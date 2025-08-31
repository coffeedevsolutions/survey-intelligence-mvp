-- Enhanced AI Configuration Schema for Survey Application
-- Add these tables to your existing database schema

-- AI Prompt Templates for different survey contexts
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  context_type TEXT NOT NULL CHECK (context_type IN ('question_generation', 'fact_extraction', 'brief_generation', 'follow_up')),
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini' CHECK (model_name IN ('gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo')),
  temperature DECIMAL(3,2) DEFAULT 0.2 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, name, context_type)
);

-- AI Configuration per survey flow
CREATE TABLE IF NOT EXISTS ai_flow_configs (
  id BIGSERIAL PRIMARY KEY,
  flow_id BIGINT REFERENCES survey_flows(id) ON DELETE CASCADE,
  question_generation_template_id BIGINT REFERENCES ai_prompt_templates(id),
  fact_extraction_template_id BIGINT REFERENCES ai_prompt_templates(id),
  brief_generation_template_id BIGINT REFERENCES ai_prompt_templates(id),
  
  -- AI behavior settings
  enable_adaptive_questions BOOLEAN DEFAULT TRUE,
  enable_dynamic_follow_ups BOOLEAN DEFAULT TRUE,
  enable_context_awareness BOOLEAN DEFAULT TRUE,
  enable_smart_fact_extraction BOOLEAN DEFAULT TRUE,
  
  -- Quality controls
  max_ai_questions_per_session INTEGER DEFAULT 10,
  min_confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
  enable_human_fallback BOOLEAN DEFAULT TRUE,
  
  -- Cost controls
  max_tokens_per_session INTEGER DEFAULT 10000,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (flow_id)
);

-- Domain-specific knowledge base for better AI context
CREATE TABLE IF NOT EXISTS ai_domain_knowledge (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- e.g., 'IT', 'HR', 'Finance', 'Marketing'
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('terminology', 'common_patterns', 'validation_rules', 'follow_up_triggers')),
  content JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI session tracking for analytics and debugging
CREATE TABLE IF NOT EXISTS ai_session_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
  flow_id BIGINT REFERENCES survey_flows(id),
  
  -- Request details
  ai_action TEXT NOT NULL CHECK (ai_action IN ('question_generation', 'fact_extraction', 'brief_generation', 'follow_up')),
  prompt_template_id BIGINT REFERENCES ai_prompt_templates(id),
  input_tokens INTEGER,
  output_tokens INTEGER,
  model_used TEXT,
  temperature_used DECIMAL(3,2),
  
  -- Response details
  ai_response JSONB,
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Cost tracking
  estimated_cost_cents INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced survey flows table updates
ALTER TABLE survey_flows 
  ADD COLUMN IF NOT EXISTS ai_config_id BIGINT REFERENCES ai_flow_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_customization_level TEXT DEFAULT 'standard' CHECK (ai_customization_level IN ('none', 'standard', 'adaptive', 'full'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_org_context ON ai_prompt_templates(org_id, context_type);
CREATE INDEX IF NOT EXISTS idx_ai_session_logs_session_id ON ai_session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_session_logs_created_at ON ai_session_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_domain_knowledge_org_domain ON ai_domain_knowledge(org_id, domain);

-- Default AI prompt templates for organizations
INSERT INTO ai_prompt_templates (org_id, name, description, context_type, system_prompt, user_prompt_template, model_name) VALUES
(NULL, 'Default Question Generator', 'Standard question generation for surveys', 'question_generation', 
 'You are an expert survey designer creating the next best question to understand user requirements. Generate questions that are clear, specific, and help extract actionable information. Always respond in valid JSON format.',
 'Based on the conversation so far and the current context, generate the next most relevant question.\n\nConversation history:\n{{conversation_history}}\n\nCurrent facts extracted:\n{{extracted_facts}}\n\nSurvey context:\n{{survey_context}}\n\nRespond with JSON: {"question_text": "your question here", "question_type": "text|multiple_choice|scale", "follow_up_logic": "optional logic description"}',
 'gpt-4o-mini'),

(NULL, 'Default Fact Extractor', 'Standard fact extraction from survey responses', 'fact_extraction',
 'You are an expert at extracting structured facts from survey responses. Focus on actionable information and maintain consistency. Always respond in valid JSON format.',
 'Extract relevant facts from this survey response.\n\nQuestion: {{question_text}}\nResponse: {{user_response}}\n\nPrevious facts: {{existing_facts}}\n\nExtract new facts and suggest confidence scores. Respond with JSON: {"extracted_facts": [{"key": "fact_name", "value": "fact_value", "confidence": 0.9}], "suggested_follow_ups": ["optional follow-up question"]}',
 'gpt-4o-mini');
