import { AuthAdapter } from "./auth-adapter.js";
import pkg from "express-openid-connect";
const { auth, requiresAuth } = pkg;
import { pool } from "./database.js";

export class Auth0Auth extends AuthAdapter {
  constructor() {
    super();
    const FRONTEND = process.env.WEB_ORIGIN || 'http://localhost:5173';
    
    this.config = {
      authRequired: false,
      auth0Logout: true,
      baseURL: process.env.AUTH0_BASE_URL || "http://localhost:8787",
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      secret: process.env.AUTH0_SESSION_SECRET,
      session: {
        cookie: { sameSite: 'Lax', secure: false, httpOnly: true }
      },
      // Let the library handle callback response itself (no res.redirect here)
      routes: {
        login: false,       // we'll define our own
        logout: false,      // we'll define our own
        callback: '/auth/callback'
      }
    };
    this.FRONTEND = FRONTEND;
  }

  install(app) {
    // Install the Auth0 middleware
    app.use(auth(this.config));
    
    // Explicit login route that sets the *final* redirect
    app.get('/auth/login', (req, res) => {
      return res.oidc.login({ returnTo: this.FRONTEND });
    });

    // Explicit logout route that returns to your frontend
    app.get('/auth/logout', (req, res) => {
      return res.oidc.logout({ returnTo: this.FRONTEND });
    });

    // Add user enrichment middleware
    app.use(async (req, res, next) => {
      if (!req.oidc?.isAuthenticated()) return next();
      
      const sub = req.oidc.user?.sub;         // e.g. "auth0|abcd123"
      const email = req.oidc.user?.email || null;

      try {
        // Look up user by Auth0 identity
        const q = `
          SELECT u.id, u.email, r.role, r.org_id, o.slug AS org_slug
          FROM identities i
          JOIN users u ON u.id = i.user_id
          LEFT JOIN user_org_roles r ON r.user_id = u.id
          LEFT JOIN organizations o ON o.id = r.org_id
          WHERE i.provider = 'auth0' AND i.provider_user_id = $1
          LIMIT 1
        `;
        const { rows } = await pool.query(q, [sub]);

        if (rows.length) {
          req.user = {
            id: rows[0].id,
            email: rows[0].email,
            role: rows[0].role || "requestor",
            orgId: rows[0].org_id || null,
            orgSlug: rows[0].org_slug || null,
            auth0Sub: sub
          };
          return next();
        }

        // Auto-provision user on first login
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const u = await client.query(
            `INSERT INTO users(email, password_hash, email_verified) VALUES ($1, '', true) 
             ON CONFLICT (email) DO UPDATE SET email_verified=true
             RETURNING id, email`,
            [email || `${sub}@auth0.local`]
          );

          await client.query(
            `INSERT INTO identities(user_id, provider, provider_user_id) 
             VALUES ($1,'auth0',$2)
             ON CONFLICT (provider, provider_user_id) DO NOTHING`,
            [u.rows[0].id, sub]
          );
          await client.query("COMMIT");

          req.user = { 
            id: u.rows[0].id, 
            email: u.rows[0].email, 
            role: "requestor", 
            orgId: null, 
            orgSlug: null, 
            auth0Sub: sub 
          };
        } catch (e) {
          await client.query("ROLLBACK");
          console.error("Auto-provision failed:", e);
        } finally {
          client.release();
        }

        next();
      } catch (e) {
        console.warn("Identity lookup error:", e.message);
        next();
      }
    });

    // Simple /auth/me route for session-based auth
    app.get("/auth/me", (req, res) => {
      console.log('🔍 /auth/me called');
      console.log('🔐 req.oidc.isAuthenticated():', req.oidc?.isAuthenticated());
      
      if (!req.oidc?.isAuthenticated()) {
        console.log('❌ User not authenticated via Auth0');
        return res.status(401).json({ error: "unauthorized" });
      }
      
      // Return enriched user if present; else basic OIDC info
      const user = req.user ?? { 
        id: null,
        email: req.oidc.user?.email, 
        auth0Sub: req.oidc.user?.sub, 
        role: "requestor",
        orgId: null,
        orgSlug: null
      };
      
      console.log('✅ Returning user data:', user);
      res.json({ user });
    });

    // Auth status route (additional)
    app.get("/auth/status", (req, res) => {
      res.json({
        authenticated: req.oidc?.isAuthenticated() || false,
        user: req.user || null
      });
    });

    // Auth0 callback redirect is handled by afterCallback config above
    
    // Add a root route that redirects to frontend (in case someone hits the API directly)
    app.get('/', (req, res) => {
      res.redirect('http://localhost:5173');
    });
  }

  async registerOrgAndAdmin() {
    throw new Error("Use Auth0 Dashboard or Management API to create users and assign to organizations");
  }

  async login() {
    // Login is handled by express-openid-connect middleware at /auth/login
    throw new Error("Login redirect handled by Auth0 middleware at /auth/login");
  }

  async logout({ res }) {
    // Logout handled by express-openid-connect
    if (res?.oidc?.logout) {
      return res.oidc.logout();
    }
    throw new Error("Logout handled by Auth0 middleware at /auth/logout");
  }

  async verifyRequest(req) {
    if (!req.oidc?.isAuthenticated()) return null;
    if (!req.user) return null;
    
    return {
      user: req.user,
      tokenJti: null // not applicable for Auth0 session
    };
  }

  setCookie() {
    // Not used with Auth0 - sessions handled by express-openid-connect
  }

  clearCookie() {
    // Not used with Auth0 - sessions handled by express-openid-connect
  }

  requiresAuth() {
    return requiresAuth();
  }
}