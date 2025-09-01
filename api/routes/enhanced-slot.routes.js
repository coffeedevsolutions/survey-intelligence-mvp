/**
 * Enhanced Slot-Based Survey Routes
 * Example integration showing how to use the new optimization components
 */

import express from 'express';
import { 
  getNextOptimalQuestion,
  processAnswerWithEnhancedExtraction,
  checkSurveyCompletion,
  getSurveyStatus,
  shouldUseEnhancedFeatures
} from '../services/enhancedSlotService.js';

const router = express.Router();

/**
 * GET /api/enhanced-slots/:sessionId/next-question
 * Get the next optimal question using enhanced selection
 */
router.get('/:sessionId/next-question', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const useEnhanced = shouldUseEnhancedFeatures(sessionId, 'smartQuestionSelection');
    
    console.log(`📋 Getting next question for session ${sessionId} (enhanced: ${useEnhanced})`);
    
    const result = await getNextOptimalQuestion(sessionId, useEnhanced);
    
    if (result.completed) {
      return res.json({
        nextQuestion: null,
        completed: true,
        reason: result.reason,
        canGenerateBrief: result.canGenerateBrief,
        summary: result.slotSummary
      });
    }
    
    res.json({
      nextQuestion: {
        id: result.id,
        text: result.text,
        type: result.type,
        metadata: result.metadata
      },
      completed: false
    });
    
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ error: 'Failed to get next question' });
  }
});

/**
 * POST /api/enhanced-slots/:sessionId/answer
 * Process answer with enhanced extraction and confidence calibration
 */
router.post('/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answer } = req.body;
    
    if (!questionId || !answer) {
      return res.status(400).json({ error: 'questionId and answer are required' });
    }
    
    const useEnhanced = shouldUseEnhancedFeatures(sessionId, 'enhancedConfidenceCalibration');
    
    console.log(`💬 Processing answer for session ${sessionId}, question ${questionId}`);
    
    // Process the answer
    const extractionResult = await processAnswerWithEnhancedExtraction(
      sessionId, 
      questionId, 
      answer, 
      useEnhanced
    );
    
    // Check if survey should complete
    const completionCheck = await checkSurveyCompletion(sessionId);
    
    // Get next question if not complete
    let nextQuestion = null;
    if (!completionCheck.shouldHalt.halt) {
      const nextResult = await getNextOptimalQuestion(sessionId, useEnhanced);
      if (!nextResult.completed) {
        nextQuestion = {
          id: nextResult.id,
          text: nextResult.text,
          type: nextResult.type,
          metadata: nextResult.metadata
        };
      }
    }
    
    res.json({
      extractions: extractionResult.extractions,
      nextQuestion,
      completed: completionCheck.shouldHalt.halt,
      completionReason: completionCheck.shouldHalt.reason,
      canGenerateBrief: completionCheck.canGenerateBrief,
      progress: {
        ...extractionResult.slotSummary,
        fatigue: extractionResult.fatigue,
        totalQuestions: completionCheck.totalQuestions
      }
    });
    
  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

/**
 * GET /api/enhanced-slots/:sessionId/status
 * Get comprehensive survey status
 */
router.get('/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const status = await getSurveyStatus(sessionId);
    
    res.json(status);
    
  } catch (error) {
    console.error('Error getting survey status:', error);
    res.status(500).json({ error: 'Failed to get survey status' });
  }
});

/**
 * POST /api/enhanced-slots/:sessionId/completion-check
 * Check if survey can be completed
 */
router.post('/:sessionId/completion-check', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const completionCheck = await checkSurveyCompletion(sessionId);
    
    res.json(completionCheck);
    
  } catch (error) {
    console.error('Error checking completion:', error);
    res.status(500).json({ error: 'Failed to check completion' });
  }
});

export default router;
