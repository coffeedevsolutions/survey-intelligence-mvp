-- Budget Tracking Schema
-- Adds budget tracking columns to organizations and sessions tables
-- Implements per-tenant and global cost budgets

-- Add budget tracking columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS ai_budget_cents INTEGER DEFAULT 100000, -- $1000 default
ADD COLUMN IF NOT EXISTS ai_spent_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_budget_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS ai_budget_period TEXT DEFAULT 'monthly' CHECK (ai_budget_period IN ('daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS ai_budget_alerts_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ai_budget_alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80% threshold
ADD COLUMN IF NOT EXISTS ai_budget_last_alert_date TIMESTAMP;

-- Add budget tracking columns to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS ai_cost_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_calls_count INTEGER DEFAULT 0;

-- Create budget alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_reached', 'budget_exceeded', 'budget_reset')),
  threshold_percentage DECIMAL(3,2),
  current_usage_cents INTEGER,
  budget_limit_cents INTEGER,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  acknowledged_by BIGINT REFERENCES users(id)
);

-- Create budget history table for tracking spending over time
CREATE TABLE IF NOT EXISTS budget_history (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spent_cents INTEGER NOT NULL DEFAULT 0,
  budget_cents INTEGER NOT NULL,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  ai_calls_count INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_ai_budget ON organizations(ai_budget_cents, ai_spent_cents);
CREATE INDEX IF NOT EXISTS idx_sessions_ai_cost ON sessions(ai_cost_cents);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_org_date ON budget_alerts(org_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_budget_history_org_date ON budget_history(org_id, date);

-- Create function to check budget limits
CREATE OR REPLACE FUNCTION check_budget_limit(org_id_param BIGINT, cost_cents_param INTEGER)
RETURNS TABLE (
  within_budget BOOLEAN,
  remaining_budget_cents INTEGER,
  usage_percentage DECIMAL(5,2),
  should_alert BOOLEAN
) AS $$
DECLARE
  org_budget INTEGER;
  org_spent INTEGER;
  org_threshold DECIMAL(3,2);
  org_alerts_enabled BOOLEAN;
  org_last_alert TIMESTAMP;
  new_spent INTEGER;
  usage_pct DECIMAL(5,2);
  threshold_reached BOOLEAN;
BEGIN
  -- Get organization budget settings
  SELECT 
    ai_budget_cents,
    ai_spent_cents,
    ai_budget_alert_threshold,
    ai_budget_alerts_enabled,
    ai_budget_last_alert_date
  INTO org_budget, org_spent, org_threshold, org_alerts_enabled, org_last_alert
  FROM organizations 
  WHERE id = org_id_param;
  
  -- Calculate new spent amount
  new_spent := org_spent + cost_cents_param;
  
  -- Calculate usage percentage
  usage_pct := (new_spent::DECIMAL / org_budget::DECIMAL) * 100;
  
  -- Check if threshold is reached
  threshold_reached := (usage_pct / 100) >= org_threshold;
  
  RETURN QUERY SELECT 
    new_spent <= org_budget as within_budget,
    GREATEST(0, org_budget - new_spent) as remaining_budget_cents,
    usage_pct as usage_percentage,
    (org_alerts_enabled AND threshold_reached AND 
     (org_last_alert IS NULL OR org_last_alert < CURRENT_DATE)) as should_alert;
END;
$$ LANGUAGE plpgsql;

-- Create function to update budget spending
CREATE OR REPLACE FUNCTION update_budget_spending(
  org_id_param BIGINT,
  cost_cents_param INTEGER,
  tokens_param INTEGER DEFAULT 0,
  calls_param INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  budget_check RECORD;
  org_budget INTEGER;
  org_spent INTEGER;
BEGIN
  -- Check budget limits
  SELECT * INTO budget_check 
  FROM check_budget_limit(org_id_param, cost_cents_param);
  
  -- Get current budget info
  SELECT ai_budget_cents, ai_spent_cents 
  INTO org_budget, org_spent
  FROM organizations 
  WHERE id = org_id_param;
  
  -- Update spending if within budget
  IF budget_check.within_budget THEN
    UPDATE organizations 
    SET 
      ai_spent_cents = ai_spent_cents + cost_cents_param,
      ai_budget_last_alert_date = CASE 
        WHEN budget_check.should_alert THEN CURRENT_TIMESTAMP
        ELSE ai_budget_last_alert_date
      END
    WHERE id = org_id_param;
    
    -- Update daily budget history
    INSERT INTO budget_history (org_id, date, spent_cents, budget_cents, sessions_count, ai_calls_count, tokens_used)
    VALUES (org_id_param, CURRENT_DATE, cost_cents_param, org_budget, 0, calls_param, tokens_param)
    ON CONFLICT (org_id, date) 
    DO UPDATE SET 
      spent_cents = budget_history.spent_cents + cost_cents_param,
      ai_calls_count = budget_history.ai_calls_count + calls_param,
      tokens_used = budget_history.tokens_used + tokens_param;
    
    -- Create alert if threshold reached
    IF budget_check.should_alert THEN
      INSERT INTO budget_alerts (
        org_id, 
        alert_type, 
        threshold_percentage, 
        current_usage_cents, 
        budget_limit_cents, 
        message
      ) VALUES (
        org_id_param,
        'threshold_reached',
        budget_check.usage_percentage,
        org_spent + cost_cents_param,
        org_budget,
        format('Budget usage at %.1f%% (%.2f of %.2f)', 
               budget_check.usage_percentage, 
               (org_spent + cost_cents_param)::DECIMAL / 100, 
               org_budget::DECIMAL / 100)
      );
    END IF;
    
    RETURN TRUE;
  ELSE
    -- Budget exceeded - create alert
    INSERT INTO budget_alerts (
      org_id, 
      alert_type, 
      current_usage_cents, 
      budget_limit_cents, 
      message
    ) VALUES (
      org_id_param,
      'budget_exceeded',
      org_spent + cost_cents_param,
      org_budget,
      format('Budget exceeded! Usage: %.2f, Limit: %.2f', 
             (org_spent + cost_cents_param)::DECIMAL / 100, 
             org_budget::DECIMAL / 100)
    );
    
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset budget (for periodic resets)
CREATE OR REPLACE FUNCTION reset_budget(org_id_param BIGINT)
RETURNS VOID AS $$
DECLARE
  org_period TEXT;
  org_budget INTEGER;
BEGIN
  -- Get organization settings
  SELECT ai_budget_period, ai_budget_cents 
  INTO org_period, org_budget
  FROM organizations 
  WHERE id = org_id_param;
  
  -- Reset spending
  UPDATE organizations 
  SET 
    ai_spent_cents = 0,
    ai_budget_reset_date = CURRENT_DATE,
    ai_budget_last_alert_date = NULL
  WHERE id = org_id_param;
  
  -- Create reset alert
  INSERT INTO budget_alerts (
    org_id, 
    alert_type, 
    message
  ) VALUES (
    org_id_param,
    'budget_reset',
    format('Budget reset for %s period. New limit: %.2f', 
           org_period, org_budget::DECIMAL / 100)
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get budget status
CREATE OR REPLACE FUNCTION get_budget_status(org_id_param BIGINT)
RETURNS TABLE (
  budget_cents INTEGER,
  spent_cents INTEGER,
  remaining_cents INTEGER,
  usage_percentage DECIMAL(5,2),
  period TEXT,
  reset_date DATE,
  alerts_enabled BOOLEAN,
  last_alert_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.ai_budget_cents,
    o.ai_spent_cents,
    GREATEST(0, o.ai_budget_cents - o.ai_spent_cents) as remaining_cents,
    ROUND((o.ai_spent_cents::DECIMAL / o.ai_budget_cents::DECIMAL) * 100, 2) as usage_percentage,
    o.ai_budget_period,
    o.ai_budget_reset_date,
    o.ai_budget_alerts_enabled,
    o.ai_budget_last_alert_date
  FROM organizations o
  WHERE o.id = org_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to application role
GRANT EXECUTE ON FUNCTION check_budget_limit(BIGINT, INTEGER) TO application_role;
GRANT EXECUTE ON FUNCTION update_budget_spending(BIGINT, INTEGER, INTEGER, INTEGER) TO application_role;
GRANT EXECUTE ON FUNCTION reset_budget(BIGINT) TO application_role;
GRANT EXECUTE ON FUNCTION get_budget_status(BIGINT) TO application_role;
GRANT SELECT, INSERT, UPDATE ON budget_alerts TO application_role;
GRANT SELECT, INSERT, UPDATE ON budget_history TO application_role;

-- Add comments for documentation
COMMENT ON COLUMN organizations.ai_budget_cents IS 'AI budget limit in cents';
COMMENT ON COLUMN organizations.ai_spent_cents IS 'AI spending in cents for current period';
COMMENT ON COLUMN organizations.ai_budget_period IS 'Budget reset period (daily, weekly, monthly, yearly)';
COMMENT ON COLUMN organizations.ai_budget_alert_threshold IS 'Alert threshold as decimal (0.80 = 80%)';
COMMENT ON COLUMN sessions.ai_cost_cents IS 'Total AI cost for this session in cents';
COMMENT ON COLUMN sessions.ai_tokens_used IS 'Total AI tokens used in this session';
COMMENT ON COLUMN sessions.ai_calls_count IS 'Number of AI calls made in this session';

COMMENT ON TABLE budget_alerts IS 'Budget alerts and notifications';
COMMENT ON TABLE budget_history IS 'Daily budget spending history';

COMMENT ON FUNCTION check_budget_limit(BIGINT, INTEGER) IS 'Check if spending would exceed budget limits';
COMMENT ON FUNCTION update_budget_spending(BIGINT, INTEGER, INTEGER, INTEGER) IS 'Update budget spending and create alerts';
COMMENT ON FUNCTION reset_budget(BIGINT) IS 'Reset budget for new period';
COMMENT ON FUNCTION get_budget_status(BIGINT) IS 'Get current budget status for organization';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Budget tracking schema created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up budget middleware to check limits before AI calls';
    RAISE NOTICE '2. Configure budget alerts and notifications';
    RAISE NOTICE '3. Set up periodic budget resets based on organization settings';
END $$;
