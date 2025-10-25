/**
 * Middleware Index
 * 
 * Exports all middleware functions
 */

import { authMiddleware, rlsContextMiddleware, requireRole, initializeAuth } from './auth.middleware.js';
import { errorMiddleware } from './error.middleware.js';
import * as validationMiddleware from './validation.middleware.js';

export {
  authMiddleware,
  rlsContextMiddleware,
  requireRole,
  errorMiddleware,
  validationMiddleware,
  initializeAuth
};

export default {
  authMiddleware,
  rlsContextMiddleware,
  requireRole,
  errorMiddleware,
  validationMiddleware,
  initializeAuth
};
