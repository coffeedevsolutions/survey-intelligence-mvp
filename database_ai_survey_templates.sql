-- Enhanced AI Survey Template System
-- Add these tables to support goal-based AI survey templates

-- AI Survey Templates (reusable templates with AI behavior)
CREATE TABLE IF NOT EXISTS ai_survey_templates (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'it_support', 'requirements', 'feedback', 'assessment', 'troubleshooting')),
  
  -- Survey Goals and Context
  survey_goal TEXT NOT NULL, -- "Help with email issues", "Understand software requirements", etc.
  target_outcome TEXT NOT NULL, -- What we want to achieve
  context_description TEXT, -- Additional context for AI
  
  -- AI Behavior Configuration
  ai_instructions TEXT NOT NULL, -- Instructions for how AI should behave
  first_question_prompt TEXT, -- How to generate the first question
  follow_up_strategy TEXT, -- How to generate follow-up questions
  max_questions INTEGER DEFAULT 8 CHECK (max_questions >= 3 AND max_questions <= 20),
  min_questions INTEGER DEFAULT 3 CHECK (min_questions >= 1),
  
  -- Output Configuration
  brief_template TEXT NOT NULL, -- Template for the final brief
  brief_sections JSONB, -- Structured sections for the brief
  success_criteria JSONB, -- What makes a successful survey completion
  
  -- Model Configuration
  model_name TEXT DEFAULT 'gpt-4o-mini' CHECK (model_name IN ('gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo')),
  temperature DECIMAL(3,2) DEFAULT 0.3 CHECK (temperature >= 0 AND temperature <= 1),
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (org_id, name)
);

-- AI Survey Instances (actual surveys using AI templates)
CREATE TABLE IF NOT EXISTS ai_survey_instances (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
  ai_template_id BIGINT REFERENCES ai_survey_templates(id) ON DELETE SET NULL,
  
  -- Instance-specific context
  custom_context JSONB, -- Any custom context for this specific survey
  survey_goal_override TEXT, -- Override the template goal if needed
  
  -- AI State Tracking
  questions_asked INTEGER DEFAULT 0,
  facts_gathered JSONB DEFAULT '{}',
  ai_confidence_score DECIMAL(3,2),
  completion_reason TEXT, -- 'max_questions', 'goal_achieved', 'user_ended', etc.
  
  -- Costs and Performance
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Question History (track all questions asked by AI)
CREATE TABLE IF NOT EXISTS ai_question_history (
  id BIGSERIAL PRIMARY KEY,
  ai_instance_id BIGINT REFERENCES ai_survey_instances(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  
  -- Question Details
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'multiple_choice', 'scale', 'boolean')),
  question_intent TEXT, -- What the AI was trying to learn
  
  -- User Response
  user_response TEXT,
  response_timestamp TIMESTAMP,
  
  -- AI Analysis
  extracted_facts JSONB,
  confidence_score DECIMAL(3,2),
  follow_up_reasoning TEXT, -- Why AI chose this as next question
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pre-built AI Survey Templates
INSERT INTO ai_survey_templates (
  org_id, name, description, category, survey_goal, target_outcome, context_description,
  ai_instructions, first_question_prompt, follow_up_strategy, max_questions, min_questions,
  brief_template, brief_sections, success_criteria
) VALUES 
(
  NULL, 
  'IT Support Request', 
  'Help users with technical issues and IT requests',
  'it_support',
  'Understand and resolve IT/technical issues',
  'Provide clear problem definition, impact assessment, and actionable next steps',
  'This survey helps IT support understand user problems quickly and provide effective solutions.',
  
  'You are an expert IT support analyst. Your goal is to quickly understand the user''s technical problem, assess its impact, and gather enough information to provide effective solutions. Ask focused, technical questions that help diagnose the issue. Be empathetic but efficient.',
  
  'Ask about the specific technical problem they''re experiencing. Be direct but friendly. Example: "What specific technical issue are you experiencing?" or "Describe the problem you''re having with your technology/system."',
  
  'Follow up based on the problem type: For software issues, ask about error messages, when it started, and what they were doing. For hardware issues, ask about symptoms and recent changes. For access issues, ask about what they''re trying to access and any error messages. Always prioritize business impact and urgency.',
  
  7, 3,
  
  '# IT Support Request Summary

## Problem Overview
**Issue Type:** {{issue_type}}
**Affected System:** {{affected_system}}
**Problem Description:** {{problem_description}}

## Impact Assessment
**Business Impact:** {{business_impact}}
**Urgency Level:** {{urgency_level}}
**Users Affected:** {{users_affected}}

## Technical Details
**Error Messages:** {{error_messages}}
**When Started:** {{when_started}}
**Recent Changes:** {{recent_changes}}
**Troubleshooting Attempted:** {{troubleshooting_attempted}}

## Recommended Next Steps
{{recommended_steps}}

## Estimated Resolution
**Complexity:** {{complexity_level}}
**Estimated Time:** {{estimated_time}}
**Priority:** {{priority_level}}',

  '{"sections": ["problem_overview", "impact_assessment", "technical_details", "recommended_steps", "estimated_resolution"], "required_facts": ["problem_description", "business_impact", "affected_system"]}',
  
  '{"completion_criteria": ["problem_clearly_defined", "impact_assessed", "sufficient_technical_details"], "success_indicators": ["business_impact_understood", "actionable_next_steps_identified"]}'
),

(
  NULL,
  'Software Requirements Gathering',
  'Understand software needs and requirements for new projects',
  'requirements',
  'Gather comprehensive software requirements',
  'Define clear project scope, functional requirements, and success criteria',
  'This survey helps gather detailed software requirements from stakeholders.',
  
  'You are a business analyst specializing in software requirements. Your goal is to understand what the user needs, why they need it, who will use it, and what success looks like. Ask questions that uncover both functional and non-functional requirements.',
  
  'Start by understanding their high-level need or problem. Ask: "What business problem are you trying to solve with software?" or "What would you like this software to help you accomplish?"',
  
  'Dive deeper into specifics: Who are the users? What are the key features needed? What does the current process look like? What does success look like? How do they measure ROI? What are the constraints (budget, timeline, technical)?',
  
  10, 5,
  
  '# Software Requirements Document

## Project Overview
**Project Name:** {{project_name}}
**Business Problem:** {{business_problem}}
**Target Users:** {{target_users}}
**Success Criteria:** {{success_criteria}}

## Functional Requirements
**Core Features:** {{core_features}}
**User Workflows:** {{user_workflows}}
**Integration Needs:** {{integration_needs}}
**Data Requirements:** {{data_requirements}}

## Non-Functional Requirements
**Performance:** {{performance_requirements}}
**Security:** {{security_requirements}}
**Scalability:** {{scalability_needs}}
**Compliance:** {{compliance_requirements}}

## Business Context
**Current Process:** {{current_process}}
**Pain Points:** {{pain_points}}
**Expected ROI:** {{expected_roi}}
**Timeline:** {{project_timeline}}

## Constraints & Assumptions
**Budget Range:** {{budget_range}}
**Technical Constraints:** {{technical_constraints}}
**Resource Availability:** {{resource_availability}}

## Next Steps
{{recommended_next_steps}}',

  '{"sections": ["project_overview", "functional_requirements", "non_functional_requirements", "business_context", "constraints_assumptions", "next_steps"], "required_facts": ["business_problem", "target_users", "core_features", "success_criteria"]}',
  
  '{"completion_criteria": ["problem_understood", "users_identified", "features_defined", "success_metrics_clear"], "success_indicators": ["actionable_requirements", "clear_scope", "measurable_outcomes"]}'
);

-- Add AI template reference to existing survey flows
ALTER TABLE survey_flows ADD COLUMN IF NOT EXISTS ai_template_id BIGINT REFERENCES ai_survey_templates(id) ON DELETE SET NULL;

-- Indexes for performance (created after tables)
CREATE INDEX IF NOT EXISTS idx_ai_survey_templates_org_category ON ai_survey_templates(org_id, category);
CREATE INDEX IF NOT EXISTS idx_ai_survey_instances_session ON ai_survey_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_survey_instances_template ON ai_survey_instances(ai_template_id);
CREATE INDEX IF NOT EXISTS idx_ai_question_history_instance ON ai_question_history(ai_instance_id);
