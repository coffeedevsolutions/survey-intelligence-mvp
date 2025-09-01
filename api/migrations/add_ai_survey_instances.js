/**
 * Migration: Add AI Survey Instances support
 * Adds tables to support optimized AI survey instances with dynamic question generation
 */

import { pool } from '../config/database.js';

export async function up() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create ai_survey_instances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_survey_instances (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        ai_template_id INTEGER NOT NULL REFERENCES ai_survey_templates(id) ON DELETE CASCADE,
        custom_context JSONB DEFAULT '{}',
        questions_asked INTEGER DEFAULT 0,
        facts_gathered JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(session_id)
      )
    `);
    
    // Create ai_question_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_question_history (
        id SERIAL PRIMARY KEY,
        ai_instance_id INTEGER NOT NULL REFERENCES ai_survey_instances(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'text',
        question_intent TEXT,
        follow_up_reasoning TEXT,
        answer_text TEXT,
        answer_confidence DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_survey_instances_session 
      ON ai_survey_instances(session_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_survey_instances_template 
      ON ai_survey_instances(ai_template_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_question_history_instance 
      ON ai_question_history(ai_instance_id)
    `);
    
    // Add trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_ai_survey_instances_updated_at ON ai_survey_instances
    `);
    
    await client.query(`
      CREATE TRIGGER update_ai_survey_instances_updated_at 
      BEFORE UPDATE ON ai_survey_instances 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query('COMMIT');
    console.log('✅ Successfully added AI survey instances tables');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding AI survey instances tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Drop tables in reverse order (respecting foreign keys)
    await client.query('DROP TABLE IF EXISTS ai_question_history CASCADE');
    await client.query('DROP TABLE IF EXISTS ai_survey_instances CASCADE');
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    
    await client.query('COMMIT');
    console.log('✅ Successfully removed AI survey instances tables');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error removing AI survey instances tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Auto-run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up().catch(console.error);
}
