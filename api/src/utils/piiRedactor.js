/**
 * PII Redaction Utility
 * 
 * Redacts personally identifiable information from logs and text
 * Supports email, phone, SSN, and custom patterns
 */

// PII patterns
const PII_PATTERNS = {
  // Email addresses
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  
  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  
  // SSN (XXX-XX-XXXX or XXXXXXXXX)
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  
  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // IP addresses
  ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  
  // URLs (basic pattern)
  url: /https?:\/\/[^\s]+/g,
  
  // Names (basic pattern - first name followed by last name)
  name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
  
  // Addresses (basic pattern)
  address: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
  
  // ZIP codes
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
  
  // Dates (MM/DD/YYYY or YYYY-MM-DD)
  date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/g,
};

// Replacement tokens
const REPLACEMENTS = {
  email: '<email>',
  phone: '<phone>',
  ssn: '<ssn>',
  creditCard: '<credit_card>',
  ipAddress: '<ip_address>',
  url: '<url>',
  name: '<name>',
  address: '<address>',
  zipCode: '<zip_code>',
  date: '<date>',
};

/**
 * Redact PII from text using specified patterns
 */
export function redactPII(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const {
    patterns = Object.keys(PII_PATTERNS),
    customPatterns = {},
    replacements = REPLACEMENTS,
    preserveLength = false,
    logRedactions = false
  } = options;
  
  let redactedText = text;
  const redactions = [];
  
  // Apply built-in patterns
  patterns.forEach(patternName => {
    if (PII_PATTERNS[patternName]) {
      const pattern = PII_PATTERNS[patternName];
      const replacement = replacements[patternName] || `<${patternName}>`;
      
      const matches = redactedText.match(pattern);
      if (matches) {
        redactions.push({
          pattern: patternName,
          matches: matches.length,
          replacement
        });
        
        if (preserveLength) {
          // Replace with same-length placeholder
          redactedText = redactedText.replace(pattern, (match) => {
            return replacement.repeat(Math.ceil(match.length / replacement.length)).substring(0, match.length);
          });
        } else {
          redactedText = redactedText.replace(pattern, replacement);
        }
      }
    }
  });
  
  // Apply custom patterns
  Object.entries(customPatterns).forEach(([name, pattern]) => {
    const replacement = replacements[name] || `<${name}>`;
    const matches = redactedText.match(pattern);
    
    if (matches) {
      redactions.push({
        pattern: name,
        matches: matches.length,
        replacement
      });
      
      if (preserveLength) {
        redactedText = redactedText.replace(pattern, (match) => {
          return replacement.repeat(Math.ceil(match.length / replacement.length)).substring(0, match.length);
        });
      } else {
        redactedText = redactedText.replace(pattern, replacement);
      }
    }
  });
  
  if (logRedactions && redactions.length > 0) {
    console.log('🔒 PII Redaction Summary:', redactions);
  }
  
  return redactedText;
}

/**
 * Redact PII from an object recursively
 */
export function redactPIIFromObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const {
    excludeKeys = ['id', 'created_at', 'updated_at'],
    maxDepth = 10,
    currentDepth = 0
  } = options;
  
  if (currentDepth >= maxDepth) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactPIIFromObject(item, { ...options, currentDepth: currentDepth + 1 }));
  }
  
  const redacted = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (excludeKeys.includes(key)) {
      redacted[key] = value;
    } else if (typeof value === 'string') {
      redacted[key] = redactPII(value, options);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPIIFromObject(value, { ...options, currentDepth: currentDepth + 1 });
    } else {
      redacted[key] = value;
    }
  });
  
  return redacted;
}

/**
 * Create a PII-safe logger that automatically redacts sensitive data
 */
export function createPIILogger(originalLogger, options = {}) {
  const {
    redactLevels = ['info', 'warn', 'error', 'debug'],
    excludeKeys = ['timestamp', 'level']
  } = options;
  
  const piiLogger = {};
  
  ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
    piiLogger[level] = (...args) => {
      const redactedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return redactPII(arg, options);
        } else if (typeof arg === 'object' && arg !== null) {
          return redactPIIFromObject(arg, { ...options, excludeKeys });
        }
        return arg;
      });
      
      originalLogger[level](...redactedArgs);
    };
  });
  
  return piiLogger;
}

/**
 * Hash sensitive data for logging (one-way)
 */
export function hashSensitiveData(text, algorithm = 'sha256') {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const crypto = require('crypto');
  const hash = crypto.createHash(algorithm);
  hash.update(text);
  return hash.digest('hex').substring(0, 8); // First 8 chars for brevity
}

/**
 * Create a safe version of data for logging
 */
export function createSafeLogData(data, options = {}) {
  const {
    hashSensitive = true,
    redactPII = true,
    maxStringLength = 1000,
    excludeKeys = ['id', 'created_at', 'updated_at']
  } = options;
  
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const safeData = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (excludeKeys.includes(key)) {
      safeData[key] = value;
    } else if (typeof value === 'string') {
      let processedValue = value;
      
      if (redactPII) {
        processedValue = redactPII(processedValue);
      }
      
      if (hashSensitive && isSensitiveKey(key)) {
        processedValue = hashSensitiveData(processedValue);
      }
      
      if (processedValue.length > maxStringLength) {
        processedValue = processedValue.substring(0, maxStringLength) + '...';
      }
      
      safeData[key] = processedValue;
    } else if (typeof value === 'object' && value !== null) {
      safeData[key] = createSafeLogData(value, options);
    } else {
      safeData[key] = value;
    }
  });
  
  return safeData;
}

/**
 * Check if a key is considered sensitive
 */
function isSensitiveKey(key) {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'email', 'phone', 'ssn', 'address', 'name', 'personal'
  ];
  
  return sensitiveKeys.some(sensitive => 
    key.toLowerCase().includes(sensitive)
  );
}

/**
 * Redact PII from AI prompts and responses
 */
export function redactAIContent(content, options = {}) {
  const {
    redactUserInput = true,
    redactAIOutput = false,
    preserveStructure = true
  } = options;
  
  if (!content) return content;
  
  let redacted = content;
  
  if (redactUserInput) {
    // Redact user-provided content
    redacted = redactPII(redacted, {
      patterns: ['email', 'phone', 'ssn', 'name', 'address'],
      preserveLength: preserveStructure
    });
  }
  
  if (redactAIOutput) {
    // Redact AI-generated content that might contain PII
    redacted = redactPII(redacted, {
      patterns: ['email', 'phone', 'ssn', 'name'],
      preserveLength: preserveStructure
    });
  }
  
  return redacted;
}

/**
 * Validate that text doesn't contain PII
 */
export function validateNoPII(text, options = {}) {
  const {
    patterns = Object.keys(PII_PATTERNS),
    customPatterns = {}
  } = options;
  
  const violations = [];
  
  // Check built-in patterns
  patterns.forEach(patternName => {
    if (PII_PATTERNS[patternName]) {
      const matches = text.match(PII_PATTERNS[patternName]);
      if (matches) {
        violations.push({
          pattern: patternName,
          matches: matches.length,
          examples: matches.slice(0, 3) // First 3 examples
        });
      }
    }
  });
  
  // Check custom patterns
  Object.entries(customPatterns).forEach(([name, pattern]) => {
    const matches = text.match(pattern);
    if (matches) {
      violations.push({
        pattern: name,
        matches: matches.length,
        examples: matches.slice(0, 3)
      });
    }
  });
  
  return {
    isValid: violations.length === 0,
    violations
  };
}

// Export default redactor for backward compatibility
export default {
  redactPII,
  redactPIIFromObject,
  createPIILogger,
  hashSensitiveData,
  createSafeLogData,
  redactAIContent,
  validateNoPII
};
