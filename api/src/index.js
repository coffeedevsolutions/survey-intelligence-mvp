/**
 * API Entry Point
 * 
 * Clean startup sequence with proper initialization order:
 * 1. Load configuration
 * 2. Initialize observability
 * 3. Initialize database
 * 4. Start server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from api folder first, then root
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env')
];

const envPath = envPaths.find(p => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath, encoding: 'utf8' });
  console.log(`📄 Loaded environment from: ${envPath}`);
} else {
  dotenv.config();
  console.log('📄 Loaded environment from default location');
}

// Initialize observability first (before any other imports)
// import './config/observability.js'; // Temporarily disabled due to CommonJS/ESM compatibility issues

// Import configuration
import { validateConfig } from './config/index.js';

// Import app and database
import app from './app.js';
import { initializeDatabase } from './database/schema.js';

// Configuration validation
const config = validateConfig();
console.log('✅ Configuration validated');

// Initialize database
console.log('🔧 Initializing database...');
await initializeDatabase();
console.log('✅ Database initialized');

// Start server
const PORT = process.env.PORT || 8787;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 API server listening on ${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Auth provider: ${process.env.AUTH_PROVIDER || 'local'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
