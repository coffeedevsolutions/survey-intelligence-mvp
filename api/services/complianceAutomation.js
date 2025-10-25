/**
 * Compliance Automation and Reporting System
 * 
 * Implements automated compliance reporting, evidence collection,
 * and audit trail generation for SOC 2 and other compliance frameworks
 */

import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { SOC2ComplianceManager } from './soc2Compliance.js';
import { AdvancedMonitoringManager } from './advancedMonitoring.js';

// Compliance Automation Configuration
const COMPLIANCE_CONFIG = {
  reporting: {
    enabled: true,
    schedules: {
      daily: '0 9 * * *', // 9 AM daily
      weekly: '0 9 * * 1', // 9 AM Monday
      monthly: '0 9 1 * *' // 9 AM 1st of month
    },
    formats: ['pdf', 'excel', 'json'],
    retention: 90 // days
  },
  evidence: {
    autoCollection: true,
    sources: [
      'audit_logs',
      'access_logs',
      'system_logs',
      'security_scans',
      'backup_verification',
      'incident_reports'
    ],
    validation: {
      enabled: true,
      checks: ['integrity', 'completeness', 'timeliness']
    }
  },
  alerts: {
    enabled: true,
    channels: ['email', 'slack'],
    thresholds: {
      complianceScore: 80,
      evidenceGap: 7, // days
      controlFailure: 1 // any failure
    }
  }
};

/**
 * Compliance Report Generator
 */
export class ComplianceReportGenerator {
  constructor(config = COMPLIANCE_CONFIG.reporting) {
    this.config = config;
    this.reportsPath = 'api/compliance/reports';
  }

  /**
   * Generate daily compliance report
   */
  async generateDailyReport() {
    const reportData = await this.collectDailyData();
    const report = await this.formatReport(reportData, 'daily');
    
    const filename = `daily_compliance_${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.reportsPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📊 [Compliance] Generated daily report: ${filename}`);
    return { filepath, report };
  }

  /**
   * Generate weekly compliance report
   */
  async generateWeeklyReport() {
    const reportData = await this.collectWeeklyData();
    const report = await this.formatReport(reportData, 'weekly');
    
    const filename = `weekly_compliance_${this.getWeekString()}.json`;
    const filepath = path.join(this.reportsPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📊 [Compliance] Generated weekly report: ${filename}`);
    return { filepath, report };
  }

  /**
   * Generate monthly compliance report
   */
  async generateMonthlyReport() {
    const reportData = await this.collectMonthlyData();
    const report = await this.formatReport(reportData, 'monthly');
    
    const filename = `monthly_compliance_${this.getMonthString()}.json`;
    const filepath = path.join(this.reportsPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📊 [Compliance] Generated monthly report: ${filename}`);
    return { filepath, report };
  }

  /**
   * Collect daily compliance data
   */
  async collectDailyData() {
    const client = await pool.connect();
    try {
      // Get daily metrics
      const metrics = await client.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
          AVG(duration_ms) as avg_latency,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency
        FROM http_request_logs
        WHERE created_at >= CURRENT_DATE
      `);

      // Get security events
      const securityEvents = await client.query(`
        SELECT COUNT(*) as security_events
        FROM security_events
        WHERE created_at >= CURRENT_DATE
      `);

      // Get access patterns
      const accessPatterns = await client.query(`
        SELECT 
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT org_id) as unique_orgs,
          COUNT(*) as total_sessions
        FROM user_sessions
        WHERE created_at >= CURRENT_DATE
      `);

      return {
        date: new Date().toISOString().split('T')[0],
        metrics: metrics.rows[0],
        securityEvents: securityEvents.rows[0],
        accessPatterns: accessPatterns.rows[0],
        generatedAt: new Date().toISOString()
      };

    } finally {
      client.release();
    }
  }

  /**
   * Collect weekly compliance data
   */
  async collectWeeklyData() {
    const client = await pool.connect();
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Get weekly trends
      const trends = await client.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
          AVG(duration_ms) as avg_latency
        FROM http_request_logs
        WHERE created_at >= $1
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [startDate]);

      // Get compliance scores
      const complianceScores = await client.query(`
        SELECT 
          control_id,
          AVG(effectiveness_score) as avg_score,
          COUNT(*) as measurements
        FROM soc2_control_effectiveness
        WHERE measured_at >= $1
        GROUP BY control_id
      `, [startDate]);

      return {
        period: 'weekly',
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        trends: trends.rows,
        complianceScores: complianceScores.rows,
        generatedAt: new Date().toISOString()
      };

    } finally {
      client.release();
    }
  }

  /**
   * Collect monthly compliance data
   */
  async collectMonthlyData() {
    const client = await pool.connect();
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      // Get monthly summary
      const summary = await client.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT org_id) as unique_orgs,
          AVG(duration_ms) as avg_latency,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_latency
        FROM http_request_logs
        WHERE created_at >= $1
      `, [startDate]);

      // Get control effectiveness
      const controlEffectiveness = await client.query(`
        SELECT 
          c.id as control_id,
          c.name as control_name,
          c.category,
          cs.status,
          cs.effectiveness_score,
          COUNT(e.id) as evidence_count
        FROM soc2_controls c
        LEFT JOIN soc2_control_status cs ON cs.control_id = c.id
        LEFT JOIN soc2_evidence e ON e.control_id = c.id AND e.collected_at >= $1
        GROUP BY c.id, c.name, c.category, cs.status, cs.effectiveness_score
        ORDER BY c.category, c.id
      `, [startDate]);

      // Get audit findings
      const auditFindings = await client.query(`
        SELECT 
          COUNT(*) as total_findings,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_findings,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_findings
        FROM soc2_audit_logs
        WHERE audit_date >= $1
      `, [startDate]);

      return {
        period: 'monthly',
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        summary: summary.rows[0],
        controlEffectiveness: controlEffectiveness.rows,
        auditFindings: auditFindings.rows[0],
        generatedAt: new Date().toISOString()
      };

    } finally {
      client.release();
    }
  }

  /**
   * Format report data
   */
  async formatReport(data, type) {
    return {
      reportType: type,
      framework: 'SOC 2 Type II',
      data: data,
      metadata: {
        generatedBy: 'AI Survey Platform',
        version: '1.0',
        schema: 'compliance-report-v1'
      }
    };
  }

  /**
   * Get week string for filename
   */
  getWeekString() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return startOfWeek.toISOString().split('T')[0];
  }

  /**
   * Get month string for filename
   */
  getMonthString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Evidence Collection Automator
 */
export class EvidenceCollectionAutomator {
  constructor(config = COMPLIANCE_CONFIG.evidence) {
    this.config = config;
    this.evidencePath = 'api/compliance/evidence';
  }

  /**
   * Automatically collect evidence
   */
  async collectEvidence() {
    const evidence = [];

    for (const source of this.config.sources) {
      try {
        const sourceEvidence = await this.collectFromSource(source);
        evidence.push(...sourceEvidence);
      } catch (error) {
        console.error(`Failed to collect evidence from ${source}:`, error);
      }
    }

    // Validate evidence
    if (this.config.validation.enabled) {
      await this.validateEvidence(evidence);
    }

    return evidence;
  }

  /**
   * Collect evidence from specific source
   */
  async collectFromSource(source) {
    const client = await pool.connect();
    try {
      switch (source) {
        case 'audit_logs':
          return await this.collectAuditLogs(client);
        case 'access_logs':
          return await this.collectAccessLogs(client);
        case 'system_logs':
          return await this.collectSystemLogs(client);
        case 'security_scans':
          return await this.collectSecurityScans(client);
        case 'backup_verification':
          return await this.collectBackupVerification(client);
        case 'incident_reports':
          return await this.collectIncidentReports(client);
        default:
          return [];
      }
    } finally {
      client.release();
    }
  }

  /**
   * Collect audit logs evidence
   */
  async collectAuditLogs(client) {
    const result = await client.query(`
      SELECT 
        'audit_logs' as source_type,
        COUNT(*) as total_logs,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_logs,
        MAX(created_at) as last_log
      FROM audit_logs
    `);

    return result.rows.map(row => ({
      type: 'audit_logs',
      description: 'Audit log collection summary',
      data: row,
      collectedAt: new Date().toISOString(),
      source: 'audit_logs'
    }));
  }

  /**
   * Collect access logs evidence
   */
  async collectAccessLogs(client) {
    const result = await client.query(`
      SELECT 
        'access_logs' as source_type,
        COUNT(*) as total_accesses,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_accesses,
        MAX(created_at) as last_access
      FROM access_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    return result.rows.map(row => ({
      type: 'access_logs',
      description: 'Access log collection summary',
      data: row,
      collectedAt: new Date().toISOString(),
      source: 'access_logs'
    }));
  }

  /**
   * Collect system logs evidence
   */
  async collectSystemLogs(client) {
    const result = await client.query(`
      SELECT 
        'system_logs' as source_type,
        COUNT(*) as total_logs,
        COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_logs,
        COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warning_logs,
        MAX(created_at) as last_log
      FROM system_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    return result.rows.map(row => ({
      type: 'system_logs',
      description: 'System log collection summary',
      data: row,
      collectedAt: new Date().toISOString(),
      source: 'system_logs'
    }));
  }

  /**
   * Collect security scans evidence
   */
  async collectSecurityScans(client) {
    const result = await client.query(`
      SELECT 
        'security_scans' as source_type,
        COUNT(*) as total_scans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_scans,
        COUNT(CASE WHEN vulnerabilities_found > 0 THEN 1 END) as scans_with_vulnerabilities,
        MAX(scan_date) as last_scan
      FROM security_scans
      WHERE scan_date >= CURRENT_DATE - INTERVAL '30 days'
    `);

    return result.rows.map(row => ({
      type: 'security_scans',
      description: 'Security scan collection summary',
      data: row,
      collectedAt: new Date().toISOString(),
      source: 'security_scans'
    }));
  }

  /**
   * Collect backup verification evidence
   */
  async collectBackupVerification(client) {
    const result = await client.query(`
      SELECT 
        'backup_verification' as source_type,
        COUNT(*) as total_backups,
        COUNT(CASE WHEN verification_status = 'success' THEN 1 END) as successful_backups,
        COUNT(CASE WHEN verification_status = 'failed' THEN 1 END) as failed_backups,
        MAX(backup_date) as last_backup
      FROM backup_verification
      WHERE backup_date >= CURRENT_DATE - INTERVAL '7 days'
    `);

    return result.rows.map(row => ({
      type: 'backup_verification',
      description: 'Backup verification collection summary',
      data: row,
      collectedAt: new Date().toISOString(),
      source: 'backup_verification'
    }));
  }

  /**
   * Collect incident reports evidence
   */
  async collectIncidentReports(client) {
    const result = await client.query(`
      SELECT 
        'incident_reports' as source_type,
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_incidents,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_incidents,
        MAX(incident_date) as last_incident
      FROM incident_reports
      WHERE incident_date >= CURRENT_DATE - INTERVAL '30 days'
    `);

    return result.rows.map(row => ({
      type: 'incident_reports',
      description: 'Incident report collection summary',
      data: row,
      collectedAt: new Date().toISOString(),
      source: 'incident_reports'
    }));
  }

  /**
   * Validate collected evidence
   */
  async validateEvidence(evidence) {
    for (const item of evidence) {
      // Check integrity
      if (!item.data || !item.collectedAt) {
        console.warn(`⚠️ [Compliance] Evidence integrity check failed for ${item.type}`);
      }

      // Check completeness
      if (!item.description || !item.source) {
        console.warn(`⚠️ [Compliance] Evidence completeness check failed for ${item.type}`);
      }

      // Check timeliness
      const collectedDate = new Date(item.collectedAt);
      const daysSinceCollection = Math.floor(
        (Date.now() - collectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceCollection > 7) {
        console.warn(`⚠️ [Compliance] Evidence timeliness check failed for ${item.type}: ${daysSinceCollection} days old`);
      }
    }
  }
}

/**
 * Compliance Automation Manager
 */
export class ComplianceAutomationManager {
  constructor(config = COMPLIANCE_CONFIG) {
    this.config = config;
    this.reportGenerator = new ComplianceReportGenerator(config.reporting);
    this.evidenceCollector = new EvidenceCollectionAutomator(config.evidence);
    this.soc2Manager = new SOC2ComplianceManager();
    this.monitoringManager = new AdvancedMonitoringManager();
  }

  /**
   * Initialize compliance automation
   */
  async initialize() {
    // Schedule daily reports
    cron.schedule(this.config.reporting.schedules.daily, async () => {
      await this.runDailyComplianceTasks();
    });

    // Schedule weekly reports
    cron.schedule(this.config.reporting.schedules.weekly, async () => {
      await this.runWeeklyComplianceTasks();
    });

    // Schedule monthly reports
    cron.schedule(this.config.reporting.schedules.monthly, async () => {
      await this.runMonthlyComplianceTasks();
    });

    // Schedule evidence collection
    cron.schedule('0 */6 * * *', async () => {
      await this.collectEvidence();
    });

    console.log('🤖 [Compliance] Automation system initialized');
  }

  /**
   * Run daily compliance tasks
   */
  async runDailyComplianceTasks() {
    try {
      // Generate daily report
      await this.reportGenerator.generateDailyReport();

      // Collect evidence
      await this.collectEvidence();

      // Check compliance status
      await this.checkComplianceStatus();

      console.log('✅ [Compliance] Daily compliance tasks completed');

    } catch (error) {
      console.error('Failed to run daily compliance tasks:', error);
    }
  }

  /**
   * Run weekly compliance tasks
   */
  async runWeeklyComplianceTasks() {
    try {
      // Generate weekly report
      await this.reportGenerator.generateWeeklyReport();

      // Run compliance assessment
      await this.runComplianceAssessment();

      console.log('✅ [Compliance] Weekly compliance tasks completed');

    } catch (error) {
      console.error('Failed to run weekly compliance tasks:', error);
    }
  }

  /**
   * Run monthly compliance tasks
   */
  async runMonthlyComplianceTasks() {
    try {
      // Generate monthly report
      await this.reportGenerator.generateMonthlyReport();

      // Run comprehensive compliance review
      await this.runComprehensiveReview();

      console.log('✅ [Compliance] Monthly compliance tasks completed');

    } catch (error) {
      console.error('Failed to run monthly compliance tasks:', error);
    }
  }

  /**
   * Collect evidence automatically
   */
  async collectEvidence() {
    try {
      const evidence = await this.evidenceCollector.collectEvidence();
      
      // Store evidence in database
      const client = await pool.connect();
      try {
        for (const item of evidence) {
          await client.query(`
            INSERT INTO compliance_evidence (
              evidence_type, description, data, collected_at, source
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            item.type,
            item.description,
            JSON.stringify(item.data),
            item.collectedAt,
            item.source
          ]);
        }
      } finally {
        client.release();
      }

      console.log(`📋 [Compliance] Collected ${evidence.length} evidence items`);

    } catch (error) {
      console.error('Failed to collect evidence:', error);
    }
  }

  /**
   * Check compliance status
   */
  async checkComplianceStatus() {
    try {
      const status = await this.soc2Manager.getComplianceStatus();
      
      // Check for compliance issues
      const issues = [];
      
      if (status.dashboard.overallStatus.complianceScore < this.config.alerts.thresholds.complianceScore) {
        issues.push({
          type: 'compliance_score',
          severity: 'warning',
          message: `Compliance score ${status.dashboard.overallStatus.complianceScore}% below threshold`
        });
      }

      // Send alerts if needed
      if (issues.length > 0 && this.config.alerts.enabled) {
        await this.sendComplianceAlerts(issues);
      }

      return { status, issues };

    } catch (error) {
      console.error('Failed to check compliance status:', error);
      return { status: null, issues: [] };
    }
  }

  /**
   * Send compliance alerts
   */
  async sendComplianceAlerts(issues) {
    for (const issue of issues) {
      console.log(`🚨 [Compliance] ${issue.severity.toUpperCase()}: ${issue.message}`);
      
      // In production, this would send actual alerts via email/Slack
      // For now, just log the alert
    }
  }

  /**
   * Run compliance assessment
   */
  async runComplianceAssessment() {
    try {
      const assessment = {
        timestamp: new Date().toISOString(),
        controls: [],
        overallScore: 0
      };

      // Assess each control
      const controls = await this.soc2Manager.controlMapping.getAllControls();
      
      for (const control of controls) {
        const effectiveness = await this.soc2Manager.monitoringManager.monitorControlEffectiveness(control.id);
        assessment.controls.push(effectiveness);
      }

      // Calculate overall score
      assessment.overallScore = assessment.controls.reduce((sum, control) => sum + control.effectivenessScore, 0) / assessment.controls.length;

      console.log(`📊 [Compliance] Assessment completed: ${assessment.overallScore.toFixed(2)}% overall score`);

      return assessment;

    } catch (error) {
      console.error('Failed to run compliance assessment:', error);
      return null;
    }
  }

  /**
   * Run comprehensive compliance review
   */
  async runComprehensiveReview() {
    try {
      const review = {
        timestamp: new Date().toISOString(),
        framework: 'SOC 2 Type II',
        scope: 'All controls and evidence',
        findings: [],
        recommendations: []
      };

      // Review all controls
      const controls = await this.soc2Manager.controlMapping.getAllControls();
      
      for (const control of controls) {
        const effectiveness = await this.soc2Manager.monitoringManager.monitorControlEffectiveness(control.id);
        
        if (effectiveness.effectivenessScore < 80) {
          review.findings.push({
            controlId: control.id,
            controlName: control.name,
            issue: 'Low effectiveness score',
            score: effectiveness.effectivenessScore,
            recommendations: effectiveness.recommendations
          });
        }
      }

      // Generate recommendations
      if (review.findings.length > 0) {
        review.recommendations.push('Address low effectiveness controls');
        review.recommendations.push('Increase evidence collection frequency');
        review.recommendations.push('Conduct additional control testing');
      }

      console.log(`🔍 [Compliance] Comprehensive review completed: ${review.findings.length} findings`);

      return review;

    } catch (error) {
      console.error('Failed to run comprehensive review:', error);
      return null;
    }
  }

  /**
   * Get compliance automation status
   */
  async getAutomationStatus() {
    return {
      enabled: true,
      schedules: this.config.reporting.schedules,
      lastDailyReport: new Date().toISOString(),
      lastWeeklyReport: new Date().toISOString(),
      lastMonthlyReport: new Date().toISOString(),
      evidenceCollection: {
        enabled: this.config.evidence.autoCollection,
        sources: this.config.evidence.sources,
        lastCollection: new Date().toISOString()
      },
      alerting: {
        enabled: this.config.alerts.enabled,
        channels: this.config.alerts.channels,
        thresholds: this.config.alerts.thresholds
      }
    };
  }
}

// Export default compliance automation manager
export default ComplianceAutomationManager;
