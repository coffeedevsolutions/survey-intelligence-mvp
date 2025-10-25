/**
 * SCIM 2.0 Service
 * 
 * Implements SCIM 2.0 endpoints for enterprise SSO provisioning
 * Supports user and group management for enterprise tenants
 */

import { pool } from '../config/database.js';
import crypto from 'crypto';

// SCIM 2.0 configuration
const SCIM_CONFIG = {
  version: '2.0',
  baseUrl: process.env.SCIM_BASE_URL || '/api/scim/v2',
  supportedSchemas: [
    'urn:ietf:params:scim:schemas:core:2.0:User',
    'urn:ietf:params:scim:schemas:core:2.0:Group',
    'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'
  ],
  supportedOperations: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  maxResults: 100,
  defaultResults: 20
};

/**
 * SCIM 2.0 Service Class
 */
export class SCIMService {
  constructor(config = SCIM_CONFIG) {
    this.config = config;
  }

  /**
   * Generate SCIM ID
   */
  generateSCIMId() {
    return crypto.randomUUID();
  }

  /**
   * Validate SCIM request
   */
  validateSCIMRequest(req) {
    const contentType = req.get('Content-Type');
    const accept = req.get('Accept');
    
    if (contentType && !contentType.includes('application/scim+json')) {
      throw new Error('Invalid Content-Type. Expected application/scim+json');
    }
    
    if (accept && !accept.includes('application/scim+json')) {
      throw new Error('Invalid Accept header. Expected application/scim+json');
    }
  }

  /**
   * Create SCIM error response
   */
  createErrorResponse(status, detail, scimType = null) {
    const error = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      status: status.toString(),
      detail: detail
    };
    
    if (scimType) {
      error.scimType = scimType;
    }
    
    return error;
  }

  /**
   * Create SCIM user from database user
   */
  createSCIMUser(user, orgId) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.scim_id || user.id.toString(),
      externalId: user.external_id,
      userName: user.email,
      name: {
        formatted: user.name || user.email,
        familyName: user.last_name || '',
        givenName: user.first_name || '',
        middleName: user.middle_name || ''
      },
      displayName: user.name || user.email,
      emails: [{
        value: user.email,
        type: 'work',
        primary: true
      }],
      active: user.active !== false,
      meta: {
        resourceType: 'User',
        created: user.created_at,
        lastModified: user.updated_at,
        location: `${this.config.baseUrl}/Users/${user.scim_id || user.id}`,
        version: user.version || '1'
      },
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
        organization: orgId.toString(),
        department: user.department || '',
        manager: user.manager_id ? {
          value: user.manager_id.toString()
        } : null
      }
    };
  }

  /**
   * Create SCIM group from database group
   */
  createSCIMGroup(group, members = []) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: group.scim_id || group.id.toString(),
      externalId: group.external_id,
      displayName: group.name,
      members: members.map(member => ({
        value: member.scim_id || member.id.toString(),
        display: member.name || member.email,
        $ref: `${this.config.baseUrl}/Users/${member.scim_id || member.id}`
      })),
      meta: {
        resourceType: 'Group',
        created: group.created_at,
        lastModified: group.updated_at,
        location: `${this.config.baseUrl}/Groups/${group.scim_id || group.id}`,
        version: group.version || '1'
      }
    };
  }

  /**
   * Get users with SCIM pagination
   */
  async getUsers(orgId, options = {}) {
    const {
      startIndex = 1,
      count = this.config.defaultResults,
      filter = null,
      sortBy = 'created_at',
      sortOrder = 'asc'
    } = options;

    const client = await pool.connect();
    try {
      let query = `
        SELECT u.*, uor.role, uor.org_id
        FROM users u
        JOIN user_org_roles uor ON uor.user_id = u.id
        WHERE uor.org_id = $1
      `;
      
      const params = [orgId];
      let paramIndex = 2;

      // Apply filter if provided
      if (filter) {
        query += ` AND (u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
        params.push(`%${filter}%`);
        paramIndex++;
      }

      // Apply sorting
      query += ` ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}`;

      // Apply pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(count, startIndex - 1);

      const result = await client.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        JOIN user_org_roles uor ON uor.user_id = u.id
        WHERE uor.org_id = $1
      `;
      
      const countParams = [orgId];
      if (filter) {
        countQuery += ` AND (u.email ILIKE $2 OR u.name ILIKE $2)`;
        countParams.push(`%${filter}%`);
      }

      const countResult = await client.query(countQuery, countParams);
      const totalResults = parseInt(countResult.rows[0].total);

      return {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: totalResults,
        startIndex: startIndex,
        itemsPerPage: count,
        Resources: result.rows.map(user => this.createSCIMUser(user, orgId))
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get user by ID
   */
  async getUser(orgId, userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT u.*, uor.role, uor.org_id
        FROM users u
        JOIN user_org_roles uor ON uor.user_id = u.id
        WHERE uor.org_id = $1 AND (u.scim_id = $2 OR u.id = $2)
      `, [orgId, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return this.createSCIMUser(result.rows[0], orgId);

    } finally {
      client.release();
    }
  }

  /**
   * Create user via SCIM
   */
  async createUser(orgId, scimUser) {
    const client = await pool.connect();
    try {
      // Validate required fields
      if (!scimUser.userName) {
        throw new Error('userName is required');
      }

      // Check if user already exists
      const existing = await client.query(`
        SELECT id FROM users WHERE email = $1
      `, [scimUser.userName]);

      if (existing.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Generate SCIM ID
      const scimId = this.generateSCIMId();

      // Extract user data
      const userData = {
        email: scimUser.userName,
        name: scimUser.displayName || scimUser.userName,
        first_name: scimUser.name?.givenName || '',
        last_name: scimUser.name?.familyName || '',
        external_id: scimUser.externalId,
        scim_id: scimId,
        active: scimUser.active !== false,
        created_at: new Date().toISOString()
      };

      // Create user
      const result = await client.query(`
        INSERT INTO users (
          email, name, first_name, last_name, external_id, scim_id, active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userData.email,
        userData.name,
        userData.first_name,
        userData.last_name,
        userData.external_id,
        userData.scim_id,
        userData.active,
        userData.created_at
      ]);

      const user = result.rows[0];

      // Add user to organization
      await client.query(`
        INSERT INTO user_org_roles (org_id, user_id, role)
        VALUES ($1, $2, $3)
      `, [orgId, user.id, 'requestor']);

      return this.createSCIMUser(user, orgId);

    } finally {
      client.release();
    }
  }

  /**
   * Update user via SCIM
   */
  async updateUser(orgId, userId, scimUser) {
    const client = await pool.connect();
    try {
      // Get existing user
      const existing = await client.query(`
        SELECT u.*, uor.role, uor.org_id
        FROM users u
        JOIN user_org_roles uor ON uor.user_id = u.id
        WHERE uor.org_id = $1 AND (u.scim_id = $2 OR u.id = $2)
      `, [orgId, userId]);

      if (existing.rows.length === 0) {
        throw new Error('User not found');
      }

      const existingUser = existing.rows[0];

      // Prepare update data
      const updateData = {
        email: scimUser.userName || existingUser.email,
        name: scimUser.displayName || existingUser.name,
        first_name: scimUser.name?.givenName || existingUser.first_name,
        last_name: scimUser.name?.familyName || existingUser.last_name,
        external_id: scimUser.externalId || existingUser.external_id,
        active: scimUser.active !== undefined ? scimUser.active : existingUser.active,
        updated_at: new Date().toISOString()
      };

      // Update user
      const result = await client.query(`
        UPDATE users 
        SET email = $1, name = $2, first_name = $3, last_name = $4, 
            external_id = $5, active = $6, updated_at = $7
        WHERE id = $8
        RETURNING *
      `, [
        updateData.email,
        updateData.name,
        updateData.first_name,
        updateData.last_name,
        updateData.external_id,
        updateData.active,
        updateData.updated_at,
        existingUser.id
      ]);

      const updatedUser = result.rows[0];
      updatedUser.role = existingUser.role;
      updatedUser.org_id = existingUser.org_id;

      return this.createSCIMUser(updatedUser, orgId);

    } finally {
      client.release();
    }
  }

  /**
   * Delete user via SCIM
   */
  async deleteUser(orgId, userId) {
    const client = await pool.connect();
    try {
      // Get user
      const result = await client.query(`
        SELECT u.id
        FROM users u
        JOIN user_org_roles uor ON uor.user_id = u.id
        WHERE uor.org_id = $1 AND (u.scim_id = $2 OR u.id = $2)
      `, [orgId, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Remove user from organization (soft delete)
      await client.query(`
        DELETE FROM user_org_roles 
        WHERE org_id = $1 AND user_id = $2
      `, [orgId, user.id]);

      // Mark user as inactive
      await client.query(`
        UPDATE users 
        SET active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [user.id]);

      return { success: true };

    } finally {
      client.release();
    }
  }

  /**
   * Get groups with SCIM pagination
   */
  async getGroups(orgId, options = {}) {
    const {
      startIndex = 1,
      count = this.config.defaultResults,
      filter = null
    } = options;

    const client = await pool.connect();
    try {
      let query = `
        SELECT DISTINCT uor.role as name, 
               MIN(uor.created_at) as created_at,
               MAX(uor.updated_at) as updated_at
        FROM user_org_roles uor
        WHERE uor.org_id = $1
      `;
      
      const params = [orgId];

      if (filter) {
        query += ` AND uor.role ILIKE $2`;
        params.push(`%${filter}%`);
      }

      query += ` GROUP BY uor.role ORDER BY uor.role`;

      const result = await client.query(query, params);

      // Get members for each group
      const groups = [];
      for (const group of result.rows) {
        const membersResult = await client.query(`
          SELECT u.*
          FROM users u
          JOIN user_org_roles uor ON uor.user_id = u.id
          WHERE uor.org_id = $1 AND uor.role = $2
        `, [orgId, group.name]);

        groups.push(this.createSCIMGroup(group, membersResult.rows));
      }

      return {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: groups.length,
        startIndex: startIndex,
        itemsPerPage: count,
        Resources: groups
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get service provider configuration
   */
  getServiceProviderConfig() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: {
        supported: true
      },
      bulk: {
        supported: false,
        maxOperations: 0,
        maxPayloadSize: 0
      },
      filter: {
        supported: true,
        maxResults: this.config.maxResults
      },
      changePassword: {
        supported: false
      },
      sort: {
        supported: true
      },
      etag: {
        supported: false
      },
      authenticationSchemes: [{
        type: 'oauthbearertoken',
        name: 'OAuth Bearer Token',
        description: 'Authentication scheme using OAuth Bearer Token'
      }]
    };
  }

  /**
   * Get resource types
   */
  getResourceTypes() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
      totalResults: 2,
      Resources: [
        {
          id: 'User',
          name: 'User',
          endpoint: '/Users',
          description: 'User Account',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
          schemaExtensions: [
            {
              schema: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
              required: false
            }
          ],
          meta: {
            location: `${this.config.baseUrl}/ResourceTypes/User`,
            resourceType: 'ResourceType'
          }
        },
        {
          id: 'Group',
          name: 'Group',
          endpoint: '/Groups',
          description: 'Group',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
          meta: {
            location: `${this.config.baseUrl}/ResourceTypes/Group`,
            resourceType: 'ResourceType'
          }
        }
      ]
    };
  }
}

// Export default SCIM service
export default SCIMService;
