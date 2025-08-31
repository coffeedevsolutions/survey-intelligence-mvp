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
} from '../config/database.js';
import {
  getNextQuestion,
  extractFactsFromAnswer,
  renderTemplate,
  AI_PROMPTS,
  parseAIResponse,
  getCompletionPercentage
} from '../services/adaptiveEngine.js';
import { getTemplateForSurvey } from '../config/database.js';

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
      useAI: surveyLink.use_ai,
      campaignTemplateId: surveyLink.campaign_template_id,
      flowTemplateId: surveyLink.flow_template_id
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

// Get survey template for a given token
router.get('/surveys/:token/template', validateSurveyToken, async (req, res) => {
  try {
    const { orgId, campaignId, flowId, campaignTemplateId, flowTemplateId } = req.surveyContext;
    
    console.log('🎨 Fetching template for survey:', { 
      orgId, campaignId, flowId, campaignTemplateId, flowTemplateId 
    });
    
    // Get the template for this survey
    const template = await getTemplateForSurvey(orgId, campaignId, flowId);
    
    console.log('🎨 Retrieved template:', template ? { 
      id: template.id, 
      name: template.name, 
      settings: template.settings 
    } : 'null');
    
    res.json({ template });
    
  } catch (error) {
    console.error('Error fetching survey template:', error);
    res.status(500).json({ error: 'Failed to load survey template' });
  }
});

// Serve styled survey for a given token
router.get('/surveys/:token', validateSurveyToken, async (req, res) => {
  try {
    const { orgId, campaignId, flowId, campaignName } = req.surveyContext;
    
    // Get the template for this survey
    const template = await getTemplateForSurvey(orgId, campaignId, flowId);
    
    // Generate survey HTML with template styling
    const surveyHTML = generateSurveyHTML(req.surveyContext, template);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(surveyHTML);
    
  } catch (error) {
    console.error('Error serving styled survey:', error);
    res.status(500).json({ error: 'Failed to load survey' });
  }
});

// Survey preview endpoint for organization settings
router.get('/preview', async (req, res) => {
  try {
    const { preview, orgId, settings } = req.query;
    
    if (!preview || !orgId) {
      return res.status(400).json({ error: 'Preview mode and orgId required' });
    }
    
    let parsedSettings = {};
    if (settings) {
      try {
        parsedSettings = JSON.parse(settings);
      } catch (err) {
        console.warn('Failed to parse settings for preview:', err);
      }
    }
    
    // Generate preview HTML with current settings
    const previewHTML = generateSurveyPreviewHTML(parsedSettings);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(previewHTML);
    
  } catch (error) {
    console.error('Error generating survey preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

function generateSurveyHTML(surveyContext, template) {
  const { campaignName, token } = surveyContext;
  const settings = template?.settings || {};
  
  const theme = settings.survey_theme || 'professional';
  const primaryColor = settings.survey_primary_color || '#1f2937';
  const backgroundColor = settings.survey_background_color || '#ffffff';
  const fontFamily = settings.survey_font_family || 'Inter, Arial, sans-serif';
  const companyName = settings.company_name || campaignName;
  const logoUrl = settings.logo_url;
  const welcomeMessage = settings.survey_welcome_message || 'Welcome! Thank you for taking the time to provide your feedback.';
  const showLogo = settings.survey_show_logo !== false;
  const showProgress = settings.survey_show_progress !== false;
  const smoothTransitions = settings.survey_smooth_transitions !== false;
  
  // Theme-specific styles
  const themeStyles = {
    professional: `
      .survey-container {
        background: white;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .question-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
      }
    `,
    modern: `
      .survey-container {
        background: linear-gradient(135deg, ${backgroundColor} 0%, ${primaryColor}10 100%);
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }
      .question-card {
        background: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
    `,
    minimal: `
      .survey-container {
        background: #fafafa;
        border: none;
      }
      .question-card {
        background: white;
        border: 1px solid #f0f0f0;
      }
    `,
    friendly: `
      .survey-container {
        background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
        border: 1px solid #e0f2fe;
      }
      .question-card {
        background: white;
        border: 1px solid #bfdbfe;
      }
    `
  };
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${campaignName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${fontFamily};
      background-color: ${backgroundColor};
      color: #1f2937;
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .survey-container {
      max-width: 600px;
      width: 100%;
      border-radius: 12px;
      padding: 32px;
      ${smoothTransitions ? 'transition: all 0.3s ease;' : ''}
    }
    
    ${themeStyles[theme] || themeStyles.professional}
    
    .logo-section {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .logo {
      max-height: 60px;
      margin-bottom: 16px;
    }
    
    .company-name {
      font-size: 1.5rem;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 8px;
    }
    
    .campaign-title {
      font-size: 1.25rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .welcome-message {
      font-size: 1.1rem;
      color: #6b7280;
      margin-bottom: 32px;
      text-align: center;
    }
    
    .loading-container {
      text-align: center;
      padding: 40px;
    }
    
    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid ${primaryColor};
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .start-button {
      background: ${primaryColor};
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 1.1rem;
      font-weight: 500;
      cursor: pointer;
      ${smoothTransitions ? 'transition: all 0.2s ease;' : ''}
    }
    
    .start-button:hover {
      background: ${primaryColor}dd;
      transform: translateY(-1px);
    }
    
    .progress-bar {
      background: #f3f4f6;
      height: 8px;
      border-radius: 4px;
      margin-bottom: 24px;
      overflow: hidden;
      display: none;
    }
    
    .progress-fill {
      background: ${primaryColor};
      height: 100%;
      width: 0%;
      border-radius: 4px;
      ${smoothTransitions ? 'transition: width 0.3s ease;' : ''}
    }
    
    .question-container {
      display: none;
    }
    
    .question-card {
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .question-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: ${primaryColor};
    }
    
    .question-input, .question-textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      font-size: 1rem;
      font-family: inherit;
      ${smoothTransitions ? 'transition: border-color 0.2s ease;' : ''}
    }
    
    .question-input:focus, .question-textarea:focus {
      outline: none;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 3px ${primaryColor}20;
    }
    
    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 32px;
    }
    
    .btn {
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      border: 2px solid;
      ${smoothTransitions ? 'transition: all 0.2s ease;' : ''}
    }
    
    .btn-primary {
      background: ${primaryColor};
      color: white;
      border-color: ${primaryColor};
    }
    
    .btn-primary:hover {
      background: ${primaryColor}dd;
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      background: transparent;
      color: ${primaryColor};
      border-color: ${primaryColor};
    }
    
    .btn-secondary:hover {
      background: ${primaryColor}10;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="survey-container">
    ${showLogo && (logoUrl || companyName) ? `
      <div class="logo-section">
        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName} Logo" class="logo">` : ''}
        <div class="company-name">${companyName}</div>
      </div>
    ` : ''}
    
    <div class="campaign-title">${campaignName}</div>
    <div class="welcome-message">${welcomeMessage}</div>
    
    ${showProgress ? `
      <div class="progress-bar" id="progressBar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div id="progressText" style="text-align: center; font-size: 0.9rem; color: #6b7280; margin-bottom: 24px; display: none;">
        0% Complete
      </div>
    ` : ''}
    
    <div class="loading-container" id="loadingContainer">
      <div class="spinner"></div>
      <p>Loading survey...</p>
    </div>
    
    <div class="question-container" id="questionContainer">
      <div class="question-card">
        <div class="question-title" id="questionTitle">Question will appear here</div>
        <div id="questionContent">
          <textarea 
            class="question-textarea" 
            id="questionInput"
            rows="4" 
            placeholder="Type your response here..."
          ></textarea>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="btn btn-secondary" id="prevButton" style="display: none;">Previous</button>
        <button class="btn btn-primary" id="nextButton">Continue</button>
      </div>
    </div>
  </div>
  
  <script>
    // Survey state
    let currentSession = null;
    let currentQuestion = null;
    let isFirstQuestion = true;
    
    // API endpoints
    const API_BASE = '/public';
    const SURVEY_TOKEN = '${token}';
    
    // Initialize survey
    document.addEventListener('DOMContentLoaded', function() {
      bootstrapSurvey();
    });
    
    async function bootstrapSurvey() {
      try {
        const response = await fetch(\`\${API_BASE}/surveys/\${SURVEY_TOKEN}/bootstrap\`);
        const data = await response.json();
        
        if (data.firstQuestion) {
          showQuestion(data.firstQuestion);
          hideLoading();
        } else {
          showError('No questions configured for this survey');
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
        showError('Failed to load survey');
      }
    }
    
    async function createSession() {
      try {
        const response = await fetch(\`\${API_BASE}/surveys/\${SURVEY_TOKEN}/sessions\`, {
          method: 'POST'
        });
        const data = await response.json();
        currentSession = data.sessionId;
        return data;
      } catch (error) {
        console.error('Session creation error:', error);
        throw error;
      }
    }
    
    async function submitAnswer(questionId, text) {
      if (!currentSession) {
        const sessionData = await createSession();
        currentQuestion = sessionData.question;
        updateProgress(sessionData.progress);
      }
      
      try {
        const response = await fetch(\`\${API_BASE}/sessions/\${currentSession}/answer\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            questionId: questionId,
            text: text
          })
        });
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Answer submission error:', error);
        throw error;
      }
    }
    
    function showQuestion(question) {
      currentQuestion = question;
      document.getElementById('questionTitle').textContent = question.text;
      document.getElementById('questionInput').value = '';
      document.getElementById('questionInput').focus();
      
      // Update progress visibility
      ${showProgress ? `
        document.getElementById('progressBar').style.display = 'block';
        document.getElementById('progressText').style.display = 'block';
      ` : ''}
    }
    
    function hideLoading() {
      document.getElementById('loadingContainer').style.display = 'none';
      document.getElementById('questionContainer').style.display = 'block';
    }
    
    function updateProgress(progress) {
      ${showProgress ? `
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill && progressText) {
          progressFill.style.width = progress.percentage + '%';
          progressText.textContent = Math.round(progress.percentage) + '% Complete';
        }
      ` : ''}
    }
    
    function showError(message) {
      document.getElementById('loadingContainer').innerHTML = \`
        <div style="color: #dc2626; text-align: center;">
          <p>\${message}</p>
          <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Try Again
          </button>
        </div>
      \`;
    }
    
    // Next button handler
    document.getElementById('nextButton').addEventListener('click', async function() {
      const answer = document.getElementById('questionInput').value.trim();
      
      if (!answer) {
        alert('Please provide an answer before continuing.');
        return;
      }
      
      const button = this;
      button.disabled = true;
      button.textContent = 'Processing...';
      
      try {
        const result = await submitAnswer(currentQuestion.id, answer);
        
        if (result.completed) {
          // Survey completed
          window.location.href = \`\${API_BASE}/sessions/\${currentSession}/completion\`;
        } else if (result.nextQuestion) {
          showQuestion(result.nextQuestion);
          updateProgress(result.progress);
          isFirstQuestion = false;
        } else {
          showError('Survey flow error');
        }
      } catch (error) {
        showError('Failed to submit answer. Please try again.');
      } finally {
        button.disabled = false;
        button.textContent = 'Continue';
      }
    });
    
    // Enter key handler
    document.getElementById('questionInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        document.getElementById('nextButton').click();
      }
    });
  </script>
</body>
</html>`;
}

function generateSurveyPreviewHTML(settings) {
  const theme = settings.survey_theme || 'professional';
  const primaryColor = settings.survey_primary_color || settings.primary_color || '#1f2937';
  const backgroundColor = settings.survey_background_color || '#ffffff';
  const fontFamily = settings.survey_font_family || settings.font_family || 'Inter, Arial, sans-serif';
  const companyName = settings.company_name || 'Your Company';
  const logoUrl = settings.logo_url;
  const welcomeMessage = settings.survey_welcome_message || 'Welcome! Thank you for taking the time to provide your feedback.';
  const showLogo = settings.survey_show_logo !== false;
  const showProgress = settings.survey_show_progress !== false;
  const smoothTransitions = settings.survey_smooth_transitions !== false;
  
  // Theme-specific styles
  const themeStyles = {
    professional: `
      .survey-container {
        background: white;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .question-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
      }
    `,
    modern: `
      .survey-container {
        background: linear-gradient(135deg, ${backgroundColor} 0%, ${primaryColor}10 100%);
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }
      .question-card {
        background: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
    `,
    minimal: `
      .survey-container {
        background: #fafafa;
        border: none;
      }
      .question-card {
        background: white;
        border: 1px solid #f0f0f0;
      }
    `,
    friendly: `
      .survey-container {
        background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
        border: 1px solid #e0f2fe;
      }
      .question-card {
        background: white;
        border: 1px solid #bfdbfe;
      }
    `
  };
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Survey Preview - ${companyName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${fontFamily};
      background-color: ${backgroundColor};
      color: #1f2937;
      line-height: 1.6;
      padding: 20px;
    }
    
    .survey-container {
      max-width: 600px;
      margin: 0 auto;
      border-radius: 12px;
      padding: 32px;
      ${smoothTransitions ? 'transition: all 0.3s ease;' : ''}
    }
    
    ${themeStyles[theme] || themeStyles.professional}
    
    .logo-section {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .logo {
      max-height: 60px;
      margin-bottom: 16px;
    }
    
    .company-name {
      font-size: 1.5rem;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 8px;
    }
    
    .welcome-message {
      font-size: 1.1rem;
      color: #6b7280;
      margin-bottom: 32px;
      text-align: center;
    }
    
    .progress-bar {
      background: #f3f4f6;
      height: 8px;
      border-radius: 4px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    
    .progress-fill {
      background: ${primaryColor};
      height: 100%;
      width: 30%;
      border-radius: 4px;
      ${smoothTransitions ? 'transition: width 0.3s ease;' : ''}
    }
    
    .question-card {
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .question-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: ${primaryColor};
    }
    
    .question-input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      font-size: 1rem;
      font-family: inherit;
      ${smoothTransitions ? 'transition: border-color 0.2s ease;' : ''}
    }
    
    .question-input:focus {
      outline: none;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 3px ${primaryColor}20;
    }
    
    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 32px;
    }
    
    .btn {
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      ${smoothTransitions ? 'transition: all 0.2s ease;' : ''}
    }
    
    .btn-primary {
      background: ${primaryColor};
      color: white;
      border: 2px solid ${primaryColor};
    }
    
    .btn-primary:hover {
      background: ${primaryColor}dd;
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      background: transparent;
      color: ${primaryColor};
      border: 2px solid ${primaryColor};
    }
    
    .btn-secondary:hover {
      background: ${primaryColor}10;
    }
    
    .preview-banner {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      margin-bottom: 24px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="survey-container">
    <div class="preview-banner">
      🎨 Survey Appearance Preview - This is how your surveys will look to respondents
    </div>
    
    ${showLogo && (logoUrl || companyName) ? `
      <div class="logo-section">
        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName} Logo" class="logo">` : ''}
        <div class="company-name">${companyName}</div>
      </div>
    ` : ''}
    
    <div class="welcome-message">
      ${welcomeMessage}
    </div>
    
    ${showProgress ? `
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div style="text-align: center; font-size: 0.9rem; color: #6b7280; margin-bottom: 24px;">
        30% Complete
      </div>
    ` : ''}
    
    <div class="question-card">
      <div class="question-title">What is your primary business objective?</div>
      <textarea 
        class="question-input" 
        rows="4" 
        placeholder="Please describe your main business goal or challenge..."
      ></textarea>
    </div>
    
    <div class="question-card">
      <div class="question-title">How would you rate your current satisfaction?</div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        ${[1, 2, 3, 4, 5].map(num => `
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="radio" name="satisfaction" value="${num}" style="accent-color: ${primaryColor};">
            <span>${num}</span>
          </label>
        `).join('')}
      </div>
    </div>
    
    <div class="action-buttons">
      <button class="btn btn-secondary">Previous</button>
      <button class="btn btn-primary">Continue</button>
    </div>
  </div>
  
  <script>
    // Add some interactivity for the preview
    document.querySelectorAll('.question-input, input[type="radio"]').forEach(input => {
      input.addEventListener('change', () => {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
          const currentWidth = parseInt(progressFill.style.width) || 30;
          progressFill.style.width = Math.min(currentWidth + 10, 90) + '%';
        }
      });
    });
    
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.style.transform = 'scale(0.98)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 100);
      });
    });
  </script>
</body>
</html>`;
}

export default router;
