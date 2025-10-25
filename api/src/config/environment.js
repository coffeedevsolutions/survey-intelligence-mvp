/**
 * Environment Variables Schema
 * 
 * Documents all environment variables used by the application
 */

export const ENVIRONMENT_VARIABLES = {
  // Server Configuration
  PORT: {
    description: 'Port number for the API server',
    type: 'number',
    default: 8787,
    required: false
  },
  HOST: {
    description: 'Host address for the API server',
    type: 'string',
    default: '0.0.0.0',
    required: false
  },
  NODE_ENV: {
    description: 'Node environment (development, staging, production)',
    type: 'string',
    default: 'development',
    required: false
  },
  
  // Database Configuration
  DATABASE_URL: {
    description: 'Complete database connection URL (PostgreSQL)',
    type: 'string',
    required: true,
    example: 'postgresql://user:password@host:port/database'
  },
  DB_HOST: {
    description: 'Database host (fallback if DATABASE_URL not provided)',
    type: 'string',
    default: 'localhost',
    required: false
  },
  DB_PORT: {
    description: 'Database port (fallback if DATABASE_URL not provided)',
    type: 'number',
    default: 5432,
    required: false
  },
  DB_NAME: {
    description: 'Database name (fallback if DATABASE_URL not provided)',
    type: 'string',
    default: 'survey_db',
    required: false
  },
  DB_USER: {
    description: 'Database user (fallback if DATABASE_URL not provided)',
    type: 'string',
    default: 'postgres',
    required: false
  },
  DB_PASSWORD: {
    description: 'Database password (fallback if DATABASE_URL not provided)',
    type: 'string',
    default: 'password',
    required: false
  },
  
  // Authentication Configuration
  AUTH_PROVIDER: {
    description: 'Authentication provider (local or auth0)',
    type: 'string',
    default: 'local',
    enum: ['local', 'auth0'],
    required: false
  },
  JWT_SECRET: {
    description: 'Secret key for JWT token signing (required for local auth)',
    type: 'string',
    required: true
  },
  
  // Auth0 Configuration (if AUTH_PROVIDER=auth0)
  AUTH0_SECRET: {
    description: 'Auth0 application secret',
    type: 'string',
    required: false
  },
  AUTH0_BASE_URL: {
    description: 'Auth0 base URL (e.g., https://your-app.com)',
    type: 'string',
    required: false
  },
  AUTH0_ISSUER_BASE_URL: {
    description: 'Auth0 issuer base URL (e.g., https://your-domain.auth0.com)',
    type: 'string',
    required: false
  },
  AUTH0_CLIENT_ID: {
    description: 'Auth0 application client ID',
    type: 'string',
    required: false
  },
  AUTH0_CLIENT_SECRET: {
    description: 'Auth0 application client secret',
    type: 'string',
    required: false
  },
  
  // AI Configuration
  OPENAI_API_KEY: {
    description: 'OpenAI API key for AI features',
    type: 'string',
    required: false
  },
  AI_DEFAULT_MODEL: {
    description: 'Default AI model to use',
    type: 'string',
    default: 'gpt-4o-mini',
    required: false
  },
  AI_MAX_TOKENS_PER_SESSION: {
    description: 'Maximum tokens per AI session',
    type: 'number',
    default: 10000,
    required: false
  },
  AI_CONFIDENCE_THRESHOLD: {
    description: 'AI confidence threshold (0-1)',
    type: 'number',
    default: 0.7,
    required: false
  },
  
  // Email Configuration
  SENDGRID_API_KEY: {
    description: 'SendGrid API key for email functionality',
    type: 'string',
    required: false
  },
  FROM_EMAIL: {
    description: 'Default from email address',
    type: 'string',
    required: false
  },
  
  // CORS Configuration
  CLIENT_ORIGIN: {
    description: 'Comma-separated list of allowed client origins',
    type: 'string',
    required: false
  },
  WEB_ORIGIN: {
    description: 'Web application origin URL',
    type: 'string',
    default: 'http://localhost:5173',
    required: false
  },
  
  // Observability Configuration
  OTEL_SERVICE_NAME: {
    description: 'OpenTelemetry service name',
    type: 'string',
    default: 'ai-survey-api',
    required: false
  },
  OTEL_SERVICE_VERSION: {
    description: 'OpenTelemetry service version',
    type: 'string',
    default: '1.0.0',
    required: false
  },
  OTEL_EXPORTER_OTLP_ENDPOINT: {
    description: 'OpenTelemetry OTLP exporter endpoint',
    type: 'string',
    default: 'http://localhost:4318',
    required: false
  },
  OTEL_SAMPLING_RATIO: {
    description: 'OpenTelemetry sampling ratio (0-1)',
    type: 'number',
    default: 1.0,
    required: false
  },
  OTEL_ENABLE_METRICS: {
    description: 'Enable OpenTelemetry metrics',
    type: 'boolean',
    default: false,
    required: false
  },
  OTEL_ENABLE_TRACING: {
    description: 'Enable OpenTelemetry tracing',
    type: 'boolean',
    default: true,
    required: false
  },
  
  // Enterprise Features
  SOC2_ENABLED: {
    description: 'Enable SOC2 compliance features',
    type: 'boolean',
    default: false,
    required: false
  },
  MFA_ENABLED: {
    description: 'Enable multi-factor authentication',
    type: 'boolean',
    default: false,
    required: false
  },
  SCIM_ENABLED: {
    description: 'Enable SCIM user provisioning',
    type: 'boolean',
    default: false,
    required: false
  },
  COST_OPT_ENABLED: {
    description: 'Enable cost optimization features',
    type: 'boolean',
    default: false,
    required: false
  },
  ENCRYPTION_MODE: {
    description: 'Encryption mode (local or kms)',
    type: 'string',
    default: 'local',
    enum: ['local', 'kms'],
    required: false
  },
  
  // AWS KMS Configuration (if ENCRYPTION_MODE=kms)
  AWS_REGION: {
    description: 'AWS region for KMS',
    type: 'string',
    required: false
  },
  AWS_ACCESS_KEY_ID: {
    description: 'AWS access key ID',
    type: 'string',
    required: false
  },
  AWS_SECRET_ACCESS_KEY: {
    description: 'AWS secret access key',
    type: 'string',
    required: false
  },
  AWS_KMS_KEY_ID: {
    description: 'AWS KMS key ID',
    type: 'string',
    required: false
  },
  
  // Azure Key Vault Configuration (if ENCRYPTION_MODE=kms)
  AZURE_KEY_VAULT_URL: {
    description: 'Azure Key Vault URL',
    type: 'string',
    required: false
  },
  AZURE_CLIENT_ID: {
    description: 'Azure client ID',
    type: 'string',
    required: false
  },
  AZURE_CLIENT_SECRET: {
    description: 'Azure client secret',
    type: 'string',
    required: false
  },
  AZURE_TENANT_ID: {
    description: 'Azure tenant ID',
    type: 'string',
    required: false
  },
  
  // Google Cloud KMS Configuration (if ENCRYPTION_MODE=kms)
  GOOGLE_CLOUD_PROJECT_ID: {
    description: 'Google Cloud project ID',
    type: 'string',
    required: false
  },
  GOOGLE_CLOUD_KEY_RING: {
    description: 'Google Cloud KMS key ring',
    type: 'string',
    required: false
  },
  GOOGLE_CLOUD_KEY_NAME: {
    description: 'Google Cloud KMS key name',
    type: 'string',
    required: false
  }
};

/**
 * Generate .env.example content
 */
export function generateEnvExample() {
  let content = '# AI Survey API Environment Variables\n\n';
  
  const categories = {
    'Server Configuration': ['PORT', 'HOST', 'NODE_ENV'],
    'Database Configuration': ['DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'],
    'Authentication Configuration': ['AUTH_PROVIDER', 'JWT_SECRET', 'AUTH0_SECRET', 'AUTH0_BASE_URL', 'AUTH0_ISSUER_BASE_URL', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'],
    'AI Configuration': ['OPENAI_API_KEY', 'AI_DEFAULT_MODEL', 'AI_MAX_TOKENS_PER_SESSION', 'AI_CONFIDENCE_THRESHOLD'],
    'Email Configuration': ['SENDGRID_API_KEY', 'FROM_EMAIL'],
    'CORS Configuration': ['CLIENT_ORIGIN', 'WEB_ORIGIN'],
    'Observability Configuration': ['OTEL_SERVICE_NAME', 'OTEL_SERVICE_VERSION', 'OTEL_EXPORTER_OTLP_ENDPOINT', 'OTEL_SAMPLING_RATIO', 'OTEL_ENABLE_METRICS', 'OTEL_ENABLE_TRACING'],
    'Enterprise Features': ['SOC2_ENABLED', 'MFA_ENABLED', 'SCIM_ENABLED', 'COST_OPT_ENABLED', 'ENCRYPTION_MODE'],
    'AWS KMS Configuration': ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_KMS_KEY_ID'],
    'Azure Key Vault Configuration': ['AZURE_KEY_VAULT_URL', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'],
    'Google Cloud KMS Configuration': ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_CLOUD_KEY_RING', 'GOOGLE_CLOUD_KEY_NAME']
  };
  
  for (const [category, vars] of Object.entries(categories)) {
    content += `# ${category}\n`;
    for (const varName of vars) {
      const config = ENVIRONMENT_VARIABLES[varName];
      if (config) {
        content += `# ${config.description}\n`;
        if (config.example) {
          content += `# Example: ${config.example}\n`;
        }
        if (config.required) {
          content += `${varName}=\n`;
        } else {
          content += `# ${varName}=${config.default}\n`;
        }
        content += '\n';
      }
    }
  }
  
  return content;
}
