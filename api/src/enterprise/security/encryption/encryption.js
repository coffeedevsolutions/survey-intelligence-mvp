/**
 * Centralized Encryption Service with KMS Integration
 * 
 * Provides envelope encryption using AWS KMS for production/staging
 * Falls back to environment-based keys for local development
 */

import crypto from 'crypto';
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const useKMS = isProduction || isStaging;

// KMS Configuration
let kmsClient = null;
if (useKMS) {
  kmsClient = new KMSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits for GCM
const AAD_LENGTH = 32; // Additional authenticated data

/**
 * Get encryption key based on environment
 */
async function getEncryptionKey(tenantId = 'default') {
  if (useKMS) {
    return await getKMSDataKey(tenantId);
  } else {
    return getEnvKey(tenantId);
  }
}

/**
 * Get data key from KMS using envelope encryption
 */
async function getKMSDataKey(tenantId) {
  try {
    const keyId = process.env.KMS_KEY_ID || `alias/ai-survey-${tenantId}`;
    
    const command = new GenerateDataKeyCommand({
      KeyId: keyId,
      KeySpec: 'AES_256',
      NumberOfBytes: 32,
    });
    
    const response = await kmsClient.send(command);
    
    return {
      plaintext: response.Plaintext,
      ciphertextBlob: response.CiphertextBlob,
    };
  } catch (error) {
    console.error('KMS data key generation failed:', error);
    throw new Error('Failed to generate encryption key');
  }
}

/**
 * Decrypt data key from KMS
 */
async function decryptKMSDataKey(ciphertextBlob) {
  try {
    const command = new DecryptCommand({
      CiphertextBlob: ciphertextBlob,
    });
    
    const response = await kmsClient.send(command);
    return response.Plaintext;
  } catch (error) {
    console.error('KMS data key decryption failed:', error);
    throw new Error('Failed to decrypt encryption key');
  }
}

/**
 * Get environment-based key for local development
 */
function getEnvKey(tenantId) {
  const keyEnvVar = `ENCRYPTION_KEY_${tenantId.toUpperCase()}`;
  const key = process.env[keyEnvVar] || process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn(`⚠️  ${keyEnvVar} not set. Using default key for development only!`);
    return crypto.scryptSync('default-dev-key', `salt-${tenantId}`, 32);
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(plaintext, tenantId = 'default', additionalData = 'ai-survey') {
  if (!plaintext) return null;
  
  try {
    const keyData = await getEncryptionKey(tenantId);
    const key = keyData.plaintext || keyData;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Set additional authenticated data
    cipher.setAAD(Buffer.from(additionalData, 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return encrypted data with metadata
    const result = {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: ALGORITHM,
      additionalData,
    };
    
    // Include KMS metadata if using KMS
    if (useKMS && keyData.ciphertextBlob) {
      result.kmsCiphertextBlob = keyData.ciphertextBlob.toString('base64');
    }
    
    return result;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(encryptedData, tenantId = 'default', additionalData = 'ai-survey') {
  if (!encryptedData) return null;
  
  try {
    let key;
    
    // Handle KMS-encrypted data
    if (encryptedData.kmsCiphertextBlob) {
      const ciphertextBlob = Buffer.from(encryptedData.kmsCiphertextBlob, 'base64');
      key = await decryptKMSDataKey(ciphertextBlob);
    } else {
      // Use environment-based key
      const keyData = await getEncryptionKey(tenantId);
      key = keyData.plaintext || keyData;
    }
    
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(additionalData, 'utf8'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt data for a specific tenant (convenience method)
 */
export async function encryptForTenant(tenantId, plaintext, additionalData = 'ai-survey') {
  return await encrypt(plaintext, tenantId, additionalData);
}

/**
 * Decrypt data for a specific tenant (convenience method)
 */
export async function decryptForTenant(tenantId, encryptedData, additionalData = 'ai-survey') {
  return await decrypt(encryptedData, tenantId, additionalData);
}

/**
 * Generate a new encryption key for a tenant
 */
export async function generateTenantKey(tenantId) {
  if (useKMS) {
    const keyData = await getKMSDataKey(tenantId);
    return {
      tenantId,
      keyId: process.env.KMS_KEY_ID || `alias/ai-survey-${tenantId}`,
      ciphertextBlob: keyData.ciphertextBlob.toString('base64'),
    };
  } else {
    const key = crypto.randomBytes(32);
    return {
      tenantId,
      key: key.toString('hex'),
    };
  }
}

/**
 * Rotate encryption key for a tenant
 */
export async function rotateTenantKey(tenantId) {
  console.log(`🔄 Rotating encryption key for tenant: ${tenantId}`);
  
  if (useKMS) {
    // For KMS, we can generate a new data key
    // The old key will remain valid until KMS key rotation
    return await generateTenantKey(tenantId);
  } else {
    // For local development, generate a new environment key
    const newKey = crypto.randomBytes(32);
    console.log(`⚠️  New key for tenant ${tenantId}: ${newKey.toString('hex')}`);
    console.log(`⚠️  Update ENCRYPTION_KEY_${tenantId.toUpperCase()} environment variable`);
    return {
      tenantId,
      key: newKey.toString('hex'),
    };
  }
}

/**
 * Validate encryption configuration
 */
export function validateEncryptionConfig() {
  const issues = [];
  
  if (useKMS) {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      issues.push('AWS_ACCESS_KEY_ID not set');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      issues.push('AWS_SECRET_ACCESS_KEY not set');
    }
    if (!process.env.KMS_KEY_ID) {
      issues.push('KMS_KEY_ID not set (will use default alias)');
    }
  } else {
    if (!process.env.ENCRYPTION_KEY) {
      issues.push('ENCRYPTION_KEY not set for local development');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    environment: useKMS ? 'KMS' : 'Local',
  };
}

/**
 * Get encryption status and configuration
 */
export function getEncryptionStatus() {
  const config = validateEncryptionConfig();
  
  return {
    environment: config.environment,
    isValid: config.isValid,
    issues: config.issues,
    kmsEnabled: useKMS,
    algorithm: ALGORITHM,
    keyLength: 256,
  };
}

// Export default functions for backward compatibility
export default {
  encrypt,
  decrypt,
  encryptForTenant,
  decryptForTenant,
  generateTenantKey,
  rotateTenantKey,
  validateEncryptionConfig,
  getEncryptionStatus,
};
