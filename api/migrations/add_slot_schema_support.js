/**
 * Migration to add slot schema support for AI brief generation
 */

import { pool } from '../config/database.js';

export async function addSlotSchemaSupport() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Adding slot schema support...');
    
    // Add slot_schema column to brief_templates table
    await client.query(`
      ALTER TABLE brief_templates 
      ADD COLUMN IF NOT EXISTS slot_schema JSONB DEFAULT NULL
    `);
    
    // Create slot_states table for tracking slot completion per session
    await client.query(`
      CREATE TABLE IF NOT EXISTS slot_states (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
        slot_name VARCHAR(255) NOT NULL,
        slot_value TEXT,
        confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
        provenance JSONB DEFAULT '[]'::jsonb,
        last_asked TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, slot_name)
      )
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_slot_states_session_id 
      ON slot_states(session_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_slot_states_slot_name 
      ON slot_states(slot_name)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_slot_states_confidence 
      ON slot_states(confidence)
    `);
    
    // Create a table for question templates (optional, for future extensibility)
    await client.query(`
      CREATE TABLE IF NOT EXISTS question_templates (
        id BIGSERIAL PRIMARY KEY,
        template_id VARCHAR(255) UNIQUE NOT NULL,
        org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        slot_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
        scope VARCHAR(50) DEFAULT 'broad' CHECK (scope IN ('broad', 'narrow', 'confirm')),
        dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
        max_tokens INTEGER DEFAULT 150,
        priority INTEGER DEFAULT 5,
        is_active BOOLEAN DEFAULT true,
        created_by BIGINT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add session metadata for slot-based surveys
    await client.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS slot_schema_version VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS total_slots INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_slots INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_slot_update TIMESTAMP DEFAULT NULL
    `);
    
    // Create a view for slot completion status
    await client.query(`
      CREATE OR REPLACE VIEW slot_completion_status AS
      SELECT 
        s.id as session_id,
        s.completed as survey_completed,
        s.slot_schema_version,
        s.total_slots,
        s.completed_slots,
        COALESCE(s.completed_slots::float / NULLIF(s.total_slots, 0), 0) as completion_percentage,
        COUNT(ss.id) as active_slots,
        COUNT(CASE WHEN ss.confidence >= 0.7 THEN 1 END) as high_confidence_slots,
        MAX(ss.updated_at) as last_slot_update
      FROM sessions s
      LEFT JOIN slot_states ss ON s.id = ss.session_id
      WHERE s.org_id IS NOT NULL
      GROUP BY s.id, s.completed, s.slot_schema_version, s.total_slots, s.completed_slots
    `);
    
    await client.query('COMMIT');
    console.log('✅ Slot schema support added successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addSlotSchemaSupport()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
