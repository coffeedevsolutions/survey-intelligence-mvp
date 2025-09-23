-- PM Template Configuration for Organizations
-- This allows organizations to customize how work items are created from briefs

-- Add PM template configuration to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS pm_template_config JSONB DEFAULT '{}';

-- Create dedicated PM templates table for reusable templates
CREATE TABLE IF NOT EXISTS pm_templates (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Epic configuration
  epic_config JSONB DEFAULT '{}',
  
  -- Story patterns that should be created for each epic
  story_patterns JSONB DEFAULT '[]',
  
  -- Task patterns that should be created for each story
  task_patterns JSONB DEFAULT '[]',
  
  -- Requirements that should be created
  requirement_patterns JSONB DEFAULT '[]',
  
  -- AI instructions specific to this template
  ai_instructions JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  
  UNIQUE(org_id, name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pm_templates_org_id ON pm_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_templates_active ON pm_templates(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pm_templates_default ON pm_templates(org_id, is_default) WHERE is_default = true;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pm_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_pm_template_updated_at ON pm_templates;
CREATE TRIGGER trigger_update_pm_template_updated_at
  BEFORE UPDATE ON pm_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_pm_template_updated_at();

-- Insert default PM templates for existing organizations
INSERT INTO pm_templates (org_id, name, description, is_default, epic_config, story_patterns, task_patterns, requirement_patterns, ai_instructions)
SELECT 
  id as org_id,
  'Standard Agile Template' as name,
  'Default template with user stories, technical stories, and comprehensive task breakdown' as description,
  true as is_default,
  '{
    "maxEpics": 6,
    "minEpics": 2,
    "requireBusinessValue": true,
    "includeTechnicalEpics": true,
    "epicPrioritization": "business_value"
  }' as epic_config,
  '[
    {
      "id": "spike",
      "name": "{{epic_name}} - Research & Analysis",
      "description": "Investigate technical approach and define implementation strategy for {{epic_name}}",
      "storyType": "spike",
      "priority": 1,
      "estimatedPoints": 3,
      "required": true,
      "acceptanceCriteria": [
        "Technical approach documented",
        "Architecture decisions made",
        "Implementation plan created",
        "Risks and dependencies identified"
      ]
    },
    {
      "id": "functional_requirements",
      "name": "{{epic_name}} - Functional Requirements",
      "description": "Define and document all functional requirements for {{epic_name}}",
      "storyType": "user_story",
      "priority": 2,
      "estimatedPoints": 5,
      "required": true,
      "acceptanceCriteria": [
        "All user stories defined",
        "Acceptance criteria specified",
        "Business rules documented",
        "User workflows mapped"
      ]
    },
    {
      "id": "technical_requirements",
      "name": "{{epic_name}} - Technical Requirements",
      "description": "Define and document all technical requirements and constraints for {{epic_name}}",
      "storyType": "technical_story",
      "priority": 3,
      "estimatedPoints": 5,
      "required": true,
      "acceptanceCriteria": [
        "Technical architecture defined",
        "Performance requirements specified",
        "Security requirements documented",
        "Integration requirements identified",
        "Technology stack decisions made"
      ]
    },
    {
      "id": "technical_implementation",
      "name": "{{epic_name}} - Implementation",
      "description": "Implement core functionality for {{epic_name}}",
      "storyType": "technical_story",
      "priority": 4,
      "estimatedPoints": 13,
      "required": true,
      "acceptanceCriteria": [
        "Core functionality implemented",
        "Unit tests written",
        "Code reviewed",
        "Documentation updated"
      ]
    },
    {
      "id": "testing_validation",
      "name": "{{epic_name}} - Testing & Validation",
      "description": "Comprehensive testing and validation for {{epic_name}}",
      "storyType": "technical_story",
      "priority": 5,
      "estimatedPoints": 8,
      "required": true,
      "acceptanceCriteria": [
        "Integration tests implemented",
        "End-to-end testing completed",
        "Performance validation done",
        "Security testing performed"
      ]
    }
  ]' as story_patterns,
  '[
    {
      "id": "design_review",
      "name": "Design and Architecture Review",
      "description": "Review technical design and architecture decisions",
      "taskType": "research",
      "estimatedHours": 4,
      "appliesTo": ["spike"],
      "required": true
    },
    {
      "id": "requirements_analysis",
      "name": "Requirements Analysis",
      "description": "Analyze and document business requirements",
      "taskType": "research",
      "estimatedHours": 8,
      "appliesTo": ["functional_requirements"],
      "required": true
    },
    {
      "id": "technical_analysis",
      "name": "Technical Requirements Analysis",
      "description": "Define technical constraints and non-functional requirements",
      "taskType": "research",
      "estimatedHours": 6,
      "appliesTo": ["technical_requirements"],
      "required": true
    },
    {
      "id": "development",
      "name": "Core Development",
      "description": "Implement the core functionality",
      "taskType": "development", 
      "estimatedHours": 20,
      "appliesTo": ["technical_implementation"],
      "required": true
    },
    {
      "id": "unit_testing",
      "name": "Unit Testing",
      "description": "Write and execute unit tests",
      "taskType": "testing",
      "estimatedHours": 8,
      "appliesTo": ["technical_implementation"],
      "required": true
    },
    {
      "id": "integration_testing",
      "name": "Integration Testing",
      "description": "Test integration with other components",
      "taskType": "testing",
      "estimatedHours": 8,
      "appliesTo": ["testing_validation"],
      "required": true
    },
    {
      "id": "end_to_end_testing",
      "name": "End-to-End Testing",
      "description": "Comprehensive system testing",
      "taskType": "testing",
      "estimatedHours": 6,
      "appliesTo": ["testing_validation"],
      "required": true
    },
    {
      "id": "documentation",
      "name": "Documentation",
      "description": "Create or update documentation",
      "taskType": "documentation",
      "estimatedHours": 4,
      "appliesTo": ["functional_requirements", "technical_requirements", "technical_implementation"],
      "required": true
    }
  ]' as task_patterns,
  '[
    {
      "id": "functional_req",
      "type": "functional",
      "category": "Core Functionality",
      "priority": 1,
      "required": true,
      "description": "Define what the system should do from user perspective"
    },
    {
      "id": "technical_req", 
      "type": "technical",
      "category": "Technical Constraints",
      "priority": 2,
      "required": true,
      "description": "Define technical constraints and non-functional requirements"
    },
    {
      "id": "security_req",
      "type": "security", 
      "category": "Security & Compliance",
      "priority": 1,
      "required": true,
      "description": "Define security and compliance requirements"
    }
  ]' as requirement_patterns,
  '{
    "organizationContext": "Standard agile development with comprehensive testing and documentation",
    "focusAreas": ["Quality", "Documentation", "Testing"],
    "workflowApproach": "spike_first",
    "storyStructure": "structured_patterns"
  }' as ai_instructions
FROM organizations 
WHERE NOT EXISTS (
  SELECT 1 FROM pm_templates WHERE pm_templates.org_id = organizations.id
);

-- Update organizations to reference their default PM template
UPDATE organizations 
SET pm_template_config = jsonb_build_object(
  'defaultTemplateId', (
    SELECT id FROM pm_templates 
    WHERE pm_templates.org_id = organizations.id 
    AND is_default = true 
    LIMIT 1
  ),
  'enforceTemplate', true,
  'allowCustomization', true
)
WHERE pm_template_config = '{}' OR pm_template_config IS NULL;
