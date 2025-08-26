#!/usr/bin/env node
import { pool } from './database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function addUser({ orgSlug, email, password, role }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Validate role
    const validRoles = ['requestor', 'reviewer', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    
    // Get organization
    const orgRes = await client.query('SELECT id FROM organizations WHERE slug = $1', [orgSlug]);
    if (!orgRes.rowCount) throw new Error(`Organization '${orgSlug}' not found`);
    const orgId = orgRes.rows[0].id;
    
    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const userRes = await client.query(
      `INSERT INTO users(email, password_hash, email_verified)
       VALUES ($1, $2, true)
       ON CONFLICT(email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, email`,
      [email.toLowerCase(), passwordHash]
    );
    const user = userRes.rows[0];
    
    // Create identity
    await client.query(
      `INSERT INTO identities(user_id, provider, provider_user_id)
       VALUES ($1, 'local', $2)
       ON CONFLICT (provider, provider_user_id) DO UPDATE SET last_login_at = CURRENT_TIMESTAMP`,
      [user.id, email.toLowerCase()]
    );
    
    // Assign role
    await client.query(
      `INSERT INTO user_org_roles(org_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [orgId, user.id, role]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ User created successfully!`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🎭 Role: ${role}`);
    console.log(`🏢 Organization: ${orgSlug}`);
    console.log(`🔑 Password: ${password}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Usage examples
const args = process.argv.slice(2);
if (args.length !== 4) {
  console.log('Usage: node add-user.js <orgSlug> <email> <password> <role>');
  console.log('Example: node add-user.js acme reviewer@example.com secret123 reviewer');
  console.log('Roles: requestor, reviewer, admin');
  process.exit(1);
}

const [orgSlug, email, password, role] = args;

addUser({ orgSlug, email, password, role })
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
