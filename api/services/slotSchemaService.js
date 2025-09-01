/**
 * Slot Schema Service
 * Manages slot-based survey question generation and brief building
 */

import { OpenAI } from 'openai';
import { pool } from '../config/database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Default Business Brief Slot Schema
 */
export const DEFAULT_SLOT_SCHEMA = {
  "ExecutiveSummary": {
    "type": "string",
    "required": true,
    "min_confidence": 0.8,
    "depends_on": ["ProblemStatement", "ExpectedOutcomes"],
    "scope": "narrow",
    "description": "Comprehensive 3-4 sentence executive overview"
  },
  "ProblemStatement": {
    "type": "string", 
    "required": true,
    "min_confidence": 0.9,
    "scope": "broad",
    "description": "Clear definition of the core issue with business context"
  },
  "CurrentProcess": {
    "type": "string",
    "required": true,
    "min_confidence": 0.8,
    "scope": "broad",
    "description": "Current workflow or process description"
  },
  "Challenges": {
    "type": "array",
    "required": true,
    "min_items": 2,
    "min_confidence": 0.7,
    "semantic_merge_with": ["ProblemStatement"],
    "description": "Specific challenges and pain points"
  },
  "Requirements": {
    "type": "array",
    "required": true,
    "min_items": 3,
    "min_confidence": 0.8,
    "requires_explicit_question": true,
    "merged_from": ["FunctionalRequirements", "FeaturesCapabilities"],
    "description": "Functional requirements and desired capabilities"
  },
  "OutcomesAndMetrics": {
    "type": "array", 
    "required": true,
    "min_items": 2,
    "min_confidence": 0.8,
    "requires_explicit_question": true,
    "merged_from": ["ExpectedOutcomes", "SuccessMetrics"],
    "description": "Expected outcomes and success metrics with quantifiable targets"
  },
  "Stakeholders": {
    "type": "array",
    "required": true,
    "min_confidence": 0.9,
    "min_items": 2,
    "requires_explicit_question": true,
    "no_inference": true,
    "description": "Affected stakeholders and their roles"
  },
  "Dependencies": {
    "type": "array",
    "required": false,
    "min_confidence": 0.7,
    "description": "External dependencies and constraints"
  },
  "Constraints": {
    "type": "array",
    "required": false,
    "min_confidence": 0.7,
    "description": "Budget, timeline, or technical constraints"
  },
  "Risks": {
    "type": "array",
    "required": false,
    "min_confidence": 0.7,
    "description": "Potential risks and mitigation strategies"
  },
  "ROIFrame": {
    "type": "object",
    "required": true,
    "min_confidence": 0.9,
    "min_detail_level": "specific",
    "requires_explicit_question": true,
    "no_inference": true,
    "properties": {
      "time_saved_hours_per_cycle": "number",
      "rework_reduction_pct": "number", 
      "attrition_reduction_pct": "number",
      "cycle_time_reduction_pct": "number"
    },
    "description": "Quantifiable ROI metrics and business impact"
  }
};

/**
 * Slot State Management Class
 */
export class SlotState {
  constructor(schema, sessionId) {
    this.sessionId = sessionId;
    this.schema = schema;
    this.slots = {};
    this.conversationHistory = [];
    this.questionHistory = []; // Track what we've asked to avoid repetition
    this.lastQuestionTime = null;
    this.totalQuestions = 0;
    
    // Initialize all slots
    Object.keys(schema).forEach(slotName => {
      this.slots[slotName] = {
        value: null,
        confidence: 0.0,
        provenance: [], // Which answers contributed
        lastAsked: null,
        attempts: 0,
        extractedFrom: [],
        explicitlyAsked: false // Track if this slot had a dedicated question
      };
    });
  }

  /**
   * Check if a slot needs a question
   */
  needsQuestion(slotName, minConfidence = null) {
    const slot = this.slots[slotName];
    const schema = this.schema[slotName];
    const threshold = minConfidence || schema.min_confidence || 0.7;
    
    // Basic confidence check
    const hasLowConfidence = !slot.value || slot.confidence < threshold;
    
    // Check if this slot requires explicit questioning
    if (schema.requires_explicit_question && !slot.explicitlyAsked) {
      return true; // Always needs a question if not explicitly asked
    }
    
    return hasLowConfidence;
  }

  /**
   * Update slot with new information
   */
  updateSlot(slotName, value, confidence, answerSource) {
    if (!this.slots[slotName]) return;
    
    this.slots[slotName] = {
      ...this.slots[slotName],
      value,
      confidence: Math.max(this.slots[slotName].confidence, confidence),
      provenance: [...this.slots[slotName].provenance, answerSource],
      extractedFrom: [...this.slots[slotName].extractedFrom, {
        answer: answerSource,
        timestamp: new Date().toISOString(),
        confidence
      }]
    };
  }

  /**
   * Check if dependencies are satisfied for a slot
   */
  dependenciesSatisfied(slotName) {
    const schema = this.schema[slotName];
    if (!schema.depends_on) return true;
    
    return schema.depends_on.every(dep => 
      this.slots[dep] && this.slots[dep].confidence >= (this.schema[dep].min_confidence || 0.6)
    );
  }

  /**
   * Get completion summary
   */
  getCompletionSummary() {
    const total = Object.keys(this.schema).length;
    const completed = Object.values(this.slots).filter(slot => 
      slot.confidence >= (this.schema[Object.keys(this.slots).find(k => this.slots[k] === slot)].min_confidence || 0.7)
    ).length;
    
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      readySlots: Object.keys(this.slots).filter(name => 
        this.slots[name].confidence >= (this.schema[name].min_confidence || 0.7)
      ),
      missingSlots: Object.keys(this.slots).filter(name => 
        this.needsQuestion(name)
      )
    };
  }

  /**
   * Get slots ready for brief generation
   */
  getReadySlots() {
    const readySlots = {};
    Object.entries(this.slots).forEach(([name, slot]) => {
      const schema = this.schema[name];
      if (slot.confidence >= (schema.min_confidence || 0.7)) {
        readySlots[name] = slot.value;
      }
    });
    return readySlots;
  }

  /**
   * Check if we have enough information for a basic brief
   */
  canGenerateBrief() {
    const requiredSlots = Object.keys(this.schema).filter(name => this.schema[name].required);
    const completedRequired = requiredSlots.filter(name => 
      this.slots[name].confidence >= (this.schema[name].min_confidence || 0.7)
    );
    
    // More strict requirements:
    // 1. ALL required slots must be completed (100%)
    // 2. Minimum 6 questions asked (more comprehensive)
    // 3. Must have spent at least some effort on key business areas
    const hasAllRequiredSlots = completedRequired.length >= requiredSlots.length;
    const hasMinimumQuestions = this.totalQuestions >= 6;
    
    // Additional check: ensure we have meaningful detail in critical areas
    const hasDetailedCurrentProcess = this.slots.CurrentProcess && 
      this.slots.CurrentProcess.confidence >= 0.8 && 
      this.slots.CurrentProcess.value && 
      this.slots.CurrentProcess.value.length > 50;
      
    const hasDetailedStakeholders = this.slots.Stakeholders && 
      this.slots.Stakeholders.confidence >= 0.8 && 
      this.slots.Stakeholders.value && 
      Array.isArray(this.slots.Stakeholders.value) && 
      this.slots.Stakeholders.value.length >= 2;
    
    // Debug explicit questioning requirements
    const explicitRequirements = {};
    requiredSlots.forEach(slotName => {
      const slot = this.slots[slotName];
      const schema = this.schema[slotName];
      explicitRequirements[slotName] = {
        needsExplicit: schema.requires_explicit_question,
        explicitlyAsked: slot.explicitlyAsked,
        confidence: slot.confidence,
        hasValue: !!slot.value
      };
    });

    console.log('📋 Brief generation criteria check:', {
      requiredSlots: requiredSlots.length,
      completedRequired: completedRequired.length,
      hasAllRequiredSlots,
      totalQuestions: this.totalQuestions,
      hasMinimumQuestions,
      hasDetailedCurrentProcess,
      hasDetailedStakeholders,
      explicitRequirements
    });
    
    // Additional check: Has user given the same answer multiple times? (indicates completion)
    const hasRepetitiveAnswers = this.conversationHistory.length >= 3 && 
      this.conversationHistory.slice(-3).some(entry => 
        entry.answer.toLowerCase().includes('story points') && 
        entry.answer.toLowerCase().includes('burndown')
      );
    
    if (hasRepetitiveAnswers && this.totalQuestions >= 4) {
      console.log('🔄 Detected repetitive answers - user likely done providing information');
      return true;
    }
    
    return hasAllRequiredSlots && hasMinimumQuestions && hasDetailedCurrentProcess && hasDetailedStakeholders;
  }
}

/**
 * Question Templates with Slot Targeting
 */
export const QUESTION_TEMPLATES = [
  {
    "id": "problem_and_impact",
    "prompt": "Describe the problem you need to solve and how it's currently impacting your work or team.",
    "slot_targets": ["ProblemStatement", "Challenges"],
    "scope": "broad",
    "dependencies": [],
    "max_tokens": 200,
    "priority": 10,
    "ask_if": (state) => state.needsQuestion("ProblemStatement") || state.needsQuestion("Challenges")
  },
  {
    "id": "current_process_and_gaps",
    "prompt": "What's your current process or approach for handling this, and where does it fall short?",
    "slot_targets": ["CurrentProcess"],
    "scope": "broad", 
    "dependencies": ["ProblemStatement"],
    "max_tokens": 150,
    "priority": 9,
    "ask_if": (state) => state.needsQuestion("CurrentProcess")
  },
  {
    "id": "requirements_merged",
    "prompt": "What capabilities or features would solve these challenges? What would an ideal solution include?",
    "slot_targets": ["Requirements"],
    "scope": "broad",
    "dependencies": ["Challenges"],
    "max_tokens": 150,
    "priority": 7,
    "ask_if": (state) => state.needsQuestion("Requirements")
  },
  {
    "id": "outcomes_and_metrics",
    "prompt": "What outcomes do you want to achieve, and how would you measure success?",
    "slot_targets": ["OutcomesAndMetrics"],
    "scope": "broad", 
    "dependencies": ["Requirements"],
    "max_tokens": 120,
    "priority": 6,
    "ask_if": (state) => state.needsQuestion("OutcomesAndMetrics")
  },
  {
    "id": "stakeholders_identification",
    "prompt": "Who would be affected by this change? Which teams, roles, or departments are involved?",
    "slot_targets": ["Stakeholders"],
    "scope": "narrow",
    "dependencies": ["ProblemStatement"],
    "max_tokens": 100,
    "priority": 5,
    "ask_if": (state) => state.needsQuestion("Stakeholders")
  },

  {
    "id": "detailed_current_process",
    "prompt": "Walk me through your current process step-by-step - what happens first, then what, and where do things typically break down?",
    "slot_targets": ["CurrentProcess"],
    "scope": "detailed",
    "dependencies": ["ProblemStatement"],
    "max_tokens": 200,
    "priority": 8,
    "ask_if": (state) => state.needsQuestion("CurrentProcess") || (state.slots.CurrentProcess && state.slots.CurrentProcess.confidence < 0.8)
  },
  {
    "id": "stakeholder_details",
    "prompt": "Who specifically is affected by this issue? Include their roles, how it impacts them, and who would be involved in implementing a solution.",
    "slot_targets": ["Stakeholders"],
    "scope": "detailed",
    "dependencies": ["ProblemStatement"],
    "max_tokens": 150,
    "priority": 7,
    "ask_if": (state) => state.needsQuestion("Stakeholders") || (state.slots.Stakeholders && state.slots.Stakeholders.confidence < 0.8)
  },
  {
    "id": "roi_quantification",
    "prompt": "Can you estimate any time savings, efficiency gains, or cost reductions this would provide?",
    "slot_targets": ["ROIFrame"],
    "scope": "narrow",
    "dependencies": ["OutcomesAndMetrics"],
    "max_tokens": 120,
    "priority": 5,
    "ask_if": (state) => state.needsQuestion("ROIFrame")
  },
  {
    "id": "baseline_measurement",
    "prompt": "How much time do you or your team currently spend on this per day/week/month? What does the current state look like in numbers?",
    "slot_targets": ["ROIFrame"],
    "scope": "quantitative",
    "dependencies": ["CurrentProcess"],
    "max_tokens": 150,
    "priority": 6,
    "ask_if": (state) => state.needsQuestion("ROIFrame")
  },
  {
    "id": "success_metrics",
    "prompt": "What would success look like numerically? (e.g., reduce time by X%, improve accuracy to Y%, handle Z more requests)",
    "slot_targets": ["OutcomesAndMetrics", "ROIFrame"],
    "scope": "quantitative",
    "dependencies": ["Requirements"],
    "max_tokens": 150,
    "priority": 5,
    "ask_if": (state) => state.needsQuestion("OutcomesAndMetrics") || state.needsQuestion("ROIFrame")
  },
  {
    "id": "constraints_and_integrations", 
    "prompt": "Are there any technical constraints, budget limits, or existing systems this needs to integrate with?",
    "slot_targets": ["Constraints", "Dependencies"],
    "scope": "practical",
    "dependencies": ["Requirements"],
    "max_tokens": 120,
    "priority": 4,
    "ask_if": (state) => state.needsQuestion("Constraints") || state.needsQuestion("Dependencies")
  },
  {
    "id": "confirmation_summary",
    "prompt": "Let me summarize what I understand: {summary}. Is this accurate, or should I clarify anything?",
    "slot_targets": ["ExecutiveSummary"],
    "scope": "confirm",
    "dependencies": ["ProblemStatement", "OutcomesAndMetrics"],
    "max_tokens": 50,
    "priority": 1,
    "ask_if": (state) => {
      const summary = state.getCompletionSummary();
      return summary.completed >= 5 && state.needsQuestion("ExecutiveSummary");
    }
  }
];

/**
 * Select the next best question based on slot state
 */
export function selectNextQuestion(slotState, templates = QUESTION_TEMPLATES) {
  console.log('🔍 SLOT SELECTION DEBUG:');
  console.log('Total questions asked so far:', slotState.totalQuestions);
  console.log('Slot completion status:');
  Object.entries(slotState.slots).forEach(([name, slot]) => {
    const schema = slotState.schema[name];
    const minConfidence = schema.min_confidence || 0.7;
    const isComplete = slot.confidence >= minConfidence;
    console.log(`  ${name}: ${isComplete ? '✅' : '❌'} confidence=${slot.confidence.toFixed(2)}, threshold=${minConfidence}, value=${slot.value ? 'SET' : 'EMPTY'}`);
  });

  // Filter templates that pass dependency checks and ask_if conditions
  const candidates = templates.filter(template => {
    try {
      const askIfResult = template.ask_if(slotState);
      
      // Check if template dependencies (slot names) are satisfied
      const depsResult = template.dependencies.every(depSlotName => {
        const depSlot = slotState.slots[depSlotName];
        const depSchema = slotState.schema[depSlotName];
        const minConfidence = depSchema ? (depSchema.min_confidence || 0.7) : 0.7;
        const satisfied = depSlot && depSlot.confidence >= minConfidence;
        
        console.log(`    Dependency ${depSlotName}: confidence=${depSlot ? depSlot.confidence.toFixed(2) : 0}, threshold=${minConfidence}, satisfied=${satisfied}`);
        return satisfied;
      });
      
      const passes = askIfResult && depsResult;
      
      console.log(`  Template ${template.id}: ask_if=${askIfResult}, deps=${depsResult}, passes=${passes}`);
      
      return passes;
    } catch (error) {
      console.error('Error evaluating question template:', template.id, error);
      return false;
    }
  });

  console.log(`Found ${candidates.length} candidate templates`);

  if (candidates.length === 0) {
    console.log('❌ NO CANDIDATES FOUND - Survey will end');
    return null; // No more questions needed
  }

  // Score candidates by priority and information gain
  const scored = candidates.map(template => {
    const coverage = calculateSlotCoverage(template, slotState);
    const confidenceLift = calculateConfidenceLift(template, slotState);
    const fatigueRisk = calculateFatigueRisk(template, slotState);
    
    const score = (template.priority || 5) + 
                  (coverage * 3) + 
                  (confidenceLift * 2) - 
                  (fatigueRisk * 1);
    
    return { score, template };
  });

  // Return highest scoring template
  return scored.sort((a, b) => b.score - a.score)[0].template;
}

/**
 * Generate AI-powered question for specific slots based on conversation context
 */
export async function generateContextualSlotQuestion(slotState, targetSlots, openai) {
  if (!openai || !targetSlots || targetSlots.length === 0) {
    return null;
  }

  const conversationHistory = slotState.conversationHistory.map((entry, index) => 
    `Q${index + 1}: ${entry.question}\nA${index + 1}: ${entry.answer}`
  ).join('\n\n');
  
  // Get recent question patterns to avoid repetition
  const recentQuestions = slotState.questionHistory.slice(-3).map(q => q.text).join('; ');

  const completedSlots = Object.entries(slotState.slots)
    .filter(([_, slot]) => slot.confidence > 0.6)
    .map(([name, slot]) => `${name}: ${slot.value}`)
    .join('\n');

  const targetSlotDescriptions = targetSlots.map(slotName => 
    `${slotName}: ${slotState.schema[slotName]?.description || 'Business information'}`
  ).join('\n');

  const systemPrompt = `You are an expert business analyst conducting a survey to gather information for a professional business brief. 

Your goal is to ask ONE targeted question that will help gather specific information for these business brief sections:
${targetSlotDescriptions}

CRITICAL: AVOID REPETITION! Recent questions asked: ${recentQuestions}

Generate questions that:
- Build naturally on the conversation so far
- Are specific and actionable
- Use executive-level language
- NEVER repeat information already asked (see recent questions above)
- Feel like a natural follow-up to previous responses
- Move to NEW topics, not rehash existing information

Current conversation context:
${conversationHistory}

Information already gathered:
${completedSlots}

If the user has already provided the information for these slots multiple times, ask about something completely different or say "SKIP" to end the survey.

Return only the question text - no explanations or formatting.`;

  const userPrompt = `Based on the conversation so far, generate a natural follow-up question that will help gather information for these specific brief sections: ${targetSlots.join(', ')}.

The question should:
1. Feel like a natural continuation of the conversation
2. Be specific enough to gather actionable business information
3. Avoid asking for information we already have
4. Be concise and professional

Generate only the question text:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 100
    });

    const generatedQuestion = response.choices[0]?.message?.content?.trim();
    
    if (generatedQuestion && generatedQuestion.toUpperCase() !== 'SKIP') {
      console.log('🎯 Generated contextual slot question:', generatedQuestion);
      return {
        id: `ai_slot_${Date.now()}`,
        text: generatedQuestion,
        type: 'text',
        slot_targets: targetSlots,
        generated: true
      };
    } else if (generatedQuestion && generatedQuestion.toUpperCase() === 'SKIP') {
      console.log('🛑 AI indicated to SKIP further questions for these slots');
      return null; // Signal to end survey
    }
  } catch (error) {
    console.error('Error generating contextual slot question:', error);
  }

  return null;
}

/**
 * Calculate slot coverage gain for a question template
 */
function calculateSlotCoverage(template, slotState) {
  const targetSlots = template.slot_targets || [];
  const emptyTargets = targetSlots.filter(slot => slotState.needsQuestion(slot));
  return emptyTargets.length / Math.max(targetSlots.length, 1);
}

/**
 * Calculate expected confidence lift
 */
function calculateConfidenceLift(template, slotState) {
  const targetSlots = template.slot_targets || [];
  const avgCurrentConfidence = targetSlots.reduce((sum, slot) => 
    sum + (slotState.slots[slot]?.confidence || 0), 0) / targetSlots.length;
  
  return 1 - avgCurrentConfidence; // Higher lift for lower confidence slots
}

/**
 * Calculate fatigue risk (redundancy, length, etc.)
 */
function calculateFatigueRisk(template, slotState) {
  let risk = 0;
  
  // Length penalty
  if (template.max_tokens > 120) risk += 0.2;
  
  // Recent question penalty
  const recentQuestions = slotState.conversationHistory.slice(-3);
  if (recentQuestions.some(q => q.template_id === template.id)) {
    risk += 0.5;
  }
  
  // Attempt penalty for target slots
  const targetSlots = template.slot_targets || [];
  const avgAttempts = targetSlots.reduce((sum, slot) => 
    sum + (slotState.slots[slot]?.attempts || 0), 0) / targetSlots.length;
  
  if (avgAttempts > 1) risk += 0.3;
  
  return Math.min(risk, 1.0);
}

/**
 * Save slot state to database
 */
export async function saveSlotState(slotState) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete existing slot states for this session
    await client.query('DELETE FROM slot_states WHERE session_id = $1', [slotState.sessionId]);
    
    // Insert current slot states
    for (const [slotName, slot] of Object.entries(slotState.slots)) {
      if (slot.value) {
        await client.query(`
          INSERT INTO slot_states (session_id, slot_name, slot_value, confidence, provenance, last_asked, attempts)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          slotState.sessionId,
          slotName,
          JSON.stringify({
            value: slot.value,
            explicitlyAsked: slot.explicitlyAsked || false
          }),
          slot.confidence,
          JSON.stringify(slot.provenance),
          slot.lastAsked,
          slot.attempts
        ]);
      }
    }
    
    // Save session metadata (total questions count and question history)
    await client.query(`
      INSERT INTO slot_states (session_id, slot_name, slot_value, confidence, provenance, last_asked, attempts)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      slotState.sessionId,
      '_session_metadata',
      JSON.stringify({ 
        totalQuestions: slotState.totalQuestions || 0,
        questionHistory: slotState.questionHistory || []
      }),
      1.0,
      JSON.stringify([]),
      null,
      0
    ]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Load slot state from database
 */
export async function loadSlotState(sessionId, schema = DEFAULT_SLOT_SCHEMA) {
  const slotState = new SlotState(schema, sessionId);
  
  const result = await pool.query(
    'SELECT * FROM slot_states WHERE session_id = $1',
    [sessionId]
  );
  
  result.rows.forEach(row => {
    if (row.slot_name === '_session_metadata') {
      // Load session metadata (totalQuestions)
      try {
        const metadata = JSON.parse(row.slot_value);
        slotState.totalQuestions = metadata.totalQuestions || 0;
        slotState.questionHistory = metadata.questionHistory || [];
      } catch (e) {
        slotState.totalQuestions = 0;
        slotState.questionHistory = [];
      }
    } else if (slotState.slots[row.slot_name]) {
      try {
        // Handle different data formats safely
        let slotData;
        let provenance = [];
        
        // Parse slot value safely
        if (typeof row.slot_value === 'string') {
          try {
            slotData = JSON.parse(row.slot_value);
          } catch {
            // If it's not JSON, treat as simple value
            slotData = { value: row.slot_value, explicitlyAsked: false };
          }
        } else {
          slotData = { value: row.slot_value, explicitlyAsked: false };
        }
        
        // Parse provenance safely
        if (row.provenance) {
          try {
            provenance = typeof row.provenance === 'string' ? JSON.parse(row.provenance) : [];
          } catch {
            provenance = [];
          }
        }
        
        slotState.slots[row.slot_name] = {
          value: slotData.value,
          confidence: parseFloat(row.confidence || 0),
          provenance,
          lastAsked: row.last_asked,
          attempts: parseInt(row.attempts || 0),
          extractedFrom: [],
          explicitlyAsked: slotData.explicitlyAsked || false
        };
      } catch (e) {
        console.warn(`Failed to load slot ${row.slot_name}:`, e.message);
        // Initialize with safe defaults
        slotState.slots[row.slot_name] = {
          value: null,
          confidence: 0,
          provenance: [],
          lastAsked: null,
          attempts: 0,
          extractedFrom: [],
          explicitlyAsked: false
        };
      }
    }
  });
  
  return slotState;
}

/**
 * Extract slot information from user response using AI
 */
export async function extractSlotInformation(userResponse, targetSlots, currentSlotState, questionContext) {
  const systemPrompt = `You are an expert at extracting structured information from user responses. 

Extract information for these target slots: ${targetSlots.join(', ')}

Slot Definitions:
${targetSlots.map(slot => `- ${slot}: ${currentSlotState.schema[slot].description}`).join('\n')}

Return a JSON object with:
{
  "extractions": {
    "slot_name": {
      "value": "extracted value",
      "confidence": 0.0-1.0,
      "reasoning": "why this confidence level"
    }
  },
  "summary": "Brief summary of what was extracted"
}`;

  const userPrompt = `Question Context: ${questionContext}
User Response: "${userResponse}"

Current Slot Values:
${targetSlots.map(slot => `- ${slot}: ${currentSlotState.slots[slot].value || 'empty'} (confidence: ${currentSlotState.slots[slot].confidence})`).join('\n')}

Extract relevant information for the target slots. Only extract if you're confident (>0.5) in the information.

IMPORTANT: If the user has repeatedly mentioned the same information (like specific metrics, requirements, or stakeholders), give it HIGH confidence (0.8+) since repetition indicates clarity and certainty.`;

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

    let extraction;
    try {
      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content from AI');
      }
      extraction = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse AI extraction response:', parseError.message);
      console.error('Raw AI response:', response.choices[0]?.message?.content);
      return { extractions: {}, summary: "Failed to parse AI response" };
    }
    
    // Update slot state with extractions (strategic approach)
    if (extraction.extractions) {
      Object.entries(extraction.extractions).forEach(([slotName, data]) => {
        const slotSchema = currentSlotState.schema[slotName];
        
        // Check if this slot requires explicit questioning (no inference allowed)
        if (slotSchema && slotSchema.no_inference) {
          console.log(`🚫 Blocked slot ${slotName} extraction: no_inference flag set - requires explicit question`);
          return;
        }
        
        // Adjust confidence based on slot criticality
        let confidenceReduction = 0.15; // Reduced from 0.25 - less aggressive
        let minimumThreshold = 0.4;     // Reduced from 0.5 - allow more progress
        
        // Be more conservative with critical business slots
        if (slotName === 'ROIFrame' || slotName === 'Stakeholders' || slotName === 'Requirements') {
          confidenceReduction = 0.3;    // 30% confidence reduction  
          minimumThreshold = 0.6;       // Higher threshold but not too strict
        }
        
        const adjustedConfidence = Math.max(0, data.confidence - confidenceReduction);
        
        if (targetSlots.includes(slotName) && adjustedConfidence >= minimumThreshold) {
          currentSlotState.updateSlot(slotName, data.value, adjustedConfidence, {
            userResponse,
            questionContext,
            reasoning: data.reasoning
          });
          console.log(`✅ Updated slot ${slotName} with confidence ${adjustedConfidence.toFixed(2)}: ${data.value}`);
        } else {
          console.log(`🚫 Rejected slot ${slotName} extraction: confidence ${adjustedConfidence.toFixed(2)} (threshold: ${minimumThreshold})`);
        }
      });
    }
    
    return extraction;
  } catch (error) {
    console.error('Error extracting slot information:', error);
    return { extractions: {}, summary: "Extraction failed" };
  }
}
