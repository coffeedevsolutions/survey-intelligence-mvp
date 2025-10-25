-- Per-Tenant KMS Keys Schema
-- Adds tables for managing per-tenant Customer Managed Keys (CMKs) with rotation

-- Tenant KMS keys table
CREATE TABLE IF NOT EXISTS tenant_kms_keys (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  key_id VARCHAR(255) NOT NULL, -- KMS key identifier
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('aws', 'gcp', 'azure')),
  key_arn VARCHAR(500), -- Full ARN/URI for the key
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'deleted')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_rotated TIMESTAMP,
  rotation_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMP,
  UNIQUE(org_id, status) -- Only one active key per tenant
);

-- KMS rotation logs table
CREATE TABLE IF NOT EXISTS kms_rotation_logs (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  old_key_id VARCHAR(255),
  new_key_id VARCHAR(255) NOT NULL,
  rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rotation_reason VARCHAR(100) DEFAULT 'scheduled',
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- KMS key usage tracking table
CREATE TABLE IF NOT EXISTS kms_key_usage (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  key_id VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('encrypt', 'decrypt', 'generate_data_key')),
  resource_type VARCHAR(100), -- e.g., 'jira_token', 'user_data', 'ai_prompt'
  resource_id VARCHAR(255), -- ID of the encrypted resource
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_kms_keys_org_id ON tenant_kms_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_tenant_kms_keys_status ON tenant_kms_keys(status);
CREATE INDEX IF NOT EXISTS idx_tenant_kms_keys_last_rotated ON tenant_kms_keys(last_rotated);
CREATE INDEX IF NOT EXISTS idx_kms_rotation_logs_org_date ON kms_rotation_logs(org_id, rotated_at);
CREATE INDEX IF NOT EXISTS idx_kms_key_usage_org_date ON kms_key_usage(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kms_key_usage_key_id ON kms_key_usage(key_id);

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE ON tenant_kms_keys TO application_role;
GRANT SELECT, INSERT ON kms_rotation_logs TO application_role;
GRANT SELECT, INSERT ON kms_key_usage TO application_role;

-- Add comments for documentation
COMMENT ON TABLE tenant_kms_keys IS 'Per-tenant Customer Managed Keys (CMKs) with rotation tracking';
COMMENT ON TABLE kms_rotation_logs IS 'Log of KMS key rotation events';
COMMENT ON TABLE kms_key_usage IS 'Tracking of KMS key usage for audit and monitoring';

COMMENT ON COLUMN tenant_kms_keys.key_id IS 'KMS provider-specific key identifier';
COMMENT ON COLUMN tenant_kms_keys.provider IS 'KMS provider: aws, gcp, or azure';
COMMENT ON COLUMN tenant_kms_keys.key_arn IS 'Full ARN/URI for the key in the provider';
COMMENT ON COLUMN tenant_kms_keys.rotation_count IS 'Number of times this key has been rotated';

-- Create function to get keys needing rotation
CREATE OR REPLACE FUNCTION get_keys_needing_rotation(rotation_period_days INTEGER DEFAULT 365)
RETURNS TABLE (
  org_id BIGINT,
  key_id VARCHAR(255),
  days_since_rotation INTEGER,
  last_rotation_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tkk.org_id,
    tkk.key_id,
    CASE 
      WHEN tkk.last_rotated IS NULL THEN 
        EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - tkk.created_at))::INTEGER
      ELSE 
        EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - tkk.last_rotated))::INTEGER
    END as days_since_rotation,
    COALESCE(tkk.last_rotated, tkk.created_at) as last_rotation_date
  FROM tenant_kms_keys tkk
  WHERE tkk.status = 'active'
    AND (
      tkk.last_rotated IS NULL 
      OR EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - tkk.last_rotated)) >= rotation_period_days
    )
  ORDER BY last_rotation_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get KMS usage statistics
CREATE OR REPLACE FUNCTION get_kms_usage_stats(org_id_param BIGINT DEFAULT NULL)
RETURNS TABLE (
  total_operations BIGINT,
  successful_operations BIGINT,
  failed_operations BIGINT,
  encrypt_operations BIGINT,
  decrypt_operations BIGINT,
  generate_data_key_operations BIGINT,
  last_operation_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_operations,
    COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_operations,
    COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_operations,
    COUNT(CASE WHEN operation_type = 'encrypt' THEN 1 END) as encrypt_operations,
    COUNT(CASE WHEN operation_type = 'decrypt' THEN 1 END) as decrypt_operations,
    COUNT(CASE WHEN operation_type = 'generate_data_key' THEN 1 END) as generate_data_key_operations,
    MAX(created_at) as last_operation_date
  FROM kms_key_usage
  WHERE (org_id_param IS NULL OR org_id = org_id_param);
END;
$$ LANGUAGE plpgsql;

-- Create function to log KMS key usage
CREATE OR REPLACE FUNCTION log_kms_usage(
  org_id_param BIGINT,
  key_id_param VARCHAR(255),
  operation_type_param VARCHAR(50),
  resource_type_param VARCHAR(100) DEFAULT NULL,
  resource_id_param VARCHAR(255) DEFAULT NULL,
  success_param BOOLEAN DEFAULT TRUE,
  error_message_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO kms_key_usage (
    org_id, key_id, operation_type, resource_type, 
    resource_id, success, error_message
  ) VALUES (
    org_id_param, key_id_param, operation_type_param, resource_type_param,
    resource_id_param, success_param, error_message_param
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION get_keys_needing_rotation(INTEGER) TO application_role;
GRANT EXECUTE ON FUNCTION get_kms_usage_stats(BIGINT) TO application_role;
GRANT EXECUTE ON FUNCTION log_kms_usage(BIGINT, VARCHAR(255), VARCHAR(50), VARCHAR(100), VARCHAR(255), BOOLEAN, TEXT) TO application_role;

-- Add comments for functions
COMMENT ON FUNCTION get_keys_needing_rotation(INTEGER) IS 'Get keys that need rotation based on specified period';
COMMENT ON FUNCTION get_kms_usage_stats(BIGINT) IS 'Get KMS usage statistics for organization or all';
COMMENT ON FUNCTION log_kms_usage(BIGINT, VARCHAR(255), VARCHAR(50), VARCHAR(100), VARCHAR(255), BOOLEAN, TEXT) IS 'Log KMS key usage for audit trail';

-- Create trigger to automatically log key usage
CREATE OR REPLACE FUNCTION trigger_log_kms_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called from application code when KMS operations occur
  -- The actual logging happens in the application layer
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Per-tenant KMS keys schema created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure KMS provider credentials (AWS/GCP/Azure)';
    RAISE NOTICE '2. Integrate per-tenant KMS with existing encryption services';
    RAISE NOTICE '3. Set up automated key rotation schedule';
    RAISE NOTICE '4. Configure monitoring and alerting for key usage';
END $$;
