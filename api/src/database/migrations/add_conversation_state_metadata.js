/**
 * Database migration to add metadata column to conversation_state table
 * This column is needed to store survey type and phase tracking information
 */

import { pool } from '../connection.js';

export async function addConversationStateMetadata() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Adding metadata column to conversation_state table...');
    
    // Add the metadata column if it doesn't exist
    await client.query(`
      ALTER TABLE conversation_state 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
    `);
    
    // Create an index on the metadata column for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_state_metadata 
      ON conversation_state USING GIN (metadata)
    `);
    
    // Add comment to the column
    await client.query(`
      COMMENT ON COLUMN conversation_state.metadata IS 
      'JSONB column storing survey type, phase, and other dynamic state information'
    `);
    
    await client.query('COMMIT');
    console.log('✅ Successfully added metadata column to conversation_state table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding metadata column to conversation_state:', error);
    throw error;
  } finally {
    client.release();
  }
}
