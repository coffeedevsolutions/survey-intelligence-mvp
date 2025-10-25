/**
 * Auth Routes Index
 * 
 * Exports all authentication-related routes
 */

import express from 'express';
import { buildAuth } from '../services/auth-provider.js';

export function createAuthRoutes(app) {
  const router = express.Router();
  const auth = buildAuth(app);

  // Auth endpoints
  router.post("/register-org", auth.registerOrgAndAdminHandler.bind(auth));
  router.post("/login", auth.loginHandler.bind(auth));
  router.post("/logout", auth.logoutHandler.bind(auth));
  router.get("/me", auth.meHandler.bind(auth));

  return router;
}

// For backward compatibility
export const authRoutes = createAuthRoutes;
export default createAuthRoutes;
