/**
 * Encryption Configuration
 * 
 * Environment-based configuration for encryption service
 */

// Environment detection
export const ENCRYPTION_ENV = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
};

export const ENCRYPTION_MODE = {
  KMS: 'kms',
  LOCAL: 'local',
};

/**
 * Get current encryption mode based on environment
 */
export function getEncryptionMode() {
  const env = process.env.NODE_ENV || ENCRYPTION_ENV.DEVELOPMENT;
  
  if (env === ENCRYPTION_ENV.PRODUCTION || env === ENCRYPTION_ENV.STAGING) {
    return ENCRYPTION_MODE.KMS;
  }
  
  return ENCRYPTION_MODE.LOCAL;
}

/**
 * Get KMS configuration
 */
export function getKMSConfig() {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    keyId: process.env.KMS_KEY_ID || 'alias/ai-survey-default',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // For temporary credentials
  };
}

/**
 * Get local encryption configuration
 */
export function getLocalEncryptionConfig() {
  return {
    defaultKey: process.env.ENCRYPTION_KEY,
    tenantKeys: {
      // Example: 'tenant1': process.env.ENCRYPTION_KEY_TENANT1,
    },
  };
}

/**
 * Validate encryption environment variables
 */
export function validateEncryptionEnv() {
  const mode = getEncryptionMode();
  const issues = [];
  
  if (mode === ENCRYPTION_MODE.KMS) {
    const kmsConfig = getKMSConfig();
    
    if (!kmsConfig.accessKeyId) {
      issues.push('AWS_ACCESS_KEY_ID is required for KMS mode');
    }
    if (!kmsConfig.secretAccessKey) {
      issues.push('AWS_SECRET_ACCESS_KEY is required for KMS mode');
    }
    if (!kmsConfig.keyId) {
      issues.push('KMS_KEY_ID is required for KMS mode');
    }
  } else {
    const localConfig = getLocalEncryptionConfig();
    
    if (!localConfig.defaultKey) {
      issues.push('ENCRYPTION_KEY is required for local mode');
    }
  }
  
  return {
    mode,
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Get tenant-specific key configuration
 */
export function getTenantKeyConfig(tenantId) {
  const mode = getEncryptionMode();
  
  if (mode === ENCRYPTION_MODE.KMS) {
    return {
      keyId: process.env[`KMS_KEY_ID_${tenantId.toUpperCase()}`] || 
             process.env.KMS_KEY_ID || 
             `alias/ai-survey-${tenantId}`,
    };
  } else {
    return {
      key: process.env[`ENCRYPTION_KEY_${tenantId.toUpperCase()}`] || 
           process.env.ENCRYPTION_KEY,
    };
  }
}

/**
 * Log encryption configuration (without sensitive data)
 */
export function logEncryptionConfig() {
  const mode = getEncryptionMode();
  const validation = validateEncryptionEnv();
  
  console.log('🔐 Encryption Configuration:');
  console.log(`  Mode: ${mode}`);
  console.log(`  Valid: ${validation.isValid}`);
  
  if (!validation.isValid) {
    console.log('  Issues:');
    validation.issues.forEach(issue => console.log(`    - ${issue}`));
  }
  
  if (mode === ENCRYPTION_MODE.KMS) {
    const kmsConfig = getKMSConfig();
    console.log(`  AWS Region: ${kmsConfig.region}`);
    console.log(`  KMS Key ID: ${kmsConfig.keyId}`);
    console.log(`  AWS Credentials: ${kmsConfig.accessKeyId ? 'Set' : 'Not Set'}`);
  } else {
    const localConfig = getLocalEncryptionConfig();
    console.log(`  Default Key: ${localConfig.defaultKey ? 'Set' : 'Not Set'}`);
  }
}
