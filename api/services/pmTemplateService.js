/**
 * PM Template Service
 * Manages customizable project management templates for work item creation
 */

import { pool } from '../config/database.js';

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
    const { epic_config: epicConfig = {}, story_patterns: storyPatterns = [], 
            task_patterns: taskPatterns = [], requirement_patterns: requirementPatterns = [],
            ai_instructions: aiInstructions = {} } = template;

    let prompt = `You are a senior technical architect and project manager. Analyze the provided business brief and create a solution breakdown using the organization's PM template.

IMPORTANT: Follow the organization's PM template pattern exactly. Each epic MUST include the required story patterns as defined below.

Generate a detailed JSON response with the following structure:
{
  "solution": {
    "name": "Solution Name",
    "description": "Brief description",
    "estimatedDurationWeeks": number,
    "estimatedEffortPoints": number,
    "complexityScore": number (1-10)
  },
  "epics": [
    {
      "name": "Epic Name",
      "description": "Epic description",
      "businessValue": "Business value explanation",
      "priority": number (1-5),
      "estimatedStoryPoints": number,
      "stories": [
        {
          "title": "Story title",
          "description": "Story description",
          "storyType": "user_story|technical_story|spike",
          "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
          "storyPoints": number,
          "priority": number (1-5),
          "patternId": "pattern_identifier",
          "tasks": [
            {
              "title": "Task title",
              "description": "Task description",
              "taskType": "development|testing|documentation|deployment|research",
              "estimatedHours": number,
              "patternId": "task_pattern_identifier"
            }
          ]
        }
      ]
    }
  ],
  "requirements": [
    {
      "type": "functional|technical|performance|security|compliance",
      "category": "Category name",
      "title": "Requirement title",
      "description": "Detailed requirement description",
      "priority": number (1-5),
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
    }
  ],
  "architecture": [
    {
      "componentType": "frontend|backend|database|integration|infrastructure",
      "name": "Component name",
      "description": "Component description",
      "technologyStack": ["Technology 1", "Technology 2"],
      "dependencies": ["Dependency 1", "Dependency 2"],
      "complexityNotes": "Complexity considerations"
    }
  ],
  "risks": [
    {
      "type": "technical|business|timeline|resource|integration",
      "title": "Risk title",
      "description": "Risk description",
      "probability": number (1-5),
      "impact": number (1-5),
      "mitigationStrategy": "Mitigation approach"
    }
  ]
}

PM TEMPLATE CONFIGURATION:`;

    // Add epic configuration
    if (epicConfig.maxEpics) {
      prompt += `\n- LIMIT epics to maximum ${epicConfig.maxEpics} epics`;
    }
    if (epicConfig.minEpics) {
      prompt += `\n- REQUIRE minimum ${epicConfig.minEpics} epics`;
    }
    if (epicConfig.requireBusinessValue) {
      prompt += `\n- Each epic MUST include clear business value justification`;
    }

    // Add story patterns
    if (storyPatterns.length > 0) {
      prompt += `\n\nREQUIRED STORY PATTERNS - Each epic MUST include these stories:`;
      storyPatterns.forEach((pattern, index) => {
        prompt += `\n${index + 1}. ${pattern.name}`;
        prompt += `\n   - Type: ${pattern.storyType}`;
        prompt += `\n   - Description: ${pattern.description}`;
        prompt += `\n   - Priority: ${pattern.priority}`;
        prompt += `\n   - Estimated Points: ${pattern.estimatedPoints}`;
        if (pattern.required) {
          prompt += `\n   - REQUIRED: This story pattern is mandatory for every epic`;
        }
        if (pattern.acceptanceCriteria?.length > 0) {
          prompt += `\n   - Default Acceptance Criteria: ${pattern.acceptanceCriteria.join(', ')}`;
        }
      });
    }

    // Add task patterns
    if (taskPatterns.length > 0) {
      prompt += `\n\nREQUIRED TASK PATTERNS - Include these tasks based on story type:`;
      taskPatterns.forEach((pattern, index) => {
        prompt += `\n${index + 1}. ${pattern.name}`;
        prompt += `\n   - Type: ${pattern.taskType}`;
        prompt += `\n   - Description: ${pattern.description}`;
        prompt += `\n   - Estimated Hours: ${pattern.estimatedHours}`;
        prompt += `\n   - Applies to stories: ${pattern.appliesTo?.join(', ')}`;
        if (pattern.required) {
          prompt += `\n   - REQUIRED: This task is mandatory for applicable stories`;
        }
      });
    }

    // Add requirement patterns
    if (requirementPatterns.length > 0) {
      prompt += `\n\nREQUIRED REQUIREMENT TYPES:`;
      requirementPatterns.forEach((pattern, index) => {
        prompt += `\n${index + 1}. ${pattern.type} - ${pattern.category}`;
        prompt += `\n   - Description: ${pattern.description}`;
        prompt += `\n   - Priority: ${pattern.priority}`;
        if (pattern.required) {
          prompt += `\n   - REQUIRED: Must include requirements of this type`;
        }
      });
    }

    // Add AI instructions
    if (aiInstructions.organizationContext) {
      prompt += `\n\nORGANIZATION CONTEXT:\n${aiInstructions.organizationContext}`;
    }

    if (aiInstructions.focusAreas?.length > 0) {
      prompt += `\n\nFOCUS AREAS:\n${aiInstructions.focusAreas.map(area => `- ${area}`).join('\n')}`;
    }

    if (aiInstructions.workflowApproach) {
      prompt += `\n\nWORKFLOW APPROACH: ${aiInstructions.workflowApproach}`;
    }

    prompt += `\n\nCRITICAL INSTRUCTIONS:
- MUST follow the story patterns exactly - each epic needs all required story patterns
- Use the patternId field to reference which pattern each story/task follows
- Replace template variables like {{epic_name}} with actual epic names
- Ensure all required patterns are included
- Story points should use Fibonacci sequence (1,2,3,5,8,13,21)
- Create realistic, implementable solutions
- Consider dependencies between stories and tasks`;

    return prompt;
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
