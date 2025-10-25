/**
 * Authentication Middleware
 * 
 * Handles authentication and authorization for API routes
 */

import { buildAuth } from '../platform/auth/services/auth-provider.js';

// Auth adapter will be initialized when first needed
let auth = null;

/**
 * Get or initialize auth adapter
 */
function getAuth() {
  if (!auth) {
    // This will be called after the app is set up, so we can't initialize here
    // Instead, we'll initialize it in the auth routes
    throw new Error('Auth adapter not initialized. Make sure auth routes are set up first.');
  }
  return auth;
}

/**
 * Initialize auth adapter with app instance
 */
export function initializeAuth(app) {
  auth = buildAuth(app);
}

/**
 * Authentication middleware - works with both local and Auth0
 */
export async function authMiddleware(req, res, next) {
  console.log('🔐 [AuthMiddleware] Processing request:', req.method, req.path);
  
  // Check if using Auth0 (session-based)
  if (req.oidc) {
    console.log('🔐 [AuthMiddleware] Using Auth0 flow');
    if (!req.oidc.isAuthenticated()) {
      console.log('🔐 [AuthMiddleware] Auth0 not authenticated');
      return res.status(401).json({ error: "unauthorized" });
    }
    // User enrichment should have happened in Auth0 middleware
    if (!req.user) {
      console.log('🔐 [AuthMiddleware] Creating fallback user from OIDC');
      // Fallback: create basic user from OIDC info
      req.user = { 
        email: req.oidc.user?.email, 
        auth0Sub: req.oidc.user?.sub, 
        role: "requestor",
        orgId: null,
        orgSlug: null
      };
    }
    console.log('🔐 [AuthMiddleware] Auth0 auth successful');
    return next();
  }
  
  console.log('🔐 [AuthMiddleware] Using local auth (JWT-based)');
  // Local auth (JWT-based)
  try {
    console.log('🔐 [AuthMiddleware] Calling auth.verifyRequest...');
    const authAdapter = getAuth();
    const result = await authAdapter.verifyRequest(req);
    console.log('🔐 [AuthMiddleware] verifyRequest result:', !!result);
    
    if (!result) {
      console.log('🔐 [AuthMiddleware] No auth result, returning 401');
      return res.status(401).json({ error: "unauthorized" });
    }
    req.user = result.user;
    req.tokenJti = result.tokenJti;
    console.log('🔐 [AuthMiddleware] Local auth successful');
    next();
  } catch (error) {
    console.error("🔐 [AuthMiddleware] Auth error:", error);
    return res.status(401).json({ error: "unauthorized" });
  }
}

/**
 * RLS Context Middleware - sets org context for Row-Level Security
 */
export async function rlsContextMiddleware(req, res, next) {
  try {
    // Only set context if user is authenticated and has orgId
    if (req.user?.orgId) {
      console.log('🔒 [RLS] Setting org context:', req.user.orgId);
      const { pool } = await import('../database/connection.js');
      await pool.query('SET app.current_org_id = $1', [req.user.orgId]);
    } else {
      console.log('🔒 [RLS] No orgId found, clearing context');
      const { pool } = await import('../database/connection.js');
      await pool.query('SET app.current_org_id = NULL');
    }
  } catch (error) {
    console.error('🔒 [RLS] Error setting org context:', error);
    // Don't fail the request, just log the error
  }
  next();
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    // Auth0 session check
    if (req.oidc) {
      if (!req.oidc.isAuthenticated()) return res.status(401).json({ error: "unauthorized" });
      // Check enriched user role, or default to requestor
      const userRole = req.user?.role || "requestor";
      if (!roles.includes(userRole)) return res.status(403).json({ error: "forbidden" });
      return next();
    }
    
    // Local auth check
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

export default {
  authMiddleware,
  rlsContextMiddleware,
  requireRole
};
