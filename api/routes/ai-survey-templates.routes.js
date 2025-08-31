/**
 * AI Survey Templates Routes
 * Handles AI-powered survey templates and instances
 */

import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { aiSurveyTemplateService } from '../services/aiSurveyTemplateService.js';
import { requireMember } from '../auth/auth-enhanced.js';
import { 
  createCampaignSession,
  addAnswerWithOrg,
  incrementSurveyLinkUse
} from '../config/database.js';

const router = express.Router();

// Get all AI survey templates for an organization
router.get('/orgs/:orgId/ai-templates', requireMember('member', 'admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { category } = req.query;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const templates = await aiSurveyTemplateService.getTemplatesByCategory(orgId, category);
    
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching AI templates:', error);
    res.status(500).json({ error: 'Failed to fetch AI templates' });
  }
});

// Get AI template by ID
router.get('/orgs/:orgId/ai-templates/:templateId', requireMember('member', 'admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const template = await aiSurveyTemplateService.getAITemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'AI template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching AI template:', error);
    res.status(500).json({ error: 'Failed to fetch AI template' });
  }
});

// Create new AI survey template
router.post('/orgs/:orgId/ai-templates', requireMember('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const templateData = req.body;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      name, description, category, survey_goal, target_outcome, context_description,
      ai_instructions, first_question_prompt, follow_up_strategy,
      max_questions, min_questions, brief_template, brief_sections, success_criteria,
      model_name, temperature
    } = templateData;

    const result = await pool.query(`
      INSERT INTO ai_survey_templates (
        org_id, name, description, category, survey_goal, target_outcome, context_description,
        ai_instructions, first_question_prompt, follow_up_strategy,
        max_questions, min_questions, brief_template, brief_sections, success_criteria,
        model_name, temperature, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      orgId, name, description, category, survey_goal, target_outcome, context_description,
      ai_instructions, first_question_prompt, follow_up_strategy,
      max_questions || 8, min_questions || 3, brief_template, 
      JSON.stringify(brief_sections), JSON.stringify(success_criteria),
      model_name || 'gpt-4o-mini', temperature || 0.3, req.user.id
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating AI template:', error);
    res.status(500).json({ error: 'Failed to create AI template' });
  }
});

// Start AI-powered survey session
router.post('/start-ai-survey/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { ai_template_id, custom_context } = req.body;

    // Validate survey token and get survey context
    const linkResult = await pool.query(`
      SELECT 
        sl.id as link_id, sl.campaign_id, sl.flow_id, sl.is_active,
        c.org_id, sf.spec_json
      FROM survey_links sl
      JOIN campaigns c ON sl.campaign_id = c.id
      JOIN survey_flows sf ON sl.flow_id = sf.id
      WHERE sl.token = $1 AND sl.is_active = true
    `, [token]);

    if (!linkResult.rowCount) {
      return res.status(404).json({ error: 'Invalid or inactive survey link' });
    }

    const linkData = linkResult.rows[0];

    // Verify AI template exists and is accessible
    const template = await aiSurveyTemplateService.getAITemplate(ai_template_id);
    if (!template) {
      return res.status(404).json({ error: 'AI template not found' });
    }

    // Generate session ID and create session
    const sessionId = `ai_${crypto.randomBytes(8).toString('hex')}`;
    
    await incrementSurveyLinkUse(linkData.link_id);
    
    const session = await createCampaignSession({
      id: sessionId,
      orgId: linkData.org_id,
      campaignId: linkData.campaign_id,
      flowId: linkData.flow_id,
      linkId: linkData.link_id
    });

    // Create AI survey instance
    const aiInstanceId = await aiSurveyTemplateService.createAISurveyInstance(
      sessionId, 
      ai_template_id, 
      custom_context || {}
    );

    // Generate first AI question
    const firstQuestion = await aiSurveyTemplateService.generateFirstQuestion(aiInstanceId);

    res.json({
      sessionId: session.id,
      aiInstanceId,
      template: {
        name: template.name,
        description: template.description,
        goal: template.survey_goal,
        max_questions: template.max_questions
      },
      question: firstQuestion,
      progress: {
        current: 1,
        max: template.max_questions,
        percentage: Math.round((1 / template.max_questions) * 100)
      }
    });

  } catch (error) {
    console.error('Error starting AI survey:', error);
    res.status(500).json({ error: 'Failed to start AI survey' });
  }
});

// Answer AI survey question
router.post('/ai-survey/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question_number, answer, ai_instance_id } = req.body;

    if (!question_number || !answer || !ai_instance_id) {
      return res.status(400).json({ error: 'question_number, answer, and ai_instance_id are required' });
    }

    // Get session info
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Save the answer to the traditional answers table
    await addAnswerWithOrg(sessionId, `ai_q${question_number}`, answer, session.org_id);

    // Process answer with AI service
    const extractionResult = await aiSurveyTemplateService.processAnswer(
      ai_instance_id, 
      question_number, 
      answer
    );

    // Generate next question or complete survey
    const nextQuestionResult = await aiSurveyTemplateService.generateNextQuestion(
      ai_instance_id, 
      answer
    );

    if (nextQuestionResult.completed) {
      // Survey completed
      await pool.query(
        'UPDATE sessions SET completed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );

      // Generate smart brief
      const briefResult = await aiSurveyTemplateService.generateSmartBrief(ai_instance_id);

      // Save brief to database
      await pool.query(`
        INSERT INTO project_briefs (session_id, campaign_id, org_id, title, summary_md)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        sessionId,
        session.campaign_id,
        session.org_id,
        `AI Survey Brief - ${new Date().toISOString().split('T')[0]}`,
        briefResult.brief_content
      ]);

      return res.json({
        completed: true,
        reason: nextQuestionResult.reason,
        confidence: nextQuestionResult.confidence,
        brief: briefResult.brief_content,
        facts_gathered: briefResult.facts_used,
        total_questions: briefResult.questions_asked
      });
    }

    // Continue with next question
    const instanceResult = await pool.query(
      'SELECT questions_asked FROM ai_survey_instances WHERE id = $1',
      [ai_instance_id]
    );

    const currentProgress = instanceResult.rows[0]?.questions_asked || question_number;
    
    // Get template for max questions
    const templateResult = await pool.query(
      'SELECT max_questions FROM ai_survey_templates WHERE id = (SELECT ai_template_id FROM ai_survey_instances WHERE id = $1)',
      [ai_instance_id]
    );
    
    const maxQuestions = templateResult.rows[0]?.max_questions || 8;

    res.json({
      next_question: nextQuestionResult,
      extraction_result: extractionResult,
      progress: {
        current: currentProgress + 1,
        max: maxQuestions,
        percentage: Math.round(((currentProgress + 1) / maxQuestions) * 100)
      }
    });

  } catch (error) {
    console.error('Error processing AI survey answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// Get AI survey progress
router.get('/ai-survey/:sessionId/progress', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(`
      SELECT 
        ai.questions_asked, ai.facts_gathered, ai.ai_confidence_score,
        t.max_questions, t.name as template_name, t.survey_goal
      FROM ai_survey_instances ai
      JOIN ai_survey_templates t ON ai.ai_template_id = t.id
      WHERE ai.session_id = $1
    `, [sessionId]);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'AI survey instance not found' });
    }

    const data = result.rows[0];

    res.json({
      progress: {
        current: data.questions_asked,
        max: data.max_questions,
        percentage: Math.round((data.questions_asked / data.max_questions) * 100)
      },
      template: {
        name: data.template_name,
        goal: data.survey_goal
      },
      facts_gathered: data.facts_gathered,
      confidence_score: data.ai_confidence_score
    });

  } catch (error) {
    console.error('Error getting AI survey progress:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Get AI survey conversation history
router.get('/ai-survey/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(`
      SELECT 
        qh.question_number, qh.question_text, qh.question_intent,
        qh.user_response, qh.extracted_facts, qh.confidence_score,
        qh.created_at, qh.response_timestamp
      FROM ai_question_history qh
      JOIN ai_survey_instances ai ON qh.ai_instance_id = ai.id
      WHERE ai.session_id = $1
      ORDER BY qh.question_number
    `, [sessionId]);

    res.json({
      conversation: result.rows,
      total_questions: result.rows.length
    });

  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

// Update AI template (admin only)
router.put('/orgs/:orgId/ai-templates/:templateId', requireMember('admin'), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const updateData = req.body;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query
    const fields = Object.keys(updateData).filter(key => 
      ['name', 'description', 'category', 'survey_goal', 'target_outcome', 
       'context_description', 'ai_instructions', 'first_question_prompt', 
       'follow_up_strategy', 'max_questions', 'min_questions', 'brief_template',
       'brief_sections', 'success_criteria', 'model_name', 'temperature', 'is_active'].includes(key)
    );

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = fields.map(field => {
      if (['brief_sections', 'success_criteria'].includes(field)) {
        return JSON.stringify(updateData[field]);
      }
      return updateData[field];
    });
    values.push(templateId, orgId);

    const query = `
      UPDATE ai_survey_templates 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length - 1} AND org_id = $${values.length}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'AI template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating AI template:', error);
    res.status(500).json({ error: 'Failed to update AI template' });
  }
});

export default router;
