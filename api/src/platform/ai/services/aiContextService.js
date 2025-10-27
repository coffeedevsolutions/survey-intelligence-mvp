/**
 * AI Context Service
 * Provides intelligent question generation with full conversation understanding
 */

import { OpenAI } from 'openai';
import conversationTracker from '../../../core/surveys/services/conversationTrackingService.js';
import { buildRollingContext, formatContextForPrompt, shouldRegenerateSummary } from './contextBudgetService.js';
import { getSurveyTypeConfig } from '../../../config/surveyTypeConfig.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Generate contextually aware next question
 */
export async function generateContextualQuestion(sessionId, template, maxRetries = 3) {
  if (!openai) {
    console.log('⚠️ OpenAI not available, using fallback question generation');
    return generateFallbackQuestion(sessionId, template);
  }
  
  // Get comprehensive conversation context
  const context = await conversationTracker.getConversationContext(sessionId);
  const suggestions = await conversationTracker.getNextQuestionSuggestions(sessionId);
  
  // Check if we should continue
  const continuationCheck = await conversationTracker.shouldContinueConversation(sessionId);
  if (!continuationCheck.shouldContinue) {
    console.log(`🛑 Stopping conversation: ${continuationCheck.reason}`);
    return null;
  }
  
  // Check if we're in open-ended feedback phase
  const isInFeedbackPhase = continuationCheck.phase === 'open_ended_feedback';
  
  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    
    try {
      // Build rolling context with token budget management
      const { DEFAULT_SLOT_SCHEMA, loadSlotState } = await import('./slotSchemaService.js');
      const slotState = await loadSlotState(sessionId, DEFAULT_SLOT_SCHEMA);
      const rollingContext = buildRollingContext(context.conversationHistory, slotState, 1200);
      
      const questionResult = await generateQuestionWithRollingContext(rollingContext, suggestions, template, attempts, isInFeedbackPhase);
      
      if (!questionResult || !questionResult.question_text) {
        console.log(`⚠️ Attempt ${attempts}: AI returned no question`);
        continue;
      }
      
      // Check for similarity with recent questions (intent-aware)
      const similarityCheck = await conversationTracker.checkQuestionSimilarity(
        sessionId, 
        questionResult.question_text,
        0.85,
        questionResult.intent
      );
      
      if (similarityCheck.isSimilar) {
        console.log(`🔄 Attempt ${attempts}: Question too similar (${similarityCheck.maxSimilarity.toFixed(3)}), retrying...`);
        continue;
      }
      
      // Question is good, return it
      console.log(`✨ Generated contextual question (attempt ${attempts}): ${questionResult.question_text}`);
      return {
        question_text: questionResult.question_text,
        question_type: questionResult.question_type || 'text',
        intent: questionResult.intent,
        metadata: {
          ...questionResult.metadata,
          generation_attempt: attempts,
          focus_area: questionResult.focus_area,
          reasoning: questionResult.reasoning,
          expected_insights: questionResult.expected_insights,
          expected_slots: questionResult.expected_slots,
          contextTokens: rollingContext.totalTokens
        }
      };
      
    } catch (error) {
      console.error(`❌ Attempt ${attempts} failed:`, error.message);
      if (attempts === maxRetries) {
        throw error;
      }
    }
  }
  
  // If all attempts failed, use fallback
  console.log('⚠️ All AI generation attempts failed, using fallback');
  return generateFallbackQuestion(sessionId, template);
}

/**
 * Generate question using AI with full context awareness
 */
async function generateQuestionWithAI(context, suggestions, template, attempt) {
  const { conversationHistory, insightsByType, conversationState } = context;
  
  // Build conversation summary
  const conversationSummary = conversationHistory.map((turn, i) => 
    `Turn ${turn.turn}: Q: "${turn.question}" | A: "${turn.answer}"`
  ).join('\n');
  
  // Build insights summary
  const insightsSummary = Object.entries(insightsByType).map(([type, insights]) => 
    `${type}: ${insights.map(i => `"${i.value}" (${i.confidence})`).join(', ')}`
  ).join('\n');
  
  // Build areas that need more coverage
  const needsMoreCoverage = suggestions.needsMoreCoverage.join(', ');
  const wellCovered = suggestions.wellCoveredAreas.join(', ');
  
  const systemPrompt = `You are an expert business analyst conducting an intelligent survey for a project brief. Your goal is to generate the NEXT question that will efficiently gather the most valuable business information.

CRITICAL INSTRUCTIONS:
1. NEVER repeat topics already thoroughly covered
2. Focus on areas that need more information: ${needsMoreCoverage}
3. Avoid well-covered areas: ${wellCovered}
4. Generate questions that feel natural and conversational
5. Use executive-level language appropriate for business stakeholders
6. Each question should advance toward a complete project brief

CURRENT CONVERSATION CONTEXT:
${conversationSummary}

INSIGHTS ALREADY EXTRACTED:
${insightsSummary}

CONVERSATION STATE:
- Turn: ${conversationState.current_turn || 0}
- Completeness: ${((conversationState.completion_percentage || 0) * 100).toFixed(1)}%
- Topics covered: ${(conversationState.topics_covered || []).join(', ')}

TEMPLATE GOAL: ${template.ai_config?.survey_goal || 'Gather comprehensive project requirements'}

FOCUS AREAS NEEDING ATTENTION: ${needsMoreCoverage || 'completion and validation'}

Return a JSON object with:
{
  "question_text": "The next question to ask",
  "question_type": "text",
  "intent": "stakeholder_identification|problem_definition|requirements_gathering|success_metrics|timeline_constraints|budget_discussion",
  "focus_area": "which business area this targets",
  "reasoning": "why this question is valuable now",
  "expected_insights": ["insight1", "insight2"],
  "expected_slots": ["slot1", "slot2"],
  "metadata": {
    "priority": "high|medium|low",
    "category": "problem|requirements|stakeholders|success_metrics|timeline|budget"
  }
}

If no more questions are needed, return: {"question_text": null, "reasoning": "Survey complete"}`;

  const userPrompt = `Based on the conversation context above, generate the most valuable next question for this survey.

Attempt: ${attempt}/3
${attempt > 1 ? 'Previous attempts may have been too similar to existing questions. Try a different angle or topic.' : ''}

${isInFeedbackPhase ? `
OPEN-ENDED FEEDBACK MODE: Generate a question that allows the user to share any additional thoughts, concerns, or suggestions they may have. Focus on gathering additional insights rather than specific information.

` : `
Focus on: ${suggestions.suggestedFocus || 'completing missing information'}

IMPORTANT: Make sure your question builds on what the user just said and feels like a natural follow-up conversation.

SENTIMENT PRIORITY: If the user expressed negative feelings, challenges, or difficulties, address those concerns FIRST before asking about general topics or future outcomes.
`}`;

  try {
    const response = await openai.chat.completions.create({
      model: template.ai_config?.model_settings?.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: Math.min(0.1 + (attempt - 1) * 0.2, 0.7), // Increase creativity with retries
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('AI question generation error:', error);
    throw error;
  }
}

/**
 * Generate question using AI with rolling context management
 */
async function generateQuestionWithRollingContext(rollingContext, suggestions, template, attempt, isInFeedbackPhase = false) {
  const { conversationHistory, insightsByType, conversationState } = rollingContext;
  
  // Format rolling context for prompt
  const contextText = formatContextForPrompt(rollingContext);
  
  // Build areas that need more coverage
  const needsMoreCoverage = suggestions.needsMoreCoverage.join(', ');
  const wellCovered = suggestions.wellCoveredAreas.join(', ');
  
  // Get category-specific configuration
  const surveyCategory = template.category || 'general';
  const categoryConfig = getSurveyTypeConfig(surveyCategory);
  
  const systemPrompt = `You are an expert survey designer conducting an intelligent survey. Your goal is to generate the NEXT question that will efficiently gather the most valuable information based on the survey's specific purpose.

${isInFeedbackPhase ? `
🎯 OPEN-ENDED FEEDBACK PHASE:
You are now in the open-ended feedback phase. The core survey objectives have been met, and you should generate questions that:
- Allow the user to share any additional thoughts or concerns
- Encourage reflection on their overall experience
- Ask about anything they feel was not adequately covered
- Use phrases like "Is there anything else..." or "What else would you like to share..."
- Be more conversational and less structured
- Focus on gathering additional insights rather than specific information

Examples of good open-ended feedback questions:
- "Is there anything else about your experience that you'd like to share?"
- "What other thoughts or suggestions do you have that we haven't covered?"
- "Is there anything that could have made your experience better?"
- "What would you tell someone else about this experience?"

` : `
CRITICAL INSTRUCTIONS:
1. NEVER repeat topics already thoroughly covered
2. Focus on areas that need more information: ${needsMoreCoverage}
3. Avoid well-covered areas: ${wellCovered}
4. Generate questions that feel natural and conversational
5. Use language appropriate for the survey's target audience
6. Each question should advance toward the survey's specific goal
7. Build on previous answers - ask follow-up questions that relate to what the user just said
8. PAY ATTENTION TO SENTIMENT - if the user expressed negative feelings, challenges, or difficulties, ask follow-up questions that explore those issues rather than focusing on positive aspects
9. If the user mentioned struggles or problems, dig deeper into understanding those challenges
10. If the user mentioned positive experiences, explore what made those experiences positive
11. PRIORITIZE IMMEDIATE CONCERNS - if the user mentioned specific problems or difficulties, ask about those FIRST before moving to general topics
12. FOLLOW THE EMOTIONAL THREAD - if the user expressed frustration, confusion, or difficulty, explore that emotional experience before asking about outcomes or benefits
`}

SENTIMENT ANALYSIS GUIDANCE:
- If sentiment is NEGATIVE: Ask about specific challenges, difficulties, or problems they faced
- If sentiment is CHALLENGING: Ask about what made it difficult initially and how they overcame it
- If sentiment is POSITIVE: Ask about what made the experience good and how to replicate it
- If sentiment shows TRANSITION: Ask about the change process and what caused the shift

QUESTION PRIORITY ORDER:
1. FIRST: Address immediate concerns, problems, or difficulties mentioned
2. SECOND: Explore the emotional experience and specific challenges
3. THIRD: Understand the transition or change process (if mentioned)
4. FOURTH: Ask about positive aspects or outcomes (only after addressing concerns)

EXAMPLE FOR NEGATIVE/CHALLENGING SENTIMENT:
User says: "It was really hard at first and not that fun, but..."
GOOD questions: "What made it hard initially?", "What specific aspects were challenging?", "How did your experience change?"
AVOID: "What skills will be beneficial?", "How will you measure success?", "What outcomes do you hope for?"

${contextText}

SURVEY GOAL: ${template.ai_config?.survey_goal || 'Gather comprehensive information'}
TARGET OUTCOME: ${template.ai_config?.target_outcome || 'Complete understanding of the topic'}
${template.ai_config?.ai_instructions ? `CUSTOM INSTRUCTIONS: ${template.ai_config.ai_instructions}` : ''}

--- CATEGORY-SPECIFIC GUIDANCE ---
Survey Category: ${categoryConfig.name}

As you conduct this survey, additionally consider your role as: ${categoryConfig.promptEnhancement?.roleDescription || 'a professional survey conductor'}

Category-Specific Priorities (apply these alongside the survey goal):
${(categoryConfig.promptEnhancement?.keyPriorities || []).map((p, i) => `${i+1}. ${p}`).join('\n')}

Recommended Language Tone: ${categoryConfig.promptEnhancement?.languageTone || 'professional'}

Category-Specific Sentiment Handling:
${categoryConfig.analysisDirectives?.sentimentHandling || 'Handle sentiment appropriately based on context'}

Keywords to Watch For: ${(categoryConfig.analysisDirectives?.keywordFocus || []).join(', ')}

Patterns to Avoid for This Category: ${(categoryConfig.promptEnhancement?.avoidancePatterns || []).join(', ')}

Note: These category guidelines complement your main survey goal and should enhance, not replace, the custom instructions above.

FOCUS AREAS NEEDING ATTENTION: ${needsMoreCoverage || 'completion and validation'}

Return a JSON object with:
{
  "question_text": "The next question to ask",
  "question_type": "text",
  "intent": "follow_up|clarification|exploration|validation|completion",
  "focus_area": "which area this targets",
  "reasoning": "why this question is valuable now",
  "expected_insights": ["insight1", "insight2"],
  "expected_slots": ["slot1", "slot2"],
  "metadata": {
    "priority": "high|medium|low",
    "category": "follow_up|clarification|exploration|validation|completion"
  }
}

If no more questions are needed, return: {"question_text": null, "reasoning": "Survey complete"}`;

  const userPrompt = `Based on the conversation context above, generate the most valuable next question for this survey.

Attempt: ${attempt}/3
${attempt > 1 ? 'Previous attempts may have been too similar to existing questions. Try a different angle or topic.' : ''}

${isInFeedbackPhase ? `
OPEN-ENDED FEEDBACK MODE: Generate a question that allows the user to share any additional thoughts, concerns, or suggestions they may have. Focus on gathering additional insights rather than specific information.

` : `
Focus on: ${suggestions.suggestedFocus || 'completing missing information'}

IMPORTANT: Make sure your question builds on what the user just said and feels like a natural follow-up conversation.

SENTIMENT PRIORITY: If the user expressed negative feelings, challenges, or difficulties, address those concerns FIRST before asking about general topics or future outcomes.
`}`;

  try {
    // Import config for two-tier model policy
    const { OPTIMIZATION_CONFIG } = await import('../../../config/surveyOptimization.js');
    const aiConfig = OPTIMIZATION_CONFIG.AI;
    
    const response = await openai.chat.completions.create({
      model: aiConfig.QUESTION_GENERATION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: Math.min(aiConfig.QUESTION_GENERATION_TEMPERATURE + (attempt - 1) * 0.2, 0.7), // Increase creativity with retries
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('AI question generation error:', error);
    throw error;
  }
}

/**
 * Fallback question generation when AI is not available
 */
async function generateFallbackQuestion(sessionId, template) {
  const context = await conversationTracker.getConversationContext(sessionId);
  const suggestions = await conversationTracker.getNextQuestionSuggestions(sessionId);
  
  // Simple fallback based on missing areas
  const fallbackQuestions = {
    'problem_definition': "What specific challenges or pain points is this project intended to address?",
    'success_metrics': "How will you measure the success of this project? What specific metrics or KPIs are important?",
    'stakeholders': "Who are the key stakeholders that will be affected by or involved in this project?",
    'requirements': "What are the essential requirements or features that this solution must have?",
    'timeline': "What is your expected timeline for this project? Are there any critical deadlines?",
    'budget': "Do you have budget constraints or considerations that should influence the solution approach?"
  };
  
  // Pick the first area that needs coverage
  const focusArea = suggestions.needsMoreCoverage[0];
  const questionText = fallbackQuestions[focusArea] || "Is there anything else important about this project that we should discuss?";
  
  return {
    question_text: questionText,
    question_type: 'text',
    metadata: {
      generation_method: 'fallback',
      focus_area: focusArea,
      reasoning: 'AI not available, using template-based fallback'
    }
  };
}

/**
 * Analyze conversation for completion and next steps
 */
export async function analyzeConversationCompletion(sessionId) {
  const context = await conversationTracker.getConversationContext(sessionId);
  const continuationCheck = await conversationTracker.shouldContinueConversation(sessionId);
  
  if (!openai) {
    return {
      isComplete: !continuationCheck.shouldContinue,
      completeness: continuationCheck.completeness,
      reason: continuationCheck.reason,
      nextSteps: continuationCheck.shouldContinue ? ['Continue with basic questions'] : ['Generate project brief']
    };
  }
  
  try {
    const analysisPrompt = `You are analyzing a business survey conversation to determine if enough information has been gathered to create a comprehensive project brief.

CONVERSATION HISTORY:
${context.conversationHistory.map(turn => 
  `Q: ${turn.question}\nA: ${turn.answer}`
).join('\n\n')}

EXTRACTED INSIGHTS:
${Object.entries(context.insightsByType).map(([type, insights]) => 
  `${type}: ${insights.map(i => i.value).join(', ')}`
).join('\n')}

Analyze this conversation and return JSON:
{
  "isComplete": true/false,
  "completeness": 0.0-1.0,
  "reason": "why complete or incomplete",
  "strengths": ["what information is well captured"],
  "gaps": ["what critical information is missing"],
  "nextSteps": ["recommended next actions"],
  "briefReadiness": 0.0-1.0
}

A conversation is complete when it has sufficient information for a meaningful project brief covering problem, stakeholders, requirements, success metrics, and basic timeline/constraints.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Conversation analysis error:', error);
    return {
      isComplete: !continuationCheck.shouldContinue,
      completeness: continuationCheck.completeness,
      reason: continuationCheck.reason + ' (AI analysis failed)',
      nextSteps: continuationCheck.shouldContinue ? ['Continue with questions'] : ['Generate brief']
    };
  }
}

/**
 * Generate enhanced project brief with full conversation understanding
 */
export async function generateEnhancedBrief(sessionId, template) {
  const context = await conversationTracker.getConversationContext(sessionId);
  
  if (!openai) {
    return generateFallbackBrief(context, template);
  }
  
  try {
    const briefPrompt = `You are creating a comprehensive project brief based on a business survey conversation.

CONVERSATION HISTORY:
${context.conversationHistory.map(turn => 
  `Q: ${turn.question}\nA: ${turn.answer}`
).join('\n\n')}

EXTRACTED INSIGHTS:
${Object.entries(context.insightsByType).map(([type, insights]) => 
  `${type}: ${insights.map(i => `${i.value} (confidence: ${i.confidence})`).join(', ')}`
).join('\n')}

Create a professional project brief following this structure:

# Project Brief: [Intelligent Title]

## Executive Summary
[2-3 sentences summarizing the project]

## Problem Statement
[Clear description of the business problem or opportunity]

## Affected Stakeholders
[Who is impacted and their roles]

## Current State & Pain Points
[What's not working well today]

## Desired Outcomes
[What success looks like]

## Success Metrics & KPIs
[How success will be measured]

## Requirements & Constraints
[Essential features and limitations]

## Timeline & Dependencies
[Key dates and dependencies]

## Next Steps
[Recommended actions]

Make this brief professional, actionable, and comprehensive. Use the conversation insights to create a document that clearly communicates the project need and scope.`;

    const response = await openai.chat.completions.create({
      model: template.ai_config?.model_settings?.model || "gpt-4o-mini",
      messages: [{ role: "user", content: briefPrompt }],
      temperature: 0.2,
      max_tokens: 2000
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Enhanced brief generation error:', error);
    return generateFallbackBrief(context, template);
  }
}

/**
 * Fallback brief generation
 */
function generateFallbackBrief(context, template) {
  const { conversationHistory, insightsByType } = context;
  
  const painPoints = (insightsByType.pain_point_discussed || []).map(i => i.value).join('\n- ');
  const kpis = (insightsByType.kpi_mentioned || []).map(i => i.value).join('\n- ');
  const stakeholders = (insightsByType.stakeholder_identified || []).map(i => i.value).join('\n- ');
  const requirements = (insightsByType.requirement_identified || []).map(i => i.value).join('\n- ');
  
  return `# Project Brief

## Executive Summary
Based on the survey responses, this project addresses key business needs identified through stakeholder consultation.

## Problem Statement
${painPoints || 'Business challenges identified during discovery session.'}

## Stakeholders
${stakeholders || 'Key stakeholders to be identified.'}

## Success Metrics
${kpis || 'Success metrics to be defined.'}

## Requirements
${requirements || 'Requirements to be detailed.'}

## Conversation Summary
${conversationHistory.map((turn, i) => 
  `**Question ${i + 1}:** ${turn.question}\n**Response:** ${turn.answer}`
).join('\n\n')}

## Next Steps
- Review and validate requirements with stakeholders
- Define detailed success metrics
- Create implementation roadmap
`;
}

export default {
  generateContextualQuestion,
  analyzeConversationCompletion,
  generateEnhancedBrief
};
