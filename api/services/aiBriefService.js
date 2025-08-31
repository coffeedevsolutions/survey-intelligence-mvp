/**
 * AI Brief Generation Service
 * Generates professional business briefs from survey responses using customizable templates
 */

import { OpenAI } from 'openai';
import { pool } from '../config/database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate AI-powered brief from survey responses
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

You must return a JSON object with these exact keys:
- executive_summary: A comprehensive 3-4 sentence executive overview
- problem_statement: Detailed analysis of the core issue with technical and business context
- key_findings: In-depth analysis of discoveries, insights, and patterns (multiple paragraphs)
- impact_assessment: Comprehensive evaluation of business, operational, and financial impacts
- stakeholders: Detailed description of affected parties and their specific impacts
- recommendations: Detailed, prioritized strategic recommendations with rationale
- next_steps: Specific implementation plan with time-bound actions and ownership
- timeline: Realistic project timeline with phases, milestones, and dependencies
- risk_assessment: Analysis of potential risks and mitigation strategies
- success_metrics: Specific, measurable criteria for project success

Ensure all content is professional, clear, and executive-friendly.`;

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
