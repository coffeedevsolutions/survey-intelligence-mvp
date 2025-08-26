/**
 * Adaptive Survey Engine
 * 
 * Handles dynamic question flow based on:
 * - Static graph edges
 * - Rule-based logic 
 * - AI-suggested follow-ups
 * - Fact completion requirements
 */

// Extract facts from answers based on question configuration
export function extractFactsFromAnswer(question, answerText) {
  const facts = {};
  
  if (question.factKeys && Array.isArray(question.factKeys)) {
    question.factKeys.forEach(key => {
      // Simple extraction - store the answer text under each fact key
      // In production, could add more sophisticated parsing/normalization
      facts[key] = answerText.trim();
    });
  }
  
  return facts;
}

// Check if rules match current state
export function evaluateRules(rules, sessionState) {
  if (!rules || !Array.isArray(rules)) return null;
  
  const { answers, facts } = sessionState;
  const latestAnswer = answers[answers.length - 1];
  
  for (const rule of rules) {
    if (rule.if && rule.then) {
      // Handle "contains" rule type
      if (rule.if.contains) {
        const { questionId, pattern } = rule.if.contains;
        
        // Check if latest answer matches the rule
        if (latestAnswer && latestAnswer.questionId === questionId) {
          const text = latestAnswer.text.toLowerCase();
          const searchPattern = pattern.toLowerCase();
          
          if (text.includes(searchPattern)) {
            // Rule matched! Return the suggested question
            if (rule.then.ask) {
              return {
                id: rule.then.ask.id || `rule_${Date.now()}`,
                text: rule.then.ask.text,
                type: rule.then.ask.type || 'text',
                factKeys: rule.then.ask.factKeys || []
              };
            }
          }
        }
      }
      
      // Handle "threshold" rule type for numeric values
      if (rule.if.threshold) {
        const { factKey, operator, value } = rule.if.threshold;
        const factValue = facts[factKey];
        
        if (factValue !== undefined) {
          const numValue = parseFloat(factValue);
          const targetValue = parseFloat(value);
          
          if (!isNaN(numValue) && !isNaN(targetValue)) {
            let conditionMet = false;
            
            switch (operator) {
              case '>': conditionMet = numValue > targetValue; break;
              case '<': conditionMet = numValue < targetValue; break;
              case '>=': conditionMet = numValue >= targetValue; break;
              case '<=': conditionMet = numValue <= targetValue; break;
              case '==': conditionMet = numValue === targetValue; break;
            }
            
            if (conditionMet && rule.then.ask) {
              return {
                id: rule.then.ask.id || `rule_${Date.now()}`,
                text: rule.then.ask.text,
                type: rule.then.ask.type || 'text', 
                factKeys: rule.then.ask.factKeys || []
              };
            }
          }
        }
      }
    }
  }
  
  return null;
}

// Follow static edges in the flow graph
export function getNextQuestionFromEdges(flow, currentQuestionId) {
  if (!flow.edges || !Array.isArray(flow.edges)) return null;
  
  const edge = flow.edges.find(e => e.from === currentQuestionId);
  if (!edge) return null;
  
  const nextQuestion = flow.questions.find(q => q.id === edge.to);
  return nextQuestion || null;
}

// Check if all required facts are present for completion
export function isFlowComplete(flow, facts) {
  if (!flow.completion || !flow.completion.requiredFacts) return false;
  
  const required = flow.completion.requiredFacts;
  return required.every(factKey => {
    const value = facts[factKey];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}

// Calculate completion percentage based on required facts
export function getCompletionPercentage(flow, facts) {
  if (!flow.completion || !flow.completion.requiredFacts) return 0;
  
  const required = flow.completion.requiredFacts;
  const completed = required.filter(factKey => {
    const value = facts[factKey];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
  
  return Math.round((completed.length / required.length) * 100);
}

// Main function to determine next question
export function getNextQuestion(flow, sessionState) {
  const { currentQuestionId, answers, facts } = sessionState;
  
  // 1. Check rules first (highest priority)
  const ruleQuestion = evaluateRules(flow.rules, sessionState);
  if (ruleQuestion) {
    return ruleQuestion;
  }
  
  // 2. Check if flow is complete
  if (isFlowComplete(flow, facts)) {
    return null; // Survey complete
  }
  
  // 3. Follow edges from current question
  if (currentQuestionId) {
    const edgeQuestion = getNextQuestionFromEdges(flow, currentQuestionId);
    if (edgeQuestion) {
      return edgeQuestion;
    }
  }
  
  // 4. If no current question (start of survey), return first question
  if (!currentQuestionId && flow.questions && flow.questions.length > 0) {
    return flow.questions.find(q => q.id === 'intro') || flow.questions[0];
  }
  
  // 5. No more questions available - mark as complete
  return null;
}

// AI prompts for fact extraction and question suggestion
export const AI_PROMPTS = {
  FACT_EXTRACTION_SYSTEM: `You are an assistant extracting structured facts from survey answers for an internal project brief. Only return JSON. Do not include explanations.`,
  
  FACT_EXTRACTION_USER: (questionId, text, answers, facts, rules) => `
Latest answer:
Question: ${questionId}
Text: ${text}

History:
${JSON.stringify(answers, null, 2)}

Current facts:
${JSON.stringify(facts, null, 2)}

Rules summary:
${JSON.stringify(rules, null, 2)}

Return JSON:
{
  "updated_facts": [{"key":"...", "value":"..."}],
  "next_question_text": "..."  // optional; if more detail is needed
}`,

  BRIEF_GENERATION_SYSTEM: `You write concise project briefs using the provided Markdown template and facts. Keep sections crisp, actionable, and free of fluff.`,
  
  BRIEF_GENERATION_USER: (templateMd, facts) => `
Template:
${templateMd}

Facts:
${JSON.stringify(facts, null, 2)}

Return the final Markdown body only.`
};

// Helper function to safely parse AI JSON responses
export function parseAIResponse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    // Try to extract JSON from response if it's wrapped in other text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error2) {
        console.warn('Failed to parse AI JSON response:', error2);
        return {};
      }
    }
    console.warn('Invalid AI JSON response:', error);
    return {};
  }
}

// Template rendering function
export function renderTemplate(templateMd, facts) {
  if (!templateMd || typeof templateMd !== 'string') {
    return '# Brief\n\nNo template provided.';
  }
  
  let rendered = templateMd;
  
  // Replace {{fact_key}} placeholders with actual values
  Object.entries(facts).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const displayValue = value || '(not provided)';
    rendered = rendered.replace(placeholder, displayValue);
  });
  
  // Clean up any remaining unreplaced placeholders
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '(not provided)');
  
  return rendered;
}

// Default flow template for backward compatibility with existing surveys
export const DEFAULT_FLOW_SPEC = {
  questions: [
    { 
      id: "intro", 
      text: "Briefly describe the problem.", 
      type: "text", 
      factKeys: ["problem_statement"] 
    },
    { 
      id: "impact", 
      text: "Who is affected and what is the impact?", 
      type: "text", 
      factKeys: ["affected_users", "impact_metric"] 
    },
    { 
      id: "data", 
      text: "What data/systems are involved?", 
      type: "text", 
      factKeys: ["data_sources"] 
    },
    { 
      id: "workaround", 
      text: "Current workaround?", 
      type: "text", 
      factKeys: ["current_workaround"] 
    },
    { 
      id: "deadline", 
      text: "Any deadline or constraints?", 
      type: "text", 
      factKeys: ["deadline"] 
    }
  ],
  edges: [
    { from: "intro", to: "impact" },
    { from: "impact", to: "data" },
    { from: "data", to: "workaround" },
    { from: "workaround", to: "deadline" }
  ],
  rules: [
    { 
      if: { 
        contains: { 
          questionId: "data", 
          pattern: "Salesforce" 
        }
      }, 
      then: { 
        ask: { 
          id: "sf_specific", 
          text: "Which Salesforce objects are needed?",
          factKeys: ["salesforce_objects"]
        } 
      } 
    }
  ],
  completion: { 
    requiredFacts: ["problem_statement", "affected_users", "impact_metric", "data_sources", "deadline"] 
  }
};

export const DEFAULT_TEMPLATE = `# Project Brief

**Problem Statement**  
{{problem_statement}}

**Who is affected**  
{{affected_users}}

**Impact**  
{{impact_metric}}

**Desired outcomes**  
{{desired_outcomes}}

**Data sources/systems**  
{{data_sources}}

**Current workaround**  
{{current_workaround}}

**Constraints (security/compliance)**  
{{constraints}}

**Risks & assumptions**  
{{risks}}

**Deadline/dependencies**  
{{deadline}}

**Acceptance criteria**  
- Captures the problem and impacted users
- Lists data sources and desired outputs
- Defines success in measurable terms

**Effort (T-shirt)**  
{{effort_estimate}}
`;
