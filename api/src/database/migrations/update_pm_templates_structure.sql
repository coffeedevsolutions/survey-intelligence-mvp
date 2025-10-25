-- Update existing PM templates with improved structure
-- This migration updates the default template to have the corrected story patterns

UPDATE pm_templates 
SET 
  story_patterns = '[
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
  ]',
  task_patterns = '[
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
  ]',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Standard Agile Template';

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'PM templates structure updated successfully with improved story patterns and task patterns';
END $$;
