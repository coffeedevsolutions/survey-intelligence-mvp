/**
 * Database Connection Management
 * 
 * Handles PostgreSQL connection pooling and configuration
 */

import { Pool } from 'pg';
import { getConfig } from '../config/index.js';

// Connection pool configuration
const poolConfig = {
  connectionString: getConfig('DATABASE_URL'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Only use SSL in production
  // Fallback to individual connection params for local development
  host: getConfig('DB_HOST'),
  port: getConfig('DB_PORT'),
  database: getConfig('DB_NAME'),
  user: getConfig('DB_USER'),
  password: getConfig('DB_PASSWORD'),
  application_name: 'ai-survey-api',
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', (client) => {
  console.log('🔌 New database client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err);
});

pool.on('remove', (client) => {
  console.log('🔌 Database client removed from pool');
});

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closePool() {
  try {
    await pool.end();
    console.log('🔌 Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
}

/**
 * Execute a query with error handling
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed:', { text: text.substring(0, 50) + '...', duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('❌ Query error:', { text: text.substring(0, 50) + '...', error: error.message });
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for manual transaction management
 */
export async function getClient() {
  return await pool.connect();
}

export default pool;
