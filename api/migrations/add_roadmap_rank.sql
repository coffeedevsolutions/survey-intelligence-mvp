-- Add roadmap rank column to project_briefs table
-- This allows briefs to be ranked in the roadmap view and persist across refreshes
-- Run this with: psql -h localhost -U postgres -d ai_survey -f add_roadmap_rank.sql

BEGIN;

-- Add rank column to project_briefs table
-- Only reviewed briefs with priority data will have a rank
ALTER TABLE project_briefs 
ADD COLUMN IF NOT EXISTS roadmap_rank INTEGER DEFAULT NULL;

-- Create index for better query performance when sorting by rank
CREATE INDEX IF NOT EXISTS idx_project_briefs_roadmap_rank 
ON project_briefs (roadmap_rank) WHERE roadmap_rank IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN project_briefs.roadmap_rank IS 'Rank position in the roadmap view (1 = highest priority, NULL = not ranked)';

COMMIT;
