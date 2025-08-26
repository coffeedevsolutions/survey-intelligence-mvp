import { pool } from "./database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";

const COOKIE_NAME = process.env.AUTH_COOKIE || "ssid";
const AUTH_SECRET = process.env.AUTH_SECRET || "dev_secret_change_me";
const EXPIRE_DAYS = Number(process.env.AUTH_EXPIRES_DAYS || 7);

export function installCookieParser(app) {
  app.use(cookieParser());
}

export async function createOrg({ slug, name, adminEmail, password }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const orgRes = await client.query(
      "INSERT INTO organizations(slug,name) VALUES ($1,$2) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id,slug,name",
      [slug, name]
    );
    const org = orgRes.rows[0];
    const pwdHash = await bcrypt.hash(password, 12);

    // upsert user
    const uRes = await client.query(
      `INSERT INTO users(email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash
       RETURNING id, email`,
      [adminEmail.toLowerCase(), pwdHash]
    );
    const user = uRes.rows[0];

    // set role
    await client.query(
      `INSERT INTO user_org_roles(org_id, user_id, role)
       VALUES ($1,$2,'admin')
       ON CONFLICT (org_id,user_id) DO UPDATE SET role='admin'`,
      [org.id, user.id]
    );

    await client.query("COMMIT");
    return { org, user };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function login({ orgSlug, email, password }) {
  const uRes = await pool.query(`SELECT u.id, u.password_hash
    FROM users u WHERE u.email = $1`, [email.toLowerCase()]);
  if (!uRes.rowCount) throw new Error("invalid_credentials");
  const user = uRes.rows[0];

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error("invalid_credentials");

  const orgRes = await pool.query(`SELECT id, slug, name FROM organizations WHERE slug=$1`, [orgSlug]);
  if (!orgRes.rowCount) throw new Error("org_not_found");
  const org = orgRes.rows[0];

  const roleRes = await pool.query(
    `SELECT role FROM user_org_roles WHERE org_id=$1 AND user_id=$2`,
    [org.id, user.id]
  );
  if (!roleRes.rowCount) throw new Error("not_a_member");
  const role = roleRes.rows[0].role;

  const jti = crypto.randomUUID();
  const exp = new Date(Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO auth_sessions(user_id, org_id, token_id, expires_at)
     VALUES ($1,$2,$3,$4)`,
    [user.id, org.id, jti, exp]
  );

  const token = jwt.sign(
    { sub: String(user.id), orgId: org.id, orgSlug: org.slug, role },
    AUTH_SECRET,
    { algorithm: "HS256", expiresIn: `${EXPIRE_DAYS}d`, jwtid: jti }
  );

  return { token, role, org, userId: user.id, expiresAt: exp.toISOString() };
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS
    maxAge: EXPIRE_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
    if (!token) return res.status(401).json({ error: "unauthorized" });

    const payload = jwt.verify(token, AUTH_SECRET);
    // optionally check server-side session not revoked
    const sRes = await pool.query(
      `SELECT 1 FROM auth_sessions WHERE token_id=$1 AND expires_at > now()`,
      [payload.jti]
    );
    if (!sRes.rowCount) return res.status(401).json({ error: "session_expired" });

    req.user = {
      id: Number(payload.sub),
      orgId: payload.orgId,
      orgSlug: payload.orgSlug,
      role: payload.role,
      tokenJti: payload.jti,
    };
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "forbidden" });
    next();
  };
}
