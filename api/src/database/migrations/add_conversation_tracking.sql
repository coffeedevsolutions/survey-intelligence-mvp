-- Enhanced conversation tracking for AI context understanding
-- This migration adds comprehensive conversation history tracking

-- Table to store full conversation context with AI metadata
CREATE TABLE IF NOT EXISTS conversation_history (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    question_id VARCHAR(255) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'text',
    question_metadata JSONB DEFAULT '{}',
    answer_text TEXT,
    answer_metadata JSONB DEFAULT '{}',
    ai_analysis JSONB DEFAULT '{}', -- Store AI's analysis of the Q&A
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON conversation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_turn ON conversation_history(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at);

-- Table to store semantic embeddings for deduplication
CREATE TABLE IF NOT EXISTS question_embeddings (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    embedding_vector FLOAT[] NOT NULL, -- Store embedding as array
    similarity_hash VARCHAR(255), -- Simple hash for quick comparison
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_embeddings_session ON question_embeddings(session_id);
CREATE INDEX IF NOT EXISTS idx_question_embeddings_hash ON question_embeddings(similarity_hash);

-- Table to track AI insights and extracted topics
CREATE TABLE IF NOT EXISTS ai_conversation_insights (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'topic_extracted', 'requirement_identified', 'kpi_mentioned', etc.
    insight_value TEXT NOT NULL,
    confidence FLOAT DEFAULT 0.0,
    turn_number INTEGER, -- Which turn this insight came from
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_session ON ai_conversation_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_conversation_insights(insight_type);

-- Table to track conversation state and progress
CREATE TABLE IF NOT EXISTS conversation_state (
    session_id VARCHAR(255) PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    current_turn INTEGER DEFAULT 0,
    topics_covered TEXT[] DEFAULT '{}',
    requirements_identified JSONB DEFAULT '[]',
    kpis_mentioned JSONB DEFAULT '[]',
    stakeholders_identified JSONB DEFAULT '[]',
    pain_points_discussed JSONB DEFAULT '[]',
    completion_percentage FLOAT DEFAULT 0.0,
    ai_confidence FLOAT DEFAULT 0.0,
    last_question_category VARCHAR(100),
    should_continue BOOLEAN DEFAULT true,
    stop_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to update conversation state timestamp
CREATE OR REPLACE FUNCTION update_conversation_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_state_timestamp ON conversation_state;
CREATE TRIGGER trigger_update_conversation_state_timestamp
    BEFORE UPDATE ON conversation_state
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_state_timestamp();

-- Add conversation tracking columns to existing answers table
ALTER TABLE answers 
ADD COLUMN IF NOT EXISTS turn_number INTEGER,
ADD COLUMN IF NOT EXISTS question_text TEXT,
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}';

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_answers_turn_number ON answers(session_id, turn_number);

COMMENT ON TABLE conversation_history IS 'Comprehensive conversation tracking for AI context understanding';
COMMENT ON TABLE question_embeddings IS 'Semantic embeddings for question deduplication';
COMMENT ON TABLE ai_conversation_insights IS 'AI-extracted insights and topics from conversations';
COMMENT ON TABLE conversation_state IS 'Current state and progress tracking for conversations';
