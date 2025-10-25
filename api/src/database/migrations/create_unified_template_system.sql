-- UNIFIED TEMPLATE SYSTEM MIGRATION
-- Consolidates ai_survey_templates, survey_templates, brief_templates into one clear system

-- Step 1: Create the new unified survey_templates structure
CREATE TABLE IF NOT EXISTS survey_templates_unified (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template Identity
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'it_support', 'requirements', 'feedback', 'assessment', 'troubleshooting', 'business_analysis')),
  
  -- Template Type - The KEY difference
  template_type TEXT NOT NULL DEFAULT 'ai_dynamic' CHECK (template_type IN ('static', 'ai_dynamic', 'hybrid')),
  
  -- AI Configuration (consolidated from ai_survey_templates)
  ai_config JSONB DEFAULT '{}', -- Contains: survey_goal, target_outcome, ai_instructions, model_settings, optimization_config
  
  -- Output Configuration (consolidated from brief_templates) 
  output_config JSONB DEFAULT '{}', -- Contains: brief_template, slot_schema, success_criteria
  
  -- Appearance Configuration (from current survey_templates)
  appearance_config JSONB DEFAULT '{}', -- Contains: colors, styling, branding, ui_settings
  
  -- Flow Configuration (for static/hybrid templates)
  flow_config JSONB DEFAULT '{}', -- Contains: questions, logic, branching
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (org_id, name)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_templates_unified_org ON survey_templates_unified(org_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_unified_type ON survey_templates_unified(template_type);
CREATE INDEX IF NOT EXISTS idx_survey_templates_unified_category ON survey_templates_unified(category);
CREATE INDEX IF NOT EXISTS idx_survey_templates_unified_default ON survey_templates_unified(org_id, is_default);

-- Step 3: Add updated_at trigger
CREATE OR REPLACE FUNCTION update_survey_templates_unified_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_survey_templates_unified_updated_at
  BEFORE UPDATE ON survey_templates_unified
  FOR EACH ROW EXECUTE FUNCTION update_survey_templates_unified_updated_at();

-- Step 4: Update campaigns to reference the unified system
ALTER TABLE campaigns DROP COLUMN IF EXISTS survey_template_id CASCADE;
ALTER TABLE campaigns DROP COLUMN IF EXISTS brief_template_id CASCADE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS unified_template_id BIGINT REFERENCES survey_templates_unified(id) ON DELETE SET NULL;

-- Step 5: Update survey_flows to reference the unified system
ALTER TABLE survey_flows DROP COLUMN IF EXISTS survey_template_id CASCADE;
ALTER TABLE survey_flows ADD COLUMN IF NOT EXISTS unified_template_id BIGINT REFERENCES survey_templates_unified(id) ON DELETE SET NULL;

-- Step 6: Create view for backward compatibility (temporary)
CREATE OR REPLACE VIEW survey_templates_legacy AS 
SELECT 
  id,
  org_id,
  name,
  description,
  appearance_config as settings,
  is_default,
  CASE WHEN template_type = 'ai_dynamic' THEN true ELSE false END as enable_ai,
  null as ai_template_id, -- Will be handled differently now
  (output_config->>'brief_template') as brief_template,
  (ai_config->>'ai_instructions') as brief_ai_instructions,
  created_by,
  created_at,
  updated_at
FROM survey_templates_unified;

COMMENT ON TABLE survey_templates_unified IS 'Unified template system - replaces ai_survey_templates, survey_templates, and brief_templates';
COMMENT ON COLUMN survey_templates_unified.template_type IS 'static=predefined questions, ai_dynamic=AI generates questions, hybrid=mix of both';
COMMENT ON COLUMN survey_templates_unified.ai_config IS 'AI behavior: {survey_goal, target_outcome, ai_instructions, model_settings, optimization_config}';
COMMENT ON COLUMN survey_templates_unified.output_config IS 'Output generation: {brief_template, slot_schema, success_criteria}';
COMMENT ON COLUMN survey_templates_unified.appearance_config IS 'UI/UX: {colors, styling, branding, layout}';
COMMENT ON COLUMN survey_templates_unified.flow_config IS 'Static flow: {questions, logic, branching} (for static/hybrid types)';
