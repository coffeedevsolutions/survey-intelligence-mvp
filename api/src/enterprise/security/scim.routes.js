/**
 * SCIM 2.0 Routes
 * 
 * Express routes for SCIM 2.0 endpoints
 * Implements user and group provisioning for enterprise SSO
 */

import express from 'express';
import SCIMService from './scim/scimService.js';
import { requireMember } from '../../platform/auth/services/auth-enhanced.js';

const router = express.Router();
const scimService = new SCIMService();

// SCIM middleware for validation
function scimMiddleware(req, res, next) {
  try {
    scimService.validateSCIMRequest(req);
    next();
  } catch (error) {
    res.status(400).json(scimService.createErrorResponse(400, error.message));
  }
}

// Set SCIM content type
function setSCIMContentType(req, res, next) {
  res.setHeader('Content-Type', 'application/scim+json');
  next();
}

// Service Provider Configuration
router.get('/ServiceProviderConfig', (req, res) => {
  res.json(scimService.getServiceProviderConfig());
});

// Resource Types
router.get('/ResourceTypes', (req, res) => {
  res.json(scimService.getResourceTypes());
});

// Users endpoints
router.get('/Users', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const options = {
        startIndex: parseInt(req.query.startIndex) || 1,
        count: parseInt(req.query.count) || 20,
        filter: req.query.filter,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'asc'
      };

      const result = await scimService.getUsers(orgId, options);
      res.json(result);
    } catch (error) {
      console.error('SCIM Users GET error:', error);
      res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
    }
  }
);

router.get('/Users/:id', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const userId = req.params.id;
      
      const user = await scimService.getUser(orgId, userId);
      res.json(user);
    } catch (error) {
      console.error('SCIM User GET error:', error);
      if (error.message === 'User not found') {
        res.status(404).json(scimService.createErrorResponse(404, 'User not found'));
      } else {
        res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
      }
    }
  }
);

router.post('/Users', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const scimUser = req.body;
      
      const user = await scimService.createUser(orgId, scimUser);
      res.status(201).json(user);
    } catch (error) {
      console.error('SCIM User POST error:', error);
      if (error.message === 'User already exists') {
        res.status(409).json(scimService.createErrorResponse(409, 'User already exists', 'uniqueness'));
      } else if (error.message === 'userName is required') {
        res.status(400).json(scimService.createErrorResponse(400, 'userName is required', 'invalidValue'));
      } else {
        res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
      }
    }
  }
);

router.put('/Users/:id', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const userId = req.params.id;
      const scimUser = req.body;
      
      const user = await scimService.updateUser(orgId, userId, scimUser);
      res.json(user);
    } catch (error) {
      console.error('SCIM User PUT error:', error);
      if (error.message === 'User not found') {
        res.status(404).json(scimService.createErrorResponse(404, 'User not found'));
      } else {
        res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
      }
    }
  }
);

router.patch('/Users/:id', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const userId = req.params.id;
      const patchRequest = req.body;
      
      // Handle PATCH operations
      if (patchRequest.Operations) {
        let scimUser = await scimService.getUser(orgId, userId);
        
        for (const operation of patchRequest.Operations) {
          if (operation.op === 'replace') {
            // Apply replace operations
            Object.assign(scimUser, operation.value);
          } else if (operation.op === 'add') {
            // Apply add operations
            Object.assign(scimUser, operation.value);
          } else if (operation.op === 'remove') {
            // Apply remove operations
            if (operation.path) {
              const pathParts = operation.path.split('.');
              let target = scimUser;
              for (let i = 0; i < pathParts.length - 1; i++) {
                target = target[pathParts[i]];
              }
              delete target[pathParts[pathParts.length - 1]];
            }
          }
        }
        
        const updatedUser = await scimService.updateUser(orgId, userId, scimUser);
        res.json(updatedUser);
      } else {
        res.status(400).json(scimService.createErrorResponse(400, 'Invalid PATCH request'));
      }
    } catch (error) {
      console.error('SCIM User PATCH error:', error);
      if (error.message === 'User not found') {
        res.status(404).json(scimService.createErrorResponse(404, 'User not found'));
      } else {
        res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
      }
    }
  }
);

router.delete('/Users/:id', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const userId = req.params.id;
      
      await scimService.deleteUser(orgId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('SCIM User DELETE error:', error);
      if (error.message === 'User not found') {
        res.status(404).json(scimService.createErrorResponse(404, 'User not found'));
      } else {
        res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
      }
    }
  }
);

// Groups endpoints
router.get('/Groups', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const options = {
        startIndex: parseInt(req.query.startIndex) || 1,
        count: parseInt(req.query.count) || 20,
        filter: req.query.filter
      };

      const result = await scimService.getGroups(orgId, options);
      res.json(result);
    } catch (error) {
      console.error('SCIM Groups GET error:', error);
      res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
    }
  }
);

router.get('/Groups/:id', 
  requireMember('admin'), 
  scimMiddleware, 
  setSCIMContentType,
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const groupId = req.params.id;
      
      // For now, groups are role-based, so we'll return role information
      const result = await scimService.getGroups(orgId, {});
      const group = result.Resources.find(g => g.id === groupId || g.displayName === groupId);
      
      if (!group) {
        res.status(404).json(scimService.createErrorResponse(404, 'Group not found'));
        return;
      }
      
      res.json(group);
    } catch (error) {
      console.error('SCIM Group GET error:', error);
      res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
    }
  }
);

// SCIM error handler
router.use((error, req, res, next) => {
  console.error('SCIM error:', error);
  res.status(500).json(scimService.createErrorResponse(500, 'Internal server error'));
});

export default router;
