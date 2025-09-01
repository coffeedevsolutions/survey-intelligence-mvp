import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Add support for brief comments and resubmit functionality
 */
export async function addCommentsAndResubmitSupport() {
  try {
    console.log('🔄 Adding comments and resubmit support...');
    
    // Execute individual migration statements
    
    // Add email column to sessions
    await pool.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)
    `);
    
    // Add index for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_email 
      ON sessions (user_email)
    `);
    
    // Create table to track brief comments from reviewers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brief_comments (
        id BIGSERIAL PRIMARY KEY,
        brief_id BIGINT NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
        org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_brief_comments_brief_id 
      ON brief_comments (brief_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_brief_comments_org_id 
      ON brief_comments (org_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_brief_comments_reviewer_id 
      ON brief_comments (reviewer_id)
    `);
    
    // Create table to track resubmit requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brief_resubmit_requests (
        id BIGSERIAL PRIMARY KEY,
        brief_id BIGINT NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email VARCHAR(255) NOT NULL,
        comment_text TEXT NOT NULL,
        request_status VARCHAR(50) DEFAULT 'sent',
        email_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_responded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resubmit_requests_brief_id 
      ON brief_resubmit_requests (brief_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resubmit_requests_session_id 
      ON brief_resubmit_requests (session_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resubmit_requests_user_email 
      ON brief_resubmit_requests (user_email)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resubmit_requests_status 
      ON brief_resubmit_requests (request_status)
    `);
    
    // Add flag to track if brief has resubmit requests
    await pool.query(`
      ALTER TABLE project_briefs 
      ADD COLUMN IF NOT EXISTS has_resubmit_requests BOOLEAN DEFAULT FALSE
    `);
    
    // Create update trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_brief_resubmit_flag()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE project_briefs 
        SET has_resubmit_requests = TRUE 
        WHERE id = NEW.brief_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    // Create trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS brief_resubmit_flag_trigger ON brief_resubmit_requests
    `);
    
    await pool.query(`
      CREATE TRIGGER brief_resubmit_flag_trigger
        AFTER INSERT ON brief_resubmit_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_brief_resubmit_flag()
    `);
    
    console.log('✅ Comments and resubmit support added successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error adding comments and resubmit support:', error);
    throw error;
  }
}

// Add helper functions for comments and resubmit operations
export async function addBriefComment(briefId, reviewerId, orgId, commentText) {
  const result = await pool.query(`
    INSERT INTO brief_comments (brief_id, reviewer_id, org_id, comment_text)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [briefId, reviewerId, orgId, commentText]);
  
  return result.rows[0];
}

export async function getBriefComments(briefId, orgId) {
  const result = await pool.query(`
    SELECT bc.*, u.email as reviewer_email
    FROM brief_comments bc
    JOIN users u ON bc.reviewer_id = u.id
    WHERE bc.brief_id = $1 AND bc.org_id = $2
    ORDER BY bc.created_at ASC
  `, [briefId, orgId]);
  
  return result.rows;
}

export async function createResubmitRequest(briefId, sessionId, reviewerId, orgId, userEmail, commentText) {
  const result = await pool.query(`
    INSERT INTO brief_resubmit_requests 
    (brief_id, session_id, reviewer_id, org_id, user_email, comment_text)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [briefId, sessionId, reviewerId, orgId, userEmail, commentText]);
  
  return result.rows[0];
}

export async function getBriefResubmitRequests(briefId, orgId) {
  const result = await pool.query(`
    SELECT brr.*, u.email as reviewer_email
    FROM brief_resubmit_requests brr
    JOIN users u ON brr.reviewer_id = u.id
    WHERE brr.brief_id = $1 AND brr.org_id = $2
    ORDER BY brr.created_at DESC
  `, [briefId, orgId]);
  
  return result.rows;
}

export async function getSessionEmail(sessionId) {
  const result = await pool.query(`
    SELECT user_email
    FROM sessions
    WHERE id = $1
  `, [sessionId]);
  
  return result.rows[0]?.user_email || null;
}

// If run directly, execute the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  addCommentsAndResubmitSupport()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
