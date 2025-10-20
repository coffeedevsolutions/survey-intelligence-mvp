/**
 * AI Context Service
 * Provides intelligent question generation with full conversation understanding
 */

import { OpenAI } from 'openai';
import conversationTracker from './conversationTrackingService.js';

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
  
  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    
    try {
      const questionResult = await generateQuestionWithAI(context, suggestions, template, attempts);
      
      if (!questionResult || !questionResult.question_text) {
        console.log(`⚠️ Attempt ${attempts}: AI returned no question`);
        continue;
      }
      
      // Check for similarity with recent questions
      const similarityCheck = await conversationTracker.checkQuestionSimilarity(
        sessionId, 
        questionResult.question_text,
        0.85
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
        metadata: {
          ...questionResult.metadata,
          generation_attempt: attempts,
          focus_area: questionResult.focus_area,
          reasoning: questionResult.reasoning,
          expected_insights: questionResult.expected_insights
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
  "focus_area": "which business area this targets",
  "reasoning": "why this question is valuable now",
  "expected_insights": ["insight1", "insight2"],
  "metadata": {
    "priority": "high|medium|low",
    "category": "problem|requirements|stakeholders|success_metrics|timeline|budget"
  }
}

If no more questions are needed, return: {"question_text": null, "reasoning": "Survey complete"}`;

  const userPrompt = `Based on the conversation context above, generate the most valuable next question for this business survey.

Attempt: ${attempt}/3
${attempt > 1 ? 'Previous attempts may have been too similar to existing questions. Try a different angle or topic.' : ''}

Focus on: ${suggestions.suggestedFocus || 'completing missing information'}

Generate a question that advances the conversation toward a complete project brief.`;

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
