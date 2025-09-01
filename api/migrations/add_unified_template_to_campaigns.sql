-- Add unified_template_id column to campaigns table
-- This allows campaigns to use the new unified template system

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS unified_template_id BIGINT REFERENCES survey_templates_unified(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_unified_template_id 
ON campaigns(unified_template_id);

-- Add comment for documentation
COMMENT ON COLUMN campaigns.unified_template_id IS 'Reference to unified template (replaces separate survey_template_id and brief_template_id)';
