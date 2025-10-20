/**
 * PM Template Management Routes
 * Handles CRUD operations for customizable PM templates
 */

import { Router } from 'express';
import { requireMember } from '../auth/auth-enhanced.js';
import { pmTemplateService } from '../services/pmTemplateService.js';

const router = Router();

/**
 * Get all PM templates for organization
 * GET /api/orgs/:orgId/pm-templates
 */
router.get('/orgs/:orgId/pm-templates', requireMember('viewer', 'admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const templates = await pmTemplateService.getTemplatesByOrg(orgId);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching PM templates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PM templates',
      details: error.message 
    });
  }
});

/**
 * Get specific PM template
 * GET /api/orgs/:orgId/pm-templates/:templateId
 */
router.get('/orgs/:orgId/pm-templates/:templateId', requireMember('viewer', 'admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const template = await pmTemplateService.getTemplateById(templateId, orgId);
    
    if (!template) {
      return res.status(404).json({ error: 'PM template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching PM template:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PM template',
      details: error.message 
    });
  }
});

/**
 * Create new PM template
 * POST /api/orgs/:orgId/pm-templates
 */
router.post('/orgs/:orgId/pm-templates', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const templateData = req.body;
    
    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate template data
    const validationErrors = pmTemplateService.validateTemplate(templateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid template configuration',
        details: validationErrors 
      });
    }

    const template = await pmTemplateService.createTemplate(orgId, templateData, req.user.id);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating PM template:', error);
    
    if (error.message.includes('duplicate') || error.code === '23505') {
      return res.status(409).json({ 
        error: 'Template name already exists',
        details: 'A template with this name already exists in your organization' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create PM template',
      details: error.message 
    });
  }
});

/**
 * Update PM template
 * PUT /api/orgs/:orgId/pm-templates/:templateId
 */
router.put('/orgs/:orgId/pm-templates/:templateId', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const templateData = req.body;
    
    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate template data
    const validationErrors = pmTemplateService.validateTemplate(templateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid template configuration',
        details: validationErrors 
      });
    }

    const template = await pmTemplateService.updateTemplate(templateId, orgId, templateData);
    
    if (!template) {
      return res.status(404).json({ error: 'PM template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error updating PM template:', error);
    
    if (error.message.includes('duplicate') || error.code === '23505') {
      return res.status(409).json({ 
        error: 'Template name already exists',
        details: 'A template with this name already exists in your organization' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update PM template',
      details: error.message 
    });
  }
});

/**
 * Delete PM template
 * DELETE /api/orgs/:orgId/pm-templates/:templateId
 */
router.delete('/orgs/:orgId/pm-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pmTemplateService.deleteTemplate(templateId, orgId);
    res.json({ 
      message: 'PM template deleted successfully',
      template: result 
    });
  } catch (error) {
    console.error('Error deleting PM template:', error);
    
    if (error.message.includes('default template')) {
      return res.status(400).json({ 
        error: 'Cannot delete default template',
        details: 'Default templates cannot be deleted. Set another template as default first.' 
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'PM template not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete PM template',
      details: error.message 
    });
  }
});

/**
 * Get template usage statistics
 * GET /api/orgs/:orgId/pm-templates/:templateId/usage
 */
router.get('/orgs/:orgId/pm-templates/:templateId/usage', requireMember('viewer', 'admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const usage = await pmTemplateService.getTemplateUsage(templateId, orgId);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching template usage:', error);
    res.status(500).json({ 
      error: 'Failed to fetch template usage',
      details: error.message 
    });
  }
});

/**
 * Duplicate PM template
 * POST /api/orgs/:orgId/pm-templates/:templateId/duplicate
 */
router.post('/orgs/:orgId/pm-templates/:templateId/duplicate', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const { name } = req.body;
    
    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Get the original template
    const originalTemplate = await pmTemplateService.getTemplateById(templateId, orgId);
    if (!originalTemplate) {
      return res.status(404).json({ error: 'Original template not found' });
    }

    // Create duplicate with new name
    const duplicateData = {
      name: name.trim(),
      description: `Copy of ${originalTemplate.name}`,
      isDefault: false,
      epicConfig: originalTemplate.epic_config,
      storyPatterns: originalTemplate.story_patterns,
      taskPatterns: originalTemplate.task_patterns,
      requirementPatterns: originalTemplate.requirement_patterns,
      aiInstructions: originalTemplate.ai_instructions
    };

    const duplicate = await pmTemplateService.createTemplate(orgId, duplicateData, req.user.id);
    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating PM template:', error);
    
    if (error.message.includes('duplicate') || error.code === '23505') {
      return res.status(409).json({ 
        error: 'Template name already exists',
        details: 'A template with this name already exists in your organization' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to duplicate PM template',
      details: error.message 
    });
  }
});

export { router as pmTemplateRoutes };
