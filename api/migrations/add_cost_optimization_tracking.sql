-- Cost Optimization Tracking Schema
-- Adds tables for tracking cost optimization metrics and model usage

-- Cost optimization logs table
CREATE TABLE IF NOT EXISTS cost_optimization_logs (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
  model_used VARCHAR(100) NOT NULL,
  tokens_saved INTEGER DEFAULT 0,
  cache_hit BOOLEAN DEFAULT FALSE,
  compression_ratio DECIMAL(3,2) DEFAULT 1.0,
  estimated_savings INTEGER DEFAULT 0, -- in cents
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model usage statistics table
CREATE TABLE IF NOT EXISTS model_usage_stats (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, model_name, task_type)
);

-- Prompt cache statistics table
CREATE TABLE IF NOT EXISTS prompt_cache_stats (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  cache_key VARCHAR(255) NOT NULL,
  hit_count INTEGER DEFAULT 0,
  miss_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, cache_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cost_optimization_logs_org_date ON cost_optimization_logs(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cost_optimization_logs_session ON cost_optimization_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_stats_org_model ON model_usage_stats(org_id, model_name);
CREATE INDEX IF NOT EXISTS idx_prompt_cache_stats_org_key ON prompt_cache_stats(org_id, cache_key);

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE ON cost_optimization_logs TO application_role;
GRANT SELECT, INSERT, UPDATE ON model_usage_stats TO application_role;
GRANT SELECT, INSERT, UPDATE ON prompt_cache_stats TO application_role;

-- Add comments for documentation
COMMENT ON TABLE cost_optimization_logs IS 'Tracks cost optimization metrics for AI calls';
COMMENT ON TABLE model_usage_stats IS 'Statistics for model usage by organization and task type';
COMMENT ON TABLE prompt_cache_stats IS 'Statistics for prompt cache performance';

COMMENT ON COLUMN cost_optimization_logs.tokens_saved IS 'Number of tokens saved through optimization';
COMMENT ON COLUMN cost_optimization_logs.cache_hit IS 'Whether this was a cache hit';
COMMENT ON COLUMN cost_optimization_logs.compression_ratio IS 'Ratio of compressed to original prompt length';
COMMENT ON COLUMN cost_optimization_logs.estimated_savings IS 'Estimated cost savings in cents';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Cost optimization tracking schema created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Integrate cost optimization with AI service calls';
    RAISE NOTICE '2. Set up monitoring dashboards for cost metrics';
    RAISE NOTICE '3. Configure model routing based on usage patterns';
END $$;
