/**
 * Policy Engine & Guardrails
 * 
 * Implements input sanitization, output validation, and security policies
 * for AI interactions and external content
 */

import { validateAIResponse } from '../utils/aiResponseValidator.js';
import { redactPII, validateNoPII } from '../utils/piiRedactor.js';

// Policy configuration
const POLICY_CONFIG = {
  input: {
    maxLength: 10000,
    allowedDomains: [], // Empty means no external domains allowed
    blockedPatterns: [
      /system\s*:/gi,
      /admin\s*:/gi,
      /root\s*:/gi,
      /sudo\s*:/gi,
      /<script/gi,
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi
    ],
    requiredFields: ['content'],
    sanitizeHtml: true
  },
  output: {
    maxLength: 50000,
    blockedContent: [
      'personal information',
      'confidential data',
      'internal systems',
      'passwords',
      'api keys',
      'secrets'
    ],
    requireNeutrality: true,
    maxExternalLinks: 0
  },
  tools: {
    allowedTools: [
      'search',
      'calculate',
      'format',
      'validate'
    ],
    blockedTools: [
      'execute',
      'shell',
      'eval',
      'system'
    ]
  }
};

/**
 * Input sanitization policies
 */
export class InputPolicy {
  constructor(config = POLICY_CONFIG.input) {
    this.config = config;
  }

  /**
   * Sanitize user input
   */
  sanitize(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    // Check length
    if (input.length > this.config.maxLength) {
      throw new Error(`Input too long: ${input.length} > ${this.config.maxLength}`);
    }

    // Check blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(input)) {
        throw new Error(`Input contains blocked pattern: ${pattern.source}`);
      }
    }

    // Remove HTML tags if sanitization enabled
    let sanitized = input;
    if (this.config.sanitizeHtml) {
      sanitized = this.removeHtmlTags(sanitized);
    }

    // Remove external URLs
    sanitized = this.removeExternalUrls(sanitized);

    // Trim whitespace
    sanitized = sanitized.trim();

    if (sanitized.length === 0) {
      throw new Error('Input is empty after sanitization');
    }

    return sanitized;
  }

  /**
   * Remove HTML tags
   */
  removeHtmlTags(input) {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Remove external URLs
   */
  removeExternalUrls(input) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return input.replace(urlRegex, (url) => {
      try {
        const urlObj = new URL(url);
        const isAllowed = this.config.allowedDomains.length === 0 || 
                         this.config.allowedDomains.includes(urlObj.hostname);
        return isAllowed ? url : '[EXTERNAL_URL_REMOVED]';
      } catch {
        return '[INVALID_URL_REMOVED]';
      }
    });
  }

  /**
   * Validate input structure
   */
  validateStructure(input) {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }

    for (const field of this.config.requiredFields) {
      if (!input[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    return true;
  }
}

/**
 * Output validation policies
 */
export class OutputPolicy {
  constructor(config = POLICY_CONFIG.output) {
    this.config = config;
  }

  /**
   * Validate AI output
   */
  async validate(output, schemaName = null) {
    if (!output) {
      throw new Error('Output cannot be empty');
    }

    // Check length
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    if (outputStr.length > this.config.maxLength) {
      throw new Error(`Output too long: ${outputStr.length} > ${this.config.maxLength}`);
    }

    // Check for blocked content
    await this.checkBlockedContent(outputStr);

    // Check neutrality if required
    if (this.config.requireNeutrality) {
      this.checkNeutrality(outputStr);
    }

    // Check external links
    this.checkExternalLinks(outputStr);

    // Validate against schema if provided
    if (schemaName) {
      const validation = await validateAIResponse(outputStr, schemaName, {
        maxRetries: 1,
        enableRepair: false,
        enableFallback: false
      });

      if (!validation.success) {
        throw new Error(`Schema validation failed: ${validation.error}`);
      }

      return validation.data;
    }

    return output;
  }

  /**
   * Check for blocked content
   */
  async checkBlockedContent(output) {
    const lowerOutput = output.toLowerCase();
    
    for (const blocked of this.config.blockedContent) {
      if (lowerOutput.includes(blocked.toLowerCase())) {
        throw new Error(`Output contains blocked content: ${blocked}`);
      }
    }

    // Check for PII
    const piiCheck = validateNoPII(output);
    if (!piiCheck.isValid) {
      throw new Error(`Output contains PII: ${piiCheck.violations.map(v => v.pattern).join(', ')}`);
    }
  }

  /**
   * Check neutrality
   */
  checkNeutrality(output) {
    const biasIndicators = [
      'you should',
      'you must',
      'you need to',
      'I recommend',
      'I suggest',
      'I think you should',
      'you ought to'
    ];

    const lowerOutput = output.toLowerCase();
    
    for (const indicator of biasIndicators) {
      if (lowerOutput.includes(indicator)) {
        console.warn(`⚠️ [Policy] Output may contain bias: ${indicator}`);
      }
    }
  }

  /**
   * Check external links
   */
  checkExternalLinks(output) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = output.match(urlRegex) || [];
    
    if (urls.length > this.config.maxExternalLinks) {
      throw new Error(`Too many external links: ${urls.length} > ${this.config.maxExternalLinks}`);
    }
  }
}

/**
 * Tool allowlist policy
 */
export class ToolPolicy {
  constructor(config = POLICY_CONFIG.tools) {
    this.config = config;
  }

  /**
   * Validate tool usage
   */
  validateTool(toolName) {
    if (this.config.blockedTools.includes(toolName)) {
      throw new Error(`Tool blocked: ${toolName}`);
    }

    if (this.config.allowedTools.length > 0 && !this.config.allowedTools.includes(toolName)) {
      throw new Error(`Tool not allowed: ${toolName}`);
    }

    return true;
  }

  /**
   * Validate tool parameters
   */
  validateToolParams(toolName, params) {
    // Basic parameter validation
    if (typeof params !== 'object' || params === null) {
      throw new Error('Tool parameters must be an object');
    }

    // Check for dangerous parameters
    const dangerousParams = ['eval', 'exec', 'system', 'shell'];
    for (const param of dangerousParams) {
      if (params[param]) {
        throw new Error(`Dangerous parameter detected: ${param}`);
      }
    }

    return true;
  }
}

/**
 * Policy engine coordinator
 */
export class PolicyEngine {
  constructor(config = POLICY_CONFIG) {
    this.inputPolicy = new InputPolicy(config.input);
    this.outputPolicy = new OutputPolicy(config.output);
    this.toolPolicy = new ToolPolicy(config.tools);
  }

  /**
   * Process input through all policies
   */
  processInput(input) {
    try {
      // Validate structure if input is an object
      if (typeof input === 'object') {
        this.inputPolicy.validateStructure(input);
      }

      // Sanitize string content
      if (typeof input === 'string') {
        return this.inputPolicy.sanitize(input);
      } else if (input.content) {
        input.content = this.inputPolicy.sanitize(input.content);
        return input;
      }

      return input;
    } catch (error) {
      console.error('❌ [PolicyEngine] Input processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Process output through all policies
   */
  async processOutput(output, schemaName = null) {
    try {
      return await this.outputPolicy.validate(output, schemaName);
    } catch (error) {
      console.error('❌ [PolicyEngine] Output processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate tool usage
   */
  validateTool(toolName, params = {}) {
    try {
      this.toolPolicy.validateTool(toolName);
      this.toolPolicy.validateToolParams(toolName, params);
      return true;
    } catch (error) {
      console.error('❌ [PolicyEngine] Tool validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get policy status
   */
  getStatus() {
    return {
      input: {
        maxLength: this.inputPolicy.config.maxLength,
        blockedPatterns: this.inputPolicy.config.blockedPatterns.length,
        allowedDomains: this.inputPolicy.config.allowedDomains.length
      },
      output: {
        maxLength: this.outputPolicy.config.maxLength,
        blockedContent: this.outputPolicy.config.blockedContent.length,
        requireNeutrality: this.outputPolicy.config.requireNeutrality
      },
      tools: {
        allowedTools: this.toolPolicy.config.allowedTools.length,
        blockedTools: this.toolPolicy.config.blockedTools.length
      }
    };
  }
}

/**
 * Express middleware for policy enforcement
 */
export function policyMiddleware(options = {}) {
  const policyEngine = new PolicyEngine(options.config);

  return async (req, res, next) => {
    try {
      // Process request body
      if (req.body) {
        req.body = policyEngine.processInput(req.body);
      }

      // Process query parameters
      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string') {
            req.query[key] = policyEngine.processInput(value);
          }
        }
      }

      next();
    } catch (error) {
      console.error('❌ [PolicyMiddleware] Policy violation:', error.message);
      res.status(400).json({
        error: 'Policy violation',
        message: error.message
      });
    }
  };
}

/**
 * AI-specific policy wrapper
 */
export async function withAIPolicies(aiFunction, options = {}) {
  const policyEngine = new PolicyEngine(options.config);

  return async (...args) => {
    try {
      // Process input arguments
      const processedArgs = args.map(arg => policyEngine.processInput(arg));

      // Execute AI function
      const result = await aiFunction(...processedArgs);

      // Process output
      const processedResult = await policyEngine.processOutput(result, options.schemaName);

      return processedResult;
    } catch (error) {
      console.error('❌ [AIPolicies] Policy enforcement failed:', error.message);
      throw error;
    }
  };
}

// Export default policy engine
export default {
  PolicyEngine,
  InputPolicy,
  OutputPolicy,
  ToolPolicy,
  policyMiddleware,
  withAIPolicies
};
