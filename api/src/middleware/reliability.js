/**
 * Reliability Middleware
 * 
 * Implements timeouts, retries, circuit breakers, and idempotency
 * for AI calls and external service interactions
 */

import pRetry from 'p-retry';
import pTimeout from 'p-timeout';
import pLimit from 'p-limit';
import crypto from 'crypto';

// Circuit breaker states
const CIRCUIT_STATES = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Failing, reject requests
  HALF_OPEN: 'half-open' // Testing if service recovered
};

// Default configuration
const DEFAULT_CONFIG = {
  timeout: 15000,        // 15 seconds
  retries: 2,            // 2 retries
  retryDelay: 1000,      // 1 second base delay
  circuitBreaker: {
    failureThreshold: 5,     // Open after 5 failures
    recoveryTimeout: 30000,  // Try recovery after 30 seconds
    successThreshold: 3      // Close after 3 successes
  },
  concurrency: {
    ai: 5,               // Max 5 concurrent AI calls
    external: 10          // Max 10 concurrent external calls
  }
};

// Circuit breaker instances
const circuitBreakers = new Map();

// Concurrency limiters
const limiters = {
  ai: pLimit(DEFAULT_CONFIG.concurrency.ai),
  external: pLimit(DEFAULT_CONFIG.concurrency.external)
};

// Request tracking for idempotency
const idempotencyStore = new Map();

/**
 * Circuit Breaker Class
 */
class CircuitBreaker {
  constructor(name, config = DEFAULT_CONFIG.circuitBreaker) {
    this.name = name;
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.config = config;
  }

  canExecute() {
    const now = Date.now();
    
    switch (this.state) {
      case CIRCUIT_STATES.CLOSED:
        return true;
      
      case CIRCUIT_STATES.OPEN:
        if (now - this.lastFailureTime > this.config.recoveryTimeout) {
          this.state = CIRCUIT_STATES.HALF_OPEN;
          this.successCount = 0;
          return true;
        }
        return false;
      
      case CIRCUIT_STATES.HALF_OPEN:
        return true;
      
      default:
        return false;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CIRCUIT_STATES.CLOSED;
        console.log(`🔧 [CircuitBreaker] ${this.name} circuit closed`);
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      console.log(`🔴 [CircuitBreaker] ${this.name} circuit opened after ${this.failureCount} failures`);
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Get or create circuit breaker for a service
 */
function getCircuitBreaker(serviceName) {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(serviceName));
  }
  return circuitBreakers.get(serviceName);
}

/**
 * Generate idempotency key from request
 */
function generateIdempotencyKey(req) {
  const key = `${req.method}-${req.path}-${JSON.stringify(req.body)}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Check if request is idempotent
 */
function isIdempotentRequest(req) {
  const idempotentMethods = ['GET', 'PUT', 'DELETE'];
  return idempotentMethods.includes(req.method) || req.headers['idempotency-key'];
}

/**
 * Retry configuration with exponential backoff
 */
function getRetryConfig(options = {}) {
  return {
    retries: options.retries || DEFAULT_CONFIG.retries,
    factor: 2,
    minTimeout: options.retryDelay || DEFAULT_CONFIG.retryDelay,
    maxTimeout: 10000,
    randomize: true,
    onFailedAttempt: (error) => {
      console.warn(`🔄 [Retry] Attempt ${error.attemptNumber} failed: ${error.message}`);
    }
  };
}

/**
 * Execute function with timeout
 */
export async function withTimeout(fn, timeout = DEFAULT_CONFIG.timeout, options = {}) {
  const timeoutMessage = options.timeoutMessage || `Operation timed out after ${timeout}ms`;
  
  return pTimeout(fn(), timeout, timeoutMessage);
}

/**
 * Execute function with retries
 */
export async function withRetries(fn, options = {}) {
  const retryConfig = getRetryConfig(options);
  
  return pRetry(fn, retryConfig);
}

/**
 * Execute function with circuit breaker
 */
export async function withCircuitBreaker(fn, serviceName, options = {}) {
  const circuitBreaker = getCircuitBreaker(serviceName);
  
  if (!circuitBreaker.canExecute()) {
    throw new Error(`Circuit breaker ${serviceName} is open`);
  }
  
  try {
    const result = await fn();
    circuitBreaker.onSuccess();
    return result;
  } catch (error) {
    circuitBreaker.onFailure();
    throw error;
  }
}

/**
 * Execute function with concurrency limiting
 */
export async function withConcurrencyLimit(fn, type = 'external') {
  const limiter = limiters[type] || limiters.external;
  return limiter(fn);
}

/**
 * Execute function with full reliability stack
 */
export async function withReliability(fn, options = {}) {
  const {
    serviceName = 'default',
    timeout = DEFAULT_CONFIG.timeout,
    retries = DEFAULT_CONFIG.retries,
    concurrencyType = 'external',
    enableCircuitBreaker = true,
    enableRetries = true,
    enableTimeout = true,
    enableConcurrency = true
  } = options;
  
  let wrappedFn = fn;
  
  // Apply circuit breaker
  if (enableCircuitBreaker) {
    wrappedFn = () => withCircuitBreaker(wrappedFn, serviceName, options);
  }
  
  // Apply retries
  if (enableRetries) {
    wrappedFn = () => withRetries(wrappedFn, options);
  }
  
  // Apply timeout
  if (enableTimeout) {
    wrappedFn = () => withTimeout(wrappedFn, timeout, options);
  }
  
  // Apply concurrency limiting
  if (enableConcurrency) {
    wrappedFn = () => withConcurrencyLimit(wrappedFn, concurrencyType);
  }
  
  return wrappedFn();
}

/**
 * Idempotency middleware
 */
export function idempotencyMiddleware(options = {}) {
  const {
    ttl = 300000, // 5 minutes
    keyGenerator = generateIdempotencyKey
  } = options;
  
  return async (req, res, next) => {
    // Skip non-idempotent requests
    if (!isIdempotentRequest(req)) {
      return next();
    }
    
    const idempotencyKey = req.headers['idempotency-key'] || keyGenerator(req);
    const cached = idempotencyStore.get(idempotencyKey);
    
    if (cached) {
      console.log(`♻️ [Idempotency] Returning cached response for ${idempotencyKey}`);
      return res.json(cached.response);
    }
    
    // Store original res.json
    const originalJson = res.json;
    res.json = function(response) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyStore.set(idempotencyKey, {
          response,
          timestamp: Date.now()
        });
        
        // Clean up expired entries
        setTimeout(() => {
          idempotencyStore.delete(idempotencyKey);
        }, ttl);
      }
      
      return originalJson.call(this, response);
    };
    
    next();
  };
}

/**
 * AI call wrapper with reliability
 */
export async function reliableAICall(aiFunction, options = {}) {
  const aiOptions = {
    serviceName: 'openai',
    timeout: 30000, // 30 seconds for AI calls
    retries: 2,
    concurrencyType: 'ai',
    enableCircuitBreaker: true,
    enableRetries: true,
    enableTimeout: true,
    enableConcurrency: true,
    ...options
  };
  
  return withReliability(aiFunction, aiOptions);
}

/**
 * External API call wrapper with reliability
 */
export async function reliableExternalCall(externalFunction, options = {}) {
  const externalOptions = {
    serviceName: 'external-api',
    timeout: 15000, // 15 seconds for external calls
    retries: 3,
    concurrencyType: 'external',
    enableCircuitBreaker: true,
    enableRetries: true,
    enableTimeout: true,
    enableConcurrency: true,
    ...options
  };
  
  return withReliability(externalFunction, externalOptions);
}

/**
 * Database call wrapper with reliability
 */
export async function reliableDatabaseCall(dbFunction, options = {}) {
  const dbOptions = {
    serviceName: 'database',
    timeout: 10000, // 10 seconds for database calls
    retries: 1,
    concurrencyType: 'external',
    enableCircuitBreaker: false, // Database has its own connection pooling
    enableRetries: true,
    enableTimeout: true,
    enableConcurrency: false, // Database handles concurrency
    ...options
  };
  
  return withReliability(dbFunction, dbOptions);
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus() {
  const status = {};
  for (const [name, breaker] of circuitBreakers) {
    status[name] = breaker.getState();
  }
  return status;
}

/**
 * Reset circuit breaker
 */
export function resetCircuitBreaker(serviceName) {
  const breaker = circuitBreakers.get(serviceName);
  if (breaker) {
    breaker.state = CIRCUIT_STATES.CLOSED;
    breaker.failureCount = 0;
    breaker.successCount = 0;
    breaker.lastFailureTime = null;
    console.log(`🔄 [CircuitBreaker] Reset circuit breaker for ${serviceName}`);
  }
}

/**
 * Get reliability metrics
 */
export function getReliabilityMetrics() {
  return {
    circuitBreakers: getCircuitBreakerStatus(),
    idempotencyCacheSize: idempotencyStore.size,
    concurrencyLimits: {
      ai: DEFAULT_CONFIG.concurrency.ai,
      external: DEFAULT_CONFIG.concurrency.external
    }
  };
}

/**
 * Express middleware for reliability
 */
export function reliabilityMiddleware(options = {}) {
  return [
    idempotencyMiddleware(options.idempotency),
    // Add request timeout middleware
    (req, res, next) => {
      const timeout = options.requestTimeout || 30000;
      
      const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
          res.status(408).json({ error: 'Request timeout' });
        }
      }, timeout);
      
      res.on('finish', () => clearTimeout(timeoutId));
      res.on('close', () => clearTimeout(timeoutId));
      
      next();
    }
  ];
}

// Export default reliability utilities
export default {
  withTimeout,
  withRetries,
  withCircuitBreaker,
  withConcurrencyLimit,
  withReliability,
  reliableAICall,
  reliableExternalCall,
  reliableDatabaseCall,
  idempotencyMiddleware,
  reliabilityMiddleware,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
  getReliabilityMetrics
};
