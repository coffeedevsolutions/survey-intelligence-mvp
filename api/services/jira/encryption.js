/**
 * Jira Token Encryption Service
 * 
 * Uses centralized encryption service with KMS support
 * Maintains backward compatibility with existing encrypted data
 */

import { encryptForTenant, decryptForTenant } from '../encryption.js';

const JIRA_AAD = 'jira-token';

/**
 * Encrypt Jira token for a specific tenant
 */
export async function encrypt(text, tenantId = 'default') {
  if (!text) return null;
  
  try {
    const encryptedData = await encryptForTenant(tenantId, text, JIRA_AAD);
    
    // Convert to legacy format for backward compatibility
    return `${encryptedData.iv}:${encryptedData.tag}:${encryptedData.encrypted}`;
  } catch (error) {
    console.error('Error encrypting Jira token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt Jira token for a specific tenant
 */
export async function decrypt(encryptedData, tenantId = 'default') {
  if (!encryptedData) return null;
  
  try {
    // Handle legacy format
    if (typeof encryptedData === 'string' && encryptedData.includes(':')) {
      const [ivHex, tagHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !tagHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const legacyFormat = {
        encrypted,
        iv: ivHex,
        tag: tagHex,
        additionalData: JIRA_AAD,
      };
      
      return await decryptForTenant(tenantId, legacyFormat, JIRA_AAD);
    }
    
    // Handle new format
    return await decryptForTenant(tenantId, encryptedData, JIRA_AAD);
  } catch (error) {
    console.error('Error decrypting Jira token:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Legacy encrypt function for backward compatibility
 * @deprecated Use encrypt(text, tenantId) instead
 */
export function encryptLegacy(text) {
  console.warn('⚠️  Using legacy encryption. Consider migrating to tenant-specific encryption.');
  return encrypt(text, 'default');
}

/**
 * Legacy decrypt function for backward compatibility
 * @deprecated Use decrypt(encryptedData, tenantId) instead
 */
export function decryptLegacy(encryptedData) {
  console.warn('⚠️  Using legacy decryption. Consider migrating to tenant-specific decryption.');
  return decrypt(encryptedData, 'default');
}
