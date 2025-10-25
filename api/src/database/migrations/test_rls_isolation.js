/**
 * RLS Isolation Tests
 * 
 * These tests validate that Row-Level Security policies prevent cross-tenant data access.
 * Run these tests after enabling RLS to ensure tenant isolation is working correctly.
 */

import { pool } from '../connection.js';
import crypto from 'crypto';

// Test data setup
const testOrg1 = {
  id: 1,
  slug: 'test-org-1',
  name: 'Test Organization 1'
};

const testOrg2 = {
  id: 2,
  slug: 'test-org-2', 
  name: 'Test Organization 2'
};

const testUser1 = {
  id: 1,
  email: 'user1@test.com',
  password_hash: 'hashed_password_1'
};

const testUser2 = {
  id: 2,
  email: 'user2@test.com',
  password_hash: 'hashed_password_2'
};

/**
 * Setup test data for isolation testing
 */
async function setupTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create test organizations
    await client.query(`
      INSERT INTO organizations (id, slug, name) 
      VALUES ($1, $2, $3), ($4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name
    `, [testOrg1.id, testOrg1.slug, testOrg1.name, testOrg2.id, testOrg2.slug, testOrg2.name]);
    
    // Create test users
    await client.query(`
      INSERT INTO users (id, email, password_hash)
      VALUES ($1, $2, $3), ($4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    `, [testUser1.id, testUser1.email, testUser1.password_hash, testUser2.id, testUser2.email, testUser2.password_hash]);
    
    // Create user-org relationships
    await client.query(`
      INSERT INTO user_org_roles (org_id, user_id, role)
      VALUES ($1, $2, 'admin'), ($3, $4, 'admin')
      ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role
    `, [testOrg1.id, testUser1.id, testOrg2.id, testUser2.id]);
    
    await client.query('COMMIT');
    console.log('✅ Test data setup complete');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clean up in reverse order due to foreign key constraints
    await client.query('DELETE FROM user_org_roles WHERE org_id IN ($1, $2)', [testOrg1.id, testOrg2.id]);
    await client.query('DELETE FROM users WHERE id IN ($1, $2)', [testUser1.id, testUser2.id]);
    await client.query('DELETE FROM organizations WHERE id IN ($1, $2)', [testOrg1.id, testOrg2.id]);
    
    await client.query('COMMIT');
    console.log('✅ Test data cleanup complete');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test sessions table isolation
 */
async function testSessionsIsolation() {
  console.log('🧪 Testing sessions table isolation...');
  
  const client = await pool.connect();
  try {
    // Set context to org1
    await client.query('SET app.current_org_id = $1', [testOrg1.id]);
    
    // Create session for org1
    const sessionId1 = crypto.randomUUID();
    await client.query(`
      INSERT INTO sessions (id, org_id, current_question_id, completed)
      VALUES ($1, $2, 'test', false)
    `, [sessionId1, testOrg1.id]);
    
    // Switch context to org2
    await client.query('SET app.current_org_id = $1', [testOrg2.id]);
    
    // Try to access org1's session - should return 0 rows
    const result = await client.query('SELECT * FROM sessions WHERE id = $1', [sessionId1]);
    
    if (result.rows.length > 0) {
      throw new Error('❌ RLS FAILURE: Org2 can see Org1 sessions');
    }
    
    console.log('✅ Sessions isolation test passed');
  } finally {
    client.release();
  }
}

/**
 * Test answers table isolation
 */
async function testAnswersIsolation() {
  console.log('🧪 Testing answers table isolation...');
  
  const client = await pool.connect();
  try {
    // Set context to org1
    await client.query('SET app.current_org_id = $1', [testOrg1.id]);
    
    // Create session and answer for org1
    const sessionId1 = crypto.randomUUID();
    await client.query(`
      INSERT INTO sessions (id, org_id, current_question_id, completed)
      VALUES ($1, $2, 'test', false)
    `, [sessionId1, testOrg1.id]);
    
    await client.query(`
      INSERT INTO answers (session_id, question_id, text, org_id)
      VALUES ($1, 'q1', 'Answer from org1', $2)
    `, [sessionId1, testOrg1.id]);
    
    // Switch context to org2
    await client.query('SET app.current_org_id = $1', [testOrg2.id]);
    
    // Try to access org1's answers - should return 0 rows
    const result = await client.query('SELECT * FROM answers WHERE session_id = $1', [sessionId1]);
    
    if (result.rows.length > 0) {
      throw new Error('❌ RLS FAILURE: Org2 can see Org1 answers');
    }
    
    console.log('✅ Answers isolation test passed');
  } finally {
    client.release();
  }
}

/**
 * Test facts table isolation
 */
async function testFactsIsolation() {
  console.log('🧪 Testing facts table isolation...');
  
  const client = await pool.connect();
  try {
    // Set context to org1
    await client.query('SET app.current_org_id = $1', [testOrg1.id]);
    
    // Create session and fact for org1
    const sessionId1 = crypto.randomUUID();
    await client.query(`
      INSERT INTO sessions (id, org_id, current_question_id, completed)
      VALUES ($1, $2, 'test', false)
    `, [sessionId1, testOrg1.id]);
    
    await client.query(`
      INSERT INTO facts (session_id, key, value, org_id)
      VALUES ($1, 'test_fact', 'Fact from org1', $2)
    `, [sessionId1, testOrg1.id]);
    
    // Switch context to org2
    await client.query('SET app.current_org_id = $1', [testOrg2.id]);
    
    // Try to access org1's facts - should return 0 rows
    const result = await client.query('SELECT * FROM facts WHERE session_id = $1', [sessionId1]);
    
    if (result.rows.length > 0) {
      throw new Error('❌ RLS FAILURE: Org2 can see Org1 facts');
    }
    
    console.log('✅ Facts isolation test passed');
  } finally {
    client.release();
  }
}

/**
 * Test campaigns table isolation
 */
async function testCampaignsIsolation() {
  console.log('🧪 Testing campaigns table isolation...');
  
  const client = await pool.connect();
  try {
    // Set context to org1
    await client.query('SET app.current_org_id = $1', [testOrg1.id]);
    
    // Create campaign for org1
    const campaignId1 = await client.query(`
      INSERT INTO campaigns (org_id, slug, name, purpose, template_md, created_by)
      VALUES ($1, 'test-campaign-1', 'Test Campaign 1', 'Testing', 'Test template', $2)
      RETURNING id
    `, [testOrg1.id, testUser1.id]);
    
    const campaign1Id = campaignId1.rows[0].id;
    
    // Switch context to org2
    await client.query('SET app.current_org_id = $1', [testOrg2.id]);
    
    // Try to access org1's campaign - should return 0 rows
    const result = await client.query('SELECT * FROM campaigns WHERE id = $1', [campaign1Id]);
    
    if (result.rows.length > 0) {
      throw new Error('❌ RLS FAILURE: Org2 can see Org1 campaigns');
    }
    
    console.log('✅ Campaigns isolation test passed');
  } finally {
    client.release();
  }
}

/**
 * Test AI session logs isolation
 */
async function testAISessionLogsIsolation() {
  console.log('🧪 Testing AI session logs isolation...');
  
  const client = await pool.connect();
  try {
    // Set context to org1
    await client.query('SET app.current_org_id = $1', [testOrg1.id]);
    
    // Create session for org1
    const sessionId1 = crypto.randomUUID();
    await client.query(`
      INSERT INTO sessions (id, org_id, current_question_id, completed)
      VALUES ($1, $2, 'test', false)
    `, [sessionId1, testOrg1.id]);
    
    // Create AI session log for org1
    await client.query(`
      INSERT INTO ai_session_logs (session_id, ai_action, ai_response, estimated_cost_cents)
      VALUES ($1, 'question_generation', '{"test": "response"}', 10)
    `, [sessionId1]);
    
    // Switch context to org2
    await client.query('SET app.current_org_id = $1', [testOrg2.id]);
    
    // Try to access org1's AI logs - should return 0 rows
    const result = await client.query('SELECT * FROM ai_session_logs WHERE session_id = $1', [sessionId1]);
    
    if (result.rows.length > 0) {
      throw new Error('❌ RLS FAILURE: Org2 can see Org1 AI session logs');
    }
    
    console.log('✅ AI session logs isolation test passed');
  } finally {
    client.release();
  }
}

/**
 * Run all isolation tests
 */
async function runIsolationTests() {
  console.log('🚀 Starting RLS isolation tests...');
  
  try {
    await setupTestData();
    
    await testSessionsIsolation();
    await testAnswersIsolation();
    await testFactsIsolation();
    await testCampaignsIsolation();
    await testAISessionLogsIsolation();
    
    console.log('🎉 All RLS isolation tests passed!');
    console.log('✅ Tenant isolation is working correctly');
    
  } catch (error) {
    console.error('❌ RLS isolation test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestData();
  }
}

/**
 * Test that RLS policies are enabled
 */
async function testRLSEnabled() {
  console.log('🧪 Testing that RLS is enabled...');
  
  const client = await pool.connect();
  try {
    // Check if RLS is enabled on key tables
    const tables = ['sessions', 'answers', 'facts', 'campaigns', 'ai_session_logs'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = $1
      `, [table]);
      
      if (result.rows.length === 0) {
        throw new Error(`❌ Table ${table} not found`);
      }
      
      if (!result.rows[0].relrowsecurity) {
        throw new Error(`❌ RLS not enabled on table ${table}`);
      }
    }
    
    console.log('✅ RLS is enabled on all key tables');
  } finally {
    client.release();
  }
}

// Export functions for use in other test files
export {
  runIsolationTests,
  testRLSEnabled,
  setupTestData,
  cleanupTestData
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIsolationTests()
    .then(() => {
      console.log('✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}
