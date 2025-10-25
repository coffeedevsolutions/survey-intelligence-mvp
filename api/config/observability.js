/**
 * OpenTelemetry Configuration
 * 
 * Sets up distributed tracing, metrics, and correlation IDs
 * for observability across the AI survey application
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import crypto from 'crypto';

// Configuration
const OTEL_CONFIG = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'ai-survey-api',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  samplingRatio: parseFloat(process.env.OTEL_SAMPLING_RATIO || '1.0'),
  enableMetrics: process.env.OTEL_ENABLE_METRICS === 'true',
  enableTracing: process.env.OTEL_ENABLE_TRACING !== 'false'
};

// Initialize OpenTelemetry SDK
let sdk = null;

if (OTEL_CONFIG.enableTracing || OTEL_CONFIG.enableMetrics) {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: OTEL_CONFIG.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: OTEL_CONFIG.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: OTEL_CONFIG.environment,
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_CONFIG.otlpEndpoint}/v1/traces`,
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_CONFIG.otlpEndpoint}/v1/metrics`,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: OTEL_CONFIG.enableTracing ? traceExporter : undefined,
    metricReader: OTEL_CONFIG.enableMetrics ? metricExporter : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation
        },
        '@opentelemetry/instrumentation-net': {
          enabled: false, // Disable network instrumentation
        },
      }),
    ],
  });

  sdk.start();
  console.log('🔍 [OpenTelemetry] SDK started');
}

// Get tracer
const tracer = trace.getTracer(OTEL_CONFIG.serviceName, OTEL_CONFIG.serviceVersion);

/**
 * Generate correlation ID
 */
export function generateCorrelationId() {
  return crypto.randomUUID();
}

/**
 * Get correlation ID from context
 */
export function getCorrelationId() {
  const span = trace.getActiveSpan();
  return span?.spanContext().traceId || generateCorrelationId();
}

/**
 * Create a span for AI operations
 */
export function createAISpan(operationName, attributes = {}) {
  return tracer.startSpan(`ai.${operationName}`, {
    attributes: {
      'ai.operation': operationName,
      'ai.service': 'openai',
      ...attributes
    }
  });
}

/**
 * Create a span for database operations
 */
export function createDatabaseSpan(operationName, attributes = {}) {
  return tracer.startSpan(`db.${operationName}`, {
    attributes: {
      'db.operation': operationName,
      'db.system': 'postgresql',
      ...attributes
    }
  });
}

/**
 * Create a span for external API calls
 */
export function createExternalSpan(operationName, attributes = {}) {
  return tracer.startSpan(`external.${operationName}`, {
    attributes: {
      'external.operation': operationName,
      ...attributes
    }
  });
}

/**
 * Wrap function with tracing
 */
export function withTracing(spanName, fn, attributes = {}) {
  return async (...args) => {
    const span = tracer.startSpan(spanName, { attributes });
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(...args));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  };
}

/**
 * Add correlation ID to response headers
 */
export function addCorrelationHeaders(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  
  // Add to request context
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Trace-ID', getCorrelationId());
  
  next();
}

/**
 * Express middleware for tracing
 */
export function tracingMiddleware() {
  return (req, res, next) => {
    const span = tracer.startSpan(`http.${req.method}`, {
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path || req.path,
        'http.user_agent': req.get('User-Agent'),
        'http.request_id': req.correlationId,
        'user.id': req.user?.id,
        'user.org_id': req.user?.orgId,
      }
    });

    // Add span to request context
    req.span = span;

    // Override res.end to close span
    const originalEnd = res.end;
    res.end = function(...args) {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_size': res.get('Content-Length'),
      });

      if (res.statusCode >= 400) {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: `HTTP ${res.statusCode}` 
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * AI call tracing wrapper
 */
export function traceAICall(operationName, aiFunction) {
  return async (...args) => {
    const span = createAISpan(operationName);
    
    try {
      const startTime = Date.now();
      const result = await aiFunction(...args);
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'ai.duration_ms': duration,
        'ai.success': true,
        'ai.model': args[0]?.model || 'unknown',
        'ai.tokens_input': args[0]?.inputTokens || 0,
        'ai.tokens_output': args[0]?.outputTokens || 0,
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setAttributes({
        'ai.success': false,
        'ai.error': error.message,
      });
      
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  };
}

/**
 * Database operation tracing wrapper
 */
export function traceDatabaseOperation(operationName, dbFunction) {
  return async (...args) => {
    const span = createDatabaseSpan(operationName);
    
    try {
      const startTime = Date.now();
      const result = await dbFunction(...args);
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'db.duration_ms': duration,
        'db.success': true,
        'db.rows_affected': result?.rowCount || 0,
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setAttributes({
        'db.success': false,
        'db.error': error.message,
      });
      
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  };
}

/**
 * Add custom attributes to current span
 */
export function addSpanAttributes(attributes) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Record an event in the current span
 */
export function recordSpanEvent(name, attributes = {}) {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Get trace context for logging
 */
export function getTraceContext() {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: spanContext.traceFlags,
    };
  }
  return null;
}

/**
 * Shutdown OpenTelemetry
 */
export function shutdown() {
  if (sdk) {
    return sdk.shutdown();
  }
  return Promise.resolve();
}

/**
 * Get observability status
 */
export function getObservabilityStatus() {
  return {
    enabled: !!sdk,
    config: OTEL_CONFIG,
    traceContext: getTraceContext(),
  };
}

// Export default observability utilities
export default {
  generateCorrelationId,
  getCorrelationId,
  createAISpan,
  createDatabaseSpan,
  createExternalSpan,
  withTracing,
  addCorrelationHeaders,
  tracingMiddleware,
  traceAICall,
  traceDatabaseOperation,
  addSpanAttributes,
  recordSpanEvent,
  getTraceContext,
  shutdown,
  getObservabilityStatus
};
