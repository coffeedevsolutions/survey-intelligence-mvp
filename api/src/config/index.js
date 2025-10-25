/**
 * Configuration Management
 * 
 * Centralized configuration loading and validation
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.join(__dirname, '..', '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env')
];

const envPath = envPaths.find(p => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath, encoding: 'utf8' });
}

// Configuration schema
const CONFIG_SCHEMA = {
  // Server
  PORT: { type: 'number', default: 8787 },
  HOST: { type: 'string', default: '0.0.0.0' },
  NODE_ENV: { type: 'string', default: 'development' },
  
  // Database
  DATABASE_URL: { type: 'string', required: true },
  DB_HOST: { type: 'string', default: 'localhost' },
  DB_PORT: { type: 'number', default: 5432 },
  DB_NAME: { type: 'string', default: 'survey_db' },
  DB_USER: { type: 'string', default: 'postgres' },
  DB_PASSWORD: { type: 'string', default: 'password' },
  
  // Auth
  AUTH_PROVIDER: { type: 'string', default: 'local', enum: ['local', 'auth0'] },
  JWT_SECRET: { type: 'string', required: true },
  
  // Auth0 (if using)
  AUTH0_SECRET: { type: 'string' },
  AUTH0_BASE_URL: { type: 'string' },
  AUTH0_ISSUER_BASE_URL: { type: 'string' },
  AUTH0_CLIENT_ID: { type: 'string' },
  AUTH0_CLIENT_SECRET: { type: 'string' },
  
  // AI
  OPENAI_API_KEY: { type: 'string' },
  AI_DEFAULT_MODEL: { type: 'string', default: 'gpt-4o-mini' },
  AI_MAX_TOKENS_PER_SESSION: { type: 'number', default: 10000 },
  AI_CONFIDENCE_THRESHOLD: { type: 'number', default: 0.7 },
  
  // Email
  SENDGRID_API_KEY: { type: 'string' },
  FROM_EMAIL: { type: 'string' },
  
  // CORS
  CLIENT_ORIGIN: { type: 'string' },
  WEB_ORIGIN: { type: 'string', default: 'http://localhost:5173' },
  
  // Observability
  OTEL_SERVICE_NAME: { type: 'string', default: 'ai-survey-api' },
  OTEL_SERVICE_VERSION: { type: 'string', default: '1.0.0' },
  OTEL_EXPORTER_OTLP_ENDPOINT: { type: 'string', default: 'http://localhost:4318' },
  OTEL_SAMPLING_RATIO: { type: 'number', default: 1.0 },
  OTEL_ENABLE_METRICS: { type: 'boolean', default: false },
  OTEL_ENABLE_TRACING: { type: 'boolean', default: true },
  
  // Enterprise features
  SOC2_ENABLED: { type: 'boolean', default: false },
  MFA_ENABLED: { type: 'boolean', default: false },
  SCIM_ENABLED: { type: 'boolean', default: false },
  COST_OPT_ENABLED: { type: 'boolean', default: false },
  ENCRYPTION_MODE: { type: 'string', default: 'local', enum: ['local', 'kms'] },
  
  // AWS KMS (if using)
  AWS_REGION: { type: 'string' },
  AWS_ACCESS_KEY_ID: { type: 'string' },
  AWS_SECRET_ACCESS_KEY: { type: 'string' },
  AWS_KMS_KEY_ID: { type: 'string' },
  
  // Azure Key Vault (if using)
  AZURE_KEY_VAULT_URL: { type: 'string' },
  AZURE_CLIENT_ID: { type: 'string' },
  AZURE_CLIENT_SECRET: { type: 'string' },
  AZURE_TENANT_ID: { type: 'string' },
  
  // Google Cloud KMS (if using)
  GOOGLE_CLOUD_PROJECT_ID: { type: 'string' },
  GOOGLE_CLOUD_KEY_RING: { type: 'string' },
  GOOGLE_CLOUD_KEY_NAME: { type: 'string' },
};

/**
 * Validate configuration against schema
 */
export function validateConfig() {
  const config = {};
  const errors = [];
  
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const value = process.env[key];
    
    // Check required fields
    if (schema.required && !value) {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }
    
    // Use default if not provided
    if (!value && schema.default !== undefined) {
      config[key] = schema.default;
      continue;
    }
    
    // Skip if not provided and not required
    if (!value) {
      continue;
    }
    
    // Type conversion and validation
    let convertedValue = value;
    
    switch (schema.type) {
      case 'number':
        convertedValue = Number(value);
        if (isNaN(convertedValue)) {
          errors.push(`Invalid number for ${key}: ${value}`);
          continue;
        }
        break;
      case 'boolean':
        convertedValue = value.toLowerCase() === 'true';
        break;
      case 'string':
        // No conversion needed
        break;
    }
    
    // Enum validation
    if (schema.enum && !schema.enum.includes(convertedValue)) {
      errors.push(`Invalid value for ${key}: ${value}. Must be one of: ${schema.enum.join(', ')}`);
      continue;
    }
    
    config[key] = convertedValue;
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Configuration validation failed');
  }
  
  return config;
}

/**
 * Get configuration value
 */
export function getConfig(key) {
  return process.env[key];
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature) {
  return process.env[`${feature}_ENABLED`] === 'true';
}

export default validateConfig();
