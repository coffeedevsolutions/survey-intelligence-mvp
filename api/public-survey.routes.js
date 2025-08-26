import express from 'express';
import { OpenAI } from 'openai';
import crypto from 'node:crypto';
import { 
  getSurveyLinkByToken,
  incrementSurveyLinkUse,
  createCampaignSession,
  getSession,
  addAnswerWithOrg,
  upsertMultipleFactsWithOrg,
  updateSession,
  pool
} from './database.js';
import {
  getNextQuestion,
  extractFactsFromAnswer,
  renderTemplate,
  AI_PROMPTS,
  parseAIResponse,
  getCompletionPercentage
} from './adaptiveEngine.js';

const router = express.Router();
const useAI = !!process.env.OPENAI_API_KEY;
const openai = useAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Token validation middleware for public routes
async function validateSurveyToken(req, res, next) {
  try {
    const token = req.params.token;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const surveyLink = await getSurveyLinkByToken(token);
    
    if (!surveyLink) {
      return res.status(401).json({ error: 'Invalid, expired, or revoked survey link' });
    }
    
    // Attach survey context to request
    req.surveyContext = {
      orgId: surveyLink.org_id,
      campaignId: surveyLink.campaign_id,
      flowId: surveyLink.flow_id,
      linkId: surveyLink.id,
      token: surveyLink.token,
      campaignName: surveyLink.campaign_name,
      flowSpec: surveyLink.spec_json,
      useAI: surveyLink.use_ai
    };
    
    next();
  } catch (error) {
    console.error('Error validating survey token:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
}

// Public survey bootstrap - get campaign info and first question
router.get('/surveys/:token/bootstrap', validateSurveyToken, async (req, res) => {
  try {
    const { campaignName, flowSpec, campaignId, flowId } = req.surveyContext;
    
    // Get the first question
    const firstQuestion = getNextQuestion(flowSpec, {
      currentQuestionId: null,
      answers: [],
      facts: {}
    });
    
    if (!firstQuestion) {
      return res.status(400).json({ error: 'No questions configured in this survey' });
    }
    
    // Check if there's an existing session for this token (for resume functionality)
    // For now, we'll always create new sessions, but this could be enhanced later
    
    res.json({
      campaign: {
        id: campaignId,
        name: campaignName
      },
      flow: {
        id: flowId,
        version: flowSpec.version || 1,
        completion: flowSpec.completion
      },
      firstQuestion,
      resumable: false // Could implement session resumption later
    });
  } catch (error) {
    console.error('Error bootstrapping survey:', error);
    res.status(500).json({ error: 'Failed to bootstrap survey' });
  }
});

// Create a new survey session
router.post('/surveys/:token/sessions', validateSurveyToken, async (req, res) => {
  try {
    const { orgId, campaignId, flowId, linkId, flowSpec } = req.surveyContext;
    
    // Increment link usage
    await incrementSurveyLinkUse(linkId);
    
    // Generate session ID
    const sessionId = `pub_${crypto.randomBytes(8).toString('hex')}`;
    
    // Create session
    const session = await createCampaignSession({
      id: sessionId,
      orgId,
      campaignId,
      flowId,
      linkId
    });
    
    // Get first question
    const question = getNextQuestion(flowSpec, {
      currentQuestionId: null,
      answers: [],
      facts: {}
    });
    
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
    console.error('Error creating survey session:', error);
    res.status(500).json({ error: 'Failed to create survey session' });
  }
});

// Answer a question (main adaptive logic)
router.post('/sessions/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, text } = req.body;
    
    if (!questionId || !text) {
      return res.status(400).json({ error: 'questionId and text are required' });
    }
    
    // Get session - use direct query to get all database fields
    const sessionResult = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    console.log('📝 Raw session query result:', { rowCount: sessionResult.rowCount });
    
    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];
    console.log('📝 Raw session data:', { 
      id: session.id, 
      flow_id: session.flow_id, 
      org_id: session.org_id, 
      campaign_id: session.campaign_id 
    });
    
    // Get flow spec
    console.log('📝 Looking for flow ID:', session.flow_id);
    const flowResult = await pool.query(
      'SELECT spec_json, use_ai FROM survey_flows WHERE id = $1',
      [session.flow_id]
    );
    console.log('📝 Flow query result:', { rowCount: flowResult.rowCount, foundFlow: !!flowResult.rows[0] });
    
    if (!flowResult.rowCount) {
      return res.status(500).json({ error: 'Survey flow not found' });
    }
    
    const flowSpec = flowResult.rows[0].spec_json;
    const useAIForFlow = flowResult.rows[0].use_ai;
    
    // Find the question in the spec
    const question = flowSpec.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    
    // Save answer
    await addAnswerWithOrg(sessionId, questionId, text, session.org_id);
    
    // Extract facts from answer
    const extractedFacts = extractFactsFromAnswer(question, text);
    await upsertMultipleFactsWithOrg(sessionId, extractedFacts, session.org_id);
    
    // Get current session state for next question logic
    const answersResult = await pool.query(
      'SELECT question_id, text FROM answers WHERE session_id = $1 ORDER BY created_at',
      [sessionId]
    );
    
    const factsResult = await pool.query(
      'SELECT key, value FROM facts WHERE session_id = $1',
      [sessionId]
    );
    
    const answers = answersResult.rows.map(row => ({
      questionId: row.question_id,
      text: row.text
    }));
    
    const facts = {};
    factsResult.rows.forEach(row => {
      facts[row.key] = row.value;
    });
    
    // Add the current answer and facts to state
    answers.push({ questionId, text });
    Object.assign(facts, extractedFacts);
    
    const sessionState = {
      currentQuestionId: questionId,
      answers,
      facts
    };
    
    // Try AI enhancement if enabled
    if (useAI && useAIForFlow && openai) {
      try {
        const prompt = AI_PROMPTS.FACT_EXTRACTION_USER(
          questionId, 
          text, 
          answers, 
          facts, 
          flowSpec.rules || []
        );
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: AI_PROMPTS.FACT_EXTRACTION_SYSTEM },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        });
        
        const aiResult = parseAIResponse(response.choices[0]?.message?.content || '{}');
        
        // Update facts with AI suggestions
        if (aiResult.updated_facts && Array.isArray(aiResult.updated_facts)) {
          const aiFacts = {};
          aiResult.updated_facts.forEach(({ key, value }) => {
            if (key && value !== undefined) {
              facts[key] = value;
              aiFacts[key] = value;
            }
          });
          
          if (Object.keys(aiFacts).length > 0) {
            await upsertMultipleFactsWithOrg(sessionId, aiFacts, session.org_id);
          }
        }
        
        // Update session state with AI-enhanced facts
        sessionState.facts = facts;
      } catch (aiError) {
        console.warn('AI enhancement failed, continuing without it:', aiError.message);
      }
    }
    
    // Determine next question
    const nextQuestion = getNextQuestion(flowSpec, sessionState);
    
    // Calculate progress
    const progress = {
      percentage: getCompletionPercentage(flowSpec, facts),
      completed: !nextQuestion
    };
    
    if (!nextQuestion) {
      // Survey completed
      await updateSession(sessionId, { 
        completed: true, 
        current_question_id: null 
      });
      
      return res.json({
        next: null,
        completed: true,
        progress
      });
    }
    
    // Update session with next question
    await updateSession(sessionId, {
      current_question_id: nextQuestion.id,
      completed: false
    });
    
    res.json({
      next: nextQuestion,
      completed: false,
      progress
    });
    
  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// Submit completed survey and generate brief
router.post('/sessions/:sessionId/submit', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session and verify it's completed - use direct query to get all database fields
    const sessionResult = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];
    console.log('📋 Submit - Raw session data:', { 
      id: session.id, 
      campaign_id: session.campaign_id, 
      completed: session.completed 
    });
    
    if (!session.completed) {
      return res.status(400).json({ error: 'Survey not completed yet' });
    }
    
    // Get campaign template
    const campaignResult = await pool.query(
      'SELECT template_md, name FROM campaigns WHERE id = $1',
      [session.campaign_id]
    );
    
    if (!campaignResult.rowCount) {
      return res.status(500).json({ error: 'Campaign not found' });
    }
    
    const templateMd = campaignResult.rows[0].template_md;
    const campaignName = campaignResult.rows[0].name;
    
    // Get all facts for this session
    const factsResult = await pool.query(
      'SELECT key, value FROM facts WHERE session_id = $1',
      [sessionId]
    );
    
    const facts = {};
    factsResult.rows.forEach(row => {
      facts[row.key] = row.value;
    });
    
    let briefMarkdown;
    
    // Try AI-enhanced brief generation if available
    if (useAI && openai) {
      try {
        const prompt = AI_PROMPTS.BRIEF_GENERATION_USER(templateMd, facts);
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: AI_PROMPTS.BRIEF_GENERATION_SYSTEM },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        });
        
        briefMarkdown = response.choices[0]?.message?.content || renderTemplate(templateMd, facts);
      } catch (aiError) {
        console.warn('AI brief generation failed, using template:', aiError.message);
        briefMarkdown = renderTemplate(templateMd, facts);
      }
    } else {
      // Fallback to template rendering
      briefMarkdown = renderTemplate(templateMd, facts);
    }
    
    // Store brief in database
    const briefResult = await pool.query(`
      INSERT INTO project_briefs (session_id, campaign_id, org_id, title, summary_md)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      sessionId,
      session.campaign_id,
      session.org_id,
      facts.problem_statement || `${campaignName} Response`,
      briefMarkdown
    ]);
    
    const briefId = briefResult.rows[0].id;
    
    res.json({
      briefMarkdown,
      stored: true,
      briefId,
      message: 'Survey completed successfully!'
    });
    
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

// Get survey session status (for resumption/progress tracking)
router.get('/sessions/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get flow spec for progress calculation
    const flowResult = await pool.query(
      'SELECT spec_json FROM survey_flows WHERE id = $1',
      [session.flow_id]
    );
    
    if (!flowResult.rowCount) {
      return res.status(500).json({ error: 'Survey flow not found' });
    }
    
    const flowSpec = flowResult.rows[0].spec_json;
    
    // Get current facts
    const factsResult = await pool.query(
      'SELECT key, value FROM facts WHERE session_id = $1',
      [sessionId]
    );
    
    const facts = {};
    factsResult.rows.forEach(row => {
      facts[row.key] = row.value;
    });
    
    const progress = {
      percentage: getCompletionPercentage(flowSpec, facts),
      completed: session.completed
    };
    
    res.json({
      sessionId: session.id,
      completed: session.completed,
      currentQuestionId: session.current_question_id,
      progress
    });
    
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

export default router;
