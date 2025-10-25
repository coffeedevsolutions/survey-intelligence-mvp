/**
 * Survey Optimization Configuration
 * Centralized configuration for the enhanced survey system
 */

export const OPTIMIZATION_CONFIG = {
  // Question Selection
  QUESTION_SELECTION: {
    MAX_TURNS: 10,                    // Reduced from 15-20
    MAX_SEMANTIC_SIMILARITY: 0.85,   // Threshold for rejecting similar questions
    SOFT_SIMILARITY_THRESHOLD: 0.6,  // Start applying penalty above this
    COOLDOWN_PENALTY_WEIGHT: 1.5,    // Weight for topic cooldown penalty
    FATIGUE_PENALTY_WEIGHT: 1.2,     // Weight for user fatigue penalty
    EIG_BOOST_WEIGHT: 2.0,           // Weight for Expected Information Gain
    COVERAGE_BOOST_WEIGHT: 3.0       // Weight for slot coverage
  },
  
  // Confidence Calibration
  CONFIDENCE: {
    VALIDATOR_WEIGHT: 0.25,
    SELF_CONFIDENCE_WEIGHT: 0.35,
    EVIDENCE_WEIGHT: 0.15,
    ANSWER_QUALITY_WEIGHT: 0.15,
    CONSISTENCY_WEIGHT: 0.10,
    CRITICAL_SLOT_CAP: 0.85,         // Max confidence for critical slots
    PROVISIONAL_THRESHOLD_BUFFER: 0.1 // Allow provisional below threshold
  },
  
  // Completion Logic
  COMPLETION: {
    MIN_COVERAGE_REQUIRED: 0.75,     // 75% of required slots must be filled
    LOW_CONFIDENCE_STREAK_LIMIT: 2,  // Stop after 2 consecutive low-conf extractions
    MIN_DETAIL_LENGTH: 50,           // Minimum characters for detailed slots
    MIN_STAKEHOLDER_COUNT: 2,        // Minimum stakeholders required
    MIN_REQUIREMENTS_COUNT: 2,       // Minimum requirements for depth check
    LOW_EIG_THRESHOLD: 0.15,         // EIG below this indicates low value questions
    HIGH_FATIGUE_THRESHOLD: 0.6      // Fatigue above this suggests stopping
  },
  
  // Fatigue Detection
  FATIGUE: {
    LOOKBACK_WINDOW: 4,              // Number of recent answers to analyze
    SHORT_ANSWER_PENALTY: 0.3,      // Penalty for answers < 10 chars
    IDK_PATTERN: /(^|\b)(i don'?t know|unsure|not sure|n\/a|no idea)(\b|$)/i,
    IDK_PENALTY: 0.6,                // Heavy penalty for "I don't know" responses
    DETAIL_BONUS: 0.2,               // Bonus for answers with explanatory language
    NUMERIC_BONUS: 0.2,              // Bonus for answers with numbers
    SENTENCE_BONUS: 0.3              // Bonus for multi-sentence answers
  },
  
  // Slot Priorities and Thresholds
  SLOT_PRIORITIES: {
    critical: { confidence_bump: 0.05, min_threshold: 0.75 },
    important: { confidence_bump: 0.0, min_threshold: 0.7 },
    nice: { confidence_bump: -0.1, min_threshold: 0.6 }
  },
  
  // Template Cooldowns and Limits
  TEMPLATES: {
    DEFAULT_COOLDOWN: 2,             // Default turns before template can be reused
    MAX_ASKS_PER_SLOT: 2,           // Maximum times a template can be used
    TOPIC_STREAK_LIMIT: 2,          // Avoid same topic N times in a row
    SEMANTIC_HISTORY_SIZE: 5         // Number of recent questions to track for similarity
  },
  
  // AI Model Settings - Two-tier model policy
  AI: {
    // Small model for extraction, validation, similarity, next question
    EXTRACTION_MODEL: "gpt-4o-mini",
    VALIDATION_MODEL: "gpt-4o-mini", 
    SIMILARITY_MODEL: "gpt-4o-mini",
    QUESTION_GENERATION_MODEL: "gpt-4o-mini",
    
    // Larger model reserved for brief synthesis only
    BRIEF_GENERATION_MODEL: "gpt-4o-mini", // Reserve gpt-4o option for future
    
    // Embedding model
    EMBEDDING_MODEL: "text-embedding-3-small",
    
    // Temperature settings
    EXTRACTION_TEMPERATURE: 0.1,
    VALIDATION_TEMPERATURE: 0.1,
    QUESTION_GENERATION_TEMPERATURE: 0.3,
    BRIEF_GENERATION_TEMPERATURE: 0.2,
    
    // Token limits
    MAX_EXTRACTION_TOKENS: 800,
    MAX_VALIDATION_TOKENS: 100,
    MAX_QUESTION_TOKENS: 150,
    MAX_BRIEF_TOKENS: 1000
  },
  
  // Feature Flags (for gradual rollout)
  FEATURES: {
    SEMANTIC_DEDUPLICATION: true,
    ENHANCED_CONFIDENCE_CALIBRATION: true,
    FATIGUE_DETECTION: true,
    SMART_QUESTION_SELECTION: true,
    COVERAGE_BASED_COMPLETION: true,
    VALIDATOR_MICRO_PROMPTS: true,
    DYNAMIC_THRESHOLDS: true
  }
};

/**
 * Get configuration value with fallback
 */
export function getConfig(path, fallback = null) {
  const keys = path.split('.');
  let value = OPTIMIZATION_CONFIG;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      return fallback;
    }
  }
  
  return value;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return getConfig(`FEATURES.${featureName}`, false);
}

/**
 * Get slot priority configuration
 */
export function getSlotPriorityConfig(priority) {
  return getConfig(`SLOT_PRIORITIES.${priority}`, OPTIMIZATION_CONFIG.SLOT_PRIORITIES.important);
}

/**
 * Environment-based configuration overrides
 */
export function applyEnvironmentOverrides() {
  // Override with environment variables if needed
  if (process.env.SURVEY_MAX_TURNS) {
    OPTIMIZATION_CONFIG.QUESTION_SELECTION.MAX_TURNS = parseInt(process.env.SURVEY_MAX_TURNS);
  }
  
  if (process.env.SURVEY_MIN_COVERAGE) {
    OPTIMIZATION_CONFIG.COMPLETION.MIN_COVERAGE_REQUIRED = parseFloat(process.env.SURVEY_MIN_COVERAGE);
  }
  
  // Disable features based on environment
  if (process.env.DISABLE_SEMANTIC_DEDUP === 'true') {
    OPTIMIZATION_CONFIG.FEATURES.SEMANTIC_DEDUPLICATION = false;
  }
  
  if (process.env.DISABLE_ENHANCED_CONFIDENCE === 'true') {
    OPTIMIZATION_CONFIG.FEATURES.ENHANCED_CONFIDENCE_CALIBRATION = false;
  }
}

// Apply environment overrides on module load
applyEnvironmentOverrides();
