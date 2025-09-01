-- Add priority_data column to support new prioritization frameworks
-- Run this with: psql -h localhost -U postgres -d ai_survey -f add_priority_data.sql

BEGIN;

-- Add priority_data column to project_briefs table
ALTER TABLE project_briefs 
ADD COLUMN IF NOT EXISTS priority_data JSONB DEFAULT NULL;

-- Add framework_id to track which prioritization framework was used
ALTER TABLE project_briefs 
ADD COLUMN IF NOT EXISTS framework_id VARCHAR(50) DEFAULT 'simple';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_briefs_priority_data 
ON project_briefs USING GIN (priority_data);

CREATE INDEX IF NOT EXISTS idx_project_briefs_framework_id 
ON project_briefs (framework_id);

-- Migrate existing priority values to the new format
UPDATE project_briefs 
SET priority_data = jsonb_build_object('value', priority)
WHERE priority IS NOT NULL AND priority_data IS NULL;

COMMIT;
