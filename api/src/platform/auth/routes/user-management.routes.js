import express from 'express';
import { pool } from '../../../database/connection.js';
import { requireMember } from '../services/auth-enhanced.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * GET /api/orgs/users
 * Get all users in the organization
 */
router.get('/users', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        uor.role,
        u.created_at
      FROM users u
      JOIN user_org_roles uor ON uor.user_id = u.id
      WHERE uor.org_id = $1
      ORDER BY u.email ASC
    `, [orgId]);
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/orgs/seats
 * Get seat information for the organization
 */
router.get('/seats', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    
    // Default seat limit (no seat limit in organizations table yet)
    const seatLimit = 10;
    
    // Get current user count
    const userCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_org_roles WHERE org_id = $1',
      [orgId]
    );
    
    const userCount = parseInt(userCountResult.rows[0].count);
    
    res.json({
      seats_used: userCount,
      seats_total: seatLimit,
      available: seatLimit - userCount
    });
  } catch (error) {
    console.error('Error fetching seat info:', error);
    res.status(500).json({ error: 'Failed to fetch seat info' });
  }
});

/**
 * GET /api/orgs/invites
 * Get all invites for the organization
 */
router.get('/invites', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    
    const result = await pool.query(`
      SELECT 
        i.id,
        i.email,
        i.role,
        i.token,
        i.expires_at,
        i.accepted,
        i.created_at
      FROM invites i
      WHERE i.org_id = $1 AND i.accepted = FALSE
      ORDER BY i.created_at DESC
    `, [orgId]);
    
    res.json({ invites: result.rows });
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

/**
 * POST /api/orgs/invites
 * Create a new invite
 */
router.post('/invites', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }
    
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const result = await pool.query(`
      INSERT INTO invites (org_id, email, role, token, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, role, token, expires_at, created_at
    `, [orgId, email.toLowerCase(), role, token, expiresAt, req.user.id]);
    
    res.status(201).json({ invite: result.rows[0] });
  } catch (error) {
    console.error('Error creating invite:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Invite already exists for this email' });
    }
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

/**
 * GET /api/orgs/shares
 * Get all share links for the organization
 */
router.get('/shares', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    
    const result = await pool.query(`
      SELECT 
        sl.id,
        sl.artifact_type,
        sl.artifact_id,
        sl.scope,
        sl.token,
        sl.expires_at,
        sl.max_uses,
        sl.uses,
        sl.revoked,
        sl.created_at
      FROM share_links sl
      WHERE sl.org_id = $1 AND sl.revoked = FALSE
      ORDER BY sl.created_at DESC
    `, [orgId]);
    
    res.json({ shareLinks: result.rows });
  } catch (error) {
    console.error('Error fetching share links:', error);
    res.status(500).json({ error: 'Failed to fetch share links' });
  }
});

/**
 * POST /api/orgs/shares
 * Create a new share link
 */
router.post('/shares', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { artifactType, artifactId, scope, expiresAt, maxUses } = req.body;
    
    if (!artifactType || !artifactId || !scope) {
      return res.status(400).json({ error: 'Artifact type, artifact ID, and scope are required' });
    }
    
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(`
      INSERT INTO share_links (org_id, artifact_type, artifact_id, scope, token, expires_at, max_uses, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [orgId, artifactType, artifactId, scope, token, expiresAt || null, maxUses || null, req.user.id]);
    
    const baseUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const shareLink = {
      ...result.rows[0],
      url: `${baseUrl}/shared/${token}`
    };
    
    res.status(201).json({ shareLink });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

/**
 * DELETE /api/orgs/shares/:linkId
 * Revoke a share link
 */
router.delete('/shares/:linkId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const linkId = parseInt(req.params.linkId);
    
    await pool.query(`
      UPDATE share_links
      SET revoked = TRUE
      WHERE id = $1 AND org_id = $2
    `, [linkId, orgId]);
    
    res.json({ message: 'Share link revoked successfully' });
  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

/**
 * PUT /api/orgs/users/:email/role
 * Update user role
 */
router.put('/users/:email/role', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const email = decodeURIComponent(req.params.email);
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    
    // Get user ID from email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Update role
    await pool.query(`
      UPDATE user_org_roles
      SET role = $1
      WHERE org_id = $2 AND user_id = $3
    `, [role, orgId, userId]);
    
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * DELETE /api/orgs/users/:email
 * Delete user from organization
 */
router.delete('/users/:email', requireMember('admin'), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const email = decodeURIComponent(req.params.email);
    
    // Get user ID from email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Prevent deleting yourself
    if (parseInt(userId) === parseInt(req.user.id)) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    // Remove user from organization
    await pool.query(`
      DELETE FROM user_org_roles
      WHERE org_id = $1 AND user_id = $2
    `, [orgId, userId]);
    
    res.json({ message: 'User removed from organization successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

