-- Quick script to add the missing columns
-- Run this in your PostgreSQL database

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

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_briefs' 
AND column_name IN ('priority_data', 'framework_id');
