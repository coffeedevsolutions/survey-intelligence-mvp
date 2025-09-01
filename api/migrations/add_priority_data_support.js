import { pool } from '../config/database.js';

/**
 * Migration: Add priority_data support for new prioritization frameworks
 * This adds a priority_data JSONB column to store framework-specific priority information
 */
export async function addPriorityDataSupport() {
  try {
    console.log('Adding priority_data column to project_briefs table...');
    
    // Add priority_data column to project_briefs table
    await pool.query(`
      ALTER TABLE project_briefs 
      ADD COLUMN IF NOT EXISTS priority_data JSONB DEFAULT NULL
    `);
    
    // Create an index on priority_data for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_briefs_priority_data 
      ON project_briefs USING GIN (priority_data)
    `);
    
    // Migrate existing priority values to the new format
    console.log('Migrating existing priority values...');
    await pool.query(`
      UPDATE project_briefs 
      SET priority_data = jsonb_build_object('value', priority)
      WHERE priority IS NOT NULL AND priority_data IS NULL
    `);
    
    console.log('Priority data support migration completed successfully');
    
  } catch (error) {
    console.error('Error in priority data migration:', error);
    throw error;
  }
}

// Auto-run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addPriorityDataSupport()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
