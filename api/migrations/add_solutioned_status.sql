-- Add Solutioned status to project_briefs table
-- This allows briefs to have a status indicating a solution has been generated
-- Run this with: psql -h localhost -U postgres -d ai_survey -f add_solutioned_status.sql

BEGIN;

-- Update the review_status constraint to include 'solutioned'
ALTER TABLE project_briefs 
DROP CONSTRAINT IF EXISTS project_briefs_review_status_check;

ALTER TABLE project_briefs 
ADD CONSTRAINT project_briefs_review_status_check 
CHECK (review_status IN ('pending', 'reviewed', 'solutioned'));

-- Add comment for documentation
COMMENT ON COLUMN project_briefs.review_status IS 'Status of brief: pending (not reviewed), reviewed (reviewed but no solution), solutioned (solution generated)';

COMMIT;
