/**
 * Confidence Calibration Service
 * Dynamic confidence adjustment based on multiple evidence factors
 */

import { OpenAI } from 'openai';
import { answerQuality, calculateNovelty, contradictionScore } from './semanticAnalysisService.js';
import { minThrFor } from './slotSchemaService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Run a quick validator micro-prompt for extracted values
 */
async function runValidator(slotName, extractedValue, questionContext) {
  if (!extractedValue || typeof extractedValue !== 'string') return 0.5;
  
  const prompt = `Given this conversation context and extracted value, is it precise and actionable?

Question Context: ${questionContext}
Slot: ${slotName}
Extracted Value: "${extractedValue}"

Rate precision/actionability from 0 to 1, then give a 1-sentence assessment.
Format: SCORE|ASSESSMENT

Example: 0.8|Value is specific and measurable but could use timeline details.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precision evaluator. Rate how precise and actionable extracted information is." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: "json_object" }
    });
    
    const result = response.choices[0].message.content.trim();
    
    try {
      const jsonResult = JSON.parse(result);
      const score = parseFloat(jsonResult.score || jsonResult.SCORE);
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (jsonError) {
      // Fallback to legacy format parsing
      const scorePart = result.split('|')[0];
      const score = parseFloat(scorePart);
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    }
  } catch (error) {
    console.error('Validator error:', error);
    return 0.5; // Default neutral score
  }
}

/**
 * Count evidence spans in extracted data
 */
function countEvidenceSpans(extractedData) {
  if (!extractedData || !extractedData.evidence_spans) return 0;
  
  if (Array.isArray(extractedData.evidence_spans)) {
    return extractedData.evidence_spans.length;
  }
  
  return 0;
}

/**
 * Enhanced confidence calibration using multiple features
 */
export async function calibratedConfidence(features) {
  const {
    self,              // AI's stated confidence 0..1
    validator,         // Validator score 0..1
    evidenceSpans,     // Count of evidence spans
    answerQuality: aq, // Answer quality score 0..1
    novelty,          // Semantic novelty 0..1
    consistency,      // Consistency score 0..1
    critical          // Is this a critical slot?
  } = features;
  
  // Base linear blend of confidence signals
  let confidence = (
    0.35 * self +
    0.25 * validator +
    0.15 * Math.tanh(evidenceSpans / 2) +
    0.15 * aq +
    0.10 * consistency
  );
  
  // Encourage novelty only if consistent
  confidence += 0.05 * Math.max(0, novelty - 0.3) * consistency;
  
  // Conservative caps for critical slots
  if (critical) {
    confidence = Math.min(confidence, 0.85);
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Process extracted slot data with enhanced confidence calibration
 */
export async function processSlotExtraction(slotName, extractedData, userResponse, questionContext, slotState) {
  const schema = slotState.schema[slotName];
  const slot = slotState.slots[slotName];
  const isCritical = ['ROIFrame', 'Stakeholders', 'Requirements'].includes(slotName) || 
                     schema?.priority === 'critical';
  
  // Check if slot requires explicit questioning
  if (schema?.no_inference && !slot?.askedThisTurn) {
    console.log(`🚫 Blocked slot ${slotName} extraction: no_inference flag set - requires explicit question`);
    return null;
  }
  
  // Gather confidence features
  const features = {
    self: extractedData.confidence || 0,
    validator: await runValidator(slotName, extractedData.value, questionContext),
    evidenceSpans: countEvidenceSpans(extractedData),
    answerQuality: answerQuality(userResponse),
    novelty: await calculateNovelty(extractedData.value, slot?.value),
    consistency: await contradictionScore(slotName, extractedData.value, slotState),
    critical: isCritical
  };
  
  // Calculate calibrated confidence
  const calibratedConf = await calibratedConfidence(features);
  
  // Determine minimum threshold
  const minThreshold = minThrFor(schema);
  
  // Allow provisional fill below threshold if explicitly asked this turn
  const askedNow = slot?.askedThisTurn === true;
  const provisionalAllowed = askedNow && calibratedConf >= (minThreshold - 0.1);
  const meetsThreshold = calibratedConf >= minThreshold;
  
  if (meetsThreshold || provisionalAllowed) {
    // Handle "must ask once" explicit questioning
    if (schema?.requires_explicit_question === "must_ask_once" && askedNow) {
      slot.explicitlyAsked = true;
      console.log(`✅ Marked slot ${slotName} as explicitly asked (must_ask_once)`);
    }
    
    // Update slot with calibrated confidence
    slotState.updateSlot(slotName, extractedData.value, calibratedConf, {
      userResponse,
      questionContext,
      reasoning: extractedData.reasoning,
      features: features,
      calibration: {
        original: extractedData.confidence,
        calibrated: calibratedConf,
        provisional: provisionalAllowed && !meetsThreshold
      }
    });
    
    console.log(`✅ Updated slot ${slotName} with calibrated confidence ${calibratedConf.toFixed(2)}: ${extractedData.value}`);
    
    // Reset low confidence streak on successful extraction
    if (calibratedConf >= minThreshold) {
      slotState.lowConfStreak = 0;
    } else {
      slotState.lowConfStreak = (slotState.lowConfStreak || 0) + 1;
    }
    
    return {
      slotName,
      value: extractedData.value,
      confidence: calibratedConf,
      features: features,
      provisional: provisionalAllowed && !meetsThreshold
    };
  } else {
    console.log(`🚫 Rejected slot ${slotName} extraction: calibrated confidence ${calibratedConf.toFixed(2)} < threshold ${minThreshold.toFixed(2)}`);
    
    // Increment low confidence streak
    slotState.lowConfStreak = (slotState.lowConfStreak || 0) + 1;
    
    return null;
  }
}

/**
 * Enhanced AI extraction prompt with few-shot examples
 */
export function buildEnhancedExtractionPrompt(slotName, slotDescription) {
  const fewShotExamples = {
    'ProblemStatement': {
      good: {
        answer: "Our current sprint planning takes 4 hours every 2 weeks and team members often miss dependencies, causing delays.",
        extraction: {
          value: "Sprint planning process is inefficient (4 hours biweekly) with frequent dependency misses causing project delays",
          confidence: 0.9,
          evidence_spans: ["4 hours every 2 weeks", "miss dependencies", "causing delays"],
          reasoning: "Specific timeframes and clear cause-effect relationship mentioned"
        }
      },
      bad: {
        answer: "Things are not working well",
        extraction: {
          value: "Unspecified operational issues",
          confidence: 0.3,
          evidence_spans: [],
          reasoning: "Vague statement without specific problems or context"
        }
      }
    },
    'Stakeholders': {
      good: {
        answer: "This affects our product managers, the engineering team leads, QA testers, and the customer support team who handle user complaints.",
        extraction: {
          value: ["Product managers", "Engineering team leads", "QA testers", "Customer support team"],
          confidence: 0.9,
          evidence_spans: ["product managers", "engineering team leads", "QA testers", "customer support team"],
          reasoning: "Specific roles clearly identified with their connection to the problem"
        }
      }
    }
  };
  
  const example = fewShotExamples[slotName];
  const exampleText = example ? `

Example of good extraction:
User: "${example.good.answer}"
Output: ${JSON.stringify(example.good.extraction, null, 2)}

${example.bad ? `Example of poor extraction:
User: "${example.bad.answer}"
Output: ${JSON.stringify(example.bad.extraction, null, 2)}` : ''}` : '';

  return `You are an expert at extracting structured information for business briefs.

Target slot: ${slotName}
Description: ${slotDescription}${exampleText}

Extract information with high precision. Include evidence_spans (direct quotes) and explain your confidence level.

Return JSON:
{
  "value": "extracted content",
  "confidence": 0.0-1.0,
  "evidence_spans": ["direct", "quotes", "from", "user"],
  "reasoning": "why this confidence level",
  "validator_hint": "format ok|ambiguous|conflicting"
}`;
}
