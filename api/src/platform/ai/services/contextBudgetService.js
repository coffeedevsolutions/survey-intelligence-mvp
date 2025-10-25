/**
 * Context Budget Service
 * Manages rolling context with token budgets for AI conversations
 */

import { DEFAULT_SLOT_SCHEMA } from './slotSchemaService.js';

/**
 * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Build hierarchical context with token budget management
 */
export function buildRollingContext(conversationHistory, slotState, maxTokens = 1200) {
  const context = {
    tier1: [], // Last N raw turns (verbatim)
    tier2: '', // Compact state vector (slots + confidence + insight counts)
    tier3: '', // Running summary (regenerated every 3 turns)
    totalTokens: 0
  };
  
  // Tier 1: Last 3-5 turns verbatim
  const lastTurns = conversationHistory.slice(-5);
  context.tier1 = lastTurns.map(turn => ({
    turn: turn.turn || turn.turnNumber,
    question: turn.question,
    answer: turn.answer
  }));
  
  // Tier 2: Compact state vector (50-100 tokens)
  context.tier2 = buildCompactStateVector(slotState);
  
  // Tier 3: Running summary (300-600 tokens max)
  context.tier3 = buildRunningSummary(conversationHistory.slice(0, -5)); // Exclude recent turns
  
  // Calculate total tokens
  context.totalTokens = estimateTokens(JSON.stringify(context.tier1)) + 
                       estimateTokens(context.tier2) + 
                       estimateTokens(context.tier3);
  
  // If over budget, truncate Tier 3 first, then Tier 1 oldest
  if (context.totalTokens > maxTokens) {
    const overage = context.totalTokens - maxTokens;
    
    // First, truncate Tier 3
    if (estimateTokens(context.tier3) > 300) {
      const targetTier3Tokens = Math.max(200, estimateTokens(context.tier3) - overage);
      context.tier3 = truncateToTokens(context.tier3, targetTier3Tokens);
    }
    
    // Recalculate
    context.totalTokens = estimateTokens(JSON.stringify(context.tier1)) + 
                         estimateTokens(context.tier2) + 
                         estimateTokens(context.tier3);
    
    // If still over budget, truncate Tier 1 oldest turns
    if (context.totalTokens > maxTokens) {
      const remainingOverage = context.totalTokens - maxTokens;
      let tokensToRemove = remainingOverage;
      
      // Remove oldest turns until we're under budget
      while (context.tier1.length > 2 && tokensToRemove > 0) {
        const removedTurn = context.tier1.shift();
        tokensToRemove -= estimateTokens(JSON.stringify(removedTurn));
      }
      
      context.totalTokens = estimateTokens(JSON.stringify(context.tier1)) + 
                           estimateTokens(context.tier2) + 
                           estimateTokens(context.tier3);
    }
  }
  
  return context;
}

/**
 * Build compact state vector from slot state
 */
function buildCompactStateVector(slotState) {
  if (!slotState || !slotState.slots) {
    return 'No slot state available';
  }
  
  const stateVector = [];
  
  for (const [slotName, slot] of Object.entries(slotState.slots)) {
    const schema = slotState.schema[slotName];
    if (!schema) continue;
    
    const status = slot.value ? 
      (slot.confidence >= (schema.min_confidence || 0.7) ? 'confirmed' : 'provisional') : 
      'unknown';
    
    stateVector.push(`${slotName}:${status}`);
  }
  
  return `Slot States: ${stateVector.join(', ')}`;
}

/**
 * Build running summary of older conversation turns
 */
function buildRunningSummary(olderTurns) {
  if (!olderTurns || olderTurns.length === 0) {
    return 'No previous conversation history';
  }
  
  // Group turns by topic/intent for summarization
  const topics = {
    problem: [],
    stakeholders: [],
    requirements: [],
    metrics: [],
    timeline: [],
    other: []
  };
  
  olderTurns.forEach(turn => {
    const text = `${turn.question} ${turn.answer}`.toLowerCase();
    
    if (text.includes('problem') || text.includes('issue') || text.includes('challenge')) {
      topics.problem.push(turn);
    } else if (text.includes('stakeholder') || text.includes('team') || text.includes('people')) {
      topics.stakeholders.push(turn);
    } else if (text.includes('requirement') || text.includes('feature') || text.includes('need')) {
      topics.requirements.push(turn);
    } else if (text.includes('metric') || text.includes('success') || text.includes('measure')) {
      topics.metrics.push(turn);
    } else if (text.includes('time') || text.includes('timeline') || text.includes('schedule')) {
      topics.timeline.push(turn);
    } else {
      topics.other.push(turn);
    }
  });
  
  // Build summary for each topic
  const summaryParts = [];
  
  Object.entries(topics).forEach(([topic, turns]) => {
    if (turns.length > 0) {
      const keyPoints = turns.map(turn => 
        `${turn.question.substring(0, 50)}... → ${turn.answer.substring(0, 100)}...`
      ).join('; ');
      
      summaryParts.push(`${topic.charAt(0).toUpperCase() + topic.slice(1)}: ${keyPoints}`);
    }
  });
  
  return summaryParts.join('\n');
}

/**
 * Truncate text to approximately target token count
 */
function truncateToTokens(text, targetTokens) {
  if (!text) return '';
  
  const targetChars = targetTokens * 4; // Rough approximation
  if (text.length <= targetChars) return text;
  
  // Find last complete sentence within target
  const truncated = text.substring(0, targetChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > targetChars * 0.8) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  return truncated + '...';
}

/**
 * Format rolling context for AI prompts with sentiment analysis
 */
export function formatContextForPrompt(context) {
  let promptContext = '';
  
  // Add Tier 1 (recent turns) with sentiment analysis
  if (context.tier1 && context.tier1.length > 0) {
    promptContext += 'RECENT CONVERSATION:\n';
    context.tier1.forEach(turn => {
      const sentiment = analyzeSentiment(turn.answer);
      promptContext += `Turn ${turn.turn}: Q: "${turn.question}"\nA: "${turn.answer}"\n`;
      promptContext += `Sentiment: ${sentiment.tone} (${sentiment.confidence}% confidence) - ${sentiment.keyPoints.join(', ')}\n\n`;
    });
  }
  
  // Add Tier 2 (state vector)
  if (context.tier2) {
    promptContext += `CURRENT STATE: ${context.tier2}\n\n`;
  }
  
  // Add Tier 3 (running summary)
  if (context.tier3) {
    promptContext += `CONVERSATION SUMMARY:\n${context.tier3}\n\n`;
  }
  
  return promptContext.trim();
}

/**
 * Analyze sentiment and extract key emotional points from user responses
 */
function analyzeSentiment(text) {
  if (!text || text.length < 10) {
    return { tone: 'neutral', confidence: 50, keyPoints: ['short response'] };
  }

  const lowerText = text.toLowerCase();
  
  // Negative sentiment indicators
  const negativeWords = ['hard', 'difficult', 'challenging', 'struggle', 'frustrating', 'confusing', 'overwhelming', 'stressful', 'boring', 'not fun', 'disappointing', 'terrible', 'awful', 'hate', 'dislike'];
  const negativePhrases = ['not that fun', 'really hard', 'too difficult', 'didn\'t like', 'wasn\'t good', 'couldn\'t understand'];
  
  // Positive sentiment indicators  
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'enjoy', 'fun', 'easy', 'helpful', 'useful', 'valuable', 'good', 'better', 'improved'];
  const positivePhrases = ['really enjoyed', 'very helpful', 'made sense', 'got better', 'clicked for me'];
  
  // Challenge/struggle indicators
  const challengeWords = ['initially', 'at first', 'in the beginning', 'started with', 'had trouble', 'took time', 'eventually', 'finally', 'but then'];
  
  let negativeScore = 0;
  let positiveScore = 0;
  let challengeScore = 0;
  const keyPoints = [];
  
  // Count negative indicators
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) {
      negativeScore += 1;
      keyPoints.push(`negative: ${word}`);
    }
  });
  
  negativePhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      negativeScore += 2;
      keyPoints.push(`negative phrase: ${phrase}`);
    }
  });
  
  // Count positive indicators
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) {
      positiveScore += 1;
      keyPoints.push(`positive: ${word}`);
    }
  });
  
  positivePhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      positiveScore += 2;
      keyPoints.push(`positive phrase: ${phrase}`);
    }
  });
  
  // Count challenge indicators
  challengeWords.forEach(word => {
    if (lowerText.includes(word)) {
      challengeScore += 1;
      keyPoints.push(`challenge: ${word}`);
    }
  });
  
  // Determine overall tone
  let tone = 'neutral';
  let confidence = 50;
  
  if (negativeScore > positiveScore && negativeScore > 0) {
    tone = 'negative';
    confidence = Math.min(90, 50 + (negativeScore * 10));
  } else if (positiveScore > negativeScore && positiveScore > 0) {
    tone = 'positive';
    confidence = Math.min(90, 50 + (positiveScore * 10));
  } else if (challengeScore > 0) {
    tone = 'challenging';
    confidence = Math.min(85, 50 + (challengeScore * 8));
  }
  
  // If there's a "but" or transition, note it
  if (lowerText.includes('but') || lowerText.includes('however') || lowerText.includes('though')) {
    keyPoints.push('transition/change mentioned');
  }
  
  return {
    tone,
    confidence,
    keyPoints: keyPoints.length > 0 ? keyPoints : ['neutral response']
  };
}

/**
 * Check if context needs regeneration (every 3 turns)
 */
export function shouldRegenerateSummary(turnNumber) {
  return turnNumber % 3 === 0;
}
