-- Add JIRA export tracking to solutions table
-- This allows us to track which solutions have been exported and when

ALTER TABLE solutions 
ADD COLUMN IF NOT EXISTS jira_exported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS jira_export_project_key TEXT,
ADD COLUMN IF NOT EXISTS jira_export_epic_key TEXT,
ADD COLUMN IF NOT EXISTS jira_export_issue_count INTEGER DEFAULT 0;

-- Index for performance when filtering by export status
CREATE INDEX IF NOT EXISTS idx_solutions_jira_exported_at ON solutions (jira_exported_at);
CREATE INDEX IF NOT EXISTS idx_solutions_jira_export_project_key ON solutions (jira_export_project_key);

-- Add comments for clarity
COMMENT ON COLUMN solutions.jira_exported_at IS 'Timestamp when solution was last exported to JIRA';
COMMENT ON COLUMN solutions.jira_export_project_key IS 'JIRA project key where solution was exported';
COMMENT ON COLUMN solutions.jira_export_epic_key IS 'JIRA epic key created during export';
COMMENT ON COLUMN solutions.jira_export_issue_count IS 'Number of JIRA issues created during export';
