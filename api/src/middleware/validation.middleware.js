/**
 * Validation Middleware
 * 
 * Request validation and sanitization
 */

import { ValidationError } from './error.middleware.js';

/**
 * Validate request body against schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        
        throw new ValidationError('Validation failed', details);
      }
      
      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validate request query parameters against schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        
        throw new ValidationError('Query validation failed', details);
      }
      
      req.query = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validate request parameters against schema
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        
        throw new ValidationError('Parameter validation failed', details);
      }
      
      req.params = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(fields = []) {
  return (req, res, next) => {
    try {
      const { sanitize } = require('dompurify');
      const { JSDOM } = require('jsdom');
      
      const window = new JSDOM('').window;
      const purify = sanitize(window);
      
      fields.forEach(field => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = purify.sanitize(req.body[field]);
        }
      });
      
      next();
    } catch (err) {
      console.warn('HTML sanitization failed:', err.message);
      next(); // Continue without sanitization
    }
  };
}

/**
 * Validate organization access
 */
export function validateOrgAccess(req, res, next) {
  const orgId = req.params.orgId || req.body.orgId;
  
  if (!orgId) {
    return next(new ValidationError('Organization ID is required'));
  }
  
  if (req.user?.orgId && parseInt(req.user.orgId) !== parseInt(orgId)) {
    return next(new ValidationError('Access denied to this organization'));
  }
  
  next();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(req, res, next) {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  if (limit < 1 || limit > 1000) {
    return next(new ValidationError('Limit must be between 1 and 1000'));
  }
  
  if (offset < 0) {
    return next(new ValidationError('Offset must be non-negative'));
  }
  
  req.pagination = { limit, offset };
  next();
}

/**
 * Validate UUID parameter
 */
export function validateUuid(paramName = 'id') {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    
    if (!uuid) {
      return next(new ValidationError(`${paramName} is required`));
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      return next(new ValidationError(`Invalid ${paramName} format`));
    }
    
    next();
  };
}

export default {
  validateBody,
  validateQuery,
  validateParams,
  sanitizeHtml,
  validateOrgAccess,
  validatePagination,
  validateUuid
};
