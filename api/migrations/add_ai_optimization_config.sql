-- Add optimization configuration to ai_survey_templates
-- This supports the new optimization features like semantic deduplication, fatigue detection, etc.

-- Add optimization_config column to ai_survey_templates if it doesn't exist
ALTER TABLE ai_survey_templates 
ADD COLUMN IF NOT EXISTS optimization_config JSONB DEFAULT '{
  "enable_semantic_deduplication": true,
  "enable_fatigue_detection": true,
  "enable_dynamic_thresholds": true,
  "fatigue_threshold": 0.7,
  "similarity_threshold": 0.85,
  "max_turns": 6,
  "coverage_requirement": 0.8
}';

-- Create index for optimization config queries
CREATE INDEX IF NOT EXISTS idx_ai_survey_templates_optimization 
ON ai_survey_templates USING GIN (optimization_config);

-- Update existing templates to have default optimization config
UPDATE ai_survey_templates 
SET optimization_config = '{
  "enable_semantic_deduplication": true,
  "enable_fatigue_detection": true,
  "enable_dynamic_thresholds": true,
  "fatigue_threshold": 0.7,
  "similarity_threshold": 0.85,
  "max_turns": 6,
  "coverage_requirement": 0.8
}'::jsonb
WHERE optimization_config IS NULL;
