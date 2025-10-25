/**
 * Local Authentication Service
 * 
 * Handles JWT-based local authentication with cookies
 */

import { AuthAdapter } from "./auth-adapter.js";
import { pool } from "../../../database/connection.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";

const COOKIE_NAME = process.env.AUTH_COOKIE || "ssid";
const AUTH_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev_secret_change_me";
const EXPIRE_DAYS = Number(process.env.AUTH_EXPIRES_DAYS || 7);

export function installLocalAuth(app) { 
  app.use(cookieParser()); 
}

export class LocalAuth extends AuthAdapter {
  install(app) {
    // Local auth doesn't need additional middleware setup
    // Cookie parser is already installed by installLocalAuth function
  }
  
  async registerOrgAndAdmin({ slug, name, email, password }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Create organization
      const orgRes = await client.query(
        "INSERT INTO organizations(slug,name) VALUES ($1,$2) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id,slug,name",
        [slug, name]
      );
      const org = orgRes.rows[0];
      
      const pwdHash = await bcrypt.hash(password, 12);

      // Create user
      const uRes = await client.query(
        `INSERT INTO users(email, password_hash, email_verified)
         VALUES ($1, $2, true)
         ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash
         RETURNING id, email`,
        [email.toLowerCase(), pwdHash]
      );
      const user = uRes.rows[0];

      // Create local identity
      await client.query(
        `INSERT INTO identities(user_id, provider, provider_user_id)
         VALUES ($1, 'local', $2)
         ON CONFLICT (provider, provider_user_id) DO UPDATE SET last_login_at = CURRENT_TIMESTAMP`,
        [user.id, email.toLowerCase()]
      );

      // Set admin role
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

  async login({ orgSlug, email, password }) {
    const uRes = await pool.query(`SELECT u.id, u.email, u.password_hash
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

    // Update identity last login
    await pool.query(
      `UPDATE identities SET last_login_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND provider = 'local'`,
      [user.id]
    );

    const jti = crypto.randomUUID();
    const exp = new Date(Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO auth_sessions(user_id, org_id, token_id, expires_at)
       VALUES ($1,$2,$3,$4)`,
      [user.id, org.id, jti, exp]
    );

    // OIDC-like token format
    const token = jwt.sign(
      { 
        iss: process.env.AUTH_ISSUER || "http://localhost:8787/",
        aud: process.env.AUTH_AUDIENCE || "ai-survey-api",
        sub: String(user.id), 
        orgId: org.id, 
        orgSlug: org.slug, 
        role,
        email: user.email
      },
      AUTH_SECRET,
      { algorithm: "HS256", expiresIn: `${EXPIRE_DAYS}d`, jwtid: jti }
    );

    return { token, role, org, userId: user.id, expiresAt: exp.toISOString() };
  }

  async verifyRequest(req) {
    const token = req.cookies?.[COOKIE_NAME] || 
                 (req.headers.authorization?.startsWith("Bearer ") ? 
                  req.headers.authorization.slice(7) : null);
    if (!token) return null;
    
    try {
      const payload = jwt.verify(token, AUTH_SECRET);
      
      // Check server-side session not revoked
      const sRes = await pool.query(
        `SELECT 1 FROM auth_sessions WHERE token_id=$1 AND expires_at > now()`,
        [payload.jti]
      );
      if (!sRes.rowCount) return null;

      return {
        user: {
          id: Number(payload.sub),
          orgId: payload.orgId,
          orgSlug: payload.orgSlug,
          role: payload.role,
        },
        tokenJti: payload.jti
      };
    } catch {
      return null;
    }
  }

  setCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true behind HTTPS
      maxAge: EXPIRE_DAYS * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }

  clearCookie(res) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
  }

  async logout({ tokenJti }) {
    if (tokenJti) {
      await pool.query(`DELETE FROM auth_sessions WHERE token_id = $1`, [tokenJti]);
    }
  }

  // Route handlers for auth-provider.js compatibility
  async registerOrgAndAdminHandler(req, res) {
    try {
      const { orgName, orgSlug, adminEmail, adminPassword } = req.body;
      const { org, user } = await this.registerOrgAndAdmin({
        slug: orgSlug,
        name: orgName,
        email: adminEmail,
        password: adminPassword
      });

      const loginResult = await this.login({
        orgSlug: org.slug,
        email: adminEmail,
        password: adminPassword
      });

      this.setCookie(res, loginResult.token);

      res.json({
        success: true,
        org: { id: org.id, slug: org.slug, name: org.name },
        user: { id: user.id, email: user.email },
        token: loginResult.token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async loginHandler(req, res) {
    try {
      const { orgSlug, email, password } = req.body;
      const result = await this.login({ orgSlug, email, password });
      
      this.setCookie(res, result.token);
      
      res.json({
        success: true,
        token: result.token,
        user: { id: result.userId, role: result.role },
        org: result.org
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  async logoutHandler(req, res) {
    try {
      if (req.user?.tokenJti) {
        await pool.query(
          'DELETE FROM auth_sessions WHERE token_id = $1',
          [req.user.tokenJti]
        );
      }
      
      this.clearCookie(res);
      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  async meHandler(req, res) {
    try {
      res.json({
        user: req.user,
        success: true
      });
    } catch (error) {
      console.error('Me handler error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }
}

