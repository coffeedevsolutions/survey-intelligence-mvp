-- AI Log Retention Policy
-- Implements 30-90 day TTL for ai_session_logs table
-- Automatically removes old logs to comply with data retention policies

-- Create a function to clean up old AI logs
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    retention_days INTEGER;
BEGIN
    -- Get retention period from environment or use default
    retention_days := COALESCE(
        current_setting('app.ai_log_retention_days', true)::INTEGER,
        90  -- Default to 90 days
    );
    
    -- Delete logs older than retention period
    DELETE FROM ai_session_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up % old AI logs (older than % days)', deleted_count, retention_days;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to anonymize logs before deletion (for compliance)
CREATE OR REPLACE FUNCTION anonymize_ai_logs()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
    retention_days INTEGER;
BEGIN
    -- Get retention period
    retention_days := COALESCE(
        current_setting('app.ai_log_retention_days', true)::INTEGER,
        90
    );
    
    -- Anonymize logs that are approaching retention limit
    UPDATE ai_session_logs 
    SET 
        ai_response = jsonb_build_object(
            'anonymized', true,
            'original_size', jsonb_array_length(ai_response),
            'anonymized_at', NOW()
        ),
        error_message = CASE 
            WHEN error_message IS NOT NULL THEN '[ANONYMIZED]'
            ELSE NULL
        END
    WHERE created_at < NOW() - INTERVAL '1 day' * (retention_days - 7)
      AND ai_response IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Anonymized % AI logs', updated_count;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_ai_session_logs_created_at_cleanup 
ON ai_session_logs(created_at) 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Create a view for monitoring log retention
CREATE OR REPLACE VIEW ai_log_retention_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as log_date,
    COUNT(*) as log_count,
    COUNT(*) FILTER (WHERE ai_response IS NOT NULL) as response_count,
    COUNT(*) FILTER (WHERE error_message IS NOT NULL) as error_count,
    AVG(estimated_cost_cents) as avg_cost_cents,
    SUM(estimated_cost_cents) as total_cost_cents
FROM ai_session_logs
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY log_date DESC;

-- Create a function to get retention compliance report
CREATE OR REPLACE FUNCTION get_retention_compliance_report()
RETURNS TABLE (
    total_logs BIGINT,
    logs_older_than_30_days BIGINT,
    logs_older_than_60_days BIGINT,
    logs_older_than_90_days BIGINT,
    oldest_log_date TIMESTAMP,
    newest_log_date TIMESTAMP,
    estimated_storage_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days') as logs_older_than_30_days,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '60 days') as logs_older_than_60_days,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '90 days') as logs_older_than_90_days,
        MIN(created_at) as oldest_log_date,
        MAX(created_at) as newest_log_date,
        ROUND(
            (pg_total_relation_size('ai_session_logs') / 1024.0 / 1024.0)::NUMERIC, 2
        ) as estimated_storage_mb
    FROM ai_session_logs;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to application role
GRANT EXECUTE ON FUNCTION cleanup_old_ai_logs() TO application_role;
GRANT EXECUTE ON FUNCTION anonymize_ai_logs() TO application_role;
GRANT EXECUTE ON FUNCTION get_retention_compliance_report() TO application_role;
GRANT SELECT ON ai_log_retention_stats TO application_role;

-- Add comments for documentation
COMMENT ON FUNCTION cleanup_old_ai_logs() IS 'Removes AI logs older than the configured retention period';
COMMENT ON FUNCTION anonymize_ai_logs() IS 'Anonymizes AI logs before deletion for compliance';
COMMENT ON FUNCTION get_retention_compliance_report() IS 'Returns compliance report for AI log retention';
COMMENT ON VIEW ai_log_retention_stats IS 'Daily statistics for AI log retention monitoring';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'AI log retention policy created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up cron job to run cleanup_old_ai_logs() daily';
    RAISE NOTICE '2. Configure app.ai_log_retention_days setting';
    RAISE NOTICE '3. Monitor retention compliance using get_retention_compliance_report()';
END $$;
