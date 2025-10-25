-- Update survey_templates_unified category constraint to include new survey types
-- This migration adds support for the expanded survey categories

-- First, drop the existing constraint
ALTER TABLE survey_templates_unified DROP CONSTRAINT IF EXISTS survey_templates_unified_category_check;

-- Add the new constraint with all the new categories
ALTER TABLE survey_templates_unified ADD CONSTRAINT survey_templates_unified_category_check 
CHECK (category IN (
  'general', 
  'course_feedback', 
  'customer_feedback', 
  'employee_feedback', 
  'event_feedback', 
  'product_feedback', 
  'service_feedback',
  'it_support', 
  'requirements', 
  'assessment', 
  'troubleshooting', 
  'business_analysis',
  'market_research',
  'user_research',
  'nps_survey',
  'exit_interview'
));

-- Update any existing 'feedback' entries to 'course_feedback' for backward compatibility
UPDATE survey_templates_unified 
SET category = 'course_feedback' 
WHERE category = 'feedback';

COMMENT ON CONSTRAINT survey_templates_unified_category_check ON survey_templates_unified IS 'Updated constraint to support expanded survey categories';
