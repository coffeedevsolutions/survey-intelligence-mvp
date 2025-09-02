import express from 'express';
import { pool } from '../config/database.js';
import { requireMember } from '../auth/auth-enhanced.js';
import { sanitizeOrganizationSettings } from '../utils/htmlSanitizer.js';
import { 
  createSurveyTemplate, 
  getSurveyTemplatesByOrg, 
  getSurveyTemplateById, 
  updateSurveyTemplate, 
  deleteSurveyTemplate 
} from '../config/database.js';

const router = express.Router();

/**
 * Validate and sanitize solution generation configuration
 */
function validateSolutionGenerationConfig(config) {
  const defaultConfig = {
    epics: {
      maxCount: 5,
      minCount: 1,
      enforceLimit: false,
      defaultPriority: 3,
      includeTechnicalEpics: true,
      includeInfrastructureEpics: true
    },
    stories: {
      maxPerEpic: 10,
      storyTypes: ["user_story", "technical_story", "spike"],
      requireAcceptanceCriteria: true,
      estimationScale: "fibonacci",
      defaultPriority: 3
    },
    requirements: {
      types: ["functional", "technical", "performance", "security", "compliance"],
      categories: {
        functional: true,
        technical: true,
        performance: true,
        security: true,
        compliance: false
      },
      maxPerType: 15,
      requirePrioritization: true
    },
    architecture: {
      componentTypes: ["frontend", "backend", "database", "integration", "infrastructure"],
      includeTechnologyStack: true,
      includeDependencies: true,
      includeComplexityNotes: true,
      maxComponents: 20
    },
    risks: {
      types: ["technical", "business", "timeline", "resource", "integration"],
      requireMitigationStrategy: true,
      maxRisks: 10,
      priorityThreshold: 3
    },
    estimation: {
      includeEffortPoints: true,
      includeDurationWeeks: true,
      includeComplexityScore: true,
      storyPointsScale: [1, 2, 3, 5, 8, 13, 21],
      complexityRange: [1, 10]
    },
    aiInstructions: {
      customPromptAdditions: "",
      focusAreas: [],
      constraintsAndGuidelines: [],
      organizationContext: ""
    },
    templates: {
      userStoryTemplate: "As a [user] I want [goal] so that [benefit]",
      technicalStoryTemplate: "Technical: [technical requirement or infrastructure need]",
      taskTemplate: "[action verb] [specific task description]",
      requirementTemplate: "[system/feature] must/should [requirement description]"
    }
  };

  // Deep merge with validation
  const validatedConfig = { ...defaultConfig };
  
  // Validate epics configuration
  if (config.epics) {
    if (typeof config.epics.maxCount === 'number' && config.epics.maxCount >= 1 && config.epics.maxCount <= 20) {
      validatedConfig.epics.maxCount = config.epics.maxCount;
    }
    if (typeof config.epics.minCount === 'number' && config.epics.minCount >= 1 && config.epics.minCount <= validatedConfig.epics.maxCount) {
      validatedConfig.epics.minCount = config.epics.minCount;
    }
    if (typeof config.epics.enforceLimit === 'boolean') {
      validatedConfig.epics.enforceLimit = config.epics.enforceLimit;
    }
    if (typeof config.epics.includeTechnicalEpics === 'boolean') {
      validatedConfig.epics.includeTechnicalEpics = config.epics.includeTechnicalEpics;
    }
    if (typeof config.epics.includeInfrastructureEpics === 'boolean') {
      validatedConfig.epics.includeInfrastructureEpics = config.epics.includeInfrastructureEpics;
    }
  }

  // Validate requirements configuration
  if (config.requirements?.categories) {
    const validTypes = ["functional", "technical", "performance", "security", "compliance"];
    for (const type of validTypes) {
      if (typeof config.requirements.categories[type] === 'boolean') {
        validatedConfig.requirements.categories[type] = config.requirements.categories[type];
      }
    }
  }

  // Validate AI instructions
  if (config.aiInstructions) {
    if (typeof config.aiInstructions.customPromptAdditions === 'string') {
      validatedConfig.aiInstructions.customPromptAdditions = config.aiInstructions.customPromptAdditions.slice(0, 2000);
    }
    if (Array.isArray(config.aiInstructions.focusAreas)) {
      validatedConfig.aiInstructions.focusAreas = config.aiInstructions.focusAreas.slice(0, 10);
    }
    if (Array.isArray(config.aiInstructions.constraintsAndGuidelines)) {
      validatedConfig.aiInstructions.constraintsAndGuidelines = config.aiInstructions.constraintsAndGuidelines.slice(0, 10);
    }
    if (typeof config.aiInstructions.organizationContext === 'string') {
      validatedConfig.aiInstructions.organizationContext = config.aiInstructions.organizationContext.slice(0, 1000);
    }
  }

  return validatedConfig;
}

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

// Get organization solution generation settings
router.get('/orgs/:orgId/settings/solution-generation', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      'SELECT solution_generation_config FROM organizations WHERE id = $1',
      [orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({
      config: result.rows[0].solution_generation_config || {}
    });
  } catch (error) {
    console.error('Error fetching solution generation settings:', error);
    res.status(500).json({ error: 'Failed to fetch solution generation settings' });
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
      'letterhead_enabled', 'page_margins', 'page_size', 'export_formats',
      // Survey appearance settings
      'survey_theme', 'survey_primary_color', 'survey_background_color',
      'survey_font_family', 'survey_welcome_message', 'survey_completion_message',
      'survey_show_logo', 'survey_show_progress', 'survey_smooth_transitions',
      // Prioritization framework settings
      'prioritization_framework', 'prioritization_framework_config', 'enabled_prioritization_frameworks'
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

// Update organization solution generation settings
router.put('/orgs/:orgId/settings/solution-generation', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { config } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Valid config object required' });
    }
    
    // Validate and sanitize configuration structure
    const validatedConfig = validateSolutionGenerationConfig(config);
    
    const result = await pool.query(
      'UPDATE organizations SET solution_generation_config = $1 WHERE id = $2 RETURNING solution_generation_config',
      [JSON.stringify(validatedConfig), orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({
      config: result.rows[0].solution_generation_config,
      message: 'Solution generation settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating solution generation settings:', error);
    res.status(500).json({ error: 'Failed to update solution generation settings' });
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

// Get available prioritization frameworks
router.get('/orgs/:orgId/prioritization-frameworks', async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('User accessing prioritization frameworks:', {
      userId: req.user.id,
      userOrgId: req.user.orgId,
      requestedOrgId: orgId,
      userRole: req.user.role
    });
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied - org mismatch' });
    }
    
    const frameworks = {
      simple: {
        id: 'simple',
        name: '1-5 Priority Scale',
        description: 'Simple numeric scale from 1 (highest) to 5 (lowest)',
        type: 'numeric',
        isDefault: true
      },
      ice: {
        id: 'ice',
        name: 'ICE Framework',
        description: 'Impact × Confidence × Ease scoring (1-10 each)',
        type: 'composite'
      },
      rice: {
        id: 'rice',
        name: 'RICE Framework',
        description: 'Reach × Impact × Confidence ÷ Effort scoring',
        type: 'composite'
      },
      moscow: {
        id: 'moscow',
        name: 'MoSCoW Framework',
        description: 'Must have, Should have, Could have, Won\'t have',
        type: 'categorical'
      },
      value_effort: {
        id: 'value_effort',
        name: 'Value vs Effort Matrix',
        description: 'Plot initiatives on Value vs Effort matrix',
        type: 'matrix'
      },
      story_points: {
        id: 'story_points',
        name: 'Story Points (Fibonacci)',
        description: 'Fibonacci sequence for relative sizing',
        type: 'numeric'
      },
      tshirt: {
        id: 'tshirt',
        name: 'T-Shirt Sizes',
        description: 'XS, S, M, L, XL, XXL sizing for relative estimation',
        type: 'categorical'
      }
    };
    
    res.json({ frameworks });
  } catch (error) {
    console.error('Error fetching prioritization frameworks:', error);
    res.status(500).json({ error: 'Failed to fetch prioritization frameworks' });
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

// Survey template management endpoints

// Get all survey templates for organization
router.get('/orgs/:orgId/survey-templates', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const templates = await getSurveyTemplatesByOrg(orgId);
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching survey templates:', error);
    res.status(500).json({ error: 'Failed to fetch survey templates' });
  }
});

// Create a new survey template
router.post('/orgs/:orgId/survey-templates', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { name, description, settings, isDefault, enable_ai, ai_template_id, brief_template, brief_ai_instructions } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!name || !settings) {
      return res.status(400).json({ error: 'Name and settings are required' });
    }
    
    const template = await createSurveyTemplate({
      orgId,
      name,
      description,
      settings,
      isDefault: isDefault || false,
      enableAI: enable_ai || false,
      aiTemplateId: (enable_ai && ai_template_id) ? parseInt(ai_template_id) : null,
      briefTemplate: brief_template || null,
      briefAIInstructions: brief_ai_instructions || null,
      createdBy: req.user.id
    });
    
    res.status(201).json({ template });
  } catch (error) {
    console.error('Error creating survey template:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'A template with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create survey template' });
  }
});

// Get a specific survey template
router.get('/orgs/:orgId/survey-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const templateId = parseInt(req.params.templateId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await getSurveyTemplateById(templateId, orgId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Error fetching survey template:', error);
    res.status(500).json({ error: 'Failed to fetch survey template' });
  }
});

// Update a survey template
router.put('/orgs/:orgId/survey-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const templateId = parseInt(req.params.templateId);
    const { name, description, settings, isDefault } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await updateSurveyTemplate(templateId, orgId, {
      name,
      description,
      settings,
      isDefault
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Error updating survey template:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'A template with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update survey template' });
  }
});

// Delete a survey template
router.delete('/orgs/:orgId/survey-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const templateId = parseInt(req.params.templateId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const template = await deleteSurveyTemplate(templateId, orgId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey template:', error);
    res.status(500).json({ error: 'Failed to delete survey template' });
  }
});

export default router;
