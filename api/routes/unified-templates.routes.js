/**
 * Unified Templates API Routes
 * Single endpoint for all template management - replaces multiple overlapping systems
 */

import express from 'express';
import { requireMember } from '../auth/auth-enhanced.js';
import { unifiedTemplateService } from '../services/unifiedTemplateService.js';

const router = express.Router();

// Unified Templates Routes

// Get all templates for organization
router.get('/orgs/:orgId/unified-templates', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { type } = req.query;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const templates = await unifiedTemplateService.getTemplatesByOrg(orgId, type);
    
    res.json({
      templates,
      total: templates.length
    });
  } catch (error) {
    console.error('Error fetching unified templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get specific template
router.get('/orgs/:orgId/unified-templates/:templateId', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await unifiedTemplateService.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Verify template belongs to organization
    if (parseInt(template.org_id) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching unified template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create new template
router.post('/orgs/:orgId/unified-templates', requireMember('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const templateData = {
      ...req.body,
      orgId: parseInt(orgId),
      createdBy: req.user.id
    };
    
    const template = await unifiedTemplateService.createTemplate(templateData);
    
    res.status(201).json({
      template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating unified template:', error);
    
    if (error.message.includes('Invalid template type') || 
        error.message.includes('require a survey_goal') ||
        error.message.includes('require ai_instructions')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/orgs/:orgId/unified-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if template exists and belongs to organization
    const existingTemplate = await unifiedTemplateService.getTemplate(templateId);
    if (!existingTemplate || parseInt(existingTemplate.org_id) !== parseInt(orgId)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const updates = req.body;
    const template = await unifiedTemplateService.updateTemplate(templateId, orgId, updates);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({
      template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating unified template:', error);
    
    if (error.message.includes('No valid fields to update')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (soft delete)
router.delete('/orgs/:orgId/unified-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await unifiedTemplateService.deleteTemplate(templateId, orgId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting unified template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get default template for organization
router.get('/orgs/:orgId/unified-templates/default', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await unifiedTemplateService.getDefaultTemplate(orgId);
    
    if (!template) {
      return res.status(404).json({ error: 'No default template found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching default template:', error);
    res.status(500).json({ error: 'Failed to fetch default template' });
  }
});

// Get template for specific survey (used by survey system)
router.get('/orgs/:orgId/surveys/:campaignId/template', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, campaignId } = req.params;
    const { flowId } = req.query;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await unifiedTemplateService.getTemplateForSurvey(
      orgId, 
      campaignId, 
      flowId || null
    );
    
    if (!template) {
      return res.status(404).json({ error: 'No template found for this survey' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching survey template:', error);
    res.status(500).json({ error: 'Failed to fetch survey template' });
  }
});

// Generate preview question (for testing templates)
router.post('/orgs/:orgId/unified-templates/:templateId/preview', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const { conversationHistory = [] } = req.body;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await unifiedTemplateService.getTemplate(templateId);
    
    if (!template || parseInt(template.org_id) !== parseInt(orgId)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (!['ai_dynamic', 'hybrid'].includes(template.template_type)) {
      return res.status(400).json({ error: 'Preview is only available for AI templates' });
    }
    
    const questionResult = await unifiedTemplateService.generateAIQuestion(
      template, 
      conversationHistory, 
      `preview_${Date.now()}`
    );
    
    res.json({
      question: questionResult,
      message: 'Preview question generated successfully'
    });
  } catch (error) {
    console.error('Error generating preview question:', error);
    res.status(500).json({ error: 'Failed to generate preview question' });
  }
});

// Get template statistics
router.get('/orgs/:orgId/unified-templates/stats', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Verify user has access to this organization
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const templates = await unifiedTemplateService.getTemplatesByOrg(orgId);
    
    const stats = {
      total: templates.length,
      by_type: {
        ai_dynamic: templates.filter(t => t.template_type === 'ai_dynamic').length,
        static: templates.filter(t => t.template_type === 'static').length,
        hybrid: templates.filter(t => t.template_type === 'hybrid').length
      },
      by_category: {},
      has_default: templates.some(t => t.is_default)
    };
    
    // Count by category
    templates.forEach(template => {
      const category = template.category || 'general';
      stats.by_category[category] = (stats.by_category[category] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({ error: 'Failed to fetch template statistics' });
  }
});

export default router;
