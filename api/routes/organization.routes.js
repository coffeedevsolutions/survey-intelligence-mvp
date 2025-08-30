import express from 'express';
import { pool } from '../config/database.js';
import { requireMember } from '../auth/auth-enhanced.js';
import { sanitizeOrganizationSettings } from '../utils/htmlSanitizer.js';

const router = express.Router();

// Get organization branding settings
router.get('/orgs/:orgId/settings/branding', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      'SELECT document_settings FROM organizations WHERE id = $1',
      [orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({
      settings: result.rows[0].document_settings || {}
    });
  } catch (error) {
    console.error('Error fetching organization branding settings:', error);
    res.status(500).json({ error: 'Failed to fetch branding settings' });
  }
});

// Update organization branding settings
router.put('/orgs/:orgId/settings/branding', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { settings } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Valid settings object required' });
    }
    
    // Validate settings structure
    const allowedFields = [
      'company_name', 'logo_url', 'document_header', 'document_footer',
      'document_header_html', 'document_footer_html',
      'theme', 'primary_color', 'secondary_color', 'font_family',
      'letterhead_enabled', 'page_margins', 'page_size', 'export_formats'
    ];
    
    const validatedSettings = {};
    for (const [key, value] of Object.entries(settings)) {
      if (allowedFields.includes(key)) {
        validatedSettings[key] = value;
      }
    }

    // Sanitize HTML fields to prevent XSS attacks
    const sanitizedSettings = sanitizeOrganizationSettings(validatedSettings);
    
    const result = await pool.query(
      'UPDATE organizations SET document_settings = $1 WHERE id = $2 RETURNING document_settings',
      [JSON.stringify(sanitizedSettings), orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({
      settings: result.rows[0].document_settings,
      message: 'Branding settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization branding settings:', error);
    res.status(500).json({ error: 'Failed to update branding settings' });
  }
});

// Get available document themes
router.get('/orgs/:orgId/themes', requireMember('admin'), async (req, res) => {
  try {
    const themes = {
      professional: {
        name: 'Professional',
        description: 'Clean corporate styling with letterhead',
        preview_css: `
          body { font-family: Inter, Arial, sans-serif; color: #1f2937; }
          h1 { color: #111827; border-bottom: 2px solid #e5e7eb; }
          .letterhead { background: #f9fafb; padding: 2rem; }
        `
      },
      technical: {
        name: 'Technical',
        description: 'Code-friendly with monospace elements',
        preview_css: `
          body { font-family: system-ui, sans-serif; color: #374151; }
          code { background: #f3f4f6; font-family: 'JetBrains Mono', monospace; }
          h1 { color: #1f2937; font-weight: 600; }
        `
      },
      consulting: {
        name: 'Consulting',
        description: 'Executive summary style with emphasis',
        preview_css: `
          body { font-family: Georgia, serif; color: #1f2937; line-height: 1.7; }
          h1 { color: #059669; font-size: 2.5rem; }
          .summary { background: #ecfdf5; padding: 1.5rem; }
        `
      },
      minimal: {
        name: 'Minimal',
        description: 'Clean and simple with plenty of whitespace',
        preview_css: `
          body { font-family: -apple-system, sans-serif; color: #374151; }
          h1 { color: #111827; font-weight: 300; }
          .content { max-width: 600px; margin: 0 auto; }
        `
      }
    };
    
    res.json({ themes });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// Preview brief with custom settings
router.get('/orgs/:orgId/briefs/preview', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { settings, content } = req.query;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!settings || !content) {
      return res.status(400).json({ error: 'Settings and content parameters required' });
    }
    
    let parsedSettings;
    try {
      parsedSettings = JSON.parse(settings);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid settings JSON' });
    }
    
    // Import the document export service
    const { exportBrief } = await import('../services/documentExport.js');
    
    // Generate styled HTML preview
    const exportResult = await exportBrief(content, 'html', parsedSettings);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(exportResult.content);
    
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

export default router;
