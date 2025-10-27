-- Add metadata column to conversation_state table
-- This column stores survey type and phase tracking information

-- Add the metadata column if it doesn't exist
ALTER TABLE conversation_state 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create an index on the metadata column for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_state_metadata ON conversation_state USING GIN (metadata);

COMMENT ON COLUMN conversation_state.metadata IS 'JSONB column storing survey type, phase, and other dynamic state information';
