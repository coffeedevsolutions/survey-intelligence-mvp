/**
 * Performance Optimization Framework
 * 
 * Implements advanced caching, model optimization, and performance tuning
 * for AI services and database operations
 */

import { pool } from '../config/database.js';
import crypto from 'crypto';
import { trace } from '@opentelemetry/api';

// Performance Optimization Configuration
const PERFORMANCE_CONFIG = {
  caching: {
    enabled: true,
    ttl: {
      short: 300, // 5 minutes
      medium: 3600, // 1 hour
      long: 86400 // 24 hours
    },
    maxSize: 10000,
    compressionThreshold: 1024 // Compress objects larger than 1KB
  },
  modelOptimization: {
    enabled: true,
    routing: {
      simple: ['gpt-3.5-turbo', 'gpt-4o-mini'],
      complex: ['gpt-4o', 'gpt-4']
    },
    compression: {
      enabled: true,
      ratio: 0.7
    }
  },
  database: {
    connectionPooling: {
      min: 5,
      max: 20,
      idleTimeoutMillis: 30000
    },
    queryOptimization: {
      enabled: true,
      slowQueryThreshold: 1000 // ms
    }
  }
};

/**
 * Advanced Cache Manager
 */
export class AdvancedCacheManager {
  constructor(config = PERFORMANCE_CONFIG.caching) {
    this.config = config;
    this.cache = new Map();
    this.accessTimes = new Map();
    this.hitCounts = new Map();
    this.missCounts = new Map();
  }

  /**
   * Generate cache key with namespace
   */
  generateCacheKey(namespace, key, version = '1') {
    const combined = `${namespace}:${key}:${version}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get cached value
   */
  get(namespace, key, version = '1') {
    const cacheKey = this.generateCacheKey(namespace, key, version);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      this.missCounts.set(cacheKey, (this.missCounts.get(cacheKey) || 0) + 1);
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      this.accessTimes.delete(cacheKey);
      this.missCounts.set(cacheKey, (this.missCounts.get(cacheKey) || 0) + 1);
      return null;
    }

    // Update access time and hit count
    this.accessTimes.set(cacheKey, Date.now());
    this.hitCounts.set(cacheKey, (this.hitCounts.get(cacheKey) || 0) + 1);

    return cached.value;
  }

  /**
   * Set cached value
   */
  set(namespace, key, value, ttl = this.config.ttl.medium, version = '1') {
    const cacheKey = this.generateCacheKey(namespace, key, version);

    // Clean up if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.cleanup();
    }

    // Compress large values
    let processedValue = value;
    if (this.config.compressionThreshold && JSON.stringify(value).length > this.config.compressionThreshold) {
      processedValue = this.compress(value);
    }

    const cached = {
      value: processedValue,
      timestamp: Date.now(),
      ttl: ttl * 1000,
      compressed: processedValue !== value
    };

    this.cache.set(cacheKey, cached);
    this.accessTimes.set(cacheKey, Date.now());

    return true;
  }

  /**
   * Compress value
   */
  compress(value) {
    // Simple compression - in production, use zlib or similar
    const json = JSON.stringify(value);
    return Buffer.from(json).toString('base64');
  }

  /**
   * Decompress value
   */
  decompress(value) {
    try {
      const json = Buffer.from(value, 'base64').toString();
      return JSON.parse(json);
    } catch {
      return value;
    }
  }

  /**
   * Clean up old cache entries
   */
  cleanup() {
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);

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
    const totalHits = Array.from(this.hitCounts.values()).reduce((a, b) => a + b, 0);
    const totalMisses = Array.from(this.missCounts.values()).reduce((a, b) => a + b, 0);
    const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: hitRate,
      totalHits: totalHits,
      totalMisses: totalMisses,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache) {
      totalSize += key.length + JSON.stringify(value).length;
    }
    return totalSize;
  }
}

/**
 * Model Optimization Manager
 */
export class ModelOptimizationManager {
  constructor(config = PERFORMANCE_CONFIG.modelOptimization) {
    this.config = config;
    this.usageStats = new Map();
    this.performanceMetrics = new Map();
  }

  /**
   * Select optimal model based on task complexity
   */
  selectOptimalModel(taskType, inputLength, complexity = 'medium') {
    const routing = this.config.routing;
    
    // Determine complexity based on input length and task type
    if (inputLength < 500 && this.isSimpleTask(taskType)) {
      complexity = 'simple';
    } else if (inputLength > 2000 || this.isComplexTask(taskType)) {
      complexity = 'complex';
    }

    const models = routing[complexity] || routing.medium;
    const selectedModel = models[0]; // For now, select first available

    // Track usage
    this.trackModelUsage(selectedModel, taskType, complexity);

    return {
      model: selectedModel,
      complexity: complexity,
      estimatedCost: this.estimateCost(selectedModel, inputLength),
      estimatedLatency: this.estimateLatency(selectedModel, inputLength)
    };
  }

  /**
   * Check if task is simple
   */
  isSimpleTask(taskType) {
    const simpleTasks = ['classification', 'extraction', 'formatting', 'validation'];
    return simpleTasks.includes(taskType);
  }

  /**
   * Check if task is complex
   */
  isComplexTask(taskType) {
    const complexTasks = ['creative_writing', 'complex_analysis', 'reasoning', 'code_generation'];
    return complexTasks.includes(taskType);
  }

  /**
   * Track model usage
   */
  trackModelUsage(model, taskType, complexity) {
    const key = `${model}:${taskType}:${complexity}`;
    const current = this.usageStats.get(key) || { count: 0, totalCost: 0, totalLatency: 0 };
    
    current.count++;
    this.usageStats.set(key, current);
  }

  /**
   * Estimate model cost
   */
  estimateCost(model, inputLength) {
    const pricing = {
      'gpt-3.5-turbo': { input: 0.1, output: 0.2 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4o': { input: 0.5, output: 1.5 },
      'gpt-4': { input: 3.0, output: 6.0 }
    };

    const modelPricing = pricing[model];
    if (!modelPricing) return 0;

    const inputCost = (inputLength / 1000) * modelPricing.input;
    const outputCost = (500 / 1000) * modelPricing.output; // Assume 500 output tokens

    return Math.ceil(inputCost + outputCost);
  }

  /**
   * Estimate model latency
   */
  estimateLatency(model, inputLength) {
    const baseLatency = {
      'gpt-3.5-turbo': 500,
      'gpt-4o-mini': 800,
      'gpt-4o': 1500,
      'gpt-4': 3000
    };

    const base = baseLatency[model] || 1000;
    const lengthFactor = Math.log(inputLength / 100) * 100;

    return Math.ceil(base + lengthFactor);
  }

  /**
   * Optimize prompt for model
   */
  optimizePrompt(prompt, model, targetLength = null) {
    if (!this.config.compression.enabled) {
      return prompt;
    }

    const currentLength = typeof prompt === 'string' ? prompt.length : JSON.stringify(prompt).length;
    
    if (targetLength && currentLength <= targetLength) {
      return prompt;
    }

    const target = targetLength || Math.ceil(currentLength * this.config.compression.ratio);
    
    if (typeof prompt === 'string') {
      return this.compressText(prompt, target);
    } else {
      return this.compressObject(prompt, target);
    }
  }

  /**
   * Compress text
   */
  compressText(text, targetLength) {
    if (text.length <= targetLength) return text;

    // Simple compression: remove extra whitespace, shorten common phrases
    let compressed = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    if (compressed.length <= targetLength) return compressed;

    // Truncate if still too long
    return compressed.substring(0, targetLength - 3) + '...';
  }

  /**
   * Compress object
   */
  compressObject(obj, targetLength) {
    const json = JSON.stringify(obj);
    if (json.length <= targetLength) return obj;

    // Remove optional fields
    const compressed = { ...obj };
    delete compressed.metadata;
    delete compressed.timestamp;
    delete compressed.debug;

    const compressedJson = JSON.stringify(compressed);
    if (compressedJson.length <= targetLength) return compressed;

    // Truncate string fields
    for (const [key, value] of Object.entries(compressed)) {
      if (typeof value === 'string' && value.length > 100) {
        compressed[key] = value.substring(0, 100) + '...';
      }
    }

    return compressed;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    return {
      usageStats: Object.fromEntries(this.usageStats),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      compressionEnabled: this.config.compression.enabled,
      compressionRatio: this.config.compression.ratio
    };
  }
}

/**
 * Database Performance Manager
 */
export class DatabasePerformanceManager {
  constructor(config = PERFORMANCE_CONFIG.database) {
    this.config = config;
    this.slowQueries = new Map();
    this.queryStats = new Map();
  }

  /**
   * Monitor database query performance
   */
  async monitorQuery(query, params, operation, table) {
    const startTime = Date.now();
    
    try {
      const result = await query;
      const duration = Date.now() - startTime;

      // Record metrics
      this.recordQueryMetrics(operation, table, duration, true);

      // Check for slow queries
      if (duration > this.config.queryOptimization.slowQueryThreshold) {
        this.recordSlowQuery(operation, table, duration, params);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(operation, table, duration, false);
      throw error;
    }
  }

  /**
   * Record query metrics
   */
  recordQueryMetrics(operation, table, duration, success) {
    const key = `${operation}:${table}`;
    const stats = this.queryStats.get(key) || {
      count: 0,
      totalDuration: 0,
      successCount: 0,
      errorCount: 0,
      avgDuration: 0,
      maxDuration: 0
    };

    stats.count++;
    stats.totalDuration += duration;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.avgDuration = stats.totalDuration / stats.count;

    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }

    this.queryStats.set(key, stats);
  }

  /**
   * Record slow query
   */
  recordSlowQuery(operation, table, duration, params) {
    const slowQuery = {
      operation,
      table,
      duration,
      params: JSON.stringify(params),
      timestamp: new Date().toISOString()
    };

    const key = `${operation}:${table}:${Date.now()}`;
    this.slowQueries.set(key, slowQuery);

    console.warn(`🐌 [DB] Slow query detected: ${operation} on ${table} took ${duration}ms`);
  }

  /**
   * Optimize database connection pool
   */
  async optimizeConnectionPool() {
    const client = await pool.connect();
    try {
      // Get current pool stats
      const poolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };

      // Optimize based on usage patterns
      if (poolStats.waitingCount > 5) {
        console.log('📈 [DB] High waiting count, consider increasing pool size');
      }

      if (poolStats.idleCount > poolStats.totalCount * 0.8) {
        console.log('📉 [DB] High idle count, consider decreasing pool size');
      }

      return poolStats;

    } finally {
      client.release();
    }
  }

  /**
   * Get database performance statistics
   */
  getPerformanceStats() {
    return {
      queryStats: Object.fromEntries(this.queryStats),
      slowQueries: Array.from(this.slowQueries.values()).slice(-10), // Last 10 slow queries
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  }
}

/**
 * Performance Optimization Manager
 */
export class PerformanceOptimizationManager {
  constructor(config = PERFORMANCE_CONFIG) {
    this.config = config;
    this.cacheManager = new AdvancedCacheManager(config.caching);
    this.modelOptimizer = new ModelOptimizationManager(config.modelOptimization);
    this.dbPerformanceManager = new DatabasePerformanceManager(config.database);
  }

  /**
   * Optimize AI call with caching and model selection
   */
  async optimizeAICall(prompt, context = {}, options = {}) {
    const {
      taskType = 'general',
      useCache = true,
      optimizePrompt = true,
      targetLatency = null
    } = options;

    // Generate cache key
    const cacheKey = this.generateAICacheKey(prompt, context, taskType);

    // Try cache first
    if (useCache) {
      const cached = this.cacheManager.get('ai', cacheKey);
      if (cached) {
        console.log(`💾 [Performance] Cache hit for AI call: ${taskType}`);
        return cached;
      }
    }

    // Select optimal model
    const inputLength = typeof prompt === 'string' ? prompt.length : JSON.stringify(prompt).length;
    const modelSelection = this.modelOptimizer.selectOptimalModel(taskType, inputLength);

    // Optimize prompt if needed
    let optimizedPrompt = prompt;
    if (optimizePrompt) {
      optimizedPrompt = this.modelOptimizer.optimizePrompt(prompt, modelSelection.model, targetLatency);
    }

    return {
      prompt: optimizedPrompt,
      model: modelSelection.model,
      complexity: modelSelection.complexity,
      estimatedCost: modelSelection.estimatedCost,
      estimatedLatency: modelSelection.estimatedLatency,
      cacheKey: cacheKey
    };
  }

  /**
   * Generate AI cache key
   */
  generateAICacheKey(prompt, context, taskType) {
    const content = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const contextStr = JSON.stringify(context);
    const combined = `${taskType}:${content}:${contextStr}`;
    
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  /**
   * Cache AI result
   */
  cacheAIResult(cacheKey, result, ttl = null) {
    const cacheTTL = ttl || this.config.caching.ttl.medium;
    this.cacheManager.set('ai', cacheKey, result, cacheTTL);
  }

  /**
   * Optimize database query
   */
  async optimizeDBQuery(query, params, operation, table) {
    return await this.dbPerformanceManager.monitorQuery(query, params, operation, table);
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboard() {
    const cacheStats = this.cacheManager.getStats();
    const modelStats = this.modelOptimizer.getOptimizationStats();
    const dbStats = this.dbPerformanceManager.getPerformanceStats();

    return {
      cache: cacheStats,
      model: modelStats,
      database: dbStats,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Run performance optimization
   */
  async runOptimization() {
    try {
      // Optimize connection pool
      await this.dbPerformanceManager.optimizeConnectionPool();

      // Clean up cache
      this.cacheManager.cleanup();

      console.log('⚡ [Performance] Optimization completed');

    } catch (error) {
      console.error('Failed to run performance optimization:', error);
    }
  }
}

// Export default performance optimization manager
export default PerformanceOptimizationManager;
