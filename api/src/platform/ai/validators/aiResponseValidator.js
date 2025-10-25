/**
 * AI Response Validator
 * 
 * Validates AI responses against JSON schemas using Ajv
 * Provides retry logic and fallback mechanisms
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Ajv with strict validation
const ajv = new Ajv({ 
  allErrors: true, 
  strict: true,
  verbose: true,
  removeAdditional: false
});
addFormats(ajv);

// Schema cache
const schemaCache = new Map();

/**
 * Load JSON schema from file
 */
async function loadSchema(schemaName) {
  if (schemaCache.has(schemaName)) {
    return schemaCache.get(schemaName);
  }
  
  try {
    const schemaPath = path.join(__dirname, '..', '..', '..', '..', 'schemas', 'ai-responses', `${schemaName}.schema.json`);
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    schemaCache.set(schemaName, schema);
    return schema;
  } catch (error) {
    console.error(`Failed to load schema ${schemaName}:`, error);
    throw new Error(`Schema ${schemaName} not found`);
  }
}

/**
 * Validate response against schema
 */
function validateResponse(response, schema) {
  const validate = ajv.compile(schema);
  const isValid = validate(response);
  
  return {
    isValid,
    errors: validate.errors || [],
    data: response
  };
}

/**
 * Attempt to repair common JSON issues
 */
function attemptRepair(jsonString) {
  try {
    // Remove markdown code blocks
    let cleaned = jsonString.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to parse
    return JSON.parse(cleaned);
  } catch (error) {
    // Try to extract JSON from text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Last resort: try to fix common issues
        let fixed = jsonMatch[0]
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
          .replace(/:\s*([^",{\[\]]+)([,}])/g, ': "$1"$2');  // Quote unquoted string values
        
        return JSON.parse(fixed);
      }
    }
    
    throw new Error('Unable to repair JSON');
  }
}

/**
 * Create fallback response based on schema
 */
function createFallbackResponse(schemaName, originalResponse) {
  const fallbacks = {
    question: {
      id: 'fallback',
      question_text: 'Could you please provide more details about your requirements?',
      question_type: 'text',
      rationale: 'AI response validation failed, using fallback question',
      needs_clarification: true,
      confidence_score: 0.1
    },
    'fact-extraction': {
      facts: {},
      confidence: 0.1,
      summary: 'Unable to extract facts from response due to validation failure',
      insights: []
    },
    'brief-analysis': {
      title: 'Project Brief (AI Analysis Failed)',
      summary: 'The AI analysis encountered an error. Please review the input and try again.',
      epics: [],
      requirements: [],
      confidence_score: 0.1
    }
  };
  
  const fallback = fallbacks[schemaName];
  if (fallback) {
    console.warn(`Using fallback response for ${schemaName}`);
    return fallback;
  }
  
  // Generic fallback
  return {
    error: 'Validation failed',
    original_response: originalResponse,
    schema_name: schemaName,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate AI response with retry and fallback
 */
export async function validateAIResponse(response, schemaName, options = {}) {
  const {
    maxRetries = 1,
    enableRepair = true,
    enableFallback = true,
    logErrors = true
  } = options;
  
  let lastError = null;
  let attempts = 0;
  
  // Load schema
  const schema = await loadSchema(schemaName);
  
  // Try validation with original response
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts++;
    
    try {
      let responseData;
      
      // Parse response if it's a string
      if (typeof response === 'string') {
        responseData = JSON.parse(response);
      } else {
        responseData = response;
      }
      
      // Validate against schema
      const validation = validateResponse(responseData, schema);
      
      if (validation.isValid) {
        return {
          success: true,
          data: validation.data,
          attempts,
          schema: schemaName
        };
      }
      
      // Log validation errors
      if (logErrors) {
        console.error(`Validation failed for ${schemaName} (attempt ${attempt + 1}):`, validation.errors);
      }
      
      lastError = new Error(`Schema validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      
      // Try repair if enabled and this is the first attempt
      if (enableRepair && attempt === 0 && typeof response === 'string') {
        try {
          const repaired = attemptRepair(response);
          const repairValidation = validateResponse(repaired, schema);
          
          if (repairValidation.isValid) {
            console.log(`✅ Successfully repaired ${schemaName} response`);
            return {
              success: true,
              data: repairValidation.data,
              attempts: attempts + 1,
              schema: schemaName,
              repaired: true
            };
          }
        } catch (repairError) {
          console.warn(`Repair attempt failed for ${schemaName}:`, repairError.message);
        }
      }
      
    } catch (error) {
      lastError = error;
      if (logErrors) {
        console.error(`Validation attempt ${attempt + 1} failed for ${schemaName}:`, error.message);
      }
    }
  }
  
  // All attempts failed, use fallback if enabled
  if (enableFallback) {
    const fallbackResponse = createFallbackResponse(schemaName, response);
    return {
      success: false,
      data: fallbackResponse,
      attempts,
      schema: schemaName,
      fallback: true,
      error: lastError?.message || 'Validation failed'
    };
  }
  
  // Return failure
  return {
    success: false,
    data: null,
    attempts,
    schema: schemaName,
    error: lastError?.message || 'Validation failed'
  };
}

/**
 * Validate multiple AI responses
 */
export async function validateMultipleResponses(responses, schemaName, options = {}) {
  const results = [];
  
  for (const response of responses) {
    const result = await validateAIResponse(response, schemaName, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Get validation statistics
 */
export function getValidationStats(results) {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const repaired = results.filter(r => r.repaired).length;
  const fallbacks = results.filter(r => r.fallback).length;
  const failed = results.filter(r => !r.success && !r.fallback).length;
  
  return {
    total,
    successful,
    repaired,
    fallbacks,
    failed,
    successRate: total > 0 ? (successful / total) : 0,
    repairRate: total > 0 ? (repaired / total) : 0,
    fallbackRate: total > 0 ? (fallbacks / total) : 0
  };
}

/**
 * Clear schema cache (useful for testing)
 */
export function clearSchemaCache() {
  schemaCache.clear();
}

/**
 * Get available schemas
 */
export function getAvailableSchemas() {
  return Array.from(schemaCache.keys());
}

// Export default validator
export default {
  validateAIResponse,
  validateMultipleResponses,
  getValidationStats,
  clearSchemaCache,
  getAvailableSchemas
};
