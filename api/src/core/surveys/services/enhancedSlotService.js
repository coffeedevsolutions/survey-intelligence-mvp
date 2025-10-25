/**
 * Enhanced Slot Service
 * Integration layer that combines all the new optimization components
 */

import { OpenAI } from 'openai';
import { pool } from '../../../database/connection.js';
import { 
  DEFAULT_SLOT_SCHEMA,
  SlotState,
  loadSlotState,
  saveSlotState,
  QUESTION_TEMPLATES,
  extractSlotInformation as legacyExtractSlotInformation
} from './slotSchemaService.js';
import { 
  selectNextQuestion as smartSelectNextQuestion,
  trackQuestionUsage,
  canGenerateBrief,
  shouldHalt
} from './smartQuestionSelector.js';
import { 
  processSlotExtraction,
  buildEnhancedExtractionPrompt
} from './confidenceCalibration.js';
import { fatigueRisk } from './semanticAnalysisService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Enhanced question selection with smart features
 */
export async function getNextOptimalQuestion(sessionId, useEnhanced = true) {
  try {
    console.log(`🎯 Getting next optimal question for session ${sessionId} (enhanced: ${useEnhanced})`);
    
    // Load slot state
    const slotState = await loadSlotState(sessionId, DEFAULT_SLOT_SCHEMA);
    
    if (!useEnhanced) {
      // Use legacy selector
      const { selectNextQuestion } = await import('./slotSchemaService.js');
      const template = selectNextQuestion(slotState, QUESTION_TEMPLATES);
      return template ? {
        id: template.id,
        text: template.prompt,
        type: 'text',
        metadata: {
          slot_targets: template.slot_targets,
          source: 'legacy'
        }
      } : null;
    }
    
    // Use enhanced smart selector
    const template = await smartSelectNextQuestion(slotState, QUESTION_TEMPLATES);
    
    if (!template) {
      const fatigue = fatigueRisk(slotState.conversationHistory, 4);
      const haltReason = shouldHalt(slotState, fatigue);
      
      console.log(`🛑 No more questions available. Reason: ${haltReason.reason || 'unknown'}`);
      
      return {
        completed: true,
        reason: haltReason.reason || 'no_suitable_questions',
        canGenerateBrief: canGenerateBrief(slotState),
        slotSummary: slotState.getCompletionSummary()
      };
    }
    
    // Track the question usage
    await trackQuestionUsage(slotState, template, template.prompt);
    
    // Save updated state
    await saveSlotState(slotState);
    
    return {
      id: template.id,
      text: template.prompt,
      type: 'text',
      metadata: {
        slot_targets: template.slot_targets,
        topic: template.topic,
        priority: template.priority,
        source: 'enhanced',
        turn: slotState.turn
      }
    };
    
  } catch (error) {
    console.error('Error in getNextOptimalQuestion:', error);
    throw error;
  }
}

/**
 * Enhanced answer processing with calibrated confidence
 */
export async function processAnswerWithEnhancedExtraction(sessionId, questionId, userResponse, useEnhanced = true) {
  try {
    console.log(`📝 Processing answer for session ${sessionId}, question ${questionId} (enhanced: ${useEnhanced})`);
    
    // Load slot state
    const slotState = await loadSlotState(sessionId, DEFAULT_SLOT_SCHEMA);
    
    // Add to conversation history
    slotState.conversationHistory.push({
      question: questionId,
      answer: userResponse,
      timestamp: new Date().toISOString()
    });
    
    if (!useEnhanced) {
      // Use legacy extraction
      const targetSlots = findTargetSlotsForQuestion(questionId);
      const extraction = await legacyExtractSlotInformation(
        userResponse,
        targetSlots,
        slotState,
        questionId
      );
      
      await saveSlotState(slotState);
      return extraction;
    }
    
    // Enhanced extraction process
    const targetSlots = findTargetSlotsForQuestion(questionId);
    const extractions = [];
    
    for (const slotName of targetSlots) {
      const schema = slotState.schema[slotName];
      if (!schema) continue;
      
      // Mark slot as asked this turn if this question specifically targets it
      if (targetSlots.length === 1 || isQuestionSpecificForSlot(questionId, slotName)) {
        slotState.slots[slotName].askedThisTurn = true;
      }
      
      // Build enhanced extraction prompt
      const systemPrompt = buildEnhancedExtractionPrompt(slotName, schema.description);
      
      const userPrompt = `Question: "${questionId}"
User Response: "${userResponse}"

Current slot value: ${slotState.slots[slotName]?.value || 'empty'}
Current confidence: ${slotState.slots[slotName]?.confidence || 0}

Extract relevant information for this slot. Only extract if you're confident the user provided relevant information.`;

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
        
        const extractedData = JSON.parse(response.choices[0].message.content);
        
        if (extractedData.value && extractedData.confidence > 0.3) {
          // Process with enhanced confidence calibration
          const result = await processSlotExtraction(
            slotName,
            extractedData,
            userResponse,
            questionId,
            slotState
          );
          
          if (result) {
            extractions.push(result);
          }
        }
        
      } catch (error) {
        console.error(`Error extracting slot ${slotName}:`, error);
      }
      
      // Reset the askedThisTurn flag
      slotState.slots[slotName].askedThisTurn = false;
    }
    
    // Save updated state
    await saveSlotState(slotState);
    
    return {
      extractions,
      slotSummary: slotState.getCompletionSummary(),
      fatigue: fatigueRisk(slotState.conversationHistory, 4)
    };
    
  } catch (error) {
    console.error('Error in processAnswerWithEnhancedExtraction:', error);
    throw error;
  }
}

/**
 * Check if survey should be completed
 */
export async function checkSurveyCompletion(sessionId) {
  try {
    const slotState = await loadSlotState(sessionId, DEFAULT_SLOT_SCHEMA);
    const fatigue = fatigueRisk(slotState.conversationHistory, 4);
    
    const completionCheck = {
      canGenerateBrief: canGenerateBrief(slotState),
      shouldHalt: shouldHalt(slotState, fatigue),
      slotSummary: slotState.getCompletionSummary(),
      fatigue: fatigue,
      totalQuestions: slotState.totalQuestions
    };
    
    return completionCheck;
    
  } catch (error) {
    console.error('Error checking survey completion:', error);
    throw error;
  }
}

/**
 * Get comprehensive survey status
 */
export async function getSurveyStatus(sessionId) {
  try {
    const slotState = await loadSlotState(sessionId, DEFAULT_SLOT_SCHEMA);
    
    return {
      sessionId,
      totalQuestions: slotState.totalQuestions,
      turn: slotState.turn,
      slotSummary: slotState.getCompletionSummary(),
      fatigue: fatigueRisk(slotState.conversationHistory, 4),
      lowConfStreak: slotState.lowConfStreak || 0,
      readySlots: slotState.getReadySlots(),
      canGenerateBrief: canGenerateBrief(slotState),
      topicHistory: slotState.topicHistory || [],
      templateUsage: slotState.templateHistory || {}
    };
    
  } catch (error) {
    console.error('Error getting survey status:', error);
    throw error;
  }
}

/**
 * Helper function to find target slots for a question
 */
function findTargetSlotsForQuestion(questionId) {
  // Look up in templates
  const template = QUESTION_TEMPLATES.find(t => t.id === questionId);
  if (template && template.slot_targets) {
    return template.slot_targets;
  }
  
  // Default mapping for common question patterns
  const defaultMappings = {
    'problem_and_impact': ['ProblemStatement', 'Challenges'],
    'current_process_and_gaps': ['CurrentProcess'],
    'requirements_merged': ['Requirements'],
    'outcomes_and_metrics': ['OutcomesAndMetrics'],
    'stakeholders_identification': ['Stakeholders'],
    'roi_quantification': ['ROIFrame']
  };
  
  return defaultMappings[questionId] || Object.keys(DEFAULT_SLOT_SCHEMA);
}

/**
 * Check if a question is specifically designed for a particular slot
 */
function isQuestionSpecificForSlot(questionId, slotName) {
  const specificMappings = {
    'stakeholders_identification': 'Stakeholders',
    'roi_quantification': 'ROIFrame',
    'requirements_merged': 'Requirements',
    'current_process_and_gaps': 'CurrentProcess',
    'outcomes_and_metrics': 'OutcomesAndMetrics'
  };
  
  return specificMappings[questionId] === slotName;
}

/**
 * Migration helper: gradually roll out enhanced features
 */
export function shouldUseEnhancedFeatures(sessionId, feature) {
  // You can implement gradual rollout logic here
  // For now, default to enhanced for all new features
  
  const enabledFeatures = {
    smartQuestionSelection: true,
    enhancedConfidenceCalibration: true,
    semanticDeduplication: true,
    fatigueDetection: true,
    coverageBasedCompletion: true
  };
  
  return enabledFeatures[feature] !== false;
}
