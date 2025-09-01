/**
 * Semantic Analysis Service
 * Handles embeddings, similarity calculations, and redundancy detection
 */

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Calculate cosine similarity between two vectors
 */
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

/**
 * Generate embeddings for text using OpenAI
 */
export async function embed(text) {
  if (!text || typeof text !== 'string') return [];
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000), // Truncate for API limits
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

/**
 * Calculate redundancy penalty for a question template
 */
export async function redundancyPenalty(templatePrompt, askedQuestions, threshold = 0.85) {
  if (!askedQuestions || askedQuestions.length === 0) {
    return { reject: false, penalty: 0 };
  }

  const emb = await embed(templatePrompt);
  if (emb.length === 0) {
    return { reject: false, penalty: 0 };
  }

  const similarities = askedQuestions
    .filter(q => q.emb && q.emb.length > 0)
    .map(q => cosine(emb, q.emb));
  
  const maxSim = similarities.length ? Math.max(...similarities) : 0;
  
  // Hard reject if super similar, soft penalty otherwise
  if (maxSim >= threshold) {
    return { reject: true, penalty: 1 };
  }
  
  // Soft penalty when similarity is between 0.6 and threshold
  const penalty = Math.max(0, (maxSim - 0.6) / 0.25);
  return { reject: false, penalty: Math.min(1, penalty) };
}

/**
 * Calculate answer quality score
 */
export function answerQuality(answer) {
  if (!answer || typeof answer !== 'string') return 0;
  
  const text = answer.trim();
  const len = text.length;
  const idk = /(^|\b)(i don'?t know|unsure|not sure|n\/a|no idea)(\b|$)/i.test(text);
  const hasNums = /\d/.test(text);
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0).length;
  const hasDetail = /\b(because|since|due to|specifically|example|such as)\b/i.test(text);
  
  // Base quality calculation (0 to 1 scale)
  let quality = 0;
  
  // Length factor
  if (len > 100) quality += 0.4;
  else if (len > 50) quality += 0.3;
  else if (len > 20) quality += 0.2;
  else if (len > 5) quality += 0.1;
  
  // Sentence structure
  if (sentences > 2) quality += 0.3;
  else if (sentences > 1) quality += 0.2;
  
  // Content richness
  if (hasNums) quality += 0.2;
  if (hasDetail) quality += 0.2;
  
  // Penalties
  if (idk) quality -= 0.6;
  if (len < 10) quality -= 0.3;
  
  return Math.max(0, Math.min(1, quality));
}

/**
 * Calculate user fatigue risk based on recent answer quality
 */
export function fatigueRisk(conversationHistory, lookback = 3) {
  if (!conversationHistory || conversationHistory.length === 0) return 0;
  
  const recent = conversationHistory.slice(-lookback);
  const qualities = recent.map(entry => answerQuality(entry.answer || entry.text || ''));
  
  if (qualities.length === 0) return 0;
  
  const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
  
  // Higher fatigue = lower average quality
  // Also consider trend: declining quality is higher risk
  let trend = 0;
  if (qualities.length >= 2) {
    const recent_avg = qualities.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const earlier_avg = qualities.slice(0, -1).reduce((a, b) => a + b, 0) / (qualities.length - 1);
    trend = Math.max(0, earlier_avg - recent_avg); // positive if declining
  }
  
  const fatigue = 1 - avgQuality + (trend * 0.3);
  return Math.max(0, Math.min(1, fatigue));
}

/**
 * Calculate expected information gain for a template
 */
export function expectedInfoGain(template, slotState) {
  if (!template.slot_targets || template.slot_targets.length === 0) return 0;
  
  // Sum remaining uncertainty across target slots
  const uncertainties = template.slot_targets.map(slotName => {
    const slot = slotState.slots[slotName];
    const confidence = slot ? (slot.confidence || 0) : 0;
    return 1 - confidence; // Remaining uncertainty
  });
  
  const avgUncertainty = uncertainties.reduce((a, b) => a + b, 0) / uncertainties.length;
  
  // Boost for critical slots
  const hasCriticalSlot = template.slot_targets.some(slotName => {
    const schema = slotState.schema[slotName];
    return schema && (schema.priority === 'critical' || schema.required);
  });
  
  const criticalBoost = hasCriticalSlot ? 0.3 : 0;
  
  return Math.min(1, avgUncertainty + criticalBoost);
}

/**
 * Check semantic novelty of a value compared to existing slot value
 */
export async function calculateNovelty(newValue, existingValue) {
  if (!existingValue || !newValue) return 1; // Completely novel
  
  const newEmb = await embed(String(newValue));
  const existingEmb = await embed(String(existingValue));
  
  if (newEmb.length === 0 || existingEmb.length === 0) return 0.5; // Default
  
  const similarity = cosine(newEmb, existingEmb);
  return 1 - similarity; // Higher novelty = lower similarity
}

/**
 * Simple contradiction detection
 */
export async function contradictionScore(slotName, newValue, slotState) {
  const slot = slotState.slots[slotName];
  if (!slot || !slot.value || !newValue) return 1; // No contradiction possible
  
  // Simple heuristic: if very different embeddings, might be contradictory
  const novelty = await calculateNovelty(newValue, slot.value);
  
  // High novelty might indicate contradiction, but could also be additive info
  // For now, assume consistency unless very high novelty + low confidence in existing
  if (novelty > 0.8 && slot.confidence < 0.6) {
    return 0.3; // Potential contradiction
  }
  
  return 1; // Assume consistent
}
