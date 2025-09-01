/**
 * AI Brief Generation Service
 * Generates professional business briefs from survey responses using customizable templates
 */

import { OpenAI } from 'openai';
import { pool } from '../config/database.js';
import { 
  DEFAULT_SLOT_SCHEMA, 
  SlotState, 
  loadSlotState, 
  saveSlotState 
} from './slotSchemaService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate slot-based AI brief from survey responses
 */
export async function generateSlotBasedBrief(sessionId, organizationId) {
  try {
    console.log('🎯 Starting slot-based AI brief generation for session:', sessionId);
    
    // Get brief template and slot schema
    const briefTemplate = await getBriefTemplateWithSlotSchema(sessionId);
    const slotSchema = briefTemplate.slot_schema || DEFAULT_SLOT_SCHEMA;
    
    console.log('📋 Using slot schema:', Object.keys(slotSchema).length, 'slots defined');
    
    // Load or create slot state
    let slotState = await loadSlotState(sessionId, slotSchema);
    
    // If no slot state exists, populate from existing answers
    if (Object.values(slotState.slots).every(slot => !slot.value)) {
      console.log('🔄 Populating slot state from existing survey responses...');
      slotState = await populateSlotStateFromSession(sessionId, slotSchema);
      await saveSlotState(slotState);
    }
    
    // Check if we have enough information for brief generation
    if (!slotState.canGenerateBrief()) {
      console.log('⚠️ Insufficient slot data for brief generation');
      const summary = slotState.getCompletionSummary();
      return {
        brief: null,
        slotSummary: summary,
        message: `Brief generation requires more information. ${summary.completed}/${summary.total} slots completed.`,
        missingSlots: summary.missingSlots
      };
    }
    
    // Generate brief content from completed slots
    const readySlots = slotState.getReadySlots();
    console.log('✅ Generating brief from', Object.keys(readySlots).length, 'completed slots');
    
    const briefContent = await generateBriefFromSlots(readySlots, slotSchema, briefTemplate);
    
    console.log('🎉 Slot-based brief generated successfully');
    return {
      brief: briefContent,
      slotSummary: slotState.getCompletionSummary(),
      metadata: {
        sessionId,
        slotsUsed: Object.keys(readySlots),
        generatedAt: new Date().toISOString(),
        templateType: 'slot-based'
      }
    };
    
  } catch (error) {
    console.error('❌ Slot-based brief generation failed:', error);
    throw error;
  }
}

/**
 * Generate AI-powered brief from survey responses (original function)
 */
export async function generateAIBrief(sessionId, organizationId) {
  try {
    console.log('🤖 Starting AI brief generation for session:', sessionId);
    
    // Get survey responses
    const responsesResult = await pool.query(`
      SELECT a.question_id, a.text, a.created_at
      FROM answers a
      WHERE a.session_id = $1
      ORDER BY a.created_at ASC
    `, [sessionId]);
    
    const responses = responsesResult.rows;
    
    if (responses.length === 0) {
      throw new Error('No responses found for session');
    }
    
    // Get session context (campaign, flow, template info)
    const sessionResult = await pool.query(`
      SELECT 
        s.campaign_id, s.flow_id, s.org_id,
        c.name as campaign_name,
        st.brief_template, st.brief_ai_instructions,
        bt.template_content as campaign_brief_template,
        bt.ai_instructions as campaign_brief_ai_instructions
      FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN survey_flows sf ON s.flow_id = sf.id
      LEFT JOIN survey_templates st ON COALESCE(sf.survey_template_id, c.survey_template_id) = st.id
      LEFT JOIN brief_templates bt ON c.brief_template_id = bt.id
      WHERE s.id = $1
    `, [sessionId]);
    
    const sessionContext = sessionResult.rows[0];
    if (!sessionContext) {
      throw new Error('Session context not found');
    }
    
    // Determine which brief template and instructions to use
    // Priority: survey template > campaign brief template > org default template
    let briefTemplate = sessionContext.brief_template; // From survey template
    let aiInstructions = sessionContext.brief_ai_instructions; // From survey template
    
    // If no survey template, try campaign brief template
    if (!briefTemplate && sessionContext.campaign_brief_template) {
      briefTemplate = sessionContext.campaign_brief_template;
      aiInstructions = sessionContext.campaign_brief_ai_instructions;
    }
    
    // If still no template, get org default brief template
    if (!briefTemplate) {
      console.log('🔍 No specific template found, getting organization default...');
      const defaultTemplateResult = await pool.query(`
        SELECT template_content, ai_instructions 
        FROM brief_templates 
        WHERE org_id = $1 AND is_default = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [sessionContext.org_id]);
      
      if (defaultTemplateResult.rows[0]) {
        briefTemplate = defaultTemplateResult.rows[0].template_content;
        aiInstructions = defaultTemplateResult.rows[0].ai_instructions;
        console.log('📋 Using organization default brief template');
      } else {
        briefTemplate = getDefaultBriefTemplate();
        aiInstructions = getDefaultAIInstructions();
        console.log('📋 Using system default brief template');
      }
    } else {
      console.log('📋 Using specific brief template');
    }
    
    console.log('📋 Using brief template:', briefTemplate ? 'Custom template' : 'Default template');
    console.log('🎯 Using AI instructions:', aiInstructions ? 'Custom instructions' : 'Default instructions');
    
    // Prepare conversation summary for AI
    const conversationSummary = responses.map((r, index) => 
      `Question ${index + 1} (${r.question_id}): ${r.text}`
    ).join('\n');
    
    // Generate AI content for template placeholders
    const aiContent = await generateBriefContent(conversationSummary, aiInstructions, sessionContext);
    
    // Apply AI content to template
    const finalBrief = applyContentToTemplate(briefTemplate, aiContent);
    
    console.log('✅ AI brief generated successfully');
    return {
      brief: finalBrief,
      aiContent,
      metadata: {
        sessionId,
        campaignName: sessionContext.campaign_name,
        responseCount: responses.length,
        generatedAt: new Date().toISOString(),
        templateUsed: briefTemplate !== getDefaultBriefTemplate() ? 'custom' : 'default'
      }
    };
    
  } catch (error) {
    console.error('❌ AI brief generation failed:', error);
    throw error;
  }
}

/**
 * Generate structured content using OpenAI
 */
async function generateBriefContent(conversationSummary, aiInstructions, context) {
  const systemPrompt = `You are an expert business analyst. Your task is to analyze survey responses and generate structured content for a business brief.

${aiInstructions}

CRITICAL INSTRUCTIONS:
1. Each section must provide UNIQUE value - avoid repetition across sections
2. Prioritize QUANTITATIVE data when available (time spent, metrics, numbers)
3. Only include impact assessments that were explicitly mentioned - do not extrapolate
4. Focus on actionable, specific content rather than generic business language

You must return a JSON object with these exact keys:
- executive_summary: Brief overview focusing on the REQUEST and DESIRED OUTCOME (avoid repeating the problem)
- problem_statement: ONE clear statement of the core issue from user's perspective
- key_findings: ONLY the specific facts/metrics mentioned by the user (no assumptions)
- impact_assessment: ONLY impacts explicitly stated by the user (if none stated, keep brief and factual)
- stakeholders: Specific people/roles mentioned by the user
- functional_requirements: Specific features/capabilities requested by the user
- roi: Quantitative benefits mentioned (time saved, efficiency gains, cost reduction) - if none provided, state "Requires quantification"
- recommendations: Actionable next steps based on stated requirements
- next_steps: Immediate actions to move forward
- timeline: Timeline constraints mentioned by user, or "To be determined"

Be concise and avoid business jargon. Focus on what was actually said, not what could be implied.`;

  const userPrompt = `Campaign: ${context.campaign_name}
Organization: ${context.org_id}

Survey Responses:
${conversationSummary}

Generate the structured brief content as JSON.`;

  console.log('🚀 CALLING OPENAI API for brief generation...');
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  console.log('📊 OpenAI Usage for brief:', {
    prompt_tokens: response.usage?.prompt_tokens,
    completion_tokens: response.usage?.completion_tokens,
    total_tokens: response.usage?.total_tokens
  });

  const content = response.choices[0]?.message?.content;
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse AI response as JSON:', content);
    throw new Error('Invalid AI response format');
  }
}

/**
 * Apply AI-generated content to template
 */
function applyContentToTemplate(template, aiContent) {
  let result = template;
  
  // Add generated date
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Replace generated_date placeholder
  result = result.replace(/{generated_date}/g, generatedDate);
  
  // Replace all placeholders with AI content
  Object.keys(aiContent).forEach(key => {
    const placeholder = `{${key}}`;
    const content = aiContent[key];
    
    // Handle arrays (like key_findings, recommendations)
    if (Array.isArray(content)) {
      const formattedContent = content.map(item => `- ${item}`).join('\n');
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), formattedContent);
    } else {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), content || '');
    }
  });
  
  return result;
}

/**
 * Default brief template
 */
function getDefaultBriefTemplate() {
  return `# Executive Business Brief

## Executive Summary
{executive_summary}

## Problem Statement
{problem_statement}

## Key Findings
{key_findings}

## Impact Assessment
{impact_assessment}

## Affected Stakeholders
{stakeholders}

## Strategic Recommendations
{recommendations}

## Implementation Plan
{next_steps}

## Project Timeline
{timeline}

## Risk Assessment
{risk_assessment}

## Success Metrics
{success_metrics}

---
*Document prepared on {generated_date} | Based on stakeholder survey responses and business analysis*`;
}

/**
 * Default AI instructions
 */
function getDefaultAIInstructions() {
  return `You are a senior business analyst creating a comprehensive executive briefing document. Analyze the survey responses and produce a detailed, professional business brief with the following requirements:

WRITING STYLE:
- Use formal, executive-level business language
- Write in complete, well-structured paragraphs (3-5 sentences each)
- Include specific details and quantifiable information when available
- Avoid bullet points unless specifically requested
- Maintain professional tone throughout

CONTENT REQUIREMENTS:
1. Executive Summary: Provide a comprehensive 3-4 sentence overview that could stand alone
2. Problem Statement: Detailed analysis of the core issue, including technical context and business implications
3. Key Findings: In-depth analysis of discovered issues, patterns, or insights (multiple paragraphs if needed)
4. Impact Assessment: Comprehensive evaluation of business, operational, and financial impacts
5. Affected Stakeholders: Detailed description of who is impacted and how (internal/external users, departments, etc.)
6. Recommendations: Detailed, prioritized action items with rationale and expected outcomes
7. Next Steps: Specific, time-bound actions with clear ownership and dependencies
8. Timeline: Realistic project timeline with phases and milestones

For each section, elaborate fully - if the survey responses provide rich information, expand on it thoughtfully. Create a document that executives can use for decision-making and resource allocation.`;
}

/**
 * Get brief template with slot schema from session context
 */
async function getBriefTemplateWithSlotSchema(sessionId) {
  const sessionResult = await pool.query(`
    SELECT 
      s.campaign_id, s.flow_id, s.org_id,
      c.name as campaign_name,
      st.brief_template, st.brief_ai_instructions,
      bt.template_content, bt.ai_instructions, bt.slot_schema
    FROM sessions s
    JOIN campaigns c ON s.campaign_id = c.id
    LEFT JOIN survey_flows sf ON s.flow_id = sf.id
    LEFT JOIN survey_templates st ON COALESCE(sf.survey_template_id, c.survey_template_id) = st.id
    LEFT JOIN brief_templates bt ON c.brief_template_id = bt.id
    WHERE s.id = $1
  `, [sessionId]);
  
  const sessionContext = sessionResult.rows[0];
  if (!sessionContext) {
    throw new Error('Session context not found');
  }
  
  // If no slot schema in brief template, check if we have a default org template
  if (!sessionContext.slot_schema) {
    const defaultTemplateResult = await pool.query(`
      SELECT template_content, ai_instructions, slot_schema
      FROM brief_templates 
      WHERE org_id = $1 AND is_default = true
      ORDER BY created_at DESC
      LIMIT 1
    `, [sessionContext.org_id]);
    
    if (defaultTemplateResult.rows[0]?.slot_schema) {
      return {
        template_content: defaultTemplateResult.rows[0].template_content,
        ai_instructions: defaultTemplateResult.rows[0].ai_instructions,
        slot_schema: defaultTemplateResult.rows[0].slot_schema
      };
    }
  }
  
  return {
    template_content: sessionContext.template_content || getDefaultBriefTemplate(),
    ai_instructions: sessionContext.ai_instructions || getDefaultAIInstructions(),
    slot_schema: sessionContext.slot_schema || DEFAULT_SLOT_SCHEMA
  };
}

/**
 * Populate slot state from existing session answers
 */
async function populateSlotStateFromSession(sessionId, slotSchema) {
  const slotState = new SlotState(slotSchema, sessionId);
  
  // Get all answers for this session
  const answersResult = await pool.query(`
    SELECT a.question_id, a.text, a.created_at
    FROM answers a
    WHERE a.session_id = $1
    ORDER BY a.created_at ASC
  `, [sessionId]);
  
  const answers = answersResult.rows;
  
  // Process each answer to extract slot information
  for (const answer of answers) {
    await extractSlotInformationFromAnswer(slotState, answer);
  }
  
  return slotState;
}

/**
 * Extract slot information from a single answer
 */
async function extractSlotInformationFromAnswer(slotState, answer) {
  // Get all possible target slots for this answer
  const allSlots = Object.keys(slotState.schema);
  
  // Use AI to extract information for multiple slots from this answer
  const systemPrompt = `You are an expert at extracting structured business information. 

Analyze this user response and extract relevant information for these business brief slots:
${allSlots.map(slot => `- ${slot}: ${slotState.schema[slot].description}`).join('\n')}

Return a JSON object with extractions only for slots where you find relevant information with confidence > 0.6.`;

  const userPrompt = `User Response: "${answer.text}"
Question Context: ${answer.question_id}

Extract relevant information for any applicable slots. Only include slots where you're confident (>0.6) in the extraction.

Return JSON format:
{
  "slot_name": {
    "value": "extracted content",
    "confidence": 0.0-1.0,
    "reasoning": "why this extraction"
  }
}`;

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

    const extractions = JSON.parse(response.choices[0].message.content);
    
    // Update slot state with extractions
    Object.entries(extractions).forEach(([slotName, data]) => {
      if (allSlots.includes(slotName) && data.confidence > 0.6) {
        slotState.updateSlot(slotName, data.value, data.confidence, {
          questionId: answer.question_id,
          userResponse: answer.text,
          timestamp: answer.created_at,
          reasoning: data.reasoning
        });
      }
    });
    
  } catch (error) {
    console.error('Error extracting slot information from answer:', error);
  }
}

/**
 * Generate brief content from completed slots
 */
async function generateBriefFromSlots(readySlots, slotSchema, briefTemplate) {
  const systemPrompt = `You are a senior business analyst creating a comprehensive executive brief. 

Generate professional business brief content using the provided slot information. Write in executive-level language with clear, actionable insights.

Template Structure:
${briefTemplate.template_content}

Available Slot Data:
${Object.entries(readySlots).map(([slot, value]) => `${slot}: ${value}`).join('\n\n')}

Instructions:
${briefTemplate.ai_instructions}

Create a polished, executive-ready business brief that flows naturally and provides actionable insights.`;

  const userPrompt = `Using the slot data provided, generate a comprehensive business brief that:

1. Synthesizes the information into a coherent narrative
2. Provides executive-level insights and recommendations  
3. Includes specific, actionable next steps
4. Maintains professional business language throughout
5. Ensures all sections flow logically and support the overall message

Focus on creating value for decision-makers who need to understand the situation and take action.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
    
  } catch (error) {
    console.error('Error generating brief from slots:', error);
    
    // Fallback: simple template replacement
    let briefContent = briefTemplate.template_content;
    Object.entries(readySlots).forEach(([slot, value]) => {
      const placeholder = new RegExp(`{${slot}}`, 'gi');
      briefContent = briefContent.replace(placeholder, value || `[${slot} not provided]`);
    });
    
    return briefContent;
  }
}
