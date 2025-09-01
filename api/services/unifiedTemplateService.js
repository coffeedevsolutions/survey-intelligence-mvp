/**
 * Unified Template Service
 * Replaces and consolidates aiSurveyTemplateService, survey template management, and brief templates
 * Single source of truth for all survey templating
 */

import { pool } from '../config/database.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class UnifiedTemplateService {
  constructor() {
    this.defaultModel = process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
  }

  /**
   * Get unified template by ID
   */
  async getTemplate(templateId) {
    const result = await pool.query(`
      SELECT * FROM survey_templates_unified 
      WHERE id = $1 AND is_active = true
    `, [templateId]);
    
    return result.rows[0] || null;
  }

  /**
   * Get templates by organization
   */
  async getTemplatesByOrg(orgId, templateType = null) {
    let query = `
      SELECT * FROM survey_templates_unified 
      WHERE org_id = $1 AND is_active = true
    `;
    const params = [orgId];
    
    if (templateType) {
      query += ` AND template_type = $2`;
      params.push(templateType);
    }
    
    query += ` ORDER BY is_default DESC, name ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get default template for organization
   */
  async getDefaultTemplate(orgId) {
    const result = await pool.query(`
      SELECT * FROM survey_templates_unified 
      WHERE org_id = $1 AND is_default = true AND is_active = true
      LIMIT 1
    `, [orgId]);
    
    return result.rows[0] || null;
  }

  /**
   * Create new unified template
   */
  async createTemplate(templateData) {
    const {
      orgId, name, description, category = 'general', templateType,
      aiConfig = {}, outputConfig = {}, appearanceConfig = {}, flowConfig = {},
      isDefault = false, createdBy
    } = templateData;

    // Validate template type
    if (!['static', 'ai_dynamic', 'hybrid'].includes(templateType)) {
      throw new Error('Invalid template type. Must be: static, ai_dynamic, or hybrid');
    }

    // Ensure required AI config for AI templates
    if (['ai_dynamic', 'hybrid'].includes(templateType)) {
      if (!aiConfig.survey_goal) {
        throw new Error('AI templates require a survey_goal');
      }
      if (!aiConfig.ai_instructions) {
        throw new Error('AI templates require ai_instructions');
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as default, unset existing defaults
      if (isDefault) {
        await client.query(
          'UPDATE survey_templates_unified SET is_default = false WHERE org_id = $1',
          [orgId]
        );
      }

      const result = await client.query(`
        INSERT INTO survey_templates_unified (
          org_id, name, description, category, template_type,
          ai_config, output_config, appearance_config, flow_config,
          is_default, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        orgId, name, description, category, templateType,
        JSON.stringify(aiConfig), JSON.stringify(outputConfig), 
        JSON.stringify(appearanceConfig), JSON.stringify(flowConfig),
        isDefault, createdBy
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update unified template
   */
  async updateTemplate(templateId, orgId, updates) {
    // Map camelCase frontend fields to snake_case database fields
    const fieldMapping = {
      'templateType': 'template_type',
      'aiConfig': 'ai_config',
      'outputConfig': 'output_config',
      'appearanceConfig': 'appearance_config',
      'flowConfig': 'flow_config',
      'isActive': 'is_active',
      'isDefault': 'is_default'
    };
    
    // Convert camelCase to snake_case
    const mappedUpdates = {};
    Object.keys(updates).forEach(key => {
      const mappedKey = fieldMapping[key] || key;
      mappedUpdates[mappedKey] = updates[key];
    });
    
    const allowedFields = [
      'name', 'description', 'category', 'template_type',
      'ai_config', 'output_config', 'appearance_config', 'flow_config',
      'is_active', 'is_default'
    ];

    const fields = [];
    const values = [];
    let paramCounter = 1;

    Object.keys(mappedUpdates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCounter}`);
        if (['ai_config', 'output_config', 'appearance_config', 'flow_config'].includes(key)) {
          values.push(JSON.stringify(mappedUpdates[key]));
        } else {
          values.push(mappedUpdates[key]);
        }
        paramCounter++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as default, unset existing defaults
      if (mappedUpdates.is_default) {
        await client.query(
          'UPDATE survey_templates_unified SET is_default = false WHERE org_id = $1 AND id != $2',
          [orgId, templateId]
        );
      }

      const result = await client.query(`
        UPDATE survey_templates_unified 
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter} AND org_id = $${paramCounter + 1}
        RETURNING *
      `, [...values, templateId, orgId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete unified template
   */
  async deleteTemplate(templateId, orgId) {
    const result = await pool.query(`
      UPDATE survey_templates_unified 
      SET is_active = false 
      WHERE id = $1 AND org_id = $2
      RETURNING *
    `, [templateId, orgId]);
    
    return result.rows[0] || null;
  }

  /**
   * Get template for campaign/flow (unified lookup)
   */
  async getTemplateForSurvey(orgId, campaignId, flowId = null) {
    // First check if flow has a specific template
    if (flowId) {
      const flowResult = await pool.query(`
        SELECT stu.* FROM survey_templates_unified stu
        JOIN survey_flows sf ON sf.unified_template_id = stu.id
        WHERE sf.id = $1 AND stu.org_id = $2 AND stu.is_active = true
      `, [flowId, orgId]);
      
      if (flowResult.rows[0]) {
        return flowResult.rows[0];
      }
    }

    // Then check if campaign has a template
    const campaignResult = await pool.query(`
      SELECT stu.* FROM survey_templates_unified stu
      JOIN campaigns c ON c.unified_template_id = stu.id
      WHERE c.id = $1 AND stu.org_id = $2 AND stu.is_active = true
    `, [campaignId, orgId]);
    
    if (campaignResult.rows[0]) {
      return campaignResult.rows[0];
    }

    // Finally, get organization default
    return await this.getDefaultTemplate(orgId);
  }

  /**
   * Generate AI question using unified template
   */
  async generateAIQuestion(template, conversationHistory = [], sessionId = null) {
    if (!['ai_dynamic', 'hybrid'].includes(template.template_type)) {
      throw new Error('Template does not support AI question generation');
    }

    const aiConfig = template.ai_config || {};
    const { survey_goal, target_outcome, ai_instructions, model_settings = {}, optimization_config = {} } = aiConfig;

    // Check optimization rules
    if (optimization_config.max_turns && conversationHistory.length >= optimization_config.max_turns) {
      return null; // Stop asking questions
    }

    // Apply semantic deduplication if enabled
    if (optimization_config.enable_semantic_deduplication && conversationHistory.length > 0) {
      // Simplified implementation - in full version would use embeddings
      const recentTopics = conversationHistory.slice(-3).map(h => h.answer.toLowerCase());
      const hasRepeatedTopics = recentTopics.some((topic, i) => 
        recentTopics.slice(i + 1).some(other => 
          this.calculateSimpleSimilarity(topic, other) > (optimization_config.similarity_threshold || 0.85)
        )
      );
      
      if (hasRepeatedTopics) {
        console.log('🔄 Skipping question due to semantic redundancy');
        return null;
      }
    }

    // Apply fatigue detection if enabled
    if (optimization_config.enable_fatigue_detection && conversationHistory.length > 2) {
      const recentAnswers = conversationHistory.slice(-2);
      const avgLength = recentAnswers.reduce((sum, h) => sum + h.answer.length, 0) / recentAnswers.length;
      
      if (avgLength < 20) { // Very short answers indicate fatigue
        console.log('😴 Stopping due to user fatigue detection');
        return null;
      }
    }

    // Build conversation context
    const conversationText = conversationHistory
      .map(h => `Q: ${h.question}\nA: ${h.answer}`)
      .join('\n\n');

    const systemPrompt = `${ai_instructions}

Survey Context:
- Goal: ${survey_goal}
- Target Outcome: ${target_outcome}
- Questions Asked: ${conversationHistory.length}
- Max Questions: ${optimization_config.max_turns || 8}

IMPORTANT QUESTION PRIORITIES:
1. Business Context: Current process, tools, pain points, departments impacted
2. Time/Effort Data: Time spent on manual processes (hours per day/week/month), team size affected, frequency
3. Technical Requirements: Desired outcomes, integration needs, constraints

Balance comprehensive business understanding with concrete quantifiable data. Ensure you cover:
- Current state analysis (processes, tools, departments)
- Quantifiable impact data (time, people, frequency)
- Future state requirements (goals, integrations, constraints)

Generate the next most valuable question. Be concise and avoid redundancy.`;

    // Use hardcoded intro question for consistency
    if (conversationHistory.length === 0) {
      return {
        question_text: "Please describe the business problem or opportunity you'd like to address with an IT solution. Include what's currently not working well or what new capability you need.",
        question_type: 'text',
        intent: 'Gather foundational problem description and context'
      };
    }

    // Check if we need to ask the final question
    const coverage = this.calculateCoverage(template, conversationHistory);
    const coverageThreshold = (template.ai_config?.optimization_config?.coverage_requirement || 0.8);
    const hasFinalQuestion = this.hasFinalQuestionBeenAsked(conversationHistory);
    
    if (coverage >= coverageThreshold && !hasFinalQuestion) {
      return {
        question_text: "Is there any additional information you'd like to provide about this solution request that would help us better understand your needs?",
        question_type: 'text',
        intent: 'Capture any additional context or requirements'
      };
    }

    const userPrompt = `Conversation so far:\n${conversationText}\n\nGenerate the next question to achieve our target outcome: "${target_outcome}"`;

    try {
      const response = await openai.chat.completions.create({
        model: model_settings.model_name || this.defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: model_settings.temperature || 0.3,
        max_tokens: 150
      });

      const questionText = response.choices[0]?.message?.content?.trim();
      
      if (questionText) {
        return {
          question_text: questionText,
          question_type: 'text',
          question_intent: `Advance toward: ${target_outcome}`,
          confidence: 0.8,
          template_id: template.id
        };
      }
    } catch (error) {
      console.error('AI question generation failed:', error);
      throw error;
    }

    return null;
  }

  /**
   * Generate brief using unified template
   */
  async generateBrief(template, conversationHistory, sessionId) {
    const outputConfig = template.output_config || {};
    const briefTemplate = outputConfig.brief_template || 'No brief template configured.';
    
    // Extract facts from conversation
    const facts = this.extractFactsFromConversation(conversationHistory);
    
    // If AI-enabled, enhance the brief with AI
    if (['ai_dynamic', 'hybrid'].includes(template.template_type) && template.ai_config?.ai_instructions) {
      try {
        const enhancedBrief = await this.generateAIBrief(template, facts, conversationHistory);
        return enhancedBrief;
      } catch (error) {
        console.warn('AI brief generation failed, using template:', error);
      }
    }
    
    // Fallback to simple template rendering
    return this.renderBriefTemplate(briefTemplate, facts);
  }

  /**
   * Check if survey should continue (unified completion logic)
   */
  shouldContinueAsking(template, conversationHistory, lastAnswer) {
    const aiConfig = template.ai_config || {};
    const optimization_config = aiConfig.optimization_config || {};
    
    // Check hard limits
    if (conversationHistory.length >= (optimization_config.max_turns || 8)) {
      return { continue: false, reason: 'max_questions_reached' };
    }
    
    if (conversationHistory.length < (aiConfig.question_limits?.min_questions || 3)) {
      return { continue: true, reason: 'min_questions_not_met' };
    }
    
    // Check coverage requirement
    const coverage = this.calculateCoverage(template, conversationHistory);
    if (coverage < (optimization_config.coverage_requirement || 0.8)) {
      return { continue: true, reason: 'insufficient_coverage' };
    }
    
    // Check if final question has been asked
    const hasFinalQuestion = this.hasFinalQuestionBeenAsked(conversationHistory);
    if (!hasFinalQuestion) {
      return { continue: true, reason: 'final_question_needed' };
    }
    
    // Check fatigue
    if (optimization_config.enable_fatigue_detection && lastAnswer && lastAnswer.length < 15) {
      return { continue: false, reason: 'user_fatigue_detected' };
    }
    
    return { continue: false, reason: 'coverage_achieved' };
  }

  // Helper methods
  calculateSimpleSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  hasFinalQuestionBeenAsked(conversationHistory) {
    // Check if we have reached sufficient coverage and have asked enough questions
    // If we have 4+ questions and good coverage, assume final question was already asked
    if (conversationHistory.length >= 4) {
      const coverage = this.calculateCoverage({ ai_config: {}, output_config: {} }, conversationHistory);
      // If we have good coverage and multiple questions, we likely asked the final question
      return coverage >= 0.8;
    }
    return false;
  }

  extractFactsFromConversation(conversationHistory) {
    const facts = {};
    conversationHistory.forEach((item, index) => {
      facts[`q${index + 1}_question`] = item.question;
      facts[`q${index + 1}_answer`] = item.answer;
    });
    return facts;
  }

  renderBriefTemplate(template, facts) {
    let rendered = template;
    Object.keys(facts).forEach(key => {
      const placeholder = `{${key}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), facts[key] || '');
    });
    return rendered;
  }

  calculateCoverage(template, conversationHistory) {
    // Enhanced coverage calculation based on content analysis
    const outputConfig = template.output_config || {};
    const briefTemplate = outputConfig.brief_template || '';
    
    // Define required information categories with keywords
    const requiredCategories = {
      problem_identification: ['problem', 'issue', 'challenge', 'difficulty', 'trouble'],
      current_process: ['current', 'currently', 'now', 'process', 'workflow', 'method', 'approach'],
      time_impact: ['time', 'hours', 'minutes', 'weekly', 'daily', 'monthly', 'effort', 'spend', 'take'],
      team_size: ['people', 'team', 'members', 'staff', 'employees', 'users', 'individuals'],
      tools_systems: ['tool', 'system', 'software', 'application', 'platform', 'excel', 'database'],
      desired_outcome: ['want', 'need', 'goal', 'outcome', 'result', 'expect', 'improve', 'better']
    };
    
    let coveredCategories = 0;
    const totalCategories = Object.keys(requiredCategories).length;
    
    // Combine all conversation text
    const allText = conversationHistory
      .map(item => `${item.question} ${item.answer}`)
      .join(' ')
      .toLowerCase();
    
    // Check each category for coverage
    for (const [category, keywords] of Object.entries(requiredCategories)) {
      const hasCoverage = keywords.some(keyword => allText.includes(keyword));
      if (hasCoverage) {
        coveredCategories++;
      }
    }
    
    // Calculate coverage percentage
    const contentCoverage = coveredCategories / totalCategories;
    
    // Ensure minimum questions but also require content coverage
    const minQuestions = Math.max(3, totalCategories);
    const questionCoverage = Math.min(1.0, conversationHistory.length / minQuestions);
    
    // Return the lower of the two (both must be satisfied)
    return Math.min(contentCoverage, questionCoverage);
  }

  async generateAIBrief(template, facts, conversationHistory) {
    const aiConfig = template.ai_config || {};
    const outputConfig = template.output_config || {};
    
    const systemPrompt = `You are an expert business analyst. Generate a comprehensive project brief based on the survey responses.

Template Context:
- Survey Goal: ${aiConfig.survey_goal}
- Target Outcome: ${aiConfig.target_outcome}

COMPREHENSIVE BRIEF REQUIREMENTS:
- Include current state analysis: processes, tools, departments, pain points
- Detail technical requirements and desired outcomes
- Provide stakeholder and impact analysis

ROI CALCULATION GUIDELINES:
- NEVER assume dollar amounts, cost savings, or monetary values
- ONLY use time/effort data explicitly provided by the user
- For ROI calculations, focus on time savings in hours/week/month/year
- If user mentioned team size, calculate total time impact across team members
- If no concrete time data was provided, state "Time impact data not provided - unable to calculate ROI"
- Do not estimate productivity improvements, conversion rates, or financial benefits

Generate a well-structured comprehensive brief that includes business context, technical requirements, and ROI analysis based ONLY on data provided by the user.`;

    const conversationText = conversationHistory
      .map(h => `Q: ${h.question}\nA: ${h.answer}`)
      .join('\n\n');

    const userPrompt = `Based on this conversation, generate a project brief:

${conversationText}

Brief Template to follow:
${outputConfig.brief_template || 'Generate a comprehensive brief with problem statement, requirements, and recommendations.'}`;

    const response = await openai.chat.completions.create({
      model: aiConfig.model_settings?.model_name || this.defaultModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content?.trim() || 'Brief generation failed.';
  }
}

export const unifiedTemplateService = new UnifiedTemplateService();
