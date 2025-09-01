/**
 * Smart Question Selector
 * Enhanced question selection with semantic deduplication, fatigue detection, and EIG scoring
 */

import { 
  redundancyPenalty, 
  fatigueRisk, 
  expectedInfoGain,
  embed
} from './semanticAnalysisService.js';
import { minThrFor } from './slotSchemaService.js';

/**
 * Check if template is allowed based on cooldowns and usage limits
 */
function templateAllowed(template, slotState) {
  const templateStats = slotState.templateHistory[template.id] || { count: 0, lastTurn: -999 };
  
  // Cooldown check
  const turnsSinceLastUse = slotState.turn - templateStats.lastTurn;
  if (turnsSinceLastUse < (template.cooldownTurns || 0)) {
    return false;
  }
  
  // Usage limit check
  if (template.maxAsksPerSlot && templateStats.count >= template.maxAsksPerSlot) {
    return false;
  }
  
  // Topical cooldown: avoid same topic 2+ times in a row unless critical & low confidence
  const recentTopics = slotState.topicHistory.slice(-2);
  const topicStreak = recentTopics.length >= 2 && recentTopics.every(topic => topic === template.topic);
  
  if (topicStreak) {
    // Allow if we have critical unfilled slots for this template
    const hasCriticalUnfilled = template.slot_targets.some(slotName => {
      const schema = slotState.schema[slotName];
      const slot = slotState.slots[slotName];
      return schema?.priority === 'critical' && 
             (slot?.confidence || 0) < minThrFor(schema);
    });
    
    if (!hasCriticalUnfilled) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate coverage score for a template
 */
function calculateSlotCoverage(template, slotState) {
  if (!template.slot_targets || template.slot_targets.length === 0) return 0;
  
  const emptyTargets = template.slot_targets.filter(slotName => 
    slotState.needsQuestion(slotName)
  );
  
  return emptyTargets.length / template.slot_targets.length;
}

/**
 * Calculate confidence lift potential
 */
function calculateConfidenceLift(template, slotState) {
  if (!template.slot_targets || template.slot_targets.length === 0) return 0;
  
  const avgCurrentConfidence = template.slot_targets.reduce((sum, slotName) => {
    const slot = slotState.slots[slotName];
    return sum + (slot?.confidence || 0);
  }, 0) / template.slot_targets.length;
  
  return 1 - avgCurrentConfidence; // Higher lift for lower confidence slots
}

/**
 * Determine if we should halt questioning early
 */
export function shouldHalt(slotState, fatigue) {
  // Hard limits
  if (slotState.totalQuestions >= 10) return { halt: true, reason: 'max_questions_reached' };
  if (slotState.lowConfStreak >= 2) return { halt: true, reason: 'low_confidence_streak' };
  
  // Coverage-based completion
  if (canGenerateBrief(slotState)) return { halt: true, reason: 'sufficient_coverage' };
  
  // Low value + high fatigue
  const topCandidateEig = slotState.debug?.topCandidateEigMax || 0;
  if (topCandidateEig < 0.1 && fatigue > 0.5) {
    return { halt: true, reason: 'low_value_high_fatigue' };
  }
  
  return { halt: false, reason: null };
}

/**
 * Calculate coverage percentage
 */
function coverage(slotState) {
  const requiredSlots = Object.keys(slotState.schema).filter(name => 
    slotState.schema[name].required
  );
  
  const filledSlots = requiredSlots.filter(name => {
    const slot = slotState.slots[name];
    const schema = slotState.schema[name];
    return slot && slot.confidence >= minThrFor(schema);
  });
  
  return filledSlots.length / Math.max(1, requiredSlots.length);
}

/**
 * Check if we have low marginal utility
 */
function lowMarginalUtility(slotState, fatigue) {
  const topEig = slotState.debug?.topCandidateEigMax || 0;
  return topEig < 0.15 || fatigue > 0.6;
}

/**
 * Enhanced completion check
 */
export function canGenerateBrief(slotState) {
  const cov = coverage(slotState);
  
  // Check that all critical slots are filled
  const criticalSlotsFilled = Object.entries(slotState.schema)
    .filter(([_, schema]) => schema.priority === 'critical')
    .every(([slotName, schema]) => {
      const slot = slotState.slots[slotName];
      return slot && slot.confidence >= minThrFor(schema);
    });
  
  const minRequirementsMet = cov >= 0.75 && criticalSlotsFilled;
  
  if (!minRequirementsMet) return false;
  
  // Ensure at least one detailed pillar has depth
  const hasDepth = (
    (slotState.slots.CurrentProcess?.value?.length || 0) > 50 ||
    (Array.isArray(slotState.slots.Requirements?.value) && 
     slotState.slots.Requirements.value.length >= 2)
  );
  
  const fatigue = fatigueRisk(slotState.conversationHistory, 4);
  
  return hasDepth || lowMarginalUtility(slotState, fatigue);
}

/**
 * Enhanced smart question selection
 */
export async function selectNextQuestion(slotState, templates) {
  const fatigue = fatigueRisk(slotState.conversationHistory, 4);
  
  // Check if we should halt early
  const haltCheck = shouldHalt(slotState, fatigue);
  if (haltCheck.halt) {
    console.log(`🛑 Halting survey: ${haltCheck.reason}`);
    return null;
  }
  
  // Filter by basic conditions: ask_if, dependencies, template restrictions
  const basicCandidates = templates.filter(template => {
    try {
      // Check ask_if condition
      const askIf = template.ask_if(slotState);
      if (!askIf) return false;
      
      // Check dependencies
      const depsOk = (template.dependencies || []).every(depSlotName => {
        const depSlot = slotState.slots[depSlotName];
        const depSchema = slotState.schema[depSlotName];
        return depSlot && depSlot.confidence >= minThrFor(depSchema);
      });
      if (!depsOk) return false;
      
      // Check template-specific restrictions
      return templateAllowed(template, slotState);
      
    } catch (error) {
      console.error('Error evaluating template:', template.id, error);
      return false;
    }
  });
  
  if (basicCandidates.length === 0) {
    console.log('❌ No valid candidate templates found');
    return null;
  }
  
  // Score candidates with semantic deduplication
  const scoredCandidates = [];
  
  for (const template of basicCandidates) {
    // Check for redundancy
    const redundancy = await redundancyPenalty(
      template.prompt, 
      slotState.askedQuestions,
      0.85
    );
    
    if (redundancy.reject) {
      console.log(`🚫 Rejected template ${template.id}: too similar to recent questions`);
      continue;
    }
    
    // Calculate scoring components
    const coverage = calculateSlotCoverage(template, slotState);
    const eig = expectedInfoGain(template, slotState);
    const confLift = calculateConfidenceLift(template, slotState);
    const basePriority = template.priority || 5;
    
    // Enhanced scoring with stronger penalties
    const score = basePriority + 
                  (coverage * 3) + 
                  (confLift * 2) + 
                  (eig * 2) - 
                  (fatigue * 1.2) - 
                  (redundancy.penalty * 1.5);
    
    scoredCandidates.push({ 
      template, 
      score, 
      eig,
      coverage,
      confLift,
      redundancy: redundancy.penalty 
    });
  }
  
  if (scoredCandidates.length === 0) {
    console.log('❌ All candidates rejected due to redundancy');
    return null;
  }
  
  // Sort by score and track debugging info
  scoredCandidates.sort((a, b) => b.score - a.score);
  
  // Store debug info for halt decisions
  slotState.debug = {
    topCandidateEigMax: scoredCandidates[0].eig,
    candidateCount: scoredCandidates.length,
    fatigue: fatigue
  };
  
  const winner = scoredCandidates[0];
  
  console.log(`🎯 Selected template: ${winner.template.id} (score: ${winner.score.toFixed(2)}, EIG: ${winner.eig.toFixed(2)})`);
  
  return winner.template;
}

/**
 * Track question and template usage
 */
export async function trackQuestionUsage(slotState, template, questionText) {
  // Update template history
  if (!slotState.templateHistory[template.id]) {
    slotState.templateHistory[template.id] = { count: 0, lastTurn: -999 };
  }
  slotState.templateHistory[template.id].count += 1;
  slotState.templateHistory[template.id].lastTurn = slotState.turn;
  
  // Update topic history
  if (template.topic) {
    slotState.topicHistory.push(template.topic);
    // Keep only last 5 topics
    if (slotState.topicHistory.length > 5) {
      slotState.topicHistory = slotState.topicHistory.slice(-5);
    }
  }
  
  // Add to semantic tracking
  const embedding = await embed(questionText);
  slotState.askedQuestions.push({
    q: questionText,
    emb: embedding
  });
  
  // Keep only last 5 questions for semantic comparison
  if (slotState.askedQuestions.length > 5) {
    slotState.askedQuestions = slotState.askedQuestions.slice(-5);
  }
  
  // Increment turn counter
  slotState.turn += 1;
}
