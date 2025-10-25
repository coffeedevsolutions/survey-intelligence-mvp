/**
 * Cost Optimization System
 * 
 * Implements model routing, prompt caching, and context compression
 * to reduce AI costs while maintaining quality
 */

import crypto from 'crypto';
import { pool } from '../config/database.js';

// Model routing configuration
const MODEL_CONFIG = {
  // Model tiers by complexity and cost
  tiers: {
    simple: {
      models: ['gpt-3.5-turbo', 'gpt-4o-mini'],
      maxTokens: 1000,
      useCases: ['classification', 'simple_extraction', 'formatting']
    },
    medium: {
      models: ['gpt-4o-mini', 'gpt-4o'],
      maxTokens: 4000,
      useCases: ['analysis', 'summarization', 'translation']
    },
    complex: {
      models: ['gpt-4o', 'gpt-4'],
      maxTokens: 8000,
      useCases: ['creative_writing', 'complex_analysis', 'reasoning']
    }
  },
  
  // Cost per 1K tokens (in cents)
  pricing: {
    'gpt-3.5-turbo': { input: 0.1, output: 0.2 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o': { input: 0.5, output: 1.5 },
    'gpt-4': { input: 3.0, output: 6.0 }
  },
  
  // Cache configuration
  cache: {
    ttl: 3600000, // 1 hour
    maxSize: 1000, // Max 1000 cached prompts
    compressionThreshold: 1000 // Compress prompts longer than 1000 chars
  }
};

/**
 * Model Router Class
 */
export class ModelRouter {
  constructor(config = MODEL_CONFIG) {
    this.config = config;
    this.usageStats = new Map();
  }

  /**
   * Determine appropriate model based on task complexity
   */
  selectModel(taskType, inputLength, complexity = 'medium') {
    const tier = this.config.tiers[complexity] || this.config.tiers.medium;
    
    // Check if input is too long for simple models
    if (inputLength > tier.maxTokens && complexity === 'simple') {
      complexity = 'medium';
    }
    
    // Select model based on tier and availability
    const availableModels = tier.models.filter(model => 
      this.config.pricing[model] !== undefined
    );
    
    if (availableModels.length === 0) {
      throw new Error(`No models available for tier ${complexity}`);
    }
    
    // For now, select the first available model
    // In production, this could be more sophisticated (load balancing, cost optimization)
    const selectedModel = availableModels[0];
    
    // Track usage
    this.trackUsage(selectedModel, taskType);
    
    return {
      model: selectedModel,
      tier: complexity,
      estimatedCost: this.estimateCost(selectedModel, inputLength, tier.maxTokens)
    };
  }

  /**
   * Estimate cost for a model call
   */
  estimateCost(model, inputTokens, outputTokens = 500) {
    const pricing = this.config.pricing[model];
    if (!pricing) {
      throw new Error(`Unknown model: ${model}`);
    }
    
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    return Math.ceil(inputCost + outputCost);
  }

  /**
   * Track model usage statistics
   */
  trackUsage(model, taskType) {
    const key = `${model}:${taskType}`;
    const current = this.usageStats.get(key) || { count: 0, totalCost: 0 };
    
    current.count++;
    this.usageStats.set(key, current);
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return Object.fromEntries(this.usageStats);
  }
}

/**
 * Prompt Cache Class
 */
export class PromptCache {
  constructor(config = MODEL_CONFIG.cache) {
    this.config = config;
    this.cache = new Map();
    this.accessTimes = new Map();
  }

  /**
   * Generate cache key from prompt and context
   */
  generateCacheKey(prompt, context = {}) {
    const content = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const contextStr = JSON.stringify(context);
    const combined = content + contextStr;
    
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get cached response
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check TTL
    if (Date.now() - cached.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return null;
    }
    
    // Update access time
    this.accessTimes.set(key, Date.now());
    
    return cached.response;
  }

  /**
   * Set cached response
   */
  set(key, response, metadata = {}) {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.cleanup();
    }
    
    const cached = {
      response: response,
      timestamp: Date.now(),
      metadata: metadata
    };
    
    this.cache.set(key, cached);
    this.accessTimes.set(key, Date.now());
  }

  /**
   * Clean up old cache entries
   */
  cleanup() {
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]); // Sort by access time
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      oldestEntry: this.getOldestEntry(),
      newestEntry: this.getNewestEntry()
    };
  }

  calculateHitRate() {
    // This would need to track hits/misses in a real implementation
    return 0.85; // Placeholder
  }

  getOldestEntry() {
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);
    
    return entries.length > 0 ? entries[0][1] : null;
  }

  getNewestEntry() {
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return entries.length > 0 ? entries[0][1] : null;
  }
}

/**
 * Context Compressor Class
 */
export class ContextCompressor {
  constructor(config = {}) {
    this.config = {
      maxContextLength: 4000,
      compressionRatio: 0.7,
      preserveKeywords: true,
      ...config
    };
  }

  /**
   * Compress context while preserving important information
   */
  compressContext(context, targetLength = null) {
    const maxLength = targetLength || this.config.maxContextLength;
    
    if (context.length <= maxLength) {
      return context;
    }
    
    // Extract key information
    const keywords = this.extractKeywords(context);
    const sentences = this.splitIntoSentences(context);
    
    // Prioritize sentences with keywords
    const prioritizedSentences = this.prioritizeSentences(sentences, keywords);
    
    // Build compressed context
    let compressed = '';
    for (const sentence of prioritizedSentences) {
      if (compressed.length + sentence.length <= maxLength) {
        compressed += sentence + ' ';
      } else {
        break;
      }
    }
    
    return compressed.trim();
  }

  /**
   * Extract keywords from context
   */
  extractKeywords(context) {
    // Simple keyword extraction - can be enhanced with NLP libraries
    const words = context.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text) {
    return text.split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  /**
   * Prioritize sentences based on keyword presence
   */
  prioritizeSentences(sentences, keywords) {
    return sentences.sort((a, b) => {
      const aScore = this.calculateSentenceScore(a, keywords);
      const bScore = this.calculateSentenceScore(b, keywords);
      return bScore - aScore;
    });
  }

  /**
   * Calculate sentence score based on keyword presence
   */
  calculateSentenceScore(sentence, keywords) {
    const lowerSentence = sentence.toLowerCase();
    return keywords.reduce((score, keyword) => {
      return score + (lowerSentence.includes(keyword) ? 1 : 0);
    }, 0);
  }
}

/**
 * Cost Optimization Manager
 */
export class CostOptimizationManager {
  constructor(config = MODEL_CONFIG) {
    this.modelRouter = new ModelRouter(config);
    this.promptCache = new PromptCache(config.cache);
    this.contextCompressor = new ContextCompressor();
    this.totalSavings = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Optimize AI call with caching and model selection
   */
  async optimizeAICall(prompt, context = {}, options = {}) {
    const {
      taskType = 'general',
      complexity = 'medium',
      useCache = true,
      compressContext = true,
      aiFunction = null
    } = options;
    
    // Generate cache key
    const cacheKey = this.promptCache.generateCacheKey(prompt, context);
    
    // Try cache first
    if (useCache) {
      const cached = this.promptCache.get(cacheKey);
      if (cached) {
        this.cacheHits++;
        console.log(`💾 [CostOptimization] Cache hit for ${taskType}`);
        return cached;
      }
      this.cacheMisses++;
    }
    
    // Compress context if needed
    let processedPrompt = prompt;
    if (compressContext && typeof prompt === 'string') {
      processedPrompt = this.contextCompressor.compressContext(prompt);
    }
    
    // Select optimal model
    const modelSelection = this.modelRouter.selectModel(
      taskType,
      processedPrompt.length,
      complexity
    );
    
    // Execute AI call
    if (aiFunction) {
      const result = await aiFunction(processedPrompt, {
        model: modelSelection.model,
        ...context
      });
      
      // Cache result
      if (useCache) {
        this.promptCache.set(cacheKey, result, {
          model: modelSelection.model,
          taskType: taskType,
          complexity: complexity
        });
      }
      
      return result;
    }
    
    return {
      prompt: processedPrompt,
      model: modelSelection.model,
      estimatedCost: modelSelection.estimatedCost
    };
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    const cacheStats = this.promptCache.getStats();
    const modelStats = this.modelRouter.getUsageStats();
    
    return {
      cache: {
        ...cacheStats,
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
      },
      models: modelStats,
      totalSavings: this.totalSavings,
      compressionRatio: this.contextCompressor.config.compressionRatio
    };
  }

  /**
   * Save optimization data to database
   */
  async saveOptimizationData(orgId, sessionId, data) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO cost_optimization_logs (
          org_id, session_id, model_used, tokens_saved, 
          cache_hit, compression_ratio, estimated_savings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orgId,
        sessionId,
        data.model,
        data.tokensSaved || 0,
        data.cacheHit || false,
        data.compressionRatio || 1.0,
        data.estimatedSavings || 0
      ]);
    } catch (error) {
      console.error('Failed to save optimization data:', error);
    } finally {
      client.release();
    }
  }
}

// Export default cost optimization utilities
export default {
  ModelRouter,
  PromptCache,
  ContextCompressor,
  CostOptimizationManager
};
