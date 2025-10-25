/**
 * Database migration to add comprehensive conversation tracking
 */

import { pool } from '../connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function addConversationTracking() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Adding conversation tracking tables...');
    
    // Create tables directly to avoid SQL parsing issues
    
    // 1. Create conversation_history table
    await client.query(`
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
        ai_analysis JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Create indexes for conversation_history
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON conversation_history(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversation_history_turn ON conversation_history(session_id, turn_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at)`);
    
    // 3. Create question_embeddings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS question_embeddings (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        embedding_vector FLOAT[] NOT NULL,
        similarity_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 4. Create indexes for question_embeddings
    await client.query(`CREATE INDEX IF NOT EXISTS idx_question_embeddings_session ON question_embeddings(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_question_embeddings_hash ON question_embeddings(similarity_hash)`);
    
    // 5. Create ai_conversation_insights table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_conversation_insights (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        insight_type VARCHAR(50) NOT NULL,
        insight_value TEXT NOT NULL,
        confidence FLOAT DEFAULT 0.0,
        turn_number INTEGER,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 6. Create indexes for ai_conversation_insights
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_insights_session ON ai_conversation_insights(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_conversation_insights(insight_type)`);
    
    // 7. Create conversation_state table
    await client.query(`
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
      )
    `);
    
    // 8. Add columns to existing answers table if they don't exist
    try {
      await client.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS turn_number INTEGER`);
      await client.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS question_text TEXT`);
      await client.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_answers_turn_number ON answers(session_id, turn_number)`);
    } catch (error) {
      console.log('Note: Some answer table modifications may have been skipped:', error.message);
    }
    
    // Add some helpful functions
    await client.query(`
      -- Function to get conversation summary
      CREATE OR REPLACE FUNCTION get_conversation_summary(p_session_id VARCHAR)
      RETURNS TABLE(
        total_turns INTEGER,
        completion_percentage FLOAT,
        topics_covered TEXT[],
        insights_count INTEGER,
        last_activity TIMESTAMP
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COALESCE(cs.current_turn, 0) as total_turns,
          COALESCE(cs.completion_percentage, 0.0) as completion_percentage,
          COALESCE(cs.topics_covered, '{}') as topics_covered,
          COUNT(aci.id)::INTEGER as insights_count,
          COALESCE(cs.updated_at, cs.created_at) as last_activity
        FROM conversation_state cs
        LEFT JOIN ai_conversation_insights aci ON aci.session_id = p_session_id
        WHERE cs.session_id = p_session_id
        GROUP BY cs.session_id, cs.current_turn, cs.completion_percentage, 
                 cs.topics_covered, cs.updated_at, cs.created_at;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      -- Function to check if session has conversation tracking
      CREATE OR REPLACE FUNCTION has_conversation_tracking(p_session_id VARCHAR)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS(SELECT 1 FROM conversation_state WHERE session_id = p_session_id);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    console.log('✅ Conversation tracking tables added successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding conversation tracking:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to initialize conversation tracking for existing sessions
export async function initializeExistingSessions() {
  const client = await pool.connect();
  try {
    console.log('🔄 Initializing conversation tracking for existing sessions...');
    
    // Get sessions without conversation tracking
    const sessionsResult = await client.query(`
      SELECT s.id 
      FROM sessions s 
      LEFT JOIN conversation_state cs ON s.id = cs.session_id
      WHERE cs.session_id IS NULL
        AND s.created_at > NOW() - INTERVAL '30 days'
      LIMIT 100
    `);
    
    if (sessionsResult.rows.length === 0) {
      console.log('✅ No sessions need initialization');
      return;
    }
    
    console.log(`📝 Initializing ${sessionsResult.rows.length} sessions...`);
    
    for (const session of sessionsResult.rows) {
      await client.query(`
        INSERT INTO conversation_state (session_id, current_turn, completion_percentage, should_continue)
        VALUES ($1, 0, 0.0, true)
        ON CONFLICT (session_id) DO NOTHING
      `, [session.id]);
    }
    
    console.log('✅ Existing sessions initialized');
    
  } catch (error) {
    console.error('❌ Error initializing existing sessions:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  addConversationTracking,
  initializeExistingSessions
};
