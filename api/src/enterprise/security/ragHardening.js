/**
 * RAG Hardening Service
 * 
 * Implements security measures for Retrieval Augmented Generation
 * with per-tenant namespaces, signed context manifests, and re-indexing
 */

import crypto from 'crypto';
import { pool } from '../../../database/connection.js';
import { PerTenantKMSManager } from './perTenantKMS.js';

// RAG Hardening Configuration
const RAG_CONFIG = {
  vectorDimensions: 1536, // OpenAI embedding dimensions
  namespacePrefix: 'tenant_',
  manifestVersion: '1.0',
  reindexSchedule: {
    enabled: true,
    interval: 'weekly', // daily, weekly, monthly
    batchSize: 1000
  },
  security: {
    enableSignatures: true,
    enableChecksums: true,
    enableTimestamps: true,
    maxContextAge: 30 // days
  }
};

/**
 * Vector Namespace Manager
 */
export class VectorNamespaceManager {
  constructor(config = RAG_CONFIG) {
    this.config = config;
  }

  /**
   * Generate tenant-specific namespace
   */
  generateNamespace(tenantId) {
    const hash = crypto.createHash('sha256')
      .update(tenantId.toString())
      .digest('hex')
      .substring(0, 16);
    
    return `${this.config.namespacePrefix}${hash}`;
  }

  /**
   * Validate namespace belongs to tenant
   */
  validateNamespace(namespace, tenantId) {
    const expectedNamespace = this.generateNamespace(tenantId);
    return namespace === expectedNamespace;
  }

  /**
   * Get all namespaces for tenant
   */
  async getTenantNamespaces(tenantId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT DISTINCT namespace, created_at, last_updated
        FROM rag_vector_namespaces
        WHERE org_id = $1 AND status = 'active'
        ORDER BY created_at DESC
      `, [tenantId]);

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Create namespace for tenant
   */
  async createNamespace(tenantId, metadata = {}) {
    const client = await pool.connect();
    try {
      const namespace = this.generateNamespace(tenantId);
      
      const result = await client.query(`
        INSERT INTO rag_vector_namespaces (
          org_id, namespace, metadata, status, created_at
        ) VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (org_id, namespace) DO UPDATE SET
          status = 'active',
          last_updated = CURRENT_TIMESTAMP
        RETURNING *
      `, [tenantId, namespace, JSON.stringify(metadata)]);

      console.log(`📁 [RAG] Created namespace ${namespace} for tenant ${tenantId}`);
      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Delete namespace for tenant
   */
  async deleteNamespace(tenantId, namespace) {
    const client = await pool.connect();
    try {
      // Validate namespace belongs to tenant
      if (!this.validateNamespace(namespace, tenantId)) {
        throw new Error('Namespace does not belong to tenant');
      }

      await client.query('BEGIN');

      // Mark namespace as deleted
      await client.query(`
        UPDATE rag_vector_namespaces 
        SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP
        WHERE org_id = $1 AND namespace = $2
      `, [tenantId, namespace]);

      // Mark all vectors in namespace as deleted
      await client.query(`
        UPDATE rag_vectors 
        SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP
        WHERE org_id = $1 AND namespace = $2
      `, [tenantId, namespace]);

      await client.query('COMMIT');

      console.log(`🗑️ [RAG] Deleted namespace ${namespace} for tenant ${tenantId}`);
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Context Manifest Manager
 */
export class ContextManifestManager {
  constructor(config = RAG_CONFIG) {
    this.config = config;
    this.kmsManager = new PerTenantKMSManager();
  }

  /**
   * Generate document checksum
   */
  generateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sign manifest with tenant key
   */
  async signManifest(tenantId, manifest) {
    try {
      const keyInfo = await this.kmsManager.getTenantKey(tenantId);
      
      // Create signature payload
      const payload = JSON.stringify(manifest);
      const signature = crypto.createHmac('sha256', keyInfo.key_id)
        .update(payload)
        .digest('hex');
      
      return {
        manifest: manifest,
        signature: signature,
        signedAt: new Date().toISOString(),
        keyId: keyInfo.key_id
      };

    } catch (error) {
      console.error('Failed to sign manifest:', error);
      throw error;
    }
  }

  /**
   * Verify manifest signature
   */
  async verifyManifest(tenantId, signedManifest) {
    try {
      const keyInfo = await this.kmsManager.getTenantKey(tenantId);
      
      const payload = JSON.stringify(signedManifest.manifest);
      const expectedSignature = crypto.createHmac('sha256', keyInfo.key_id)
        .update(payload)
        .digest('hex');
      
      return expectedSignature === signedManifest.signature;

    } catch (error) {
      console.error('Failed to verify manifest:', error);
      return false;
    }
  }

  /**
   * Create context manifest
   */
  async createManifest(tenantId, documents, metadata = {}) {
    const manifest = {
      version: this.config.manifestVersion,
      tenantId: tenantId,
      documentCount: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        checksum: this.generateChecksum(doc.content),
        timestamp: doc.timestamp || new Date().toISOString(),
        metadata: doc.metadata || {}
      })),
      metadata: metadata,
      createdAt: new Date().toISOString()
    };

    return await this.signManifest(tenantId, manifest);
  }

  /**
   * Store manifest in database
   */
  async storeManifest(tenantId, signedManifest) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO rag_context_manifests (
          org_id, manifest_data, signature, key_id, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        tenantId,
        JSON.stringify(signedManifest.manifest),
        signedManifest.signature,
        signedManifest.keyId
      ]);

      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Get manifest by ID
   */
  async getManifest(tenantId, manifestId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM rag_context_manifests
        WHERE id = $1 AND org_id = $2
      `, [manifestId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('Manifest not found');
      }

      const manifest = result.rows[0];
      return {
        manifest: JSON.parse(manifest.manifest_data),
        signature: manifest.signature,
        signedAt: manifest.created_at,
        keyId: manifest.key_id
      };

    } finally {
      client.release();
    }
  }

  /**
   * Validate manifest integrity
   */
  async validateManifest(tenantId, manifestId) {
    try {
      const signedManifest = await this.getManifest(tenantId, manifestId);
      const isValid = await this.verifyManifest(tenantId, signedManifest);
      
      if (!isValid) {
        console.warn(`⚠️ [RAG] Manifest ${manifestId} signature verification failed`);
      }
      
      return {
        valid: isValid,
        manifest: signedManifest.manifest,
        lastValidated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to validate manifest:', error);
      return {
        valid: false,
        error: error.message,
        lastValidated: new Date().toISOString()
      };
    }
  }
}

/**
 * Vector Store Manager
 */
export class VectorStoreManager {
  constructor(config = RAG_CONFIG) {
    this.config = config;
    this.namespaceManager = new VectorNamespaceManager(config);
    this.manifestManager = new ContextManifestManager(config);
  }

  /**
   * Store vector with tenant isolation
   */
  async storeVector(tenantId, vectorData) {
    const client = await pool.connect();
    try {
      const namespace = this.namespaceManager.generateNamespace(tenantId);
      
      // Ensure namespace exists
      await this.namespaceManager.createNamespace(tenantId);

      const result = await client.query(`
        INSERT INTO rag_vectors (
          org_id, namespace, document_id, content_hash, 
          vector_data, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        tenantId,
        namespace,
        vectorData.documentId,
        vectorData.contentHash,
        JSON.stringify(vectorData.vector),
        JSON.stringify(vectorData.metadata || {})
      ]);

      console.log(`📊 [RAG] Stored vector for document ${vectorData.documentId} in namespace ${namespace}`);
      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Search vectors within tenant namespace
   */
  async searchVectors(tenantId, queryVector, options = {}) {
    const client = await pool.connect();
    try {
      const {
        limit = 10,
        threshold = 0.7,
        includeMetadata = true
      } = options;

      const namespace = this.namespaceManager.generateNamespace(tenantId);

      // For now, we'll use a simple similarity search
      // In production, this would use a proper vector database like Pinecone, Weaviate, or pgvector
      const result = await client.query(`
        SELECT 
          id, document_id, content_hash, vector_data, metadata,
          created_at
        FROM rag_vectors
        WHERE org_id = $1 AND namespace = $2 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT $3
      `, [tenantId, namespace, limit]);

      // Calculate similarity scores (simplified)
      const vectorsWithScores = result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        contentHash: row.content_hash,
        vector: JSON.parse(row.vector_data),
        metadata: includeMetadata ? JSON.parse(row.metadata) : null,
        similarity: this.calculateSimilarity(queryVector, JSON.parse(row.vector_data)),
        createdAt: row.created_at
      }));

      // Filter by threshold and sort by similarity
      return vectorsWithScores
        .filter(v => v.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);

    } finally {
      client.release();
    }
  }

  /**
   * Calculate cosine similarity between vectors
   */
  calculateSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Re-index vectors for tenant
   */
  async reindexTenantVectors(tenantId, options = {}) {
    const client = await pool.connect();
    try {
      const {
        batchSize = this.config.reindexSchedule.batchSize,
        forceReindex = false
      } = options;

      const namespace = this.namespaceManager.generateNamespace(tenantId);

      // Get vectors that need reindexing
      let query = `
        SELECT id, document_id, content_hash, vector_data, metadata
        FROM rag_vectors
        WHERE org_id = $1 AND namespace = $2 AND status = 'active'
      `;

      if (!forceReindex) {
        query += ` AND (last_reindexed IS NULL OR last_reindexed < created_at)`;
      }

      query += ` ORDER BY created_at ASC LIMIT $3`;

      const result = await client.query(query, [tenantId, namespace, batchSize]);

      const reindexedVectors = [];

      for (const vector of result.rows) {
        try {
          // In a real implementation, this would regenerate embeddings
          // For now, we'll just update the timestamp
          await client.query(`
            UPDATE rag_vectors 
            SET last_reindexed = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [vector.id]);

          reindexedVectors.push({
            id: vector.id,
            documentId: vector.document_id,
            reindexedAt: new Date().toISOString()
          });

        } catch (error) {
          console.error(`Failed to reindex vector ${vector.id}:`, error);
        }
      }

      console.log(`🔄 [RAG] Reindexed ${reindexedVectors.length} vectors for tenant ${tenantId}`);
      return reindexedVectors;

    } finally {
      client.release();
    }
  }

  /**
   * Get RAG statistics for tenant
   */
  async getRAGStats(tenantId) {
    const client = await pool.connect();
    try {
      const namespace = this.namespaceManager.generateNamespace(tenantId);

      const result = await client.query(`
        SELECT 
          COUNT(*) as total_vectors,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_vectors,
          COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_vectors,
          MIN(created_at) as oldest_vector,
          MAX(created_at) as newest_vector,
          COUNT(CASE WHEN last_reindexed IS NOT NULL THEN 1 END) as reindexed_vectors
        FROM rag_vectors
        WHERE org_id = $1 AND namespace = $2
      `, [tenantId, namespace]);

      const manifestResult = await client.query(`
        SELECT COUNT(*) as total_manifests
        FROM rag_context_manifests
        WHERE org_id = $1
      `, [tenantId]);

      return {
        ...result.rows[0],
        totalManifests: parseInt(manifestResult.rows[0].total_manifests),
        namespace: namespace,
        lastReindexed: new Date().toISOString()
      };

    } finally {
      client.release();
    }
  }
}

/**
 * RAG Hardening Manager
 */
export class RAGHardeningManager {
  constructor(config = RAG_CONFIG) {
    this.config = config;
    this.namespaceManager = new VectorNamespaceManager(config);
    this.manifestManager = new ContextManifestManager(config);
    this.vectorStore = new VectorStoreManager(config);
  }

  /**
   * Initialize RAG for tenant
   */
  async initializeTenantRAG(tenantId) {
    try {
      // Create namespace
      await this.namespaceManager.createNamespace(tenantId);
      
      // Create initial manifest
      const initialManifest = await this.manifestManager.createManifest(tenantId, []);
      await this.manifestManager.storeManifest(tenantId, initialManifest);

      console.log(`🚀 [RAG] Initialized RAG for tenant ${tenantId}`);
      return {
        namespace: this.namespaceManager.generateNamespace(tenantId),
        manifestId: initialManifest.manifest.id
      };

    } catch (error) {
      console.error('Failed to initialize tenant RAG:', error);
      throw error;
    }
  }

  /**
   * Get RAG health status
   */
  async getRAGHealth(tenantId) {
    try {
      const stats = await this.vectorStore.getRAGStats(tenantId);
      const namespaces = await this.namespaceManager.getTenantNamespaces(tenantId);

      return {
        healthy: true,
        stats: stats,
        namespaces: namespaces,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

// Export default RAG hardening manager
export default RAGHardeningManager;
