/**
 * Enhanced Survey Routes with AI Integration
 * This is an improved version of public-survey.routes.js with AI customization
 */

import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../../../database/connection.js';
import { aiService } from '../../../platform/ai/services/aiService.js';
import { 
  getNextQuestion,
  extractFactsFromAnswer,
  getCompletionPercentage,
  renderTemplate 
} from '../services/adaptiveEngine.js';
import {
  sessionRepository,
  answerRepository,
  factsRepository,
  surveyLinkRepository
} from '../../../database/repositories/index.js';
import surveyConversationTracking from '../services/surveyConversationTracking.js';

const router = express.Router();

// Middleware to validate survey tokens and set context
async function validateSurveyToken(req, res, next) {
  try {
    const token = req.params.token || req.body.token || req.query.token;
    
    if (!token) {
      return res.status(400).json({ error: 'Survey token required' });
    }

    // Get survey link and related data
    const linkResult = await pool.query(`
      SELECT 
        sl.id as link_id,
        sl.campaign_id,
        sl.flow_id,
        sl.is_active,
        sl.expires_at,
        sl.max_uses,
        sl.current_uses,
        c.org_id,
        sf.spec_json,
        sf.use_ai,
        sf.ai_customization_level
      FROM survey_links sl
      JOIN campaigns c ON sl.campaign_id = c.id
      JOIN survey_flows sf ON sl.flow_id = sf.id
      WHERE sl.token = $1
    `, [token]);

    if (!linkResult.rowCount) {
      return res.status(404).json({ error: 'Invalid survey link' });
    }

    const linkData = linkResult.rows[0];

    // Validate link status
    if (!linkData.is_active) {
      return res.status(403).json({ error: 'Survey link is disabled' });
    }

    if (linkData.expires_at && new Date() > linkData.expires_at) {
      return res.status(403).json({ error: 'Survey link has expired' });
    }

    if (linkData.max_uses && linkData.current_uses >= linkData.max_uses) {
      return res.status(403).json({ error: 'Survey link has reached maximum uses' });
    }

    // Set survey context for downstream handlers
    req.surveyContext = {
      orgId: linkData.org_id,
      campaignId: linkData.campaign_id,
      flowId: linkData.flow_id,
      linkId: linkData.link_id,
      flowSpec: linkData.spec_json,
      useAI: linkData.use_ai,
      aiCustomizationLevel: linkData.ai_customization_level
    };

    next();
  } catch (error) {
    console.error('Error validating survey token:', error);
    res.status(500).json({ error: 'Failed to validate survey' });
  }
}

// Bootstrap survey (get initial info)
router.get('/bootstrap/:token', validateSurveyToken, async (req, res) => {
  try {
    const { flowSpec, orgId } = req.surveyContext;
    
    // Get organization branding/settings if available
    const orgResult = await pool.query(
      'SELECT name, settings FROM organizations WHERE id = $1',
      [orgId]
    );

    res.json({
      survey: {
        title: flowSpec.title || 'Survey',
        description: flowSpec.description || 'Please answer the following questions',
        organization: orgResult.rows[0]?.name || 'Organization'
      },
      ready: true
    });
  } catch (error) {
    console.error('Error bootstrapping survey:', error);
    res.status(500).json({ error: 'Failed to bootstrap survey' });
  }
});

// Create a new survey session with AI-enhanced initialization
router.post('/sessions/:token', validateSurveyToken, async (req, res) => {
  try {
    const { orgId, campaignId, flowId, linkId, flowSpec, useAI, aiCustomizationLevel } = req.surveyContext;
    
    // Increment link usage
    await surveyLinkRepository.incrementSurveyLinkUse(linkId);
    
    // Generate session ID
    const sessionId = `pub_${crypto.randomBytes(8).toString('hex')}`;
    
    // Create session
    const session = await sessionRepository.createCampaignSession({
      id: sessionId,
      orgId,
      campaignId,
      flowId,
      linkId
    });
    
    // Initialize conversation tracking for this session
    await surveyConversationTracking.initializeSurveyConversationTracking(sessionId);
    
    // Get first question - use AI if enabled
    let question = null;
    
    if (useAI && aiCustomizationLevel !== 'none') {
      try {
        // Try AI-generated first question
        const aiQuestion = await aiService.generateNextQuestion(sessionId, flowId, {
          answers: [],
          facts: {},
          flowSpec,
          totalQuestions: flowSpec.questions?.length || 0,
          answeredQuestions: 0,
          completionPercentage: 0
        });
        
        if (aiQuestion && aiQuestion.question_text) {
          question = {
            id: 'ai_intro',
            text: aiQuestion.question_text,
            type: aiQuestion.question_type || 'text'
          };
        }
      } catch (error) {
        console.warn('AI question generation failed, falling back to default:', error);
      }
    }
    
    // Fallback to standard flow
    if (!question) {
      question = getNextQuestion(flowSpec, {
        currentQuestionId: null,
        answers: [],
        facts: {}
      });
    }
    
    if (!question) {
      return res.status(400).json({ error: 'No questions available' });
    }
    
    res.json({
      sessionId: session.id,
      question,
      progress: {
        percentage: 0,
        completed: false
      }
    });
  } catch (error) {
    console.error('Error creating enhanced survey session:', error);
    res.status(500).json({ error: 'Failed to create survey session' });
  }
});

// Answer a question with AI-enhanced processing
router.post('/sessions/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, text } = req.body;
    
    if (!questionId || !text) {
      return res.status(400).json({ error: 'questionId and text are required' });
    }
    
    // Get session data
    const sessionResult = await pool.query(`
      SELECT s.*, sf.spec_json, sf.use_ai, sf.ai_customization_level
      FROM sessions s
      JOIN survey_flows sf ON s.flow_id = sf.id
      WHERE s.id = $1
    `, [sessionId]);
    
    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];
    const flowSpec = session.spec_json;
    const useAI = session.use_ai;
    const aiCustomizationLevel = session.ai_customization_level;
    
    // Save answer
    await answerRepository.addAnswerWithOrg(sessionId, questionId, text, session.org_id);
    
    // Track the answer in conversation history
    const currentQuestionText = await surveyConversationTracking.getCurrentQuestionText(sessionId, questionId);
    await surveyConversationTracking.trackSurveyAnswer(sessionId, null, text, {
      questionId,
      questionText: currentQuestionText,
      orgId: session.org_id
    });
    
    // Get current session state
    const [answersResult, factsResult] = await Promise.all([
      pool.query(
        'SELECT question_id, text FROM answers WHERE session_id = $1 ORDER BY created_at',
        [sessionId]
      ),
      pool.query(
        'SELECT key, value FROM facts WHERE session_id = $1',
        [sessionId]
      )
    ]);
    
    const answers = answersResult.rows.map(row => ({
      questionId: row.question_id,
      text: row.text
    }));
    
    const facts = {};
    factsResult.rows.forEach(row => {
      facts[row.key] = row.value;
    });
    
    // AI-enhanced fact extraction
    if (useAI && aiCustomizationLevel !== 'none') {
      try {
        const aiExtraction = await aiService.extractFacts(
          sessionId, 
          session.flow_id, 
          questionId, 
          text, 
          facts
        );
        
        if (aiExtraction.extracted_facts && Array.isArray(aiExtraction.extracted_facts)) {
          const newFacts = {};
          aiExtraction.extracted_facts.forEach(fact => {
            if (fact.key && fact.value && fact.confidence > 0.5) {
              newFacts[fact.key] = fact.value;
              facts[fact.key] = fact.value;
            }
          });
          
          if (Object.keys(newFacts).length > 0) {
            await factsRepository.upsertMultipleFactsWithOrg(sessionId, newFacts, session.org_id);
          }
        }
      } catch (error) {
        console.warn('AI fact extraction failed, using fallback:', error);
        // Fallback to traditional fact extraction
        const extractedFacts = extractFactsFromAnswer({ id: questionId }, text);
        await factsRepository.upsertMultipleFactsWithOrg(sessionId, extractedFacts, session.org_id);
      }
    } else {
      // Traditional fact extraction
      const extractedFacts = extractFactsFromAnswer({ id: questionId }, text);
      await factsRepository.upsertMultipleFactsWithOrg(sessionId, extractedFacts, session.org_id);
    }
    
    // Determine next question
    let nextQuestion = null;
    
    // Try AI-generated next question first
    if (useAI && (aiCustomizationLevel === 'adaptive' || aiCustomizationLevel === 'full')) {
      try {
        const completionPercentage = getCompletionPercentage(flowSpec, facts);
        
        const aiQuestion = await aiService.generateNextQuestion(sessionId, session.flow_id, {
          answers,
          facts,
          flowSpec,
          totalQuestions: flowSpec.questions?.length || 0,
          answeredQuestions: answers.length,
          completionPercentage
        });
        
        if (aiQuestion && aiQuestion.question_text) {
          nextQuestion = {
            id: `ai_${answers.length + 1}`,
            text: aiQuestion.question_text,
            type: aiQuestion.question_type || 'text'
          };
        }
      } catch (error) {
        console.warn('AI next question generation failed:', error);
      }
    }
    
    // Fallback to flow-based logic
    if (!nextQuestion) {
      nextQuestion = getNextQuestion(flowSpec, {
        currentQuestionId: questionId,
        answers,
        facts
      });
    }
    
    // Check completion
    const completionPercentage = getCompletionPercentage(flowSpec, facts);
    const isCompleted = !nextQuestion || completionPercentage >= 100;
    
    if (isCompleted) {
      // Track survey completion
      await surveyConversationTracking.trackSurveyCompletion(sessionId, true, 'survey_completed');
      
      await pool.query(
        'UPDATE sessions SET completed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );
    } else {
      // Track the next question in conversation history
      if (nextQuestion) {
        await surveyConversationTracking.trackSurveyQuestion(
          sessionId, 
          nextQuestion.id, 
          nextQuestion.text, 
          nextQuestion.type || 'text',
          {
            orgId: session.org_id,
            aiGenerated: useAI && aiCustomizationLevel !== 'none'
          }
        );
      }
    }
    
    res.json({
      next: nextQuestion,
      completed: isCompleted,
      progress: {
        percentage: Math.min(completionPercentage, 100),
        completed: isCompleted
      }
    });
    
  } catch (error) {
    console.error('Error processing survey answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// Generate AI-enhanced survey brief
router.post('/sessions/:sessionId/brief', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session and related data
    const sessionResult = await pool.query(`
      SELECT s.*, c.template_md, sf.use_ai, sf.ai_customization_level
      FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      JOIN survey_flows sf ON s.flow_id = sf.id
      WHERE s.id = $1 AND s.completed = true
    `, [sessionId]);
    
    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: 'Completed session not found' });
    }
    
    const session = sessionResult.rows[0];
    const template = session.template_md;
    
    // Get answers and facts
    const [answersResult, factsResult] = await Promise.all([
      pool.query(
        'SELECT question_id, text FROM answers WHERE session_id = $1 ORDER BY created_at',
        [sessionId]
      ),
      pool.query(
        'SELECT key, value FROM facts WHERE session_id = $1',
        [sessionId]
      )
    ]);
    
    const answers = answersResult.rows.map(row => ({
      questionId: row.question_id,
      text: row.text
    }));
    
    const facts = {};
    factsResult.rows.forEach(row => {
      facts[row.key] = row.value;
    });
    
    // Generate brief using template
    const briefMarkdown = renderTemplate(template, facts);
    
    // Save brief to database
    await pool.query(`
      INSERT INTO project_briefs (session_id, campaign_id, org_id, title, summary_md)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      sessionId,
      session.campaign_id,
      session.org_id,
      `Survey Brief - ${new Date().toISOString().split('T')[0]}`,
      briefMarkdown
    ]);
    
    res.json({
      briefMarkdown,
      facts,
      answers
    });
    
  } catch (error) {
    console.error('Error generating survey brief:', error);
    res.status(500).json({ error: 'Failed to generate brief' });
  }
});

// Get AI analytics for organization admins
router.get('/ai-analytics/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Get AI usage statistics
    const analyticsResult = await pool.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        ai_action,
        COUNT(*) as action_count,
        AVG(processing_time_ms) as avg_processing_time,
        SUM(estimated_cost_cents) as total_cost_cents,
        AVG(confidence_score) as avg_confidence
      FROM ai_session_logs asl
      JOIN sessions s ON asl.session_id = s.id
      WHERE s.org_id = $1 
        AND asl.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND asl.error_message IS NULL
      GROUP BY DATE_TRUNC('day', created_at), ai_action
      ORDER BY date DESC, ai_action
    `, [orgId]);
    
    res.json({
      analytics: analyticsResult.rows,
      period: '30 days'
    });
    
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
