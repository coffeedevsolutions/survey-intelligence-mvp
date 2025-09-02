-- Add solution generation configuration to organizations table
-- This allows each organization to customize their solution engineering workflow

-- Add solution_generation_config column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS solution_generation_config JSONB DEFAULT '{}';

-- Create index for JSON queries
CREATE INDEX IF NOT EXISTS idx_organizations_solution_config 
ON organizations USING GIN (solution_generation_config);

-- Default configuration template (can be customized per organization)
UPDATE organizations 
SET solution_generation_config = '{
  "epics": {
    "maxCount": 5,
    "minCount": 1,
    "enforceLimit": false,
    "defaultPriority": 3,
    "includeTechnicalEpics": true,
    "includeInfrastructureEpics": true
  },
  "stories": {
    "maxPerEpic": 10,
    "storyTypes": ["user_story", "technical_story", "spike"],
    "requireAcceptanceCriteria": true,
    "estimationScale": "fibonacci",
    "defaultPriority": 3
  },
  "requirements": {
    "types": ["functional", "technical", "performance", "security", "compliance"],
    "categories": {
      "functional": true,
      "technical": true,
      "performance": true,
      "security": true,
      "compliance": false
    },
    "maxPerType": 15,
    "requirePrioritization": true
  },
  "architecture": {
    "componentTypes": ["frontend", "backend", "database", "integration", "infrastructure"],
    "includeTechnologyStack": true,
    "includeDependencies": true,
    "includeComplexityNotes": true,
    "maxComponents": 20
  },
  "risks": {
    "types": ["technical", "business", "timeline", "resource", "integration"],
    "requireMitigationStrategy": true,
    "maxRisks": 10,
    "priorityThreshold": 3
  },
  "estimation": {
    "includeEffortPoints": true,
    "includeDurationWeeks": true,
    "includeComplexityScore": true,
    "storyPointsScale": [1, 2, 3, 5, 8, 13, 21],
    "complexityRange": [1, 10]
  },
  "aiInstructions": {
    "customPromptAdditions": "",
    "focusAreas": [],
    "constraintsAndGuidelines": [],
    "organizationContext": ""
  },
  "templates": {
    "userStoryTemplate": "As a [user] I want [goal] so that [benefit]",
    "technicalStoryTemplate": "Technical: [technical requirement or infrastructure need]",
    "taskTemplate": "[action verb] [specific task description]",
    "requirementTemplate": "[system/feature] must/should [requirement description]"
  }
}'
WHERE solution_generation_config = '{}' OR solution_generation_config IS NULL;

-- Add comment to document the configuration structure
COMMENT ON COLUMN organizations.solution_generation_config IS 
'JSONB configuration for customizing solution generation workflow per organization';
