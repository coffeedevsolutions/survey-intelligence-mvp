-- Compliance Automation Schema
-- Adds tables for automated compliance reporting and evidence collection

-- Compliance evidence table
CREATE TABLE IF NOT EXISTS compliance_evidence (
  id BIGSERIAL PRIMARY KEY,
  evidence_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  data JSONB NOT NULL,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(100) NOT NULL,
  validation_status VARCHAR(50) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validated_at TIMESTAMP,
  validated_by VARCHAR(255)
);

-- Compliance reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id BIGSERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'ad_hoc')),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  file_path VARCHAR(500),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by VARCHAR(255) DEFAULT 'system',
  status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'approved', 'archived'))
);

-- Compliance automation logs table
CREATE TABLE IF NOT EXISTS compliance_automation_logs (
  id BIGSERIAL PRIMARY KEY,
  task_type VARCHAR(100) NOT NULL, -- e.g., 'daily_report', 'evidence_collection', 'assessment'
  task_status VARCHAR(50) NOT NULL CHECK (task_status IN ('started', 'completed', 'failed')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Compliance alerts table
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'closed')),
  assigned_to VARCHAR(255),
  resolution_notes TEXT
);

-- Compliance assessments table
CREATE TABLE IF NOT EXISTS compliance_assessments (
  id BIGSERIAL PRIMARY KEY,
  assessment_type VARCHAR(100) NOT NULL, -- e.g., 'weekly', 'monthly', 'annual'
  assessment_data JSONB NOT NULL,
  overall_score DECIMAL(5,2),
  conducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  conducted_by VARCHAR(255) DEFAULT 'system',
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'reviewed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_type ON compliance_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_collected_at ON compliance_evidence(collected_at);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_source ON compliance_evidence(source);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_period ON compliance_reports(report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON compliance_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_compliance_automation_logs_task ON compliance_automation_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_compliance_automation_logs_status ON compliance_automation_logs(task_status);
CREATE INDEX IF NOT EXISTS idx_compliance_automation_logs_started_at ON compliance_automation_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_type ON compliance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_triggered_at ON compliance_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_type ON compliance_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_conducted_at ON compliance_assessments(conducted_at);

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE ON compliance_evidence TO application_role;
GRANT SELECT, INSERT, UPDATE ON compliance_reports TO application_role;
GRANT SELECT, INSERT ON compliance_automation_logs TO application_role;
GRANT SELECT, INSERT, UPDATE ON compliance_alerts TO application_role;
GRANT SELECT, INSERT, UPDATE ON compliance_assessments TO application_role;

-- Add comments for documentation
COMMENT ON TABLE compliance_evidence IS 'Automatically collected compliance evidence';
COMMENT ON TABLE compliance_reports IS 'Generated compliance reports (daily, weekly, monthly)';
COMMENT ON TABLE compliance_automation_logs IS 'Logs of automated compliance tasks';
COMMENT ON TABLE compliance_alerts IS 'Compliance alerts and notifications';
COMMENT ON TABLE compliance_assessments IS 'Compliance assessments and evaluations';

COMMENT ON COLUMN compliance_evidence.evidence_type IS 'Type of evidence: audit_logs, access_logs, system_logs, etc.';
COMMENT ON COLUMN compliance_evidence.validation_status IS 'Status of evidence validation';
COMMENT ON COLUMN compliance_reports.report_data IS 'JSON data containing the report content';
COMMENT ON COLUMN compliance_alerts.severity IS 'Alert severity level';
COMMENT ON COLUMN compliance_assessments.overall_score IS 'Overall compliance score (0-100)';

-- Create function to get compliance dashboard data
CREATE OR REPLACE FUNCTION get_compliance_dashboard_data()
RETURNS TABLE (
  total_evidence_items BIGINT,
  recent_evidence_items BIGINT,
  pending_validation_items BIGINT,
  total_reports BIGINT,
  recent_reports BIGINT,
  open_alerts BIGINT,
  critical_alerts BIGINT,
  last_assessment_score DECIMAL(5,2),
  last_assessment_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM compliance_evidence) as total_evidence_items,
    (SELECT COUNT(*) FROM compliance_evidence WHERE collected_at >= CURRENT_DATE - INTERVAL '7 days') as recent_evidence_items,
    (SELECT COUNT(*) FROM compliance_evidence WHERE validation_status = 'pending') as pending_validation_items,
    (SELECT COUNT(*) FROM compliance_reports) as total_reports,
    (SELECT COUNT(*) FROM compliance_reports WHERE generated_at >= CURRENT_DATE - INTERVAL '30 days') as recent_reports,
    (SELECT COUNT(*) FROM compliance_alerts WHERE status = 'open') as open_alerts,
    (SELECT COUNT(*) FROM compliance_alerts WHERE status = 'open' AND severity = 'critical') as critical_alerts,
    (SELECT overall_score FROM compliance_assessments ORDER BY conducted_at DESC LIMIT 1) as last_assessment_score,
    (SELECT conducted_at FROM compliance_assessments ORDER BY conducted_at DESC LIMIT 1) as last_assessment_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to log compliance automation task
CREATE OR REPLACE FUNCTION log_compliance_automation_task(
  task_type_param VARCHAR(100),
  task_status_param VARCHAR(50),
  error_message_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO compliance_automation_logs (
    task_type, task_status, error_message, metadata
  ) VALUES (
    task_type_param, task_status_param, error_message_param, metadata_param
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to create compliance alert
CREATE OR REPLACE FUNCTION create_compliance_alert(
  alert_type_param VARCHAR(100),
  severity_param VARCHAR(50),
  title_param VARCHAR(255),
  message_param TEXT,
  assigned_to_param VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO compliance_alerts (
    alert_type, severity, title, message, assigned_to
  ) VALUES (
    alert_type_param, severity_param, title_param, message_param, assigned_to_param
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to validate evidence
CREATE OR REPLACE FUNCTION validate_evidence(
  evidence_id_param BIGINT,
  validation_status_param VARCHAR(50),
  validated_by_param VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN
  UPDATE compliance_evidence 
  SET 
    validation_status = validation_status_param,
    validated_at = CURRENT_TIMESTAMP,
    validated_by = validated_by_param
  WHERE id = evidence_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION get_compliance_dashboard_data() TO application_role;
GRANT EXECUTE ON FUNCTION log_compliance_automation_task(VARCHAR(100), VARCHAR(50), TEXT, JSONB) TO application_role;
GRANT EXECUTE ON FUNCTION create_compliance_alert(VARCHAR(100), VARCHAR(50), VARCHAR(255), TEXT, VARCHAR(255)) TO application_role;
GRANT EXECUTE ON FUNCTION validate_evidence(BIGINT, VARCHAR(50), VARCHAR(255)) TO application_role;

-- Add comments for functions
COMMENT ON FUNCTION get_compliance_dashboard_data() IS 'Get comprehensive compliance dashboard metrics';
COMMENT ON FUNCTION log_compliance_automation_task(VARCHAR(100), VARCHAR(50), TEXT, JSONB) IS 'Log compliance automation task execution';
COMMENT ON FUNCTION create_compliance_alert(VARCHAR(100), VARCHAR(50), VARCHAR(255), TEXT, VARCHAR(255)) IS 'Create a new compliance alert';
COMMENT ON FUNCTION validate_evidence(BIGINT, VARCHAR(50), VARCHAR(255)) IS 'Validate compliance evidence';

-- Create trigger to automatically log task completion
CREATE OR REPLACE FUNCTION trigger_log_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_status = 'completed' AND OLD.task_status != 'completed' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_task_completion
  BEFORE UPDATE ON compliance_automation_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_task_completion();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Compliance automation schema created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Initialize compliance automation system';
    RAISE NOTICE '2. Configure automated report generation schedules';
    RAISE NOTICE '3. Set up evidence collection from all sources';
    RAISE NOTICE '4. Configure compliance alerting channels';
    RAISE NOTICE '5. Schedule regular compliance assessments';
END $$;
