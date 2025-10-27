-- Sync Survey Categories Migration
-- Ensures all 16 survey categories are properly defined in database constraints
-- Date: January 2025

-- Step 1: Verify current constraint exists
DO $$
BEGIN
    -- Check if constraint exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'survey_templates_unified_category_check'
        AND table_name = 'survey_templates_unified'
    ) THEN
        RAISE NOTICE 'Constraint survey_templates_unified_category_check exists';
        
        -- Drop existing constraint
        ALTER TABLE survey_templates_unified 
        DROP CONSTRAINT IF EXISTS survey_templates_unified_category_check;
        
        RAISE NOTICE 'Dropped existing constraint';
    ELSE
        RAISE NOTICE 'No existing constraint found';
    END IF;
END $$;

-- Step 2: Add updated constraint with all 16 categories
ALTER TABLE survey_templates_unified 
ADD CONSTRAINT survey_templates_unified_category_check 
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
  'exit_interview',
  'satisfaction_survey',
  'onboarding_feedback',
  'training_evaluation',
  'performance_review'
));

COMMENT ON CONSTRAINT survey_templates_unified_category_check ON survey_templates_unified IS 
'Updated constraint to support all 20 survey categories including feedback, analysis, research, and assessment types';

-- Step 3: Update any legacy category values
UPDATE survey_templates_unified 
SET category = 'general' 
WHERE category IS NULL OR category NOT IN (
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
  'exit_interview',
  'satisfaction_survey',
  'onboarding_feedback',
  'training_evaluation',
  'performance_review'
);

-- Step 4: Create index for category lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_survey_templates_unified_category 
ON survey_templates_unified(category);

-- Step 5: Add comment to category column
COMMENT ON COLUMN survey_templates_unified.category IS 
'Survey category defining the type and specialized AI behavior. Valid values: general, course_feedback, customer_feedback, employee_feedback, event_feedback, product_feedback, service_feedback, it_support, requirements, assessment, troubleshooting, business_analysis, market_research, user_research, nps_survey, exit_interview, satisfaction_survey, onboarding_feedback, training_evaluation, performance_review';

-- Verification: Show counts by category
SELECT 
  category, 
  COUNT(*) as template_count 
FROM survey_templates_unified 
GROUP BY category 
ORDER BY template_count DESC;

