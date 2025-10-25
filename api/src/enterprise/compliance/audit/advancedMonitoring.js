/**
 * Advanced Monitoring and Alerting System
 * 
 * Implements comprehensive monitoring with Prometheus metrics,
 * SLO dashboards, and intelligent alerting
 */

import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';
import cron from 'node-cron';
import { pool } from '../../../database/connection.js';
import { trace } from '@opentelemetry/api';

// Monitoring Configuration
const MONITORING_CONFIG = {
  metrics: {
    enabled: true,
    port: process.env.METRICS_PORT || 9090,
    path: '/metrics'
  },
  slo: {
    availability: 99.9, // 99.9% availability target
    latency: {
      p50: 100, // 100ms p50 latency target
      p95: 500, // 500ms p95 latency target
      p99: 1000 // 1000ms p99 latency target
    },
    errorRate: 0.1 // 0.1% error rate target
  },
  alerting: {
    enabled: true,
    channels: ['email', 'slack', 'webhook'],
    thresholds: {
      availability: 99.0, // Alert if availability drops below 99%
      latency: {
        p95: 1000, // Alert if p95 latency exceeds 1000ms
        p99: 2000  // Alert if p99 latency exceeds 2000ms
      },
      errorRate: 1.0 // Alert if error rate exceeds 1%
    }
  }
};

/**
 * Prometheus Metrics Manager
 */
export class PrometheusMetricsManager {
  constructor(config = MONITORING_CONFIG) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  initializeMetrics() {
    // HTTP request metrics
    const httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'org_id']
    });

    const httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'org_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    // AI service metrics
    const aiRequestsTotal = new Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['model', 'operation', 'org_id', 'status']
    });

    const aiRequestDuration = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'Duration of AI requests in seconds',
      labelNames: ['model', 'operation', 'org_id'],
      buckets: [1, 5, 10, 30, 60, 120]
    });

    const aiTokensUsed = new Counter({
      name: 'ai_tokens_used_total',
      help: 'Total number of AI tokens used',
      labelNames: ['model', 'token_type', 'org_id']
    });

    const aiCostTotal = new Counter({
      name: 'ai_cost_total',
      help: 'Total AI cost in cents',
      labelNames: ['model', 'org_id']
    });

    // Database metrics
    const dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections'
    });

    const dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    const dbQueryErrors = new Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'error_type']
    });

    // System metrics
    const systemMemoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes'
    });

    const systemCpuUsage = new Gauge({
      name: 'system_cpu_usage_percent',
      help: 'System CPU usage percentage'
    });

    const systemDiskUsage = new Gauge({
      name: 'system_disk_usage_percent',
      help: 'System disk usage percentage'
    });

    // Business metrics
    const activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Total number of active users',
      labelNames: ['org_id']
    });

    const activeSessions = new Gauge({
      name: 'active_sessions_total',
      help: 'Total number of active sessions',
      labelNames: ['org_id']
    });

    const surveyCompletions = new Counter({
      name: 'survey_completions_total',
      help: 'Total number of survey completions',
      labelNames: ['org_id', 'campaign_id']
    });

    return {
      httpRequestsTotal,
      httpRequestDuration,
      aiRequestsTotal,
      aiRequestDuration,
      aiTokensUsed,
      aiCostTotal,
      dbConnectionsActive,
      dbQueryDuration,
      dbQueryErrors,
      systemMemoryUsage,
      systemCpuUsage,
      systemDiskUsage,
      activeUsers,
      activeSessions,
      surveyCompletions
    };
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method, route, statusCode, duration, orgId = null) {
    this.metrics.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      org_id: orgId || 'unknown'
    });

    this.metrics.httpRequestDuration.observe({
      method,
      route,
      org_id: orgId || 'unknown'
    }, duration);
  }

  /**
   * Record AI request metrics
   */
  recordAIRequest(model, operation, duration, tokens, cost, orgId, status = 'success') {
    this.metrics.aiRequestsTotal.inc({
      model,
      operation,
      org_id: orgId || 'unknown',
      status
    });

    this.metrics.aiRequestDuration.observe({
      model,
      operation,
      org_id: orgId || 'unknown'
    }, duration);

    if (tokens) {
      this.metrics.aiTokensUsed.inc({
        model,
        token_type: 'total',
        org_id: orgId || 'unknown'
      }, tokens);
    }

    if (cost) {
      this.metrics.aiCostTotal.inc({
        model,
        org_id: orgId || 'unknown'
      }, cost);
    }
  }

  /**
   * Record database query metrics
   */
  recordDBQuery(operation, table, duration, error = null) {
    this.metrics.dbQueryDuration.observe({
      operation,
      table
    }, duration);

    if (error) {
      this.metrics.dbQueryErrors.inc({
        operation,
        table,
        error_type: error.constructor.name
      });
    }
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.systemMemoryUsage.set(memUsage.heapUsed);

    // CPU usage would require additional monitoring in production
    // this.metrics.systemCpuUsage.set(cpuUsage);
  }

  /**
   * Get metrics registry
   */
  getRegistry() {
    return register;
  }
}

/**
 * SLO Manager
 */
export class SLOManager {
  constructor(config = MONITORING_CONFIG) {
    this.config = config;
    this.sloData = new Map();
  }

  /**
   * Calculate availability SLO
   */
  async calculateAvailabilitySLO(timeWindow = '1h') {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests
        FROM http_request_logs
        WHERE created_at >= NOW() - INTERVAL '${timeWindow}'
      `);

      const data = result.rows[0];
      const availability = (data.successful_requests / data.total_requests) * 100;

      this.sloData.set('availability', {
        value: availability,
        target: this.config.slo.availability,
        met: availability >= this.config.slo.availability,
        totalRequests: parseInt(data.total_requests),
        successfulRequests: parseInt(data.successful_requests),
        failedRequests: parseInt(data.failed_requests)
      });

      return this.sloData.get('availability');

    } finally {
      client.release();
    }
  }

  /**
   * Calculate latency SLO
   */
  async calculateLatencySLO(timeWindow = '1h') {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99,
          AVG(duration_ms) as avg_latency
        FROM http_request_logs
        WHERE created_at >= NOW() - INTERVAL '${timeWindow}'
          AND status_code < 400
      `);

      const data = result.rows[0];
      const latency = {
        p50: parseFloat(data.p50),
        p95: parseFloat(data.p95),
        p99: parseFloat(data.p99),
        avg: parseFloat(data.avg_latency)
      };

      this.sloData.set('latency', {
        value: latency,
        target: this.config.slo.latency,
        met: {
          p50: latency.p50 <= this.config.slo.latency.p50,
          p95: latency.p95 <= this.config.slo.latency.p95,
          p99: latency.p99 <= this.config.slo.latency.p99
        }
      });

      return this.sloData.get('latency');

    } finally {
      client.release();
    }
  }

  /**
   * Calculate error rate SLO
   */
  async calculateErrorRateSLO(timeWindow = '1h') {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests
        FROM http_request_logs
        WHERE created_at >= NOW() - INTERVAL '${timeWindow}'
      `);

      const data = result.rows[0];
      const errorRate = (data.error_requests / data.total_requests) * 100;

      this.sloData.set('errorRate', {
        value: errorRate,
        target: this.config.slo.errorRate,
        met: errorRate <= this.config.slo.errorRate,
        totalRequests: parseInt(data.total_requests),
        errorRequests: parseInt(data.error_requests)
      });

      return this.sloData.get('errorRate');

    } finally {
      client.release();
    }
  }

  /**
   * Get all SLO data
   */
  getAllSLOData() {
    return Object.fromEntries(this.sloData);
  }

  /**
   * Get SLO compliance status
   */
  getSLOCompliance() {
    const compliance = {
      overall: true,
      details: {}
    };

    for (const [sloName, sloData] of this.sloData) {
      if (sloName === 'latency') {
        compliance.details[sloName] = Object.values(sloData.met).every(met => met);
      } else {
        compliance.details[sloName] = sloData.met;
      }
      
      if (!compliance.details[sloName]) {
        compliance.overall = false;
      }
    }

    return compliance;
  }
}

/**
 * Alert Manager
 */
export class AlertManager {
  constructor(config = MONITORING_CONFIG) {
    this.config = config;
    this.alerts = new Map();
    this.alertChannels = new Map();
  }

  /**
   * Initialize alert channels
   */
  initializeAlertChannels() {
    // Email channel
    this.alertChannels.set('email', {
      send: async (alert) => {
        console.log(`📧 [Alert] Email: ${alert.title} - ${alert.message}`);
        // Implement email sending logic
      }
    });

    // Slack channel
    this.alertChannels.set('slack', {
      send: async (alert) => {
        console.log(`💬 [Alert] Slack: ${alert.title} - ${alert.message}`);
        // Implement Slack webhook logic
      }
    });

    // Webhook channel
    this.alertChannels.set('webhook', {
      send: async (alert) => {
        console.log(`🔗 [Alert] Webhook: ${alert.title} - ${alert.message}`);
        // Implement webhook logic
      }
    });
  }

  /**
   * Check SLO violations and trigger alerts
   */
  async checkSLOViolations(sloData) {
    const violations = [];

    // Check availability
    if (sloData.availability && sloData.availability.value < this.config.alerting.thresholds.availability) {
      violations.push({
        type: 'availability',
        severity: 'critical',
        title: 'Availability SLO Violation',
        message: `Availability dropped to ${sloData.availability.value.toFixed(2)}%, below threshold of ${this.config.alerting.thresholds.availability}%`,
        value: sloData.availability.value,
        threshold: this.config.alerting.thresholds.availability
      });
    }

    // Check latency
    if (sloData.latency) {
      if (sloData.latency.value.p95 > this.config.alerting.thresholds.latency.p95) {
        violations.push({
          type: 'latency',
          severity: 'warning',
          title: 'Latency SLO Violation',
          message: `P95 latency increased to ${sloData.latency.value.p95}ms, above threshold of ${this.config.alerting.thresholds.latency.p95}ms`,
          value: sloData.latency.value.p95,
          threshold: this.config.alerting.thresholds.latency.p95
        });
      }

      if (sloData.latency.value.p99 > this.config.alerting.thresholds.latency.p99) {
        violations.push({
          type: 'latency',
          severity: 'critical',
          title: 'Latency SLO Violation',
          message: `P99 latency increased to ${sloData.latency.value.p99}ms, above threshold of ${this.config.alerting.thresholds.latency.p99}ms`,
          value: sloData.latency.value.p99,
          threshold: this.config.alerting.thresholds.latency.p99
        });
      }
    }

    // Check error rate
    if (sloData.errorRate && sloData.errorRate.value > this.config.alerting.thresholds.errorRate) {
      violations.push({
        type: 'errorRate',
        severity: 'critical',
        title: 'Error Rate SLO Violation',
        message: `Error rate increased to ${sloData.errorRate.value.toFixed(2)}%, above threshold of ${this.config.alerting.thresholds.errorRate}%`,
        value: sloData.errorRate.value,
        threshold: this.config.alerting.thresholds.errorRate
      });
    }

    // Send alerts for violations
    for (const violation of violations) {
      await this.sendAlert(violation);
    }

    return violations;
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert) {
    const alertId = `${alert.type}_${Date.now()}`;
    
    // Store alert
    this.alerts.set(alertId, {
      ...alert,
      id: alertId,
      timestamp: new Date().toISOString(),
      sent: false
    });

    // Send through channels
    for (const channelName of this.config.alerting.channels) {
      const channel = this.alertChannels.get(channelName);
      if (channel) {
        try {
          await channel.send(alert);
          console.log(`🚨 [Alert] Sent ${alert.severity} alert via ${channelName}: ${alert.title}`);
        } catch (error) {
          console.error(`Failed to send alert via ${channelName}:`, error);
        }
      }
    }

    // Mark as sent
    const storedAlert = this.alerts.get(alertId);
    storedAlert.sent = true;
    this.alerts.set(alertId, storedAlert);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
}

/**
 * Advanced Monitoring Manager
 */
export class AdvancedMonitoringManager {
  constructor(config = MONITORING_CONFIG) {
    this.config = config;
    this.metricsManager = new PrometheusMetricsManager(config);
    this.sloManager = new SLOManager(config);
    this.alertManager = new AlertManager(config);
    this.alertManager.initializeAlertChannels();
  }

  /**
   * Initialize monitoring system
   */
  async initialize() {
    // Start SLO monitoring cron job
    cron.schedule('*/5 * * * *', async () => {
      await this.runSLOMonitoring();
    });

    // Start system metrics collection
    cron.schedule('*/30 * * * * *', () => {
      this.metricsManager.updateSystemMetrics();
    });

    console.log('🔍 [Monitoring] Advanced monitoring system initialized');
  }

  /**
   * Run SLO monitoring
   */
  async runSLOMonitoring() {
    try {
      // Calculate SLOs
      const availability = await this.sloManager.calculateAvailabilitySLO();
      const latency = await this.sloManager.calculateLatencySLO();
      const errorRate = await this.sloManager.calculateErrorRateSLO();

      const sloData = {
        availability,
        latency,
        errorRate
      };

      // Check for violations
      await this.alertManager.checkSLOViolations(sloData);

      console.log('📊 [Monitoring] SLO monitoring completed');

    } catch (error) {
      console.error('Failed to run SLO monitoring:', error);
    }
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData() {
    const sloData = this.sloManager.getAllSLOData();
    const compliance = this.sloManager.getSLOCompliance();
    const alertHistory = this.alertManager.getAlertHistory(10);

    return {
      slo: sloData,
      compliance: compliance,
      alerts: alertHistory,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get metrics endpoint handler
   */
  getMetricsHandler() {
    return async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    };
  }
}

// Export default monitoring manager
export default AdvancedMonitoringManager;
