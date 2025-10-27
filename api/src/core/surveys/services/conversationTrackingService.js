/**
 * Comprehensive Conversation Tracking Service
 * Provides robust AI context understanding and question deduplication
 */

import { pool } from '../../../database/connection.js';
import { OpenAI } from 'openai';
import { getCompletionLogic, getSurveyTypeConfig, getPromptEnhancement, getAnalysisDirectives, getValidationRules } from '../../../config/surveyTypeConfig.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Simple embedding generation (fallback if OpenAI not available)
 */
function generateSimpleEmbedding(text) {
  // Simple hash-based embedding for basic similarity
  const words = text.toLowerCase().split(/\s+/);
  const vector = new Array(50).fill(0);
  
  words.forEach((word, i) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    vector[Math.abs(hash) % 50] += 1;
  });
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
}

/**
 * Generate embedding for question text
 */
async function generateQuestionEmbedding(questionText) {
  if (!openai) {
    return generateSimpleEmbedding(questionText);
  }
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: questionText,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.warn('OpenAI embedding failed, using simple embedding:', error.message);
    return generateSimpleEmbedding(questionText);
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
function calculateCosineSimilarity(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) return 0;
  
  const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Initialize conversation tracking for a session
 */
export async function initializeConversationTracking(sessionId, surveyType = 'general') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Initialize conversation state with survey type metadata
    await client.query(`
      INSERT INTO conversation_state (session_id, current_turn, completion_percentage, should_continue, metadata)
      VALUES ($1, 0, 0.0, true, $2)
      ON CONFLICT (session_id) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
    `, [sessionId, JSON.stringify({ survey_type: surveyType })]);
    
    await client.query('COMMIT');
    console.log(`✅ Initialized conversation tracking for session ${sessionId} with survey type: ${surveyType}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing conversation tracking:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Store a question and generate embedding
 */
export async function storeQuestionWithContext(sessionId, turnNumber, questionId, questionText, questionMetadata = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Store in conversation history
    await client.query(`
      INSERT INTO conversation_history 
      (session_id, turn_number, question_id, question_text, question_type, question_metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [sessionId, turnNumber, questionId, questionText, questionMetadata.type || 'text', questionMetadata]);
    
    // Generate and store embedding
    const embedding = await generateQuestionEmbedding(questionText);
    const similarityHash = questionText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).sort().join('');
    
    await client.query(`
      INSERT INTO question_embeddings (session_id, question_text, embedding_vector, similarity_hash)
      VALUES ($1, $2, $3, $4)
    `, [sessionId, questionText, embedding, similarityHash]);
    
    await client.query('COMMIT');
    console.log(`📝 Stored question for turn ${turnNumber}: ${questionText.substring(0, 50)}...`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error storing question:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Store answer and extract AI insights
 */
export async function storeAnswerWithAIAnalysis(sessionId, turnNumber, answerText, answerMetadata = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get the question for this turn
    const questionResult = await client.query(`
      SELECT question_text, question_metadata 
      FROM conversation_history 
      WHERE session_id = $1 AND turn_number = $2
    `, [sessionId, turnNumber]);
    
    if (!questionResult.rowCount) {
      throw new Error(`No question found for session ${sessionId} turn ${turnNumber}`);
    }
    
    const questionText = questionResult.rows[0].question_text;
    
    // Analyze answer with AI if available
    let aiAnalysis = {};
    let extractedInsights = [];
    
    if (openai) {
      try {
        aiAnalysis = await analyzeAnswerWithAI(questionText, answerText);
        extractedInsights = aiAnalysis.insights || [];
      } catch (error) {
        console.warn('AI analysis failed:', error.message);
        aiAnalysis = { error: error.message };
      }
    }
    
    // Update conversation history with answer
    await client.query(`
      UPDATE conversation_history 
      SET answer_text = $1, answer_metadata = $2, ai_analysis = $3, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $4 AND turn_number = $5
    `, [answerText, answerMetadata, aiAnalysis, sessionId, turnNumber]);
    
    // Store extracted insights
    for (const insight of extractedInsights) {
      await client.query(`
        INSERT INTO ai_conversation_insights 
        (session_id, insight_type, insight_value, confidence, turn_number, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [sessionId, insight.type, insight.value, insight.confidence, turnNumber, insight.metadata || {}]);
    }
    
    // Update conversation state
    await updateConversationState(client, sessionId, aiAnalysis);
    
    await client.query('COMMIT');
    console.log(`💡 Stored answer and extracted ${extractedInsights.length} insights for turn ${turnNumber}`);
    
    return { aiAnalysis, extractedInsights };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error storing answer with AI analysis:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Analyze answer with AI to extract insights
 */
async function analyzeAnswerWithAI(questionText, answerText) {
  if (!openai) {
    return { insights: [] };
  }
  
  const systemPrompt = `You are an expert business analyst analyzing survey responses. Extract structured insights from Q&A pairs.

Your task is to identify and categorize information from the user's answer. Return a JSON object with these fields:

{
  "insights": [
    {
      "type": "topic_extracted|requirement_identified|kpi_mentioned|stakeholder_identified|pain_point_discussed|timeline_mentioned|budget_discussed|solution_suggested",
      "value": "brief description of the insight",
      "confidence": 0.0-1.0,
      "metadata": { "additional_context": "any relevant details" }
    }
  ],
  "topics_covered": ["list", "of", "topics"],
  "completeness_assessment": {
    "has_problem_statement": true/false,
    "has_requirements": true/false,
    "has_stakeholders": true/false,
    "has_kpis": true/false,
    "has_timeline": true/false,
    "overall_completeness": 0.0-1.0
  },
  "suggested_follow_up_areas": ["area1", "area2"]
}

Focus on extracting concrete business information, not just acknowledging that topics were mentioned.`;

  const userPrompt = `Question: ${questionText}

Answer: ${answerText}

Analyze this Q&A pair and extract structured business insights.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    const analysis = JSON.parse(response.choices[0].message.content);
    return analysis;
  } catch (error) {
    console.error('AI analysis error:', error);
    return { insights: [], error: error.message };
  }
}

/**
 * Update conversation state based on AI analysis
 */
async function updateConversationState(client, sessionId, aiAnalysis) {
  const insights = aiAnalysis.insights || [];
  const completeness = aiAnalysis.completeness_assessment || {};
  
  // Extract topics and categories
  const topicInsights = insights.filter(i => i.type === 'topic_extracted');
  const kpiInsights = insights.filter(i => i.type === 'kpi_mentioned');
  const stakeholderInsights = insights.filter(i => i.type === 'stakeholder_identified');
  const painPointInsights = insights.filter(i => i.type === 'pain_point_discussed');
  
  // Update conversation state
  await client.query(`
    UPDATE conversation_state 
    SET 
      current_turn = current_turn + 1,
      topics_covered = array_cat(topics_covered, $1::text[]),
      kpis_mentioned = jsonb_concat(kpis_mentioned, $2::jsonb),
      stakeholders_identified = jsonb_concat(stakeholders_identified, $3::jsonb),
      pain_points_discussed = jsonb_concat(pain_points_discussed, $4::jsonb),
      completion_percentage = $5,
      ai_confidence = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE session_id = $7
  `, [
    topicInsights.map(i => i.value),
    JSON.stringify(kpiInsights.map(i => ({ value: i.value, confidence: i.confidence }))),
    JSON.stringify(stakeholderInsights.map(i => ({ value: i.value, confidence: i.confidence }))),
    JSON.stringify(painPointInsights.map(i => ({ value: i.value, confidence: i.confidence }))),
    completeness.overall_completeness || 0.0,
    aiAnalysis.confidence || 0.5,
    sessionId
  ]);
}

/**
 * Check for question similarity to prevent repetition with intent-aware deduplication
 */
export async function checkQuestionSimilarity(sessionId, proposedQuestionText, similarityThreshold = 0.85, proposedIntent = null) {
  const client = await pool.connect();
  try {
    // Import config for intent cooldowns
    const { OPTIMIZATION_CONFIG } = await import('../../../config/surveyOptimization.js');
    const templatesConfig = OPTIMIZATION_CONFIG.TEMPLATES;
    
    // First check intent cooldowns if intent is provided
    if (proposedIntent) {
      const recentIntents = await client.query(`
        SELECT question_metadata->>'intent' as intent, created_at
        FROM conversation_history 
        WHERE session_id = $1 
        AND question_metadata->>'intent' IS NOT NULL
        ORDER BY created_at DESC 
        LIMIT ${templatesConfig.SEMANTIC_HISTORY_SIZE || 5}
      `, [sessionId]);
      
      // Check for intent cooldown violations
      const intentCounts = {};
      const recentTurns = recentIntents.rows.length;
      
      recentIntents.rows.forEach((row, index) => {
        const intent = row.intent;
        if (intent) {
          intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        }
      });
      
      // Check if this intent has been asked too recently
      const maxAsksPerSlot = templatesConfig.MAX_ASKS_PER_SLOT || 2;
      const topicStreakLimit = templatesConfig.TOPIC_STREAK_LIMIT || 2;
      
      if (intentCounts[proposedIntent] >= maxAsksPerSlot) {
        console.log(`🚫 Intent cooldown: ${proposedIntent} asked ${intentCounts[proposedIntent]} times recently`);
        return { 
          isSimilar: true, 
          maxSimilarity: 1.0, 
          mostSimilarQuestion: `Intent: ${proposedIntent}`,
          threshold: similarityThreshold,
          reason: 'intent_cooldown'
        };
      }
      
      // Check for topic streak (same intent in recent turns)
      const recentIntentsList = recentIntents.rows.slice(0, topicStreakLimit).map(r => r.intent);
      const streakCount = recentIntentsList.filter(intent => intent === proposedIntent).length;
      
      if (streakCount >= topicStreakLimit) {
        console.log(`🚫 Topic streak limit: ${proposedIntent} asked ${streakCount} times in recent turns`);
        return { 
          isSimilar: true, 
          maxSimilarity: 1.0, 
          mostSimilarQuestion: `Intent streak: ${proposedIntent}`,
          threshold: similarityThreshold,
          reason: 'topic_streak_limit'
        };
      }
    }
    
    // If intent checks pass, proceed with semantic similarity check
    const recentQuestions = await client.query(`
      SELECT qe.question_text, qe.embedding_vector, ch.question_metadata->>'intent' as intent
      FROM question_embeddings qe
      LEFT JOIN conversation_history ch ON qe.session_id = ch.session_id AND qe.question_text = ch.question_text
      WHERE qe.session_id = $1 
      ORDER BY qe.created_at DESC 
      LIMIT ${templatesConfig.SEMANTIC_HISTORY_SIZE || 5}
    `, [sessionId]);
    
    if (recentQuestions.rowCount === 0) {
      return { isSimilar: false, maxSimilarity: 0 };
    }
    
    // Generate embedding for proposed question
    const proposedEmbedding = await generateQuestionEmbedding(proposedQuestionText);
    
    // Calculate similarities
    let maxSimilarity = 0;
    let mostSimilarQuestion = null;
    let mostSimilarIntent = null;
    
    for (const row of recentQuestions.rows) {
      const similarity = calculateCosineSimilarity(proposedEmbedding, row.embedding_vector);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarQuestion = row.question_text;
        mostSimilarIntent = row.intent;
      }
    }
    
    const isSimilar = maxSimilarity > similarityThreshold;
    
    if (isSimilar) {
      console.log(`🔄 Semantic similarity detected: ${maxSimilarity.toFixed(3)} with "${mostSimilarQuestion}" (intent: ${mostSimilarIntent})`);
    }
    
    return { 
      isSimilar, 
      maxSimilarity, 
      mostSimilarQuestion,
      mostSimilarIntent,
      threshold: similarityThreshold,
      reason: isSimilar ? 'semantic_similarity' : null
    };
  } finally {
    client.release();
  }
}

/**
 * Get comprehensive conversation context for AI
 */
export async function getConversationContext(sessionId) {
  const client = await pool.connect();
  try {
    // Get conversation history
    const historyResult = await client.query(`
      SELECT turn_number, question_text, answer_text, ai_analysis
      FROM conversation_history 
      WHERE session_id = $1 
      ORDER BY turn_number ASC
    `, [sessionId]);
    
    // Get conversation state
    const stateResult = await client.query(`
      SELECT * FROM conversation_state WHERE session_id = $1
    `, [sessionId]);
    
    // Get insights summary
    const insightsResult = await client.query(`
      SELECT insight_type, insight_value, confidence 
      FROM ai_conversation_insights 
      WHERE session_id = $1 
      ORDER BY confidence DESC, created_at DESC
    `, [sessionId]);
    
    const conversationHistory = historyResult.rows.map(row => ({
      turn: row.turn_number,
      question: row.question_text,
      answer: row.answer_text,
      analysis: row.ai_analysis
    }));
    
    const conversationState = stateResult.rows[0] || {};
    const insights = insightsResult.rows;
    
    // Group insights by type
    const insightsByType = {};
    insights.forEach(insight => {
      if (!insightsByType[insight.insight_type]) {
        insightsByType[insight.insight_type] = [];
      }
      insightsByType[insight.insight_type].push({
        value: insight.insight_value,
        confidence: insight.confidence
      });
    });
    
    return {
      conversationHistory,
      conversationState,
      insights,
      insightsByType,
      completionPercentage: conversationState.completion_percentage || 0,
      shouldContinue: conversationState.should_continue !== false
    };
  } finally {
    client.release();
  }
}

/**
 * Determine if conversation should continue based on comprehensive analysis
 */
export async function shouldContinueConversation(sessionId, minCompleteness = 0.8, maxTurns = 10) {
  const context = await getConversationContext(sessionId);
  const { conversationState, conversationHistory, insightsByType } = context;
  
  // Get survey type from template (if available)
  const surveyType = conversationState.metadata?.survey_type || 'general';
  const surveyConfig = getSurveyTypeConfig(surveyType);
  const completionLogic = getCompletionLogic(surveyType);
  const validationRules = getValidationRules(surveyType);
  
  // Use maxQuestions from completion config if available, otherwise use passed parameter
  const effectiveMaxTurns = completionLogic.maxQuestions || maxTurns;
  
  // Check hard limits - use current_turn from state instead of history length
  // to avoid counting uncompleted entries or duplicates
  const currentTurn = conversationState.current_turn || 0;
  if (currentTurn >= effectiveMaxTurns) {
    console.log(`🔚 Max turns reached: ${currentTurn}/${effectiveMaxTurns} (completeness: ${(conversationState.completion_percentage || 0) * 100}%)`);
    return { 
      shouldContinue: false, 
      reason: 'max_turns_reached',
      completeness: conversationState.completion_percentage || 0
    };
  }
  
  if (conversationHistory.length < 3) {
    return { 
      shouldContinue: true, 
      reason: 'min_turns_not_met',
      completeness: conversationState.completion_percentage || 0
    };
  }
  
  // Check validation rules - ensure required insights are captured
  if (validationRules.requiredInsights && validationRules.requiredInsights.length > 0) {
    const collectedInsights = Object.keys(insightsByType).filter(key => 
      insightsByType[key] && insightsByType[key].length > 0
    );
    const hasRequiredInsights = validationRules.requiredInsights.every(required =>
      collectedInsights.some(collected => 
        collected.toLowerCase().includes(required.toLowerCase()) || 
        collected.toLowerCase() === required.toLowerCase()
      )
    );
    
    if (!hasRequiredInsights && conversationHistory.length >= 3) {
      // Need to continue to gather required insights
      const missingInsights = validationRules.requiredInsights.filter(required =>
        !collectedInsights.some(collected => 
          collected.toLowerCase().includes(required.toLowerCase())
        )
      );
      return {
        shouldContinue: true,
        reason: 'required_insights_missing',
        missingInsights,
        completeness: conversationState.completion_percentage || 0
      };
    }
  }
  
  // Check completeness using survey-type-specific logic
  const completeness = conversationState.completion_percentage || 0;
  const threshold = completionLogic.threshold;
  
  if (completeness >= threshold) {
    // Check if this survey type has an open-ended feedback phase
    if (completionLogic.hasOpenEndedPhase) {
      const isInFeedbackPhase = conversationState.metadata?.phase === 'open_ended_feedback';
      
      if (!isInFeedbackPhase) {
        // Transition to open-ended feedback phase
        return { 
          shouldContinue: true, 
          reason: 'transition_to_open_ended_feedback',
          completeness: completeness,
          phase: 'open_ended_feedback',
          surveyType: surveyType
        };
      } else {
        // Already in feedback phase, check if we should continue
        const feedbackPhaseTurns = conversationState.metadata?.feedback_turns || 0;
        if (feedbackPhaseTurns >= completionLogic.openEndedQuestions) {
          return { 
            shouldContinue: false, 
            reason: 'open_ended_feedback_complete',
            completeness: completeness
          };
        }
        
        return { 
          shouldContinue: true, 
          reason: 'open_ended_feedback_continuing',
          completeness: completeness,
          phase: 'open_ended_feedback',
          surveyType: surveyType
        };
      }
    } else {
      // No open-ended phase for this survey type, complete normally
      return { 
        shouldContinue: false, 
        reason: 'survey_complete',
        completeness: completeness
      };
    }
  }
  
  // Check if we have essential business information
  const hasKPIs = (insightsByType.kpi_mentioned || []).length > 0;
  const hasStakeholders = (insightsByType.stakeholder_identified || []).length > 0;
  const hasPainPoints = (insightsByType.pain_point_discussed || []).length > 0;
  const hasRequirements = (insightsByType.requirement_identified || []).length > 0;
  
  const essentialInfoScore = [hasKPIs, hasStakeholders, hasPainPoints, hasRequirements]
    .filter(Boolean).length / 4;
  
  if (essentialInfoScore >= 0.75) {
    // Check if we're already in open-ended feedback phase
    const isInFeedbackPhase = conversationState.metadata?.phase === 'open_ended_feedback';
    
    if (!isInFeedbackPhase) {
      // Transition to open-ended feedback phase instead of stopping
      // Update conversation state to mark the transition
      try {
        await client.query(`
          UPDATE conversation_state 
          SET metadata = jsonb_set(metadata, '{phase}', '"open_ended_feedback"'),
              metadata = jsonb_set(metadata, '{feedback_turns}', '0')
          WHERE session_id = $1
        `, [sessionId]);
      } catch (error) {
        console.warn('Failed to update conversation state for feedback phase:', error.message);
      }
      
      return { 
        shouldContinue: true, 
        reason: 'transition_to_open_ended_feedback',
        completeness: Math.max(completeness, essentialInfoScore),
        phase: 'open_ended_feedback'
      };
    } else {
      // Already in feedback phase, check if we should continue
      const feedbackPhaseTurns = conversationState.metadata?.feedback_turns || 0;
      if (feedbackPhaseTurns >= 3) { // Allow up to 3 additional open-ended questions
        return { 
          shouldContinue: false, 
          reason: 'open_ended_feedback_complete',
          completeness: Math.max(completeness, essentialInfoScore)
        };
      }
      
      // Increment feedback turns counter
      try {
        await client.query(`
          UPDATE conversation_state 
          SET metadata = jsonb_set(metadata, '{feedback_turns}', 
            to_jsonb((metadata->>'feedback_turns')::int + 1))
          WHERE session_id = $1
        `, [sessionId]);
      } catch (error) {
        console.warn('Failed to increment feedback turns counter:', error.message);
      }
      
      return { 
        shouldContinue: true, 
        reason: 'open_ended_feedback_continuing',
        completeness: Math.max(completeness, essentialInfoScore),
        phase: 'open_ended_feedback'
      };
    }
  }
  
  // Check for user fatigue (short recent answers)
  const recentAnswers = conversationHistory.slice(-2);
  if (recentAnswers.length === 2) {
    const avgLength = recentAnswers.reduce((sum, h) => sum + (h.answer?.length || 0), 0) / 2;
    if (avgLength < 20) {
      return { 
        shouldContinue: false, 
        reason: 'user_fatigue_detected',
        completeness
      };
    }
  }
  
  return { 
    shouldContinue: true, 
    reason: 'more_info_needed',
    completeness,
    missingAreas: [
      !hasKPIs && 'success_metrics',
      !hasStakeholders && 'stakeholders',
      !hasPainPoints && 'pain_points',
      !hasRequirements && 'requirements'
    ].filter(Boolean)
  };
}

/**
 * Get next question areas to avoid repetition
 */
export async function getNextQuestionSuggestions(sessionId) {
  const context = await getConversationContext(sessionId);
  const { insightsByType, conversationHistory } = context;
  
  // Areas that have been sufficiently covered
  const wellCoveredAreas = [];
  const needsMoreCoverage = [];
  
  // Check coverage of key areas
  const areas = {
    'problem_definition': insightsByType.pain_point_discussed || [],
    'success_metrics': insightsByType.kpi_mentioned || [],
    'stakeholders': insightsByType.stakeholder_identified || [],
    'requirements': insightsByType.requirement_identified || [],
    'timeline': insightsByType.timeline_mentioned || [],
    'budget': insightsByType.budget_discussed || []
  };
  
  Object.entries(areas).forEach(([area, insights]) => {
    const coverage = insights.reduce((sum, i) => sum + i.confidence, 0) / Math.max(insights.length, 1);
    if (coverage >= 0.7 || insights.length >= 2) {
      wellCoveredAreas.push(area);
    } else {
      needsMoreCoverage.push(area);
    }
  });
  
  return {
    wellCoveredAreas,
    needsMoreCoverage,
    suggestedFocus: needsMoreCoverage.length > 0 ? needsMoreCoverage[0] : null
  };
}

export default {
  initializeConversationTracking,
  storeQuestionWithContext,
  storeAnswerWithAIAnalysis,
  checkQuestionSimilarity,
  getConversationContext,
  shouldContinueConversation,
  getNextQuestionSuggestions
};
