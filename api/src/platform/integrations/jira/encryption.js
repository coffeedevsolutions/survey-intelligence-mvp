/**
 * Jira Token Encryption Service
 * 
 * Uses centralized encryption service with KMS support
 * Maintains backward compatibility with existing encrypted data
 */

import { encryptForTenant, decryptForTenant } from '../../../enterprise/security/encryption/encryption.js';

const JIRA_AAD = 'jira-token';

/**
 * Encrypt Jira token for a specific tenant
 */
export async function encrypt(text, tenantId = 'default') {
  if (!text) return null;
  
  console.log('🔍 [Jira Encrypt] Input text:', text.substring(0, 10) + '...');
  
  try {
    const encryptedData = await encryptForTenant(tenantId, text, JIRA_AAD);
    
    console.log('🔍 [Jira Encrypt] Output data:');
    console.log('  - Type:', typeof encryptedData);
    console.log('  - Keys:', Object.keys(encryptedData));
    console.log('  - Has encrypted property?', 'encrypted' in encryptedData);
    
    // Return the full encrypted data object instead of legacy string format
    return encryptedData;
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
  
  console.log('🔍 [Jira Decrypt] Input data:');
  console.log('  - Type:', typeof encryptedData);
  console.log('  - Value:', encryptedData);
  console.log('  - Is string?', typeof encryptedData === 'string');
  console.log('  - Is object?', typeof encryptedData === 'object');
  console.log('  - Has encrypted property?', encryptedData && typeof encryptedData === 'object' && 'encrypted' in encryptedData);
  
  try {
    // Handle JSON string format (from database storage)
    if (typeof encryptedData === 'string' && encryptedData.startsWith('{')) {
      try {
        const parsedData = JSON.parse(encryptedData);
        console.log('🔍 [Jira Decrypt] Parsed JSON string to object:', Object.keys(parsedData));
        return await decryptForTenant(tenantId, parsedData, JIRA_AAD);
      } catch (parseError) {
        console.error('🔍 [Jira Decrypt] Failed to parse JSON string:', parseError);
        throw new Error('Invalid JSON format in encrypted data');
      }
    }
    
    // Handle legacy string format
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
    
    // Handle new object format
    if (typeof encryptedData === 'object' && encryptedData.encrypted) {
      return await decryptForTenant(tenantId, encryptedData, JIRA_AAD);
    }
    
    throw new Error('Invalid encrypted data format');
  } catch (error) {
    console.error('Error decrypting Jira token:', error);
    throw new Error('Failed to decrypt Jira token. The stored token may be corrupted. Please reconfigure your Jira connection in Settings.');
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
