import express from 'express';
import { pool } from '../config/database.js';
import { requireMember } from '../auth/auth-enhanced.js';
import { exportBrief, getAvailableFormats } from '../services/documentExport.js';

const router = express.Router();

// Export brief in specified format
router.get('/orgs/:orgId/briefs/:briefId/export/:format', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, briefId, format } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get brief content
    const briefResult = await pool.query(
      'SELECT summary_md, title FROM project_briefs WHERE id = $1 AND org_id = $2',
      [briefId, orgId]
    );
    
    if (briefResult.rows.length === 0) {
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    const brief = briefResult.rows[0];
    
    // Get organization settings
    const orgResult = await pool.query(
      'SELECT document_settings FROM organizations WHERE id = $1',
      [orgId]
    );
    
    const orgSettings = orgResult.rows[0]?.document_settings || {};
    
    // Export brief
    const exportResult = await exportBrief(brief.summary_md, format, orgSettings);
    
    // Set appropriate headers
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    
    if (exportResult.note) {
      res.setHeader('X-Export-Note', exportResult.note);
    }
    
    res.send(exportResult.content);
    
  } catch (error) {
    console.error('Error exporting brief:', error);
    res.status(500).json({ error: 'Failed to export brief' });
  }
});

// Get export formats for brief
router.get('/orgs/:orgId/briefs/:briefId/export-formats', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, briefId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify brief exists
    const briefResult = await pool.query(
      'SELECT id FROM project_briefs WHERE id = $1 AND org_id = $2',
      [briefId, orgId]
    );
    
    if (briefResult.rows.length === 0) {
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    const formats = getAvailableFormats();
    res.json({ formats });
    
  } catch (error) {
    console.error('Error fetching export formats:', error);
    res.status(500).json({ error: 'Failed to fetch export formats' });
  }
});

// Preview brief with styling
router.get('/orgs/:orgId/briefs/:briefId/preview', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, briefId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get brief content
    const briefResult = await pool.query(
      'SELECT summary_md, title FROM project_briefs WHERE id = $1 AND org_id = $2',
      [briefId, orgId]
    );
    
    if (briefResult.rows.length === 0) {
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    const brief = briefResult.rows[0];
    
    // Get organization settings
    const orgResult = await pool.query(
      'SELECT document_settings FROM organizations WHERE id = $1',
      [orgId]
    );
    
    const orgSettings = orgResult.rows[0]?.document_settings || {};
    
    // Generate styled HTML preview
    const exportResult = await exportBrief(brief.summary_md, 'html', orgSettings);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(exportResult.content);
    
  } catch (error) {
    console.error('Error generating brief preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

export default router;