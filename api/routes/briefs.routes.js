import express from 'express';
import { pool } from '../config/database.js';
import { requireMember } from '../auth/auth-enhanced.js';
import { exportBrief, getAvailableFormats } from '../services/documentExport.js';
import { getBriefsForReview, updateBriefReview } from '../config/database.js';

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

// Get briefs for review
router.get('/orgs/:orgId/briefs/review', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const briefs = await getBriefsForReview(orgId);
    res.json({ briefs });
  } catch (error) {
    console.error('Error fetching briefs for review:', error);
    res.status(500).json({ error: 'Failed to fetch briefs for review' });
  }
});

// Submit brief review
router.post('/orgs/:orgId/briefs/:briefId/review', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const briefId = parseInt(req.params.briefId);
    const { priority, priorityData } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get organization's prioritization framework settings
    const orgResult = await pool.query(
      'SELECT document_settings FROM organizations WHERE id = $1',
      [orgId]
    );
    
    if (!orgResult.rows.length) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const orgSettings = orgResult.rows[0].document_settings || {};
    const frameworkId = orgSettings.prioritization_framework || 'simple';
    
    // Validate priority based on framework
    let priorityValue = priority;
    let priorityDataValue = priorityData;
    
    if (frameworkId === 'simple') {
      // Legacy support: simple 1-5 scale
      if (!priority || priority < 1 || priority > 5) {
        return res.status(400).json({ error: 'Priority must be between 1 and 5' });
      }
      priorityDataValue = { value: priority };
    } else {
      // New frameworks: use priorityData
      if (!priorityData || typeof priorityData !== 'object') {
        return res.status(400).json({ error: 'Priority data is required for this framework' });
      }
      
      // For composite frameworks, we might need to calculate a single priority value for sorting
      if (['ice', 'rice', 'value_effort'].includes(frameworkId)) {
        // Calculate a numeric priority for database sorting
        // This is a simplified calculation - in a real implementation you'd import the framework logic
        if (frameworkId === 'ice' && priorityData.impact && priorityData.confidence && priorityData.ease) {
          priorityValue = Math.min(5, Math.max(1, Math.floor((priorityData.impact * priorityData.confidence * priorityData.ease) / 200)));
        } else if (frameworkId === 'rice' && priorityData.reach && priorityData.impact && priorityData.confidence && priorityData.effort) {
          const riceScore = (priorityData.reach * priorityData.impact * (priorityData.confidence / 100)) / priorityData.effort;
          priorityValue = Math.min(5, Math.max(1, Math.floor(riceScore / 100) + 1));
        } else if (frameworkId === 'value_effort' && priorityData.value && priorityData.effort) {
          // High value, low effort = priority 1; Low value, high effort = priority 5
          priorityValue = Math.min(5, Math.max(1, Math.floor((11 - priorityData.value + priorityData.effort) / 2)));
        }
      } else if (frameworkId === 'moscow') {
        const moscowMap = { 'must': 1, 'should': 2, 'could': 3, 'wont': 4 };
        priorityValue = moscowMap[priorityData.value] || 3;
      } else if (['story_points', 'tshirt'].includes(frameworkId)) {
        // For story points and t-shirt sizes, map to 1-5 scale for sorting
        if (frameworkId === 'story_points') {
          const pointsMap = { 1: 1, 2: 1, 3: 2, 5: 3, 8: 4, 13: 5, 21: 5 };
          priorityValue = pointsMap[priorityData.value] || 3;
        } else if (frameworkId === 'tshirt') {
          const sizeMap = { 'xs': 1, 's': 2, 'm': 3, 'l': 4, 'xl': 5, 'xxl': 5 };
          priorityValue = sizeMap[priorityData.value] || 3;
        }
      }
    }
    
    const updatedBrief = await updateBriefReview(briefId, orgId, {
      priority: priorityValue,
      priorityData: priorityDataValue,
      reviewedBy: req.user.id,
      frameworkId: frameworkId
    });
    
    if (!updatedBrief) {
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    res.json({ brief: updatedBrief, message: 'Brief review submitted successfully' });
  } catch (error) {
    console.error('Error submitting brief review:', error);
    res.status(500).json({ error: 'Failed to submit brief review' });
  }
});

// PDF Export endpoint
router.post('/orgs/:orgId/briefs/:briefId/export/pdf', requireMember('member'), async (req, res) => {
  try {
    const { briefId, orgId } = req.params;
    const { content, title } = req.body;
    
    // For now, return a simple text-based PDF simulation
    // In production, you would use a PDF library like Puppeteer or PDFKit
    const pdfContent = `PDF Export - ${title || 'Project Brief'}\n\n${content || 'No content available'}`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="brief-${briefId}.pdf"`);
    
    // This is a placeholder - in production you'd generate a real PDF
    const buffer = Buffer.from(pdfContent, 'utf8');
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// DOCX Export endpoint
router.post('/orgs/:orgId/briefs/:briefId/export/docx', requireMember('member'), async (req, res) => {
  try {
    const { briefId, orgId } = req.params;
    const { content, title } = req.body;
    
    // For now, return a simple text-based DOCX simulation
    // In production, you would use a DOCX library like docx or officegen
    const docxContent = `DOCX Export - ${title || 'Project Brief'}\n\n${content || 'No content available'}`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="brief-${briefId}.docx"`);
    
    // This is a placeholder - in production you'd generate a real DOCX
    const buffer = Buffer.from(docxContent, 'utf8');
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting DOCX:', error);
    res.status(500).json({ error: 'Failed to export DOCX' });
  }
});

export default router;