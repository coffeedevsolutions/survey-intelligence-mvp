/**
 * Database migration to add AI features
 * Run this script to add AI configuration tables to your existing database
 */

import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAIMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting AI features migration...');
    
    // Read and execute the AI schema
    const schemaPath = path.join(__dirname, '../../database_ai_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by statements and execute one by one
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await client.query(statement);
    }
    
    // Create default AI configurations for existing flows
    console.log('🔧 Creating default AI configurations for existing flows...');
    
    await client.query(`
      INSERT INTO ai_flow_configs (flow_id, enable_adaptive_questions, enable_smart_fact_extraction)
      SELECT id, true, true
      FROM survey_flows
      WHERE use_ai = true
      AND id NOT IN (SELECT flow_id FROM ai_flow_configs)
    `);
    
    // Update existing flows to reference AI configs
    await client.query(`
      UPDATE survey_flows 
      SET ai_config_id = afc.id,
          ai_customization_level = 'standard'
      FROM ai_flow_configs afc
      WHERE survey_flows.id = afc.flow_id
      AND survey_flows.ai_config_id IS NULL
    `);
    
    await client.query('COMMIT');
    console.log('✅ AI features migration completed successfully!');
    
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
  runAIMigration()
    .then(() => {
      console.log('Migration completed. You can now use AI features!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runAIMigration };
