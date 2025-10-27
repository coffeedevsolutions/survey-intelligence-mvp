/**
 * Script to add metadata column to conversation_state table
 */
import { pool } from '../src/database/connection.js';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  console.log('🔄 Adding metadata column to conversation_state table...');
  
  await client.query(`
    ALTER TABLE conversation_state 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
  `);
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_conversation_state_metadata 
    ON conversation_state USING GIN (metadata)
  `);
  
  await client.query('COMMIT');
  console.log('✅ Successfully added metadata column to conversation_state table');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('❌ Error adding metadata column:', error.message);
  throw error;
} finally {
  client.release();
  await pool.end();
  process.exit(0);
}
