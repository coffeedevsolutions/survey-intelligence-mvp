#!/usr/bin/env node
import { LocalAuth } from '../auth/auth-local.js';
import { initializeDatabase } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  try {
    console.log('🔧 Initializing database...');
    await initializeDatabase();
    
    console.log('👤 Creating admin user...');
    const auth = new LocalAuth();
    
    const result = await auth.registerOrgAndAdmin({
      slug: 'acme',
      name: 'Acme Inc',
      email: 'admin@example.com',
      password: 'secret123'
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', result.user.email);
    console.log('🏢 Organization:', result.org.name, `(${result.org.slug})`);
    console.log('🔑 Password: secret123');
    console.log('');
    console.log('🚀 You can now login at: http://localhost:5173');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdmin();
