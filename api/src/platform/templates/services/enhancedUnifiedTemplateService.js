/**
 * Enhanced Unified Template Service
 * Integrates robust conversation tracking with AI context understanding
 */

import { UnifiedTemplateService } from './unifiedTemplateService.js';
import conversationTracker from '../../../core/surveys/services/conversationTrackingService.js';
import aiContextService from '../../../platform/ai/services/aiContextService.js';
import { pool } from '../../../database/connection.js';

export class EnhancedUnifiedTemplateService extends UnifiedTemplateService {
  constructor() {
    super();
    this.conversationTracker = conversationTracker;
    this.aiContextService = aiContextService;
  }

  /**
   * Enhanced question generation with full conversation awareness
   */
  async generateAIQuestion(template, conversationHistory = [], sessionId = null) {
    if (!sessionId) {
      console.warn('⚠️ No sessionId provided, falling back to basic generation');
      return super.generateAIQuestion(template, conversationHistory, sessionId);
    }

    try {
      // Initialize conversation tracking if needed
      try {
        await this.conversationTracker.initializeConversationTracking(sessionId, template.category);
      } catch (error) {
        console.log('Conversation tracking already initialized or error:', error.message);
      }

      // Generate contextual question using AI context service
      const questionResult = await this.aiContextService.generateContextualQuestion(sessionId, template);
      
      if (!questionResult) {
        console.log('🛑 AI context service determined conversation should end');
        return null;
      }

      // Store the question for tracking
      const context = await this.conversationTracker.getConversationContext(sessionId);
      const nextTurn = (context.conversationState.current_turn || 0) + 1;
      
      await this.conversationTracker.storeQuestionWithContext(
        sessionId,
        nextTurn,
        `unified_q${nextTurn}`,
        questionResult.question_text,
        questionResult.metadata || {}
      );

      console.log(`✨ Generated enhanced AI question for turn ${nextTurn}: ${questionResult.question_text}`);
      
      return {
        question_text: questionResult.question_text,
        question_type: questionResult.question_type || 'text',
        question_id: `unified_q${nextTurn}`,
        metadata: {
          ...questionResult.metadata,
          turn_number: nextTurn,
          generation_method: 'enhanced_ai_context'
        }
      };

    } catch (error) {
      console.error('❌ Enhanced question generation failed:', error);
      
      // Fallback to original method
      console.log('🔄 Falling back to original generation method');
      return super.generateAIQuestion(template, conversationHistory, sessionId);
    }
  }

  /**
   * Process answer with enhanced AI analysis
   */
  async processAnswer(sessionId, questionId, answerText, questionText = null) {
    try {
      // Extract turn number from question ID or get from context
      let turnNumber = 1;
      if (questionId.startsWith('unified_q')) {
        turnNumber = parseInt(questionId.replace('unified_q', '')) || 1;
      } else {
        const context = await this.conversationTracker.getConversationContext(sessionId);
        turnNumber = context.conversationState.current_turn || 1;
      }

      // Store answer with AI analysis
      const analysisResult = await this.conversationTracker.storeAnswerWithAIAnalysis(
        sessionId,
        turnNumber,
        answerText,
        { question_id: questionId, question_text: questionText }
      );

      console.log(`💡 Processed answer for turn ${turnNumber} with ${analysisResult.extractedInsights.length} insights extracted`);
      
      return analysisResult;

    } catch (error) {
      console.error('❌ Enhanced answer processing failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced completion check with comprehensive analysis
   */
  async shouldContinueAsking(template, conversationHistory, lastAnswer) {
    // If no sessionId context, fall back to original method
    if (!conversationHistory.some(h => h.sessionId)) {
      return super.shouldContinueAsking(template, conversationHistory, lastAnswer);
    }

    try {
      // Extract sessionId from conversation history or use the first available session context
      const sessionId = conversationHistory.find(h => h.sessionId)?.sessionId;
      if (!sessionId) {
        return super.shouldContinueAsking(template, conversationHistory, lastAnswer);
      }

      // Use enhanced conversation analysis
      const continuationCheck = await this.conversationTracker.shouldContinueConversation(
        sessionId,
        template.ai_config?.optimization_config?.coverage_requirement || 0.8,
        template.ai_config?.optimization_config?.max_turns || 10
      );

      return {
        continue: continuationCheck.shouldContinue,
        reason: continuationCheck.reason,
        completeness: continuationCheck.completeness,
        missingAreas: continuationCheck.missingAreas || []
      };

    } catch (error) {
      console.error('❌ Enhanced completion check failed:', error);
      return super.shouldContinueAsking(template, conversationHistory, lastAnswer);
    }
  }

  /**
   * Enhanced brief generation with full conversation understanding
   */
  async generateBrief(template, conversationHistory, sessionId) {
    if (!sessionId) {
      console.warn('⚠️ No sessionId provided, falling back to basic brief generation');
      return super.generateBrief(template, conversationHistory, sessionId);
    }

    try {
      // Generate enhanced brief using AI context service
      const enhancedBrief = await this.aiContextService.generateEnhancedBrief(sessionId, template);
      
      console.log('✅ Generated enhanced brief with full conversation context');
      return enhancedBrief;

    } catch (error) {
      console.error('❌ Enhanced brief generation failed:', error);
      
      // Fallback to original method
      console.log('🔄 Falling back to original brief generation');
      return super.generateBrief(template, conversationHistory, sessionId);
    }
  }

  /**
   * Get conversation analytics and insights
   */
  async getConversationAnalytics(sessionId) {
    try {
      const context = await this.conversationTracker.getConversationContext(sessionId);
      const completionAnalysis = await this.aiContextService.analyzeConversationCompletion(sessionId);
      const suggestions = await this.conversationTracker.getNextQuestionSuggestions(sessionId);

      return {
        conversationState: context.conversationState,
        completionAnalysis,
        suggestions,
        totalTurns: context.conversationHistory.length,
        totalInsights: context.insights.length,
        insightsByType: context.insightsByType,
        conversationHistory: context.conversationHistory.map(turn => ({
          turn: turn.turn,
          question: turn.question,
          answer: turn.answer,
          hasAnalysis: !!turn.analysis
        }))
      };

    } catch (error) {
      console.error('❌ Error getting conversation analytics:', error);
      throw error;
    }
  }

  /**
   * Reset conversation tracking (for testing or restart scenarios)
   */
  async resetConversationTracking(sessionId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete all conversation tracking data for this session
      await client.query('DELETE FROM conversation_history WHERE session_id = $1', [sessionId]);
      await client.query('DELETE FROM question_embeddings WHERE session_id = $1', [sessionId]);
      await client.query('DELETE FROM ai_conversation_insights WHERE session_id = $1', [sessionId]);
      await client.query('DELETE FROM conversation_state WHERE session_id = $1', [sessionId]);
      
      // Reinitialize
      await this.conversationTracker.initializeConversationTracking(sessionId);
      
      await client.query('COMMIT');
      console.log(`🔄 Reset conversation tracking for session ${sessionId}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error resetting conversation tracking:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Build proper conversation history from stored data
   */
  async buildConversationHistory(sessionId) {
    try {
      const context = await this.conversationTracker.getConversationContext(sessionId);
      
      return context.conversationHistory.map(turn => ({
        question: turn.question,
        answer: turn.answer,
        sessionId: sessionId,
        turn: turn.turn,
        analysis: turn.analysis
      }));

    } catch (error) {
      console.error('❌ Error building conversation history:', error);
      return [];
    }
  }
}

// Create singleton instance
export const enhancedUnifiedTemplateService = new EnhancedUnifiedTemplateService();

export default enhancedUnifiedTemplateService;
