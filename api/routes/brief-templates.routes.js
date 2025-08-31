import express from 'express';
import { pool } from '../config/database.js';
import { requireMember } from '../auth/auth-enhanced.js';

const router = express.Router();

// Get all brief templates for an organization
router.get('/orgs/:orgId/brief-templates', requireMember('member', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(`
      SELECT bt.*, u.email as created_by_email
      FROM brief_templates bt
      LEFT JOIN users u ON bt.created_by = u.id
      WHERE bt.org_id = $1
      ORDER BY bt.is_default DESC, bt.created_at DESC
    `, [orgId]);
    
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Error fetching brief templates:', error);
    res.status(500).json({ error: 'Failed to fetch brief templates' });
  }
});

// Get a specific brief template
router.get('/orgs/:orgId/brief-templates/:templateId', requireMember('member', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const templateId = parseInt(req.params.templateId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(`
      SELECT bt.*, u.email as created_by_email
      FROM brief_templates bt
      LEFT JOIN users u ON bt.created_by = u.id
      WHERE bt.id = $1 AND bt.org_id = $2
    `, [templateId, orgId]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Brief template not found' });
    }
    
    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Error fetching brief template:', error);
    res.status(500).json({ error: 'Failed to fetch brief template' });
  }
});

// Create a new brief template
router.post('/orgs/:orgId/brief-templates', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { name, description, template_content, ai_instructions, is_default } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!name || !template_content) {
      return res.status(400).json({ error: 'Name and template content are required' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // If setting as default, unset other defaults
      if (is_default) {
        await client.query(
          'UPDATE brief_templates SET is_default = FALSE WHERE org_id = $1',
          [orgId]
        );
      }
      
      const result = await client.query(`
        INSERT INTO brief_templates (org_id, name, description, template_content, ai_instructions, is_default, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [orgId, name, description || null, template_content, ai_instructions || null, is_default || false, req.user.id]);
      
      await client.query('COMMIT');
      
      res.status(201).json({ template: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating brief template:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'A template with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create brief template' });
  }
});

// Update a brief template
router.put('/orgs/:orgId/brief-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const templateId = parseInt(req.params.templateId);
    const { name, description, template_content, ai_instructions, is_default } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // If setting as default, unset other defaults
      if (is_default) {
        await client.query(
          'UPDATE brief_templates SET is_default = FALSE WHERE org_id = $1 AND id != $2',
          [orgId, templateId]
        );
      }
      
      const result = await client.query(`
        UPDATE brief_templates 
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            template_content = COALESCE($3, template_content),
            ai_instructions = COALESCE($4, ai_instructions),
            is_default = COALESCE($5, is_default),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND org_id = $7
        RETURNING *
      `, [name, description, template_content, ai_instructions, is_default, templateId, orgId]);
      
      await client.query('COMMIT');
      
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Brief template not found' });
      }
      
      res.json({ template: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating brief template:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'A template with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update brief template' });
  }
});

// Delete a brief template
router.delete('/orgs/:orgId/brief-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const templateId = parseInt(req.params.templateId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(`
      DELETE FROM brief_templates 
      WHERE id = $1 AND org_id = $2
      RETURNING *
    `, [templateId, orgId]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Brief template not found' });
    }
    
    res.json({ message: 'Brief template deleted successfully' });
  } catch (error) {
    console.error('Error deleting brief template:', error);
    res.status(500).json({ error: 'Failed to delete brief template' });
  }
});

export default router;
