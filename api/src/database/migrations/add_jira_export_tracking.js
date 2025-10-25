import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function addJiraExportTracking(pool) {
  try {
    console.log('🔄 Adding JIRA export tracking...');
    
    const sqlPath = join(__dirname, 'add_jira_export_tracking.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ JIRA export tracking added successfully');
  } catch (error) {
    console.error('❌ Error adding JIRA export tracking:', error);
    throw error;
  }
}
