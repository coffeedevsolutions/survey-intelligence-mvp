/**
 * Enhanced AI Service for Survey Question Customization
 * Supports multiple AI providers and advanced prompt management
 */

import { OpenAI } from 'openai';
import { pool } from '../config/database.js';

// Initialize AI providers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// OpenAI Model configurations
const OPENAI_MODELS = {
  'gpt-4o': { inputCost: 0.00500, outputCost: 0.01500 }, // per 1K tokens
  'gpt-4o-mini': { inputCost: 0.00015, outputCost: 0.00060 },
  'gpt-3.5-turbo': { inputCost: 0.00050, outputCost: 0.00150 }
};

/**
 * OpenAI-focused AI Service Class
 */
export class AIService {
  constructor() {
    this.defaultModel = process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
    this.maxTokensPerSession = parseInt(process.env.AI_MAX_TOKENS_PER_SESSION) || 10000;
    this.confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7;
  }

  /**
   * Get AI configuration for a survey flow
   */
  async getFlowAIConfig(flowId) {
    const result = await pool.query(`
      SELECT 
        afc.*,
        qt.system_prompt as question_system_prompt,
        qt.user_prompt_template as question_user_template,
        qt.model_name as question_model,
        qt.temperature as question_temperature,
        et.system_prompt as extraction_system_prompt,
        et.user_prompt_template as extraction_user_template,
        et.model_name as extraction_model,
        et.temperature as extraction_temperature
      FROM ai_flow_configs afc
      LEFT JOIN ai_prompt_templates qt ON afc.question_generation_template_id = qt.id
      LEFT JOIN ai_prompt_templates et ON afc.fact_extraction_template_id = et.id
      WHERE afc.flow_id = $1
    `, [flowId]);

    return result.rows[0] || null;
  }

  /**
   * Generate next question using AI
   */
  async generateNextQuestion(sessionId, flowId, context) {
    const config = await this.getFlowAIConfig(flowId);
    if (!config || !config.enable_adaptive_questions) {
      return null;
    }

    const prompt = this.buildQuestionPrompt(config, context);
    
    try {
      const startTime = Date.now();
      const response = await this.callOpenAI(
        config.question_model || this.defaultModel,
        config.question_system_prompt,
        prompt,
        {
          temperature: config.question_temperature || 0.2,
          max_tokens: 500
        }
      );

      const processingTime = Date.now() - startTime;
      const parsedResponse = this.parseAIResponse(response.content);

      // Log the AI interaction
      await this.logAIInteraction({
        sessionId,
        flowId,
        action: 'question_generation',
        templateId: config.question_generation_template_id,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        model: config.question_model || this.defaultModel,
        temperature: config.question_temperature,
        response: parsedResponse,
        processingTime,
        cost: this.calculateCost(config.question_model || this.defaultModel, response.usage)
      });

      return parsedResponse;
    } catch (error) {
      console.error('AI question generation failed:', error);
      await this.logAIInteraction({
        sessionId,
        flowId,
        action: 'question_generation',
        errorMessage: error.message
      });
      return null;
    }
  }

  /**
   * Extract facts from user response using AI
   */
  async extractFacts(sessionId, flowId, questionText, userResponse, existingFacts) {
    const config = await this.getFlowAIConfig(flowId);
    if (!config || !config.enable_smart_fact_extraction) {
      return { facts: [], confidence: 0 };
    }

    const prompt = this.buildExtractionPrompt(config, {
      questionText,
      userResponse,
      existingFacts
    });

    try {
      const startTime = Date.now();
      const response = await this.callOpenAI(
        config.extraction_model || this.defaultModel,
        config.extraction_system_prompt,
        prompt,
        {
          temperature: config.extraction_temperature || 0.1,
          max_tokens: 800
        }
      );

      const processingTime = Date.now() - startTime;
      const parsedResponse = this.parseAIResponse(response.content);

      // Log the AI interaction
      await this.logAIInteraction({
        sessionId,
        flowId,
        action: 'fact_extraction',
        templateId: config.fact_extraction_template_id,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        model: config.extraction_model || this.defaultModel,
        temperature: config.extraction_temperature,
        response: parsedResponse,
        processingTime,
        cost: this.calculateCost(config.extraction_model || this.defaultModel, response.usage)
      });

      return parsedResponse;
    } catch (error) {
      console.error('AI fact extraction failed:', error);
      await this.logAIInteraction({
        sessionId,
        flowId,
        action: 'fact_extraction',
        errorMessage: error.message
      });
      return { facts: [], confidence: 0 };
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(model, systemPrompt, userPrompt, options = {}) {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: options.temperature || 0.2,
      max_tokens: options.max_tokens || 1000,
      response_format: { type: 'json_object' }
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage
    };
  }



  /**
   * Build question generation prompt
   */
  buildQuestionPrompt(config, context) {
    const template = config.question_user_template || '';
    
    return template
      .replace('{{conversation_history}}', JSON.stringify(context.answers || [], null, 2))
      .replace('{{extracted_facts}}', JSON.stringify(context.facts || {}, null, 2))
      .replace('{{survey_context}}', JSON.stringify(context.flowSpec || {}, null, 2))
      .replace('{{session_progress}}', JSON.stringify({
        totalQuestions: context.totalQuestions || 0,
        answeredQuestions: context.answeredQuestions || 0,
        completionPercentage: context.completionPercentage || 0
      }, null, 2));
  }

  /**
   * Build fact extraction prompt
   */
  buildExtractionPrompt(config, context) {
    const template = config.extraction_user_template || '';
    
    return template
      .replace('{{question_text}}', context.questionText || '')
      .replace('{{user_response}}', context.userResponse || '')
      .replace('{{existing_facts}}', JSON.stringify(context.existingFacts || {}, null, 2));
  }

  /**
   * Parse AI JSON response with error handling
   */
  parseAIResponse(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to parse AI response as JSON:', content);
      return { error: 'Invalid JSON response', original: content };
    }
  }

  /**
   * Calculate OpenAI API call cost
   */
  calculateCost(model, usage) {
    if (!usage || !OPENAI_MODELS[model]) {
      return 0;
    }

    const pricing = OPENAI_MODELS[model];
    const inputCost = (usage.prompt_tokens / 1000) * pricing.inputCost;
    const outputCost = (usage.completion_tokens / 1000) * pricing.outputCost;
    
    return Math.round((inputCost + outputCost) * 100); // Return in cents
  }

  /**
   * Log AI interaction for analytics and debugging
   */
  async logAIInteraction(data) {
    try {
      await pool.query(`
        INSERT INTO ai_session_logs (
          session_id, flow_id, ai_action, prompt_template_id,
          input_tokens, output_tokens, model_used, temperature_used,
          ai_response, confidence_score, processing_time_ms,
          error_message, estimated_cost_cents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        data.sessionId,
        data.flowId,
        data.action,
        data.templateId || null,
        data.inputTokens || 0,
        data.outputTokens || 0,
        data.model || null,
        data.temperature || null,
        JSON.stringify(data.response || {}),
        data.confidence || null,
        data.processingTime || null,
        data.errorMessage || null,
        data.cost || 0
      ]);
    } catch (error) {
      console.error('Failed to log AI interaction:', error);
    }
  }

  /**
   * Get domain knowledge for better AI context
   */
  async getDomainKnowledge(orgId, domain) {
    const result = await pool.query(`
      SELECT content, knowledge_type
      FROM ai_domain_knowledge
      WHERE org_id = $1 AND domain = $2 AND is_active = true
      ORDER BY knowledge_type
    `, [orgId, domain]);

    const knowledge = {};
    result.rows.forEach(row => {
      knowledge[row.knowledge_type] = row.content;
    });

    return knowledge;
  }

  /**
   * Create default AI configuration for a new survey flow
   */
  async createDefaultAIConfig(flowId, orgId) {
    // Get default templates
    const templates = await pool.query(`
      SELECT id, context_type
      FROM ai_prompt_templates
      WHERE org_id IS NULL OR org_id = $1
      ORDER BY org_id NULLS LAST, created_at DESC
    `, [orgId]);

    const questionTemplate = templates.rows.find(t => t.context_type === 'question_generation');
    const extractionTemplate = templates.rows.find(t => t.context_type === 'fact_extraction');

    // Create AI config
    const result = await pool.query(`
      INSERT INTO ai_flow_configs (
        flow_id, question_generation_template_id, fact_extraction_template_id,
        enable_adaptive_questions, enable_smart_fact_extraction
      ) VALUES ($1, $2, $3, true, true)
      RETURNING id
    `, [flowId, questionTemplate?.id, extractionTemplate?.id]);

    return result.rows[0]?.id;
  }
}

// Export singleton instance
export const aiService = new AIService();
