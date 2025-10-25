/**
 * Migration: Add analytics favorites functionality
 */

import { pool } from '../connection.js';
import fs from 'fs';
import path from 'path';

export async function up() {
  try {
    console.log('🔄 Adding analytics favorites table...');
    
    // Read and execute the SQL file
    const sqlPath = path.join(process.cwd(), 'migrations/add_analytics_favorites.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Analytics favorites table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating analytics favorites table:', error);
    throw error;
  }
}

export async function down() {
  try {
    console.log('🔄 Dropping analytics favorites table...');
    
    await pool.query('DROP TABLE IF EXISTS analytics_favorites CASCADE');
    
    console.log('✅ Analytics favorites table dropped successfully');
    
  } catch (error) {
    console.error('❌ Error dropping analytics favorites table:', error);
    throw error;
  }
}
