-- SOC 2 Compliance Schema
-- Adds tables for SOC 2 Type II compliance controls and evidence collection

-- SOC 2 controls table
CREATE TABLE IF NOT EXISTS soc2_controls (
  id VARCHAR(20) PRIMARY KEY, -- e.g., 'CC1.1', 'CC6.1', 'A1.1'
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  implementation TEXT NOT NULL,
  evidence_types JSONB DEFAULT '[]',
  category VARCHAR(100), -- e.g., 'Control Environment', 'Security', 'Availability'
  trust_service_criteria VARCHAR(100), -- e.g., 'Security', 'Availability', 'Confidentiality'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SOC 2 evidence table
CREATE TABLE IF NOT EXISTS soc2_evidence (
  id BIGSERIAL PRIMARY KEY,
  control_id VARCHAR(20) REFERENCES soc2_controls(id) ON DELETE CASCADE,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  collected_by VARCHAR(255) NOT NULL,
  evidence_type VARCHAR(100) NOT NULL, -- e.g., 'document', 'log', 'screenshot', 'test_result'
  description TEXT NOT NULL,
  file_path VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'superseded'))
);

-- SOC 2 control status table
CREATE TABLE IF NOT EXISTS soc2_control_status (
  id BIGSERIAL PRIMARY KEY,
  control_id VARCHAR(20) REFERENCES soc2_controls(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('effective', 'partially_effective', 'ineffective', 'not_implemented')),
  effectiveness_score INTEGER CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  last_assessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assessed_by VARCHAR(255) NOT NULL,
  assessment_notes TEXT,
  next_assessment_date DATE
);

-- SOC 2 control effectiveness history table
CREATE TABLE IF NOT EXISTS soc2_control_effectiveness (
  id BIGSERIAL PRIMARY KEY,
  control_id VARCHAR(20) REFERENCES soc2_controls(id) ON DELETE CASCADE,
  effectiveness_score INTEGER NOT NULL CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  measured_by VARCHAR(255) NOT NULL,
  measurement_method VARCHAR(100), -- e.g., 'testing', 'observation', 'inquiry'
  notes TEXT
);

-- SOC 2 audit logs table
CREATE TABLE IF NOT EXISTS soc2_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  control_id VARCHAR(20) REFERENCES soc2_controls(id) ON DELETE CASCADE,
  audit_type VARCHAR(100) NOT NULL, -- e.g., 'internal_audit', 'external_audit', 'self_assessment'
  audit_date DATE NOT NULL,
  auditor VARCHAR(255) NOT NULL,
  findings TEXT,
  recommendations TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SOC 2 remediation actions table
CREATE TABLE IF NOT EXISTS soc2_remediation_actions (
  id BIGSERIAL PRIMARY KEY,
  control_id VARCHAR(20) REFERENCES soc2_controls(id) ON DELETE CASCADE,
  audit_log_id BIGINT REFERENCES soc2_audit_logs(id) ON DELETE CASCADE,
  action_description TEXT NOT NULL,
  assigned_to VARCHAR(255) NOT NULL,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  completion_date DATE,
  completion_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_soc2_controls_category ON soc2_controls(category);
CREATE INDEX IF NOT EXISTS idx_soc2_controls_trust_service ON soc2_controls(trust_service_criteria);
CREATE INDEX IF NOT EXISTS idx_soc2_evidence_control_id ON soc2_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_soc2_evidence_collected_at ON soc2_evidence(collected_at);
CREATE INDEX IF NOT EXISTS idx_soc2_evidence_type ON soc2_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_soc2_control_status_control_id ON soc2_control_status(control_id);
CREATE INDEX IF NOT EXISTS idx_soc2_control_status_status ON soc2_control_status(status);
CREATE INDEX IF NOT EXISTS idx_soc2_control_effectiveness_control_id ON soc2_control_effectiveness(control_id);
CREATE INDEX IF NOT EXISTS idx_soc2_control_effectiveness_measured_at ON soc2_control_effectiveness(measured_at);
CREATE INDEX IF NOT EXISTS idx_soc2_audit_logs_control_id ON soc2_audit_logs(control_id);
CREATE INDEX IF NOT EXISTS idx_soc2_audit_logs_audit_date ON soc2_audit_logs(audit_date);
CREATE INDEX IF NOT EXISTS idx_soc2_remediation_actions_control_id ON soc2_remediation_actions(control_id);
CREATE INDEX IF NOT EXISTS idx_soc2_remediation_actions_status ON soc2_remediation_actions(status);

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE ON soc2_controls TO application_role;
GRANT SELECT, INSERT, UPDATE ON soc2_evidence TO application_role;
GRANT SELECT, INSERT, UPDATE ON soc2_control_status TO application_role;
GRANT SELECT, INSERT ON soc2_control_effectiveness TO application_role;
GRANT SELECT, INSERT, UPDATE ON soc2_audit_logs TO application_role;
GRANT SELECT, INSERT, UPDATE ON soc2_remediation_actions TO application_role;

-- Add comments for documentation
COMMENT ON TABLE soc2_controls IS 'SOC 2 Type II compliance controls and their implementations';
COMMENT ON TABLE soc2_evidence IS 'Evidence collected for SOC 2 controls';
COMMENT ON TABLE soc2_control_status IS 'Current status and effectiveness of SOC 2 controls';
COMMENT ON TABLE soc2_control_effectiveness IS 'Historical effectiveness measurements for SOC 2 controls';
COMMENT ON TABLE soc2_audit_logs IS 'Audit logs and findings for SOC 2 controls';
COMMENT ON TABLE soc2_remediation_actions IS 'Remediation actions for SOC 2 audit findings';

COMMENT ON COLUMN soc2_controls.id IS 'SOC 2 control identifier (e.g., CC1.1, CC6.1, A1.1)';
COMMENT ON COLUMN soc2_controls.evidence_types IS 'JSON array of expected evidence types for this control';
COMMENT ON COLUMN soc2_evidence.evidence_type IS 'Type of evidence: document, log, screenshot, test_result, etc.';
COMMENT ON COLUMN soc2_control_status.effectiveness_score IS 'Effectiveness score from 0-100';

-- Create function to get control effectiveness summary
CREATE OR REPLACE FUNCTION get_control_effectiveness_summary(control_id_param VARCHAR(20))
RETURNS TABLE (
  control_id VARCHAR(20),
  control_name VARCHAR(255),
  current_status VARCHAR(50),
  current_score INTEGER,
  avg_score DECIMAL(5,2),
  max_score INTEGER,
  min_score INTEGER,
  measurement_count BIGINT,
  last_measured TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as control_id,
    c.name as control_name,
    cs.status as current_status,
    cs.effectiveness_score as current_score,
    AVG(ce.effectiveness_score) as avg_score,
    MAX(ce.effectiveness_score) as max_score,
    MIN(ce.effectiveness_score) as min_score,
    COUNT(ce.id) as measurement_count,
    MAX(ce.measured_at) as last_measured
  FROM soc2_controls c
  LEFT JOIN soc2_control_status cs ON cs.control_id = c.id
  LEFT JOIN soc2_control_effectiveness ce ON ce.control_id = c.id
  WHERE c.id = control_id_param
  GROUP BY c.id, c.name, cs.status, cs.effectiveness_score;
END;
$$ LANGUAGE plpgsql;

-- Create function to get compliance dashboard data
CREATE OR REPLACE FUNCTION get_compliance_dashboard_data()
RETURNS TABLE (
  total_controls BIGINT,
  effective_controls BIGINT,
  partially_effective_controls BIGINT,
  ineffective_controls BIGINT,
  not_implemented_controls BIGINT,
  avg_effectiveness_score DECIMAL(5,2),
  total_evidence_items BIGINT,
  recent_evidence_items BIGINT,
  open_audit_findings BIGINT,
  open_remediation_actions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM soc2_controls) as total_controls,
    (SELECT COUNT(*) FROM soc2_control_status WHERE status = 'effective') as effective_controls,
    (SELECT COUNT(*) FROM soc2_control_status WHERE status = 'partially_effective') as partially_effective_controls,
    (SELECT COUNT(*) FROM soc2_control_status WHERE status = 'ineffective') as ineffective_controls,
    (SELECT COUNT(*) FROM soc2_control_status WHERE status = 'not_implemented') as not_implemented_controls,
    (SELECT AVG(effectiveness_score) FROM soc2_control_status WHERE effectiveness_score IS NOT NULL) as avg_effectiveness_score,
    (SELECT COUNT(*) FROM soc2_evidence WHERE status = 'active') as total_evidence_items,
    (SELECT COUNT(*) FROM soc2_evidence WHERE collected_at >= CURRENT_DATE - INTERVAL '30 days') as recent_evidence_items,
    (SELECT COUNT(*) FROM soc2_audit_logs WHERE status = 'open') as open_audit_findings,
    (SELECT COUNT(*) FROM soc2_remediation_actions WHERE status = 'open') as open_remediation_actions;
END;
$$ LANGUAGE plpgsql;

-- Create function to log control effectiveness measurement
CREATE OR REPLACE FUNCTION log_control_effectiveness(
  control_id_param VARCHAR(20),
  effectiveness_score_param INTEGER,
  measured_by_param VARCHAR(255),
  measurement_method_param VARCHAR(100) DEFAULT 'testing',
  notes_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO soc2_control_effectiveness (
    control_id, effectiveness_score, measured_by, measurement_method, notes
  ) VALUES (
    control_id_param, effectiveness_score_param, measured_by_param, 
    measurement_method_param, notes_param
  );
  
  -- Update current control status
  UPDATE soc2_control_status 
  SET 
    effectiveness_score = effectiveness_score_param,
    last_assessed = CURRENT_TIMESTAMP,
    assessed_by = measured_by_param,
    status = CASE 
      WHEN effectiveness_score_param >= 80 THEN 'effective'
      WHEN effectiveness_score_param >= 60 THEN 'partially_effective'
      ELSE 'ineffective'
    END
  WHERE control_id = control_id_param;
  
  -- Insert status if it doesn't exist
  INSERT INTO soc2_control_status (control_id, status, effectiveness_score, assessed_by)
  SELECT 
    control_id_param,
    CASE 
      WHEN effectiveness_score_param >= 80 THEN 'effective'
      WHEN effectiveness_score_param >= 60 THEN 'partially_effective'
      ELSE 'ineffective'
    END,
    effectiveness_score_param,
    measured_by_param
  WHERE NOT EXISTS (SELECT 1 FROM soc2_control_status WHERE control_id = control_id_param);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION get_control_effectiveness_summary(VARCHAR(20)) TO application_role;
GRANT EXECUTE ON FUNCTION get_compliance_dashboard_data() TO application_role;
GRANT EXECUTE ON FUNCTION log_control_effectiveness(VARCHAR(20), INTEGER, VARCHAR(255), VARCHAR(100), TEXT) TO application_role;

-- Add comments for functions
COMMENT ON FUNCTION get_control_effectiveness_summary(VARCHAR(20)) IS 'Get comprehensive effectiveness summary for a SOC 2 control';
COMMENT ON FUNCTION get_compliance_dashboard_data() IS 'Get overall compliance dashboard metrics';
COMMENT ON FUNCTION log_control_effectiveness(VARCHAR(20), INTEGER, VARCHAR(255), VARCHAR(100), TEXT) IS 'Log control effectiveness measurement and update status';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_soc2_controls_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_soc2_controls_timestamp
  BEFORE UPDATE ON soc2_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_soc2_controls_timestamp();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'SOC 2 compliance schema created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Initialize SOC 2 control mapping and evidence collection';
    RAISE NOTICE '2. Set up automated evidence collection for key controls';
    RAISE NOTICE '3. Configure compliance monitoring and alerting';
    RAISE NOTICE '4. Schedule regular control effectiveness assessments';
    RAISE NOTICE '5. Prepare for external SOC 2 audit';
END $$;
