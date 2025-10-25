#!/usr/bin/env node
import { pool } from '../src/database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function changeUserRole({ orgSlug, email, newRole }) {
  const validRoles = ['requestor', 'reviewer', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }
  
  const result = await pool.query(
    `UPDATE user_org_roles 
     SET role = $1
     FROM organizations o, users u
     WHERE user_org_roles.org_id = o.id 
       AND user_org_roles.user_id = u.id
       AND o.slug = $2 
       AND u.email = $3
     RETURNING user_org_roles.role`,
    [newRole, orgSlug, email.toLowerCase()]
  );
  
  if (!result.rowCount) {
    throw new Error(`User ${email} not found in organization ${orgSlug}`);
  }
  
  console.log(`✅ Role updated successfully!`);
  console.log(`📧 User: ${email}`);
  console.log(`🏢 Organization: ${orgSlug}`);
  console.log(`🎭 New Role: ${newRole}`);
}

// Usage
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.log('Usage: node change-role.js <orgSlug> <email> <newRole>');
  console.log('Example: node change-role.js acme user@example.com admin');
  console.log('Roles: requestor, reviewer, admin');
  process.exit(1);
}

const [orgSlug, email, newRole] = args;

changeUserRole({ orgSlug, email, newRole })
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
