/**
 * Survey Conversation Tracking Service
 * Simplified conversation tracking specifically for survey sessions
 */

import { pool } from '../../../database/connection.js';
import { 
  initializeConversationTracking,
  storeQuestionWithContext,
  storeAnswerWithAIAnalysis,
  getConversationContext
} from './conversationTrackingService.js';

/**
 * Initialize conversation tracking for a survey session
 */
export async function initializeSurveyConversationTracking(sessionId, surveyType = 'general') {
  try {
    await initializeConversationTracking(sessionId, surveyType);
    console.log(`🎯 Initialized survey conversation tracking for session ${sessionId} with survey type: ${surveyType}`);
  } catch (error) {
    console.error('Error initializing survey conversation tracking:', error);
    // Don't throw - conversation tracking is optional
  }
}

/**
 * Track a question being asked in a survey
 */
export async function trackSurveyQuestion(sessionId, questionId, questionText, questionType = 'text', metadata = {}) {
  try {
    // Get current turn number
    const turnResult = await pool.query(
      'SELECT current_turn FROM conversation_state WHERE session_id = $1',
      [sessionId]
    );
    
    const currentTurn = turnResult.rowCount > 0 ? turnResult.rows[0].current_turn + 1 : 1;
    
    // Store the question
    await storeQuestionWithContext(
      sessionId, 
      currentTurn, 
      questionId, 
      questionText, 
      { type: questionType, ...metadata }
    );
    
    console.log(`📝 Tracked survey question ${currentTurn}: ${questionText.substring(0, 50)}...`);
    return currentTurn;
  } catch (error) {
    console.error('Error tracking survey question:', error);
    return null;
  }
}

/**
 * Track an answer being provided in a survey
 */
export async function trackSurveyAnswer(sessionId, turnNumber, answerText, metadata = {}) {
  try {
    if (!turnNumber) {
      // Try to get the current turn number
      const turnResult = await pool.query(
        'SELECT current_turn FROM conversation_state WHERE session_id = $1',
        [sessionId]
      );
      turnNumber = turnResult.rowCount > 0 ? turnResult.rows[0].current_turn : 1;
    }
    
    // Store the answer with AI analysis
    const result = await storeAnswerWithAIAnalysis(
      sessionId, 
      turnNumber, 
      answerText, 
      metadata
    );
    
    console.log(`💡 Tracked survey answer for turn ${turnNumber}: ${answerText.substring(0, 50)}...`);
    return result;
  } catch (error) {
    console.error('Error tracking survey answer:', error);
    return null;
  }
}

/**
 * Track survey completion or abandonment
 */
export async function trackSurveyCompletion(sessionId, completed = true, reason = null) {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update conversation state
      await client.query(`
        UPDATE conversation_state 
        SET 
          should_continue = false,
          stop_reason = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $2
      `, [reason || (completed ? 'survey_completed' : 'survey_abandoned'), sessionId]);
      
      // Update session completion status
      await client.query(`
        UPDATE sessions 
        SET 
          completed = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [completed, sessionId]);
      
      await client.query('COMMIT');
      
      console.log(`🏁 Survey ${completed ? 'completed' : 'abandoned'} for session ${sessionId}${reason ? ` (${reason})` : ''}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error tracking survey completion:', error);
  }
}

/**
 * Get survey conversation summary for analytics
 */
export async function getSurveyConversationSummary(sessionId) {
  try {
    const context = await getConversationContext(sessionId);
    
    return {
      totalQuestions: context.conversationHistory.length,
      completedQuestions: context.conversationHistory.filter(h => h.answer).length,
      completionPercentage: context.completionPercentage,
      lastQuestion: context.conversationHistory[context.conversationHistory.length - 1]?.question || null,
      lastAnswer: context.conversationHistory[context.conversationHistory.length - 1]?.answer || null,
      conversationState: context.conversationState,
      insights: context.insightsByType
    };
  } catch (error) {
    console.error('Error getting survey conversation summary:', error);
    return {
      totalQuestions: 0,
      completedQuestions: 0,
      completionPercentage: 0,
      lastQuestion: null,
      lastAnswer: null,
      conversationState: {},
      insights: {}
    };
  }
}

/**
 * Get the current question text for a session
 */
export async function getCurrentQuestionText(sessionId, questionId) {
  try {
    // First try to get from conversation history
    const historyResult = await pool.query(`
      SELECT question_text 
      FROM conversation_history 
      WHERE session_id = $1 AND question_id = $2
      ORDER BY turn_number DESC 
      LIMIT 1
    `, [sessionId, questionId]);
    
    if (historyResult.rowCount > 0) {
      return historyResult.rows[0].question_text;
    }
    
    // Fallback: try to get from flow spec or return a generic text
    return `Question ${questionId}`;
  } catch (error) {
    console.error('Error getting current question text:', error);
    return `Question ${questionId}`;
  }
}

/**
 * Check if conversation tracking is enabled for a session
 */
export async function isConversationTrackingEnabled(sessionId) {
  try {
    const result = await pool.query(
      'SELECT 1 FROM conversation_state WHERE session_id = $1',
      [sessionId]
    );
    return result.rowCount > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Track survey abandonment (when user leaves without completing)
 * This should be called when a session times out or user navigates away
 */
export async function trackSurveyAbandonment(sessionId, reason = 'user_abandoned') {
  try {
    // Get the last question that was asked but not answered
    const lastQuestionResult = await pool.query(`
      SELECT ch.question_text, ch.turn_number
      FROM conversation_history ch
      WHERE ch.session_id = $1 AND ch.answer_text IS NULL
      ORDER BY ch.turn_number DESC
      LIMIT 1
    `, [sessionId]);
    
    const lastUnansweredQuestion = lastQuestionResult.rowCount > 0 ? lastQuestionResult.rows[0] : null;
    
    // Track abandonment
    await trackSurveyCompletion(sessionId, false, reason);
    
    console.log(`🚫 Survey abandoned for session ${sessionId}${lastUnansweredQuestion ? ` - Last unanswered question: ${lastUnansweredQuestion.question_text}` : ''}`);
    
    return {
      abandoned: true,
      lastUnansweredQuestion: lastUnansweredQuestion?.question_text || null,
      turnNumber: lastUnansweredQuestion?.turn_number || null,
      reason
    };
  } catch (error) {
    console.error('Error tracking survey abandonment:', error);
    return null;
  }
}

export default {
  initializeSurveyConversationTracking,
  trackSurveyQuestion,
  trackSurveyAnswer,
  trackSurveyCompletion,
  trackSurveyAbandonment,
  getSurveyConversationSummary,
  getCurrentQuestionText,
  isConversationTrackingEnabled
};
