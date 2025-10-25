/**
 * SOC 2 Compliance Framework
 * 
 * Implements SOC 2 Type II compliance controls and evidence collection
 * Maps controls to Trust Services Criteria (TSC)
 */

import { pool } from '../../../database/connection.js';
import fs from 'fs/promises';
import path from 'path';

// SOC 2 Trust Services Criteria (TSC)
const SOC2_TSC = {
  CC1: {
    name: 'Control Environment',
    description: 'The entity demonstrates a commitment to integrity and ethical values',
    criteria: [
      'CC1.1 - Commitment to integrity and ethical values',
      'CC1.2 - Board oversight of internal control',
      'CC1.3 - Management philosophy and operating style',
      'CC1.4 - Organizational structure and assignment of authority',
      'CC1.5 - Commitment to competence'
    ]
  },
  CC2: {
    name: 'Communication and Information',
    description: 'The entity obtains, generates, uses, and communicates relevant information',
    criteria: [
      'CC2.1 - Information and communication systems',
      'CC2.2 - Internal communication',
      'CC2.3 - Communication with external parties'
    ]
  },
  CC3: {
    name: 'Risk Assessment',
    description: 'The entity specifies suitable objectives and identifies risks',
    criteria: [
      'CC3.1 - Risk identification and analysis',
      'CC3.2 - Fraud risk',
      'CC3.3 - Risk response'
    ]
  },
  CC4: {
    name: 'Monitoring Activities',
    description: 'The entity selects, develops, and performs ongoing evaluations',
    criteria: [
      'CC4.1 - Ongoing monitoring',
      'CC4.2 - Separate evaluations',
      'CC4.3 - Communication of deficiencies'
    ]
  },
  CC5: {
    name: 'Control Activities',
    description: 'The entity selects and develops control activities',
    criteria: [
      'CC5.1 - Control activities',
      'CC5.2 - IT control activities',
      'CC5.3 - Segregation of duties'
    ]
  }
};

// Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, Privacy
const TRUST_SERVICES_CRITERIA = {
  Security: {
    CC6: 'Logical and Physical Access Controls',
    CC7: 'System Operations',
    CC8: 'Change Management',
    CC9: 'Risk Mitigation'
  },
  Availability: {
    A1: 'System Availability',
    A2: 'System Processing',
    A3: 'System Monitoring'
  },
  ProcessingIntegrity: {
    PI1: 'System Processing',
    PI2: 'System Inputs',
    PI3: 'System Outputs'
  },
  Confidentiality: {
    C1: 'Confidentiality Controls',
    C2: 'System Access',
    C3: 'Data Transmission'
  },
  Privacy: {
    P1: 'Notice and Communication',
    P2: 'Choice and Consent',
    P3: 'Collection',
    P4: 'Use, Retention, and Disposal',
    P5: 'Access',
    P6: 'Disclosure to Third Parties',
    P7: 'Security for Privacy',
    P8: 'Quality',
    P9: 'Monitoring and Enforcement'
  }
};

/**
 * SOC 2 Control Mapping
 */
export class SOC2ControlMapping {
  constructor() {
    this.controls = new Map();
    this.evidence = new Map();
  }

  /**
   * Map application controls to SOC 2 criteria
   */
  initializeControlMapping() {
    // CC1 - Control Environment
    this.controls.set('CC1.1', {
      name: 'Code of Conduct and Ethics',
      description: 'Established code of conduct and ethical guidelines',
      implementation: 'Documented in employee handbook and training materials',
      evidence: ['code_of_conduct.pdf', 'ethics_training_records.csv']
    });

    this.controls.set('CC1.2', {
      name: 'Board Oversight',
      description: 'Board of directors oversight of internal controls',
      implementation: 'Regular board meetings and control reviews',
      evidence: ['board_minutes.pdf', 'control_review_reports.pdf']
    });

    // CC2 - Communication and Information
    this.controls.set('CC2.1', {
      name: 'Information Systems',
      description: 'Robust information and communication systems',
      implementation: 'AI survey platform with audit logging and monitoring',
      evidence: ['system_architecture.pdf', 'audit_logs.csv']
    });

    this.controls.set('CC2.2', {
      name: 'Internal Communication',
      description: 'Effective internal communication channels',
      implementation: 'Slack, email, and documentation systems',
      evidence: ['communication_policies.pdf', 'training_records.csv']
    });

    // CC3 - Risk Assessment
    this.controls.set('CC3.1', {
      name: 'Risk Identification',
      description: 'Comprehensive risk identification and analysis',
      implementation: 'Regular risk assessments and threat modeling',
      evidence: ['risk_assessment_reports.pdf', 'threat_model.pdf']
    });

    this.controls.set('CC3.2', {
      name: 'Fraud Risk',
      description: 'Fraud risk assessment and mitigation',
      implementation: 'MFA, access controls, and monitoring',
      evidence: ['fraud_risk_assessment.pdf', 'access_control_reports.csv']
    });

    // CC4 - Monitoring Activities
    this.controls.set('CC4.1', {
      name: 'Ongoing Monitoring',
      description: 'Continuous monitoring of system operations',
      implementation: 'OpenTelemetry, logging, and alerting systems',
      evidence: ['monitoring_dashboards.pdf', 'alert_logs.csv']
    });

    this.controls.set('CC4.2', {
      name: 'Separate Evaluations',
      description: 'Independent evaluations of controls',
      implementation: 'Internal audits and external assessments',
      evidence: ['internal_audit_reports.pdf', 'external_assessment.pdf']
    });

    // CC5 - Control Activities
    this.controls.set('CC5.1', {
      name: 'Control Activities',
      description: 'Effective control activities implementation',
      implementation: 'RLS, encryption, and access controls',
      evidence: ['control_implementation.pdf', 'access_logs.csv']
    });

    this.controls.set('CC5.2', {
      name: 'IT Control Activities',
      description: 'IT-specific control activities',
      implementation: 'Database security, API security, and infrastructure controls',
      evidence: ['it_controls.pdf', 'security_scans.csv']
    });

    // Security Criteria
    this.controls.set('CC6.1', {
      name: 'Logical Access Controls',
      description: 'Logical access controls for systems and data',
      implementation: 'Authentication, authorization, and session management',
      evidence: ['access_control_matrix.pdf', 'authentication_logs.csv']
    });

    this.controls.set('CC6.2', {
      name: 'Physical Access Controls',
      description: 'Physical access controls for facilities',
      implementation: 'Data center security and facility access',
      evidence: ['physical_security_policies.pdf', 'access_logs.csv']
    });

    // Availability Criteria
    this.controls.set('A1.1', {
      name: 'System Availability',
      description: 'System availability and uptime monitoring',
      implementation: 'SLA monitoring, incident response, and disaster recovery',
      evidence: ['sla_reports.pdf', 'incident_logs.csv']
    });

    // Processing Integrity Criteria
    this.controls.set('PI1.1', {
      name: 'System Processing',
      description: 'Accurate and complete system processing',
      implementation: 'Data validation, error handling, and reconciliation',
      evidence: ['processing_logs.csv', 'validation_reports.pdf']
    });

    // Confidentiality Criteria
    this.controls.set('C1.1', {
      name: 'Confidentiality Controls',
      description: 'Controls to protect confidential information',
      implementation: 'Encryption, data classification, and access controls',
      evidence: ['encryption_policies.pdf', 'data_classification.csv']
    });

    // Privacy Criteria
    this.controls.set('P1.1', {
      name: 'Privacy Notice',
      description: 'Clear privacy notice and communication',
      implementation: 'Privacy policy and user consent mechanisms',
      evidence: ['privacy_policy.pdf', 'consent_records.csv']
    });

    this.controls.set('P4.1', {
      name: 'Data Retention',
      description: 'Data retention and disposal policies',
      implementation: 'Automated data retention and secure disposal',
      evidence: ['retention_policies.pdf', 'disposal_logs.csv']
    });
  }

  /**
   * Get control information
   */
  getControl(controlId) {
    return this.controls.get(controlId);
  }

  /**
   * Get all controls
   */
  getAllControls() {
    return Array.from(this.controls.entries()).map(([id, control]) => ({
      id,
      ...control
    }));
  }

  /**
   * Get controls by category
   */
  getControlsByCategory(category) {
    const categoryControls = TRUST_SERVICES_CRITERIA[category];
    if (!categoryControls) return [];

    return Object.keys(categoryControls).map(controlId => ({
      id: controlId,
      name: categoryControls[controlId],
      ...this.controls.get(controlId)
    }));
  }
}

/**
 * Evidence Collection Manager
 */
export class EvidenceCollectionManager {
  constructor() {
    this.evidencePath = 'api/compliance/evidence';
  }

  /**
   * Collect evidence for a control
   */
  async collectEvidence(controlId, evidenceData) {
    const client = await pool.connect();
    try {
      const evidence = {
        controlId: controlId,
        collectedAt: new Date().toISOString(),
        collectedBy: evidenceData.collectedBy,
        evidenceType: evidenceData.evidenceType,
        description: evidenceData.description,
        filePath: evidenceData.filePath,
        metadata: evidenceData.metadata || {}
      };

      const result = await client.query(`
        INSERT INTO soc2_evidence (
          control_id, collected_at, collected_by, evidence_type,
          description, file_path, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        evidence.controlId,
        evidence.collectedAt,
        evidence.collectedBy,
        evidence.evidenceType,
        evidence.description,
        evidence.filePath,
        JSON.stringify(evidence.metadata)
      ]);

      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Generate evidence report
   */
  async generateEvidenceReport(controlId = null) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          e.*,
          c.name as control_name,
          c.description as control_description
        FROM soc2_evidence e
        LEFT JOIN soc2_controls c ON c.id = e.control_id
      `;
      
      const params = [];
      if (controlId) {
        query += ` WHERE e.control_id = $1`;
        params.push(controlId);
      }
      
      query += ` ORDER BY e.collected_at DESC`;

      const result = await client.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        controlId: row.control_id,
        controlName: row.control_name,
        controlDescription: row.control_description,
        collectedAt: row.collected_at,
        collectedBy: row.collected_by,
        evidenceType: row.evidence_type,
        description: row.description,
        filePath: row.file_path,
        metadata: JSON.parse(row.metadata || '{}')
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Export evidence to file
   */
  async exportEvidence(controlId, format = 'json') {
    const evidence = await this.generateEvidenceReport(controlId);
    
    const exportPath = path.join(this.evidencePath, `evidence_${controlId}_${Date.now()}.${format}`);
    
    if (format === 'json') {
      await fs.writeFile(exportPath, JSON.stringify(evidence, null, 2));
    } else if (format === 'csv') {
      const csv = this.convertToCSV(evidence);
      await fs.writeFile(exportPath, csv);
    }
    
    return exportPath;
  }

  /**
   * Convert evidence to CSV format
   */
  convertToCSV(evidence) {
    if (evidence.length === 0) return '';
    
    const headers = Object.keys(evidence[0]);
    const csvRows = [
      headers.join(','),
      ...evidence.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }
}

/**
 * Compliance Monitoring Manager
 */
export class ComplianceMonitoringManager {
  constructor() {
    this.controlMapping = new SOC2ControlMapping();
    this.controlMapping.initializeControlMapping();
  }

  /**
   * Monitor control effectiveness
   */
  async monitorControlEffectiveness(controlId) {
    const client = await pool.connect();
    try {
      // Get control information
      const control = this.controlMapping.getControl(controlId);
      if (!control) {
        throw new Error(`Control ${controlId} not found`);
      }

      // Get recent evidence
      const evidenceResult = await client.query(`
        SELECT * FROM soc2_evidence
        WHERE control_id = $1
        ORDER BY collected_at DESC
        LIMIT 10
      `, [controlId]);

      // Calculate effectiveness score
      const effectivenessScore = this.calculateEffectivenessScore(evidenceResult.rows);

      return {
        controlId: controlId,
        controlName: control.name,
        effectivenessScore: effectivenessScore,
        evidenceCount: evidenceResult.rows.length,
        lastEvidenceDate: evidenceResult.rows[0]?.collected_at,
        status: effectivenessScore >= 80 ? 'Effective' : 
                effectivenessScore >= 60 ? 'Partially Effective' : 'Ineffective',
        recommendations: this.generateRecommendations(controlId, effectivenessScore)
      };

    } finally {
      client.release();
    }
  }

  /**
   * Calculate effectiveness score
   */
  calculateEffectivenessScore(evidence) {
    if (evidence.length === 0) return 0;
    
    // Simple scoring based on evidence recency and completeness
    let score = 0;
    const now = new Date();
    
    evidence.forEach(evidenceItem => {
      const daysSinceCollection = Math.floor(
        (now - new Date(evidenceItem.collected_at)) / (1000 * 60 * 60 * 24)
      );
      
      // Recent evidence gets higher score
      if (daysSinceCollection <= 30) score += 20;
      else if (daysSinceCollection <= 90) score += 15;
      else if (daysSinceCollection <= 180) score += 10;
      else score += 5;
      
      // Complete evidence gets higher score
      if (evidenceItem.description && evidenceItem.file_path) score += 10;
      else if (evidenceItem.description || evidenceItem.file_path) score += 5;
    });
    
    return Math.min(score, 100);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(controlId, score) {
    const recommendations = [];
    
    if (score < 60) {
      recommendations.push('Implement additional controls to improve effectiveness');
      recommendations.push('Increase frequency of evidence collection');
    }
    
    if (score < 80) {
      recommendations.push('Review and update control documentation');
      recommendations.push('Conduct additional testing of control effectiveness');
    }
    
    if (score >= 80) {
      recommendations.push('Maintain current control effectiveness');
      recommendations.push('Continue regular monitoring and evidence collection');
    }
    
    return recommendations;
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard() {
    const client = await pool.connect();
    try {
      // Get overall compliance status
      const controlsResult = await client.query(`
        SELECT 
          COUNT(*) as total_controls,
          COUNT(CASE WHEN status = 'effective' THEN 1 END) as effective_controls,
          COUNT(CASE WHEN status = 'partially_effective' THEN 1 END) as partially_effective_controls,
          COUNT(CASE WHEN status = 'ineffective' THEN 1 END) as ineffective_controls
        FROM soc2_control_status
      `);

      // Get recent evidence collection
      const evidenceResult = await client.query(`
        SELECT 
          DATE(collected_at) as collection_date,
          COUNT(*) as evidence_count
        FROM soc2_evidence
        WHERE collected_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(collected_at)
        ORDER BY collection_date DESC
      `);

      // Get control effectiveness trends
      const trendsResult = await client.query(`
        SELECT 
          control_id,
          AVG(effectiveness_score) as avg_score,
          MAX(effectiveness_score) as max_score,
          MIN(effectiveness_score) as min_score
        FROM soc2_control_effectiveness
        WHERE measured_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY control_id
        ORDER BY avg_score DESC
      `);

      return {
        overallStatus: controlsResult.rows[0],
        recentEvidence: evidenceResult.rows,
        controlTrends: trendsResult.rows,
        lastUpdated: new Date().toISOString()
      };

    } finally {
      client.release();
    }
  }
}

/**
 * SOC 2 Compliance Manager
 */
export class SOC2ComplianceManager {
  constructor() {
    this.controlMapping = new SOC2ControlMapping();
    this.evidenceManager = new EvidenceCollectionManager();
    this.monitoringManager = new ComplianceMonitoringManager();
  }

  /**
   * Initialize SOC 2 compliance framework
   */
  async initializeComplianceFramework() {
    const client = await pool.connect();
    try {
      // Initialize control mapping
      this.controlMapping.initializeControlMapping();
      
      // Store controls in database
      const controls = this.controlMapping.getAllControls();
      
      for (const control of controls) {
        await client.query(`
          INSERT INTO soc2_controls (id, name, description, implementation, evidence_types)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            implementation = EXCLUDED.implementation,
            evidence_types = EXCLUDED.evidence_types
        `, [
          control.id,
          control.name,
          control.description,
          control.implementation,
          JSON.stringify(control.evidence || [])
        ]);
      }

      console.log(`📋 [SOC2] Initialized compliance framework with ${controls.length} controls`);
      return { success: true, controlsCount: controls.length };

    } finally {
      client.release();
    }
  }

  /**
   * Get compliance status
   */
  async getComplianceStatus() {
    return {
      framework: 'SOC 2 Type II',
      trustServicesCriteria: Object.keys(TRUST_SERVICES_CRITERIA),
      controls: this.controlMapping.getAllControls(),
      dashboard: await this.monitoringManager.getComplianceDashboard()
    };
  }
}

// Export default SOC 2 compliance manager
export default SOC2ComplianceManager;
