-- MFA (Multi-Factor Authentication) Schema
-- Adds tables for TOTP MFA implementation for admin and reviewer roles

-- User MFA settings table
CREATE TABLE IF NOT EXISTS user_mfa (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes_hashed TEXT[] DEFAULT '{}', -- Array of hashed backup codes
  qr_code_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disabled BOOLEAN DEFAULT FALSE,
  disabled_at TIMESTAMP,
  disabled_by BIGINT REFERENCES users(id),
  UNIQUE(user_id)
);

-- MFA attempts log table
CREATE TABLE IF NOT EXISTS mfa_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  attempt_type VARCHAR(20) NOT NULL CHECK (attempt_type IN ('totp', 'backup_code')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add MFA enabled column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_org_id ON user_mfa(org_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_date ON mfa_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_success ON mfa_attempts(success);

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE ON user_mfa TO application_role;
GRANT SELECT, INSERT ON mfa_attempts TO application_role;

-- Add comments for documentation
COMMENT ON TABLE user_mfa IS 'TOTP MFA settings and secrets for users';
COMMENT ON TABLE mfa_attempts IS 'Log of MFA authentication attempts';

COMMENT ON COLUMN user_mfa.secret_encrypted IS 'Encrypted TOTP secret using tenant-specific encryption';
COMMENT ON COLUMN user_mfa.backup_codes_hashed IS 'Array of SHA-256 hashed backup codes';
COMMENT ON COLUMN user_mfa.verified IS 'Whether MFA setup has been verified with a test token';
COMMENT ON COLUMN mfa_attempts.attempt_type IS 'Type of MFA attempt: totp or backup_code';

-- Create function to check MFA compliance
CREATE OR REPLACE FUNCTION check_mfa_compliance(org_id_param BIGINT)
RETURNS TABLE (
  total_users BIGINT,
  mfa_enabled_users BIGINT,
  required_role_users BIGINT,
  required_role_mfa_enabled BIGINT,
  compliance_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN u.mfa_enabled = TRUE THEN 1 END) as mfa_enabled_users,
    COUNT(CASE WHEN uor.role IN ('admin', 'reviewer') THEN 1 END) as required_role_users,
    COUNT(CASE WHEN uor.role IN ('admin', 'reviewer') AND u.mfa_enabled = TRUE THEN 1 END) as required_role_mfa_enabled,
    CASE 
      WHEN COUNT(CASE WHEN uor.role IN ('admin', 'reviewer') THEN 1 END) > 0 
      THEN ROUND(
        (COUNT(CASE WHEN uor.role IN ('admin', 'reviewer') AND u.mfa_enabled = TRUE THEN 1 END)::DECIMAL / 
         COUNT(CASE WHEN uor.role IN ('admin', 'reviewer') THEN 1 END)::DECIMAL) * 100, 2
      )
      ELSE 100.0
    END as compliance_rate
  FROM users u
  JOIN user_org_roles uor ON uor.user_id = u.id
  WHERE uor.org_id = org_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get MFA statistics
CREATE OR REPLACE FUNCTION get_mfa_stats(org_id_param BIGINT)
RETURNS TABLE (
  mfa_enabled_users BIGINT,
  pending_setup_users BIGINT,
  failed_attempts_24h BIGINT,
  successful_attempts_24h BIGINT,
  backup_codes_used_24h BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(CASE WHEN u.mfa_enabled = TRUE THEN 1 END) as mfa_enabled_users,
    COUNT(CASE WHEN um.id IS NOT NULL AND um.verified = FALSE THEN 1 END) as pending_setup_users,
    COUNT(CASE WHEN ma.success = FALSE AND ma.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as failed_attempts_24h,
    COUNT(CASE WHEN ma.success = TRUE AND ma.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as successful_attempts_24h,
    COUNT(CASE WHEN ma.attempt_type = 'backup_code' AND ma.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as backup_codes_used_24h
  FROM users u
  LEFT JOIN user_mfa um ON um.user_id = u.id
  LEFT JOIN mfa_attempts ma ON ma.user_id = u.id
  JOIN user_org_roles uor ON uor.user_id = u.id
  WHERE uor.org_id = org_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION check_mfa_compliance(BIGINT) TO application_role;
GRANT EXECUTE ON FUNCTION get_mfa_stats(BIGINT) TO application_role;

-- Add comments for functions
COMMENT ON FUNCTION check_mfa_compliance(BIGINT) IS 'Check MFA compliance rate for organization';
COMMENT ON FUNCTION get_mfa_stats(BIGINT) IS 'Get MFA statistics for organization';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'MFA schema created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Integrate MFA service with authentication flow';
    RAISE NOTICE '2. Add MFA setup UI for admin/reviewer roles';
    RAISE NOTICE '3. Configure MFA enforcement policies';
END $$;
