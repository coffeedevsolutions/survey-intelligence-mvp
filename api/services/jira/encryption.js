/**
 * Simple encryption utility for storing Jira tokens
 * In production, use proper KMS or hardware security modules
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Get encryption key from environment or generate one
const getEncryptionKey = () => {
  const key = process.env.JIRA_ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  JIRA_ENCRYPTION_KEY not set. Using default key for development only!');
    return crypto.scryptSync('default-dev-key', 'salt', 32);
  }
  return Buffer.from(key, 'hex');
};

export function encrypt(text) {
  if (!text) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('jira-token'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting Jira token:', error);
    throw new Error('Failed to encrypt token');
  }
}

export function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  try {
    const key = getEncryptionKey();
    const [ivHex, tagHex, encrypted] = encryptedData.split(':');
    
    if (!ivHex || !tagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('jira-token'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting Jira token:', error);
    throw new Error('Failed to decrypt token');
  }
}
