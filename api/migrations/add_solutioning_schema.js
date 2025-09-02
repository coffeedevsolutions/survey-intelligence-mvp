import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Add solutioning schema to the database
 */
export async function addSolutioningSchema() {
  console.log('🔧 Adding solutioning schema...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_solutioning_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the entire SQL file at once to handle complex statements like functions
    try {
      await pool.query(sql);
      console.log('✅ Solutioning schema added successfully');
    } catch (error) {
      // If we get "already exists" errors, that's usually okay
      if (error.code === '42P07' || error.code === '42710' || error.message.includes('already exists')) {
        console.log(`⚠️ Schema elements already exist: ${error.message}`);
        console.log('✅ Solutioning schema validation completed');
      } else {
        console.error(`❌ Error executing schema:`, error.message);
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error adding solutioning schema:', error);
    throw error;
  }
}
