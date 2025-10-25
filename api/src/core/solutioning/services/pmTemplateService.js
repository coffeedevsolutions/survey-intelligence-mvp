/**
 * PM Template Service
 * Manages customizable project management templates for work item creation
 */

import { pool } from '../../../database/connection.js';

export class PMTemplateService {
  /**
   * Get all PM templates for an organization
   */
  async getTemplatesByOrg(orgId) {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        is_default,
        is_active,
        epic_config,
        story_patterns,
        task_patterns,
        requirement_patterns,
        ai_instructions,
        created_at,
        updated_at
      FROM pm_templates 
      WHERE org_id = $1 AND is_active = true
      ORDER BY is_default DESC, name ASC
    `, [orgId]);
    
    return result.rows;
  }

  /**
   * Get a specific PM template by ID
   */
  async getTemplateById(templateId, orgId) {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        is_default,
        is_active,
        epic_config,
        story_patterns,
        task_patterns,
        requirement_patterns,
        ai_instructions,
        created_at,
        updated_at
      FROM pm_templates 
      WHERE id = $1 AND org_id = $2
    `, [templateId, orgId]);
    
    return result.rows[0] || null;
  }

  /**
   * Get the default PM template for an organization
   */
  async getDefaultTemplate(orgId) {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        is_default,
        is_active,
        epic_config,
        story_patterns,
        task_patterns,
        requirement_patterns,
        ai_instructions,
        created_at,
        updated_at
      FROM pm_templates 
      WHERE org_id = $1 AND is_default = true AND is_active = true
      LIMIT 1
    `, [orgId]);
    
    return result.rows[0] || null;
  }

  /**
   * Create a new PM template
   */
  async createTemplate(orgId, templateData, createdBy) {
    const {
      name,
      description,
      isDefault = false,
      epicConfig = {},
      storyPatterns = [],
      taskPatterns = [],
      requirementPatterns = [],
      aiInstructions = {}
    } = templateData;

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await pool.query(`
        UPDATE pm_templates 
        SET is_default = false 
        WHERE org_id = $1 AND is_default = true
      `, [orgId]);
    }

    const result = await pool.query(`
      INSERT INTO pm_templates (
        org_id, name, description, is_default, epic_config,
        story_patterns, task_patterns, requirement_patterns,
        ai_instructions, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, description, is_default, created_at
    `, [
      orgId, name, description, isDefault, 
      JSON.stringify(epicConfig),
      JSON.stringify(storyPatterns),
      JSON.stringify(taskPatterns), 
      JSON.stringify(requirementPatterns),
      JSON.stringify(aiInstructions),
      createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Update an existing PM template
   */
  async updateTemplate(templateId, orgId, templateData) {
    const {
      name,
      description,
      isDefault = false,
      epicConfig = {},
      storyPatterns = [],
      taskPatterns = [],
      requirementPatterns = [],
      aiInstructions = {}
    } = templateData;

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await pool.query(`
        UPDATE pm_templates 
        SET is_default = false 
        WHERE org_id = $1 AND is_default = true AND id != $2
      `, [orgId, templateId]);
    }

    const result = await pool.query(`
      UPDATE pm_templates 
      SET 
        name = $3,
        description = $4,
        is_default = $5,
        epic_config = $6,
        story_patterns = $7,
        task_patterns = $8,
        requirement_patterns = $9,
        ai_instructions = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND org_id = $2
      RETURNING id, name, description, is_default, updated_at
    `, [
      templateId, orgId, name, description, isDefault,
      JSON.stringify(epicConfig),
      JSON.stringify(storyPatterns),
      JSON.stringify(taskPatterns),
      JSON.stringify(requirementPatterns),
      JSON.stringify(aiInstructions)
    ]);

    return result.rows[0];
  }

  /**
   * Delete a PM template (soft delete by setting inactive)
   */
  async deleteTemplate(templateId, orgId) {
    const result = await pool.query(`
      UPDATE pm_templates 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND org_id = $2 AND is_default = false
      RETURNING id, name
    `, [templateId, orgId]);

    if (result.rows.length === 0) {
      throw new Error('Template not found or cannot delete default template');
    }

    return result.rows[0];
  }

  /**
   * Generate AI prompt based on PM template configuration
   */
  buildTemplatePrompt(template, orgConfig = {}) {
    try {
      console.log('🎯 [PM Template] Building prompt for template:', template?.name || 'Unknown');
      console.log('🎯 [PM Template] Template structure:', Object.keys(template || {}));
      
      const { epic_config: epicConfig = {}, story_patterns: storyPatterns = [], 
              task_patterns: taskPatterns = [], requirement_patterns: requirementPatterns = [],
              ai_instructions: aiInstructions = {} } = template || {};

    let prompt = `You are a senior technical architect and project manager. Analyze the provided business brief and create a solution breakdown using the organization's PM template.

IMPORTANT: Follow the organization's PM template pattern exactly. Each epic MUST include the required story patterns as defined below.

Generate a detailed JSON response with the following structure:
{
  "title": "Project Title",
  "summary": "Comprehensive project summary (50-2000 characters)",
  "epics": [
    {
      "id": "epic_1",
      "title": "Epic Title",
      "description": "Epic description (20-1000 characters)",
      "priority": "critical|high|medium|low",
      "estimated_effort": "small|medium|large|extra-large",
      "dependencies": ["dependency1", "dependency2"],
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "stakeholders": ["stakeholder1", "stakeholder2"]
    }
  ],
  "requirements": [
    {
      "id": "req_1",
      "description": "Requirement description (10-500 characters)",
      "type": "functional|non-functional|technical|business|compliance",
      "priority": "must-have|should-have|could-have|won't-have",
      "epic_id": "epic_1",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "dependencies": ["dependency1"],
      "estimated_effort": "small|medium|large|extra-large"
    }
  ],
  "technical_stack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["Node.js", "Express"],
    "database": ["PostgreSQL"],
    "infrastructure": ["AWS", "Docker"]
  },
  "risks": [
    {
      "description": "Risk description (10-500 characters)",
      "impact": "low|medium|high|critical",
      "probability": "low|medium|high",
      "mitigation": "Mitigation strategy"
    }
  ],
  "timeline": {
    "estimated_duration": "12 weeks",
    "phases": [
      {
        "name": "Phase 1",
        "duration": "4 weeks",
        "description": "Phase description"
      }
    ]
  },
  "success_metrics": [
    {
      "metric": "User satisfaction",
      "target": "90%",
      "measurement_method": "User survey"
    }
  ],
  "confidence_score": 0.85,
  "metadata": {
    "analysis_version": "1.0",
    "generated_at": "2024-01-01T00:00:00Z",
    "model_used": "gpt-4o-mini",
    "processing_time_ms": 1500
  }
}

Focus on creating a realistic, implementable solution with proper work breakdown structure.`;

      return prompt;
    } catch (error) {
      console.error('❌ [PM Template] Error building template prompt:', error);
      throw new Error(`Failed to build template prompt: ${error.message}`);
    }
  }
  /**
   * Validate template configuration
   */
  validateTemplate(templateData) {
    const errors = [];
    const { name, storyPatterns = [], taskPatterns = [], requirementPatterns = [] } = templateData;

    // Basic validation
    if (!name || name.trim().length === 0) {
      errors.push('Template name is required');
    }

    // Validate story patterns
    storyPatterns.forEach((pattern, index) => {
      if (!pattern.name) {
        errors.push(`Story pattern ${index + 1}: Name is required`);
      }
      if (!pattern.storyType || !['user_story', 'technical_story', 'spike'].includes(pattern.storyType)) {
        errors.push(`Story pattern ${index + 1}: Invalid story type`);
      }
      if (!pattern.id) {
        errors.push(`Story pattern ${index + 1}: Pattern ID is required`);
      }
    });

    // Validate task patterns
    taskPatterns.forEach((pattern, index) => {
      if (!pattern.name) {
        errors.push(`Task pattern ${index + 1}: Name is required`);
      }
      if (!pattern.taskType || !['development', 'testing', 'documentation', 'deployment', 'research'].includes(pattern.taskType)) {
        errors.push(`Task pattern ${index + 1}: Invalid task type`);
      }
      if (!pattern.id) {
        errors.push(`Task pattern ${index + 1}: Pattern ID is required`);
      }
    });

    // Validate requirement patterns
    requirementPatterns.forEach((pattern, index) => {
      if (!pattern.type || !['functional', 'technical', 'performance', 'security', 'compliance'].includes(pattern.type)) {
        errors.push(`Requirement pattern ${index + 1}: Invalid requirement type`);
      }
      if (!pattern.id) {
        errors.push(`Requirement pattern ${index + 1}: Pattern ID is required`);
      }
    });

    return errors;
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(templateId, orgId) {
    const result = await pool.query(`
      SELECT 
        COUNT(s.id) as solutions_created,
        MAX(s.created_at) as last_used,
        AVG(s.estimated_duration_weeks) as avg_duration
      FROM solutions s
      JOIN project_briefs pb ON s.brief_id = pb.id
      WHERE pb.org_id = $1 
      AND s.created_at > CURRENT_DATE - INTERVAL '30 days'
    `, [orgId]);

    return result.rows[0] || { solutions_created: 0, last_used: null, avg_duration: null };
  }
}

export const pmTemplateService = new PMTemplateService();
