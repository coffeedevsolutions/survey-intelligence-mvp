/**
 * Per-Tenant KMS Service
 * 
 * Implements per-tenant Customer Managed Keys (CMKs) with rotation
 * Supports AWS KMS, Google Cloud KMS, and Azure Key Vault
 */

import { KMSClient, CreateKeyCommand, DescribeKeyCommand, ScheduleKeyDeletionCommand, GetKeyRotationStatusCommand, EnableKeyRotationCommand } from '@aws-sdk/client-kms';
import { SecretsManagerClient, CreateSecretCommand, GetSecretValueCommand, UpdateSecretCommand, DeleteSecretCommand } from '@aws-sdk/client-secrets-manager';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { KeyClient } from '@azure/keyvault-keys';
import { pool } from '../../../database/connection.js';
import crypto from 'crypto';

// KMS Configuration
const KMS_CONFIG = {
  providers: {
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      keySpec: 'SYMMETRIC_DEFAULT',
      keyUsage: 'ENCRYPT_DECRYPT',
      rotationPeriod: 365 // days
    },
    gcp: {
      projectId: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_KMS_LOCATION || 'global',
      keyRing: process.env.GCP_KEY_RING || 'ai-survey-keys'
    },
    azure: {
      vaultUrl: process.env.AZURE_KEY_VAULT_URL,
      keyType: 'RSA',
      keySize: 2048
    }
  },
  rotation: {
    enabled: true,
    schedule: 'annual', // annual, quarterly, monthly
    advanceWarning: 30 // days before rotation
  }
};

/**
 * KMS Provider Interface
 */
class KMSProvider {
  constructor(config) {
    this.config = config;
  }

  async createTenantKey(tenantId) {
    throw new Error('createTenantKey must be implemented by provider');
  }

  async getTenantKey(tenantId) {
    throw new Error('getTenantKey must be implemented by provider');
  }

  async rotateTenantKey(tenantId) {
    throw new Error('rotateTenantKey must be implemented by provider');
  }

  async deleteTenantKey(tenantId) {
    throw new Error('deleteTenantKey must be implemented by provider');
  }
}

/**
 * AWS KMS Provider
 */
class AWSKMSProvider extends KMSProvider {
  constructor(config) {
    super(config);
    this.kmsClient = new KMSClient({ region: config.region });
    this.secretsClient = new SecretsManagerClient({ region: config.region });
  }

  async createTenantKey(tenantId) {
    try {
      // Create CMK for tenant
      const createKeyCommand = new CreateKeyCommand({
        Description: `AI Survey Tenant Key for ${tenantId}`,
        KeyUsage: this.config.keyUsage,
        KeySpec: this.config.keySpec,
        Tags: [
          { TagKey: 'TenantId', TagValue: tenantId },
          { TagKey: 'Service', TagValue: 'ai-survey' },
          { TagKey: 'Environment', TagValue: process.env.NODE_ENV || 'development' }
        ]
      });

      const keyResult = await this.kmsClient.send(createKeyCommand);
      const keyId = keyResult.KeyMetadata.KeyId;

      // Enable automatic rotation
      const enableRotationCommand = new EnableKeyRotationCommand({
        KeyId: keyId
      });
      await this.kmsClient.send(enableRotationCommand);

      // Store key metadata in Secrets Manager
      const secretName = `ai-survey-tenant-key-${tenantId}`;
      const createSecretCommand = new CreateSecretCommand({
        Name: secretName,
        Description: `Encryption key for tenant ${tenantId}`,
        SecretString: JSON.stringify({
          keyId: keyId,
          arn: keyResult.KeyMetadata.Arn,
          createdAt: new Date().toISOString(),
          tenantId: tenantId
        }),
        Tags: [
          { Key: 'TenantId', Value: tenantId },
          { Key: 'Service', Value: 'ai-survey' }
        ]
      });

      await this.secretsClient.send(createSecretCommand);

      return {
        keyId: keyId,
        arn: keyResult.KeyMetadata.Arn,
        provider: 'aws',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to create AWS tenant key:', error);
      throw error;
    }
  }

  async getTenantKey(tenantId) {
    try {
      const secretName = `ai-survey-tenant-key-${tenantId}`;
      const getSecretCommand = new GetSecretValueCommand({
        SecretId: secretName
      });

      const result = await this.secretsClient.send(getSecretCommand);
      return JSON.parse(result.SecretString);

    } catch (error) {
      console.error('Failed to get AWS tenant key:', error);
      throw error;
    }
  }

  async rotateTenantKey(tenantId) {
    try {
      const keyInfo = await this.getTenantKey(tenantId);
      
      // Check rotation status
      const rotationStatusCommand = new GetKeyRotationStatusCommand({
        KeyId: keyInfo.keyId
      });

      const rotationStatus = await this.kmsClient.send(rotationStatusCommand);
      
      if (!rotationStatus.KeyRotationEnabled) {
        // Enable rotation if not already enabled
        const enableRotationCommand = new EnableKeyRotationCommand({
          KeyId: keyInfo.keyId
        });
        await this.kmsClient.send(enableRotationCommand);
      }

      return {
        keyId: keyInfo.keyId,
        rotationEnabled: true,
        lastRotated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to rotate AWS tenant key:', error);
      throw error;
    }
  }

  async deleteTenantKey(tenantId) {
    try {
      const keyInfo = await this.getTenantKey(tenantId);
      
      // Schedule key deletion (7-30 days)
      const deleteCommand = new ScheduleKeyDeletionCommand({
        KeyId: keyInfo.keyId,
        PendingWindowInDays: 7
      });

      await this.kmsClient.send(deleteCommand);

      // Delete secret
      const secretName = `ai-survey-tenant-key-${tenantId}`;
      const deleteSecretCommand = new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: true
      });

      await this.secretsClient.send(deleteSecretCommand);

      return { success: true };

    } catch (error) {
      console.error('Failed to delete AWS tenant key:', error);
      throw error;
    }
  }
}

/**
 * Google Cloud KMS Provider
 */
class GCPKMSProvider extends KMSProvider {
  constructor(config) {
    super(config);
    this.kmsClient = new KeyManagementServiceClient();
  }

  async createTenantKey(tenantId) {
    try {
      const keyRingPath = this.kmsClient.keyRingPath(
        this.config.projectId,
        this.config.location,
        this.config.keyRing
      );

      const keyPath = this.kmsClient.cryptoKeyPath(
        this.config.projectId,
        this.config.location,
        this.config.keyRing,
        `tenant-${tenantId}`
      );

      // Create crypto key
      const [cryptoKey] = await this.kmsClient.createCryptoKey({
        parent: keyRingPath,
        cryptoKeyId: `tenant-${tenantId}`,
        cryptoKey: {
          purpose: 'ENCRYPT_DECRYPT',
          versionTemplate: {
            algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION',
            protectionLevel: 'SOFTWARE'
          },
          rotationPeriod: {
            seconds: this.config.rotationPeriod * 24 * 60 * 60
          }
        }
      });

      return {
        keyId: cryptoKey.name,
        provider: 'gcp',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to create GCP tenant key:', error);
      throw error;
    }
  }

  async getTenantKey(tenantId) {
    try {
      const keyPath = this.kmsClient.cryptoKeyPath(
        this.config.projectId,
        this.config.location,
        this.config.keyRing,
        `tenant-${tenantId}`
      );

      const [cryptoKey] = await this.kmsClient.getCryptoKey({
        name: keyPath
      });

      return {
        keyId: cryptoKey.name,
        provider: 'gcp',
        createdAt: cryptoKey.createTime
      };

    } catch (error) {
      console.error('Failed to get GCP tenant key:', error);
      throw error;
    }
  }

  async rotateTenantKey(tenantId) {
    try {
      const keyPath = this.kmsClient.cryptoKeyPath(
        this.config.projectId,
        this.config.location,
        this.config.keyRing,
        `tenant-${tenantId}`
      );

      // Create new version
      const [cryptoKeyVersion] = await this.kmsClient.createCryptoKeyVersion({
        parent: keyPath
      });

      return {
        keyId: keyPath,
        versionId: cryptoKeyVersion.name,
        rotationEnabled: true,
        lastRotated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to rotate GCP tenant key:', error);
      throw error;
    }
  }

  async deleteTenantKey(tenantId) {
    try {
      const keyPath = this.kmsClient.cryptoKeyPath(
        this.config.projectId,
        this.config.location,
        this.config.keyRing,
        `tenant-${tenantId}`
      );

      // Destroy all versions
      const [cryptoKey] = await this.kmsClient.getCryptoKey({
        name: keyPath
      });

      for (const version of cryptoKey.primary) {
        await this.kmsClient.destroyCryptoKeyVersion({
          name: version.name
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Failed to delete GCP tenant key:', error);
      throw error;
    }
  }
}

/**
 * Azure Key Vault Provider
 */
class AzureKMSProvider extends KMSProvider {
  constructor(config) {
    super(config);
    this.keyClient = new KeyClient(config.vaultUrl);
  }

  async createTenantKey(tenantId) {
    try {
      const keyName = `tenant-${tenantId}`;
      
      const key = await this.keyClient.createKey(keyName, this.config.keyType, {
        keySize: this.config.keySize,
        tags: {
          TenantId: tenantId,
          Service: 'ai-survey',
          Environment: process.env.NODE_ENV || 'development'
        }
      });

      return {
        keyId: key.id,
        provider: 'azure',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to create Azure tenant key:', error);
      throw error;
    }
  }

  async getTenantKey(tenantId) {
    try {
      const keyName = `tenant-${tenantId}`;
      const key = await this.keyClient.getKey(keyName);

      return {
        keyId: key.id,
        provider: 'azure',
        createdAt: key.properties.createdOn
      };

    } catch (error) {
      console.error('Failed to get Azure tenant key:', error);
      throw error;
    }
  }

  async rotateTenantKey(tenantId) {
    try {
      const keyName = `tenant-${tenantId}`;
      
      // Create new version
      const newKey = await this.keyClient.createKey(keyName, this.config.keyType, {
        keySize: this.config.keySize
      });

      return {
        keyId: newKey.id,
        provider: 'azure',
        rotationEnabled: true,
        lastRotated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to rotate Azure tenant key:', error);
      throw error;
    }
  }

  async deleteTenantKey(tenantId) {
    try {
      const keyName = `tenant-${tenantId}`;
      
      // Start deletion (soft delete)
      const deleteOperation = await this.keyClient.beginDeleteKey(keyName);
      await deleteOperation.pollUntilDone();

      return { success: true };

    } catch (error) {
      console.error('Failed to delete Azure tenant key:', error);
      throw error;
    }
  }
}

/**
 * Per-Tenant KMS Manager
 */
export class PerTenantKMSManager {
  constructor(config = KMS_CONFIG) {
    this.config = config;
    this.provider = this.initializeProvider();
  }

  initializeProvider() {
    const provider = process.env.KMS_PROVIDER || 'aws';
    
    switch (provider) {
      case 'aws':
        return new AWSKMSProvider(this.config.providers.aws);
      case 'gcp':
        return new GCPKMSProvider(this.config.providers.gcp);
      case 'azure':
        return new AzureKMSProvider(this.config.providers.azure);
      default:
        throw new Error(`Unsupported KMS provider: ${provider}`);
    }
  }

  /**
   * Create KMS key for tenant
   */
  async createTenantKey(tenantId) {
    const client = await pool.connect();
    try {
      // Check if key already exists
      const existing = await client.query(`
        SELECT * FROM tenant_kms_keys WHERE org_id = $1
      `, [tenantId]);

      if (existing.rows.length > 0) {
        throw new Error(`KMS key already exists for tenant ${tenantId}`);
      }

      // Create key in KMS provider
      const keyInfo = await this.provider.createTenantKey(tenantId);

      // Store key metadata in database
      await client.query(`
        INSERT INTO tenant_kms_keys (
          org_id, key_id, provider, key_arn, created_at, status
        ) VALUES ($1, $2, $3, $4, $5, 'active')
      `, [
        tenantId,
        keyInfo.keyId,
        keyInfo.provider,
        keyInfo.arn || keyInfo.keyId,
        keyInfo.createdAt
      ]);

      console.log(`🔑 [PerTenantKMS] Created key for tenant ${tenantId}`);
      return keyInfo;

    } finally {
      client.release();
    }
  }

  /**
   * Get tenant KMS key
   */
  async getTenantKey(tenantId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM tenant_kms_keys 
        WHERE org_id = $1 AND status = 'active'
      `, [tenantId]);

      if (result.rows.length === 0) {
        throw new Error(`No active KMS key found for tenant ${tenantId}`);
      }

      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Rotate tenant KMS key
   */
  async rotateTenantKey(tenantId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current key
      const currentKey = await this.getTenantKey(tenantId);

      // Rotate key in KMS provider
      const rotationResult = await this.provider.rotateTenantKey(tenantId);

      // Update database with new key info
      await client.query(`
        UPDATE tenant_kms_keys 
        SET key_id = $1, last_rotated = $2, rotation_count = rotation_count + 1
        WHERE org_id = $3 AND status = 'active'
      `, [
        rotationResult.keyId,
        rotationResult.lastRotated,
        tenantId
      ]);

      // Log rotation event
      await client.query(`
        INSERT INTO kms_rotation_logs (org_id, old_key_id, new_key_id, rotated_at)
        VALUES ($1, $2, $3, $4)
      `, [
        tenantId,
        currentKey.key_id,
        rotationResult.keyId,
        rotationResult.lastRotated
      ]);

      await client.query('COMMIT');

      console.log(`🔄 [PerTenantKMS] Rotated key for tenant ${tenantId}`);
      return rotationResult;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete tenant KMS key
   */
  async deleteTenantKey(tenantId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete key in KMS provider
      await this.provider.deleteTenantKey(tenantId);

      // Mark key as deleted in database
      await client.query(`
        UPDATE tenant_kms_keys 
        SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP
        WHERE org_id = $1 AND status = 'active'
      `, [tenantId]);

      await client.query('COMMIT');

      console.log(`🗑️ [PerTenantKMS] Deleted key for tenant ${tenantId}`);
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get rotation schedule for all tenants
   */
  async getRotationSchedule() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          org_id,
          key_id,
          created_at,
          last_rotated,
          rotation_count,
          CASE 
            WHEN last_rotated IS NULL THEN created_at
            ELSE last_rotated
          END as last_rotation_date
        FROM tenant_kms_keys 
        WHERE status = 'active'
        ORDER BY last_rotation_date ASC
      `);

      return result.rows.map(row => ({
        tenantId: row.org_id,
        keyId: row.key_id,
        lastRotation: row.last_rotation_date,
        rotationCount: row.rotation_count || 0,
        needsRotation: this.needsRotation(row.last_rotation_date)
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Check if key needs rotation
   */
  needsRotation(lastRotationDate) {
    if (!lastRotationDate) return true;
    
    const rotationPeriod = this.config.rotation.schedule === 'annual' ? 365 :
                         this.config.rotation.schedule === 'quarterly' ? 90 :
                         this.config.rotation.schedule === 'monthly' ? 30 : 365;
    
    const daysSinceRotation = Math.floor(
      (Date.now() - new Date(lastRotationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceRotation >= rotationPeriod;
  }

  /**
   * Get KMS statistics
   */
  async getKMSStats() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_keys,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_keys,
          COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_keys,
          AVG(rotation_count) as avg_rotations,
          MAX(rotation_count) as max_rotations
        FROM tenant_kms_keys
      `);

      const rotationSchedule = await this.getRotationSchedule();
      const keysNeedingRotation = rotationSchedule.filter(k => k.needsRotation).length;

      return {
        ...result.rows[0],
        keysNeedingRotation: keysNeedingRotation,
        rotationSchedule: this.config.rotation.schedule,
        provider: process.env.KMS_PROVIDER || 'aws'
      };

    } finally {
      client.release();
    }
  }
}

// Export default KMS manager
export default PerTenantKMSManager;
