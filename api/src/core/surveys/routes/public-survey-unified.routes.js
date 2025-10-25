import express from 'express';
import { OpenAI } from 'openai';
import crypto from 'node:crypto';
import { 
  sessionRepository,
  answerRepository,
  factsRepository,
  surveyLinkRepository
} from '../../../database/repositories/index.js';
import { pool } from '../../../database/connection.js';
import { 
  getNextQuestion,
  extractFactsFromAnswer,
  renderTemplate,
  AI_PROMPTS,
  parseAIResponse,
  getCompletionPercentage
} from '../services/adaptiveEngine.js';
import { unifiedTemplateService } from '../../../platform/templates/services/unifiedTemplateService.js';
import { enhancedUnifiedTemplateService } from '../../../platform/templates/services/enhancedUnifiedTemplateService.js';
import { 
  initializeSurveyConversationTracking,
  trackSurveyQuestion,
  trackSurveyAnswer,
  trackSurveyCompletion,
  getCurrentQuestionText as getCurrentQuestionTextFromTracking
} from '../services/surveyConversationTracking.js';

const router = express.Router();
const useAI = !!process.env.OPENAI_API_KEY;
const openai = useAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Helper function to get current question text
async function getCurrentQuestionText(sessionId, questionId) {
  try {
    // Try to get from conversation history first
    const historyResult = await pool.query(`
      SELECT question_text 
      FROM conversation_history 
      WHERE session_id = $1 AND question_id = $2
    `, [sessionId, questionId]);
    
    if (historyResult.rowCount > 0) {
      return historyResult.rows[0].question_text;
    }
    
    // Fallback: extract from recent answers table if available
    const answerResult = await pool.query(`
      SELECT question_text 
      FROM answers 
      WHERE session_id = $1 AND question_id = $2 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [sessionId, questionId]);
    
    if (answerResult.rowCount > 0 && answerResult.rows[0].question_text) {
      return answerResult.rows[0].question_text;
    }
    
    // Last resort: return the question ID
    return questionId;
  } catch (error) {
    console.warn('Error getting question text:', error.message);
    return questionId;
  }
}

// Token validation middleware for public routes
async function validateSurveyToken(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Survey token is required' });
    }

    const linkData = await surveyLinkRepository.getSurveyLinkByToken(token);
    if (!linkData) {
      return res.status(404).json({ error: 'Survey not found or expired' });
    }

    // Check if link is still valid
    if (linkData.revoked || 
        (linkData.expires_at && new Date() > new Date(linkData.expires_at)) ||
        (linkData.max_uses && linkData.uses >= linkData.max_uses)) {
      return res.status(410).json({ error: 'Survey link has expired or is no longer available' });
    }

    // Attach survey context to request
    req.surveyContext = {
      linkId: linkData.id,
      orgId: linkData.org_id,
      campaignId: linkData.campaign_id,
      campaignName: linkData.campaign_name,
      flowId: linkData.flow_id,
      flowSpec: linkData.flow_spec,
      useAI: linkData.use_ai
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
}

// Public survey bootstrap - get campaign info and first question
router.get('/surveys/:token/bootstrap', validateSurveyToken, async (req, res) => {
  try {
    const { campaignName, flowSpec, campaignId, flowId, orgId } = req.surveyContext;
    
    // Get first question using unified template system
    let firstQuestion = null;
    
    if (useAI && openai) {
      try {
        console.log('🚀 Getting first question from unified template system...');
        
        const unifiedTemplate = await unifiedTemplateService.getTemplateForSurvey(orgId, campaignId, flowId);
        
        if (unifiedTemplate && ['ai_dynamic', 'hybrid'].includes(unifiedTemplate.template_type)) {
          console.log(`🎯 Found ${unifiedTemplate.template_type} template:`, unifiedTemplate.name);
          
          // Try enhanced system first, but for first question, basic is usually fine
          let questionResult;
          try {
            questionResult = await enhancedUnifiedTemplateService.generateAIQuestion(unifiedTemplate, [], null);
          } catch (error) {
            console.warn('Enhanced first question failed, using basic:', error.message);
            questionResult = await unifiedTemplateService.generateAIQuestion(unifiedTemplate, [], null);
          }
          
          if (questionResult && questionResult.question_text) {
            firstQuestion = {
              id: questionResult.question_id || 'unified_q1',
              text: questionResult.question_text,
              type: questionResult.question_type || 'text'
            };
            console.log('✨ Generated unified first question:', questionResult.question_text);
          }
        }
      } catch (error) {
        console.error('❌ Unified template first question failed:', error);
      }
    }
    
    // Fallback to flow questions if no unified template
    if (!firstQuestion) {
      console.log('📋 Using predefined first question from flow');
      firstQuestion = getNextQuestion(flowSpec, {
        current_question_id: null,
        answers: [],
        facts: {}
      });
    }
    
    if (!firstQuestion) {
      return res.status(400).json({ error: 'No questions available for this survey' });
    }

    res.json({
      campaignName,
      question: firstQuestion,
      progress: {
        percentage: 0,
        completed: false
      }
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Failed to bootstrap survey' });
  }
});

// Create a new survey session
router.post('/sessions/:token', validateSurveyToken, async (req, res) => {
  try {
    const { orgId, campaignId, flowId, linkId } = req.surveyContext;
    
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
    await initializeSurveyConversationTracking(sessionId);

    res.json({
      sessionId: session.id,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create survey session' });
  }
});

// Answer a question (UNIFIED ADAPTIVE LOGIC)
router.post('/sessions/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, text } = req.body;
    
    if (!questionId || !text) {
      return res.status(400).json({ error: 'questionId and text are required' });
    }
    
    // Get session
    const sessionResult = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];
    console.log('📝 Processing answer for session:', session.id);
    
    // Get flow spec
    const flowResult = await pool.query(
      'SELECT spec_json, use_ai FROM survey_flows WHERE id = $1',
      [session.flow_id]
    );
    
    if (!flowResult.rowCount) {
      return res.status(500).json({ error: 'Survey flow not found' });
    }
    
    const flowSpec = flowResult.rows[0].spec_json;
    const useAIForFlow = flowResult.rows[0].use_ai;
    
    // Store the answer
    await answerRepository.addAnswerWithOrg(sessionId, questionId, text, session.org_id);
    
    // Track the answer in conversation history
    const currentQuestionText = await getCurrentQuestionTextFromTracking(sessionId, questionId);
    await trackSurveyAnswer(sessionId, null, text, {
      questionId,
      questionText: currentQuestionText,
      orgId: session.org_id
    });
    
    // Get all answers for this session
    const answersResult = await pool.query(
      'SELECT question_id, text FROM answers WHERE session_id = $1 ORDER BY created_at',
      [sessionId]
    );
    const answers = answersResult.rows;
    
    // Extract facts from the current answer
    const facts = extractFactsFromAnswer({ factKeys: [questionId] }, text);
    if (facts && Object.keys(facts).length > 0) {
      await factsRepository.upsertMultipleFactsWithOrg(sessionId, facts, session.org_id);
    }
    
    // Determine next question using ENHANCED UNIFIED SYSTEM
    let nextQuestion = null;
    
    if (useAI && useAIForFlow && openai) {
      try {
        console.log('🚀 Using ENHANCED unified template system for next question...');
        
        // Get the unified template
        const unifiedTemplate = await unifiedTemplateService.getTemplateForSurvey(
          session.org_id, 
          session.campaign_id, 
          session.flow_id
        );
        
        if (unifiedTemplate && ['ai_dynamic', 'hybrid'].includes(unifiedTemplate.template_type)) {
          console.log(`🎯 Using enhanced ${unifiedTemplate.template_type} template:`, unifiedTemplate.name);
          
          // Process the answer with enhanced AI analysis
          try {
            const currentQuestionText = await getCurrentQuestionText(sessionId, questionId);
            await enhancedUnifiedTemplateService.processAnswer(
              sessionId, 
              questionId, 
              text, 
              currentQuestionText
            );
          } catch (processError) {
            console.warn('⚠️ Enhanced answer processing failed, continuing with basic processing:', processError.message);
          }
          
          // Check if survey should continue using enhanced analysis
          let conversationHistory = [];
          let shouldContinue = { continue: true };
          
          try {
            conversationHistory = await enhancedUnifiedTemplateService.buildConversationHistory(sessionId);
            shouldContinue = await enhancedUnifiedTemplateService.shouldContinueAsking(
              unifiedTemplate, 
              conversationHistory.map(h => ({ ...h, sessionId })), 
              text
            );
          } catch (analysisError) {
            console.warn('⚠️ Enhanced analysis failed, using basic continuation logic:', analysisError.message);
            shouldContinue = { continue: true };
          }
          
          if (shouldContinue.continue) {
            let questionResult = null;
            try {
              questionResult = await enhancedUnifiedTemplateService.generateAIQuestion(
                unifiedTemplate, 
                conversationHistory, 
                sessionId
              );
            } catch (questionError) {
              console.warn('⚠️ Enhanced question generation failed, using basic generation:', questionError.message);
              // Fall back to basic question generation
              questionResult = await getNextQuestion(flowSpec, answers, facts);
            }
            
            if (questionResult && questionResult.question_text) {
              nextQuestion = {
                id: questionResult.question_id || `unified_q${conversationHistory.length + 1}`,
                text: questionResult.question_text,
                type: questionResult.question_type || 'text',
                intent: questionResult.metadata?.reasoning,
                confidence: questionResult.metadata?.confidence || 0.8
              };
              console.log('✨ Generated ENHANCED question:', questionResult.question_text);
              if (questionResult.metadata?.reasoning) {
                console.log('🎯 Reasoning:', questionResult.metadata.reasoning);
              }
            } else {
              console.log('🔚 Enhanced unified system: No more questions needed');
            }
          } else {
            console.log(`🔚 Enhanced unified system: ${shouldContinue.reason} (${(shouldContinue.completeness * 100).toFixed(1)}% complete)`);
          }
        } else {
          console.log('📋 Using static template - falling back to flow questions');
        }
      } catch (enhancedError) {
        console.error('❌ Enhanced unified template system failed:', enhancedError);
        
        // Fallback to basic unified system
        try {
          console.log('🔄 Falling back to basic unified system...');
          const unifiedTemplate = await unifiedTemplateService.getTemplateForSurvey(
            session.org_id, 
            session.campaign_id, 
            session.flow_id
          );
          
          if (unifiedTemplate && ['ai_dynamic', 'hybrid'].includes(unifiedTemplate.template_type)) {
            const conversationHistory = answers.map(a => ({
              question: a.question_id,
              answer: a.text
            }));
            
            const shouldContinue = unifiedTemplateService.shouldContinueAsking(
              unifiedTemplate, 
              conversationHistory, 
              text
            );
            
            if (shouldContinue.continue) {
              const questionResult = await unifiedTemplateService.generateAIQuestion(
                unifiedTemplate, 
                conversationHistory, 
                sessionId
              );
              
              if (questionResult && questionResult.question_text) {
                nextQuestion = {
                  id: `unified_q${answers.length + 1}`,
                  text: questionResult.question_text,
                  type: questionResult.question_type || 'text',
                  intent: questionResult.question_intent,
                  confidence: questionResult.confidence
                };
                console.log('✨ Generated fallback question:', questionResult.question_text);
              }
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
      }
    }
    
    // Fallback to flow-based questions if unified system didn't provide one
    if (!nextQuestion) {
      console.log('🔄 Falling back to flow-based question generation');
      nextQuestion = getNextQuestion(flowSpec, {
        current_question_id: questionId,
        answers: answers,
        facts: facts || {}
      });
    }
    
    // Calculate progress
    const totalQuestions = flowSpec.questions?.length || 8;
    const completionPercentage = nextQuestion ? 
      Math.round((answers.length / totalQuestions) * 100) : 100;
    
    const progress = {
      percentage: Math.min(completionPercentage, 100),
      completed: !nextQuestion
    };
    
    if (!nextQuestion) {
      // Survey completed
      await sessionRepository.updateById(sessionId, { 
        completed: true, 
        currentQuestionId: null 
      });
      
      // Generate brief using unified template system if available
      let aiBrief = null;
      let briefId = null;
      if (useAI && openai) {
        try {
          const unifiedTemplate = await unifiedTemplateService.getTemplateForSurvey(
            session.org_id, 
            session.campaign_id, 
            session.flow_id
          );
          
          if (unifiedTemplate) {
            const conversationHistory = answers.map(a => ({
              question: a.question_id,
              answer: a.text
            }));
            
            const briefResult = await unifiedTemplateService.generateBrief(
              unifiedTemplate, 
              conversationHistory, 
              sessionId
            );
            
            // Generate AI title for the brief
            let briefTitle = 'Survey Response Brief'; // fallback
            try {
              const aiTitle = await unifiedTemplateService.generateBriefTitle(conversationHistory);
              if (aiTitle) {
                briefTitle = aiTitle;
                console.log('✨ Generated AI title:', aiTitle);
              }
            } catch (titleError) {
              console.warn('⚠️ Title generation failed, using fallback:', titleError);
            }
            
            // Store brief in database
            const briefStoreResult = await pool.query(`
              INSERT INTO project_briefs (session_id, campaign_id, org_id, title, summary_md)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `, [
              sessionId,
              session.campaign_id,
              session.org_id,
              briefTitle,
              briefResult
            ]);
            
            briefId = briefStoreResult.rows[0].id;
            aiBrief = { 
              brief: briefResult,
              briefId: briefId,
              stored: true
            };
            console.log('✅ Generated and stored unified brief with ID:', briefId);
          }
        } catch (briefError) {
          console.warn('⚠️ Unified brief generation failed:', briefError);
        }
      }
      
      // Track survey completion
      await trackSurveyCompletion(sessionId, true, 'survey_completed');
      
      res.json({
        progress,
        aiBrief,
        message: 'Survey completed successfully!'
      });
    } else {
      // Track the next question in conversation history
      if (nextQuestion) {
        await trackSurveyQuestion(
          sessionId, 
          nextQuestion.id, 
          nextQuestion.text, 
          nextQuestion.type || 'text',
          {
            intent: nextQuestion.intent,
            confidence: nextQuestion.confidence,
            orgId: session.org_id
          }
        );
      }
      
      // Update session with current question
      await sessionRepository.updateById(sessionId, { current_question_id: nextQuestion.id });
      
      res.json({
        question: nextQuestion,
        progress
      });
    }
    
  } catch (error) {
    console.error('Answer processing error:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// Submit completed survey and generate brief
router.post('/sessions/:sessionId/submit', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionRepository.getSessionWithData(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all facts for this session
    const factsResult = await pool.query(
      'SELECT key, value FROM session_facts WHERE session_id = $1 AND org_id = $2',
      [sessionId, session.org_id]
    );
    
    const facts = {};
    factsResult.rows.forEach(row => {
      facts[row.key] = row.value;
    });
    
    let briefMarkdown;
    let briefTitle = facts.problem_statement || 'Survey Response'; // default fallback
    
    // Use unified template system for brief generation
    if (useAI && openai) {
      try {
        console.log('🚀 Using unified template system for brief generation...');
        
        const unifiedTemplate = await unifiedTemplateService.getTemplateForSurvey(
          session.org_id, 
          session.campaign_id, 
          session.flow_id
        );
        
        if (unifiedTemplate) {
          // Try enhanced brief generation first
          try {
            briefMarkdown = await enhancedUnifiedTemplateService.generateBrief(
              unifiedTemplate, 
              [], // Enhanced service builds its own conversation history
              sessionId
            );
            console.log('✅ Generated enhanced brief with full conversation context');
          } catch (enhancedError) {
            console.warn('⚠️ Enhanced brief generation failed, using fallback:', enhancedError.message);
            
            // Fallback to basic unified system
            const answersResult = await pool.query(
              'SELECT question_id, text FROM answers WHERE session_id = $1 ORDER BY created_at',
              [sessionId]
            );
            
            const conversationHistory = answersResult.rows.map(a => ({
              question: a.question_id,
              answer: a.text
            }));
            
            briefMarkdown = await unifiedTemplateService.generateBrief(
              unifiedTemplate, 
              conversationHistory, 
              sessionId
            );
          }
          
          // Generate AI title for the brief
          try {
            const aiTitle = await unifiedTemplateService.generateBriefTitle(conversationHistory);
            if (aiTitle) {
              briefTitle = aiTitle;
              console.log('✨ Generated AI title:', aiTitle);
            }
          } catch (titleError) {
            console.warn('⚠️ Title generation failed, using fallback:', titleError);
          }
          
          console.log('✅ Unified brief generated successfully');
        } else {
          throw new Error('No unified template found');
        }
      } catch (unifiedError) {
        console.warn('⚠️ Unified brief generation failed, using fallback:', unifiedError.message);
        briefMarkdown = `# Survey Response Summary\n\n${Object.entries(facts).map(([k, v]) => `**${k}**: ${v}`).join('\n\n')}`;
      }
    } else {
      // Fallback to simple facts summary
      briefMarkdown = `# Survey Response Summary\n\n${Object.entries(facts).map(([k, v]) => `**${k}**: ${v}`).join('\n\n')}`;
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
      briefTitle,
      briefMarkdown
    ]);
    
    const briefId = briefResult.rows[0].id;
    
    // Track survey completion
    await trackSurveyCompletion(sessionId, true, 'survey_submitted');
    
    res.json({
      briefMarkdown,
      stored: true,
      briefId,
      message: 'Survey completed successfully!'
    });
    
  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

// Update session with user email
router.post('/sessions/:sessionId/email', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    await updateSession(sessionId, { user_email: email });
    
    res.json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Email update error:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// Get survey template for token (for frontend compatibility)
router.get('/surveys/:token/template', validateSurveyToken, async (req, res) => {
  try {
    const { campaignName, flowSpec, campaignId, flowId, orgId } = req.surveyContext;
    
    // Get unified template
    const unifiedTemplate = await unifiedTemplateService.getTemplateForSurvey(orgId, campaignId, flowId);
    
    if (unifiedTemplate) {
      // Convert unified template to frontend-expected format
      const templateResponse = {
        id: unifiedTemplate.id,
        name: unifiedTemplate.name,
        description: unifiedTemplate.description,
        template_type: unifiedTemplate.template_type,
        settings: {
          survey_theme: 'professional',
          survey_primary_color: unifiedTemplate.appearance_config?.colors?.primary || '#2563eb',
          survey_background_color: '#ffffff',
          survey_font_family: 'Inter, Arial, sans-serif',
          survey_welcome_message: `Welcome to ${campaignName}! Thank you for taking the time to provide your feedback.`,
          survey_completion_message: 'Thank you for completing our survey! Your responses have been recorded.',
          survey_show_logo: unifiedTemplate.appearance_config?.branding?.show_logo !== false,
          survey_show_progress: true,
          survey_smooth_transitions: true
        }
      };
      
      res.json(templateResponse);
    } else {
      // Return default template
      res.json({
        id: null,
        name: 'Default Template',
        description: 'Default survey template',
        template_type: 'static',
        settings: {
          survey_theme: 'professional',
          survey_primary_color: '#2563eb',
          survey_background_color: '#ffffff',
          survey_font_family: 'Inter, Arial, sans-serif',
          survey_welcome_message: `Welcome to ${campaignName}! Thank you for taking the time to provide your feedback.`,
          survey_completion_message: 'Thank you for completing our survey! Your responses have been recorded.',
          survey_show_logo: true,
          survey_show_progress: true,
          survey_smooth_transitions: true
        }
      });
    }
  } catch (error) {
    console.error('Template fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create new session (frontend compatibility)
router.post('/surveys/:token/sessions', validateSurveyToken, async (req, res) => {
  try {
    const { campaignId, flowId, orgId, linkId, campaignName, flowSpec } = req.surveyContext;
    
    // Generate session ID
    const sessionId = `pub_${crypto.randomBytes(8).toString('hex')}`;
    
    const session = await sessionRepository.createCampaignSession({
      id: sessionId,
      orgId,
      campaignId,
      flowId,
      linkId
    });
    
    // Get first question for the new session
    let firstQuestion = null;
    
    if (useAI && openai) {
      try {
        console.log('🚀 Getting first question for new session...');
        
        const unifiedTemplate = await unifiedTemplateService.getTemplateForSurvey(orgId, campaignId, flowId);
        
        if (unifiedTemplate && ['ai_dynamic', 'hybrid'].includes(unifiedTemplate.template_type)) {
          console.log(`🎯 Found ${unifiedTemplate.template_type} template:`, unifiedTemplate.name);
          
          const questionResult = await unifiedTemplateService.generateAIQuestion(unifiedTemplate, [], sessionId);
          
          if (questionResult && questionResult.question_text) {
            firstQuestion = {
              id: 'unified_q1',
              text: questionResult.question_text,
              type: questionResult.question_type || 'text'
            };
            console.log('✨ Generated unified first question for session:', questionResult.question_text);
          }
        }
      } catch (error) {
        console.error('❌ Unified template first question failed:', error);
      }
    }
    
    // Fallback to flow questions if no unified template
    if (!firstQuestion) {
      console.log('📋 Using predefined first question from flow for session');
      firstQuestion = getNextQuestion(flowSpec, {
        current_question_id: null,
        answers: [],
        facts: {}
      });
    }
    
    if (!firstQuestion) {
      return res.status(400).json({ error: 'No questions available for this survey' });
    }

    // Track the first question in conversation history
    try {
      await trackSurveyQuestion(
        sessionId, 
        firstQuestion.id, 
        firstQuestion.text, 
        firstQuestion.type || 'text',
        {
          intent: firstQuestion.intent,
          confidence: firstQuestion.confidence,
          orgId: orgId
        }
      );
    } catch (trackingError) {
      console.warn('⚠️ Failed to track first question:', trackingError.message);
    }
    
    res.json({ 
      sessionId: session.id,
      campaignName,
      question: firstQuestion,
      progress: {
        percentage: 0,
        completed: false
      }
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session status
router.get('/sessions/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionRepository.getSessionWithData(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      id: session.id,
      completed: session.completed || false,
      created_at: session.created_at
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

// Get general survey info
router.get('/surveys/:token', validateSurveyToken, async (req, res) => {
  try {
    const { campaignName, flowSpec, campaignId, flowId, orgId } = req.surveyContext;
    
    res.json({
      campaignName,
      campaignId,
      flowId,
      orgId,
      totalQuestions: flowSpec?.questions?.length || 5
    });
  } catch (error) {
    console.error('Survey info error:', error);
    res.status(500).json({ error: 'Failed to get survey info' });
  }
});

export default router;
