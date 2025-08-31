/**
 * Migration to add AI Survey Templates functionality
 */

import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAISurveyTemplatesMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting AI Survey Templates migration...');
    
    // Read and execute the AI survey templates schema
    const schemaPath = path.join(__dirname, '../../database_ai_survey_templates.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by statements and execute one by one
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.length > 10) { // Skip very short statements
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await client.query(statement);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ AI Survey Templates migration completed successfully!');
    
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
  runAISurveyTemplatesMigration()
    .then(() => {
      console.log('Migration completed. AI Survey Templates are now available!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runAISurveyTemplatesMigration };
