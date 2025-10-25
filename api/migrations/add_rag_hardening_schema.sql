-- RAG Hardening Schema
-- Adds tables for secure Retrieval Augmented Generation with tenant isolation

-- RAG vector namespaces table
CREATE TABLE IF NOT EXISTS rag_vector_namespaces (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  namespace VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(org_id, namespace)
);

-- RAG vectors table
CREATE TABLE IF NOT EXISTS rag_vectors (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  namespace VARCHAR(255) NOT NULL,
  document_id VARCHAR(255) NOT NULL,
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of original content
  vector_data JSONB NOT NULL, -- Vector embedding data
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reindexed TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(org_id, namespace, document_id)
);

-- RAG context manifests table
CREATE TABLE IF NOT EXISTS rag_context_manifests (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  manifest_data JSONB NOT NULL, -- Signed manifest content
  signature VARCHAR(512) NOT NULL, -- HMAC signature
  key_id VARCHAR(255) NOT NULL, -- KMS key used for signing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_validated TIMESTAMP
);

-- RAG reindexing logs table
CREATE TABLE IF NOT EXISTS rag_reindexing_logs (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  namespace VARCHAR(255) NOT NULL,
  vectors_processed INTEGER DEFAULT 0,
  vectors_successful INTEGER DEFAULT 0,
  vectors_failed INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- RAG access logs table
CREATE TABLE IF NOT EXISTS rag_access_logs (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  namespace VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('search', 'store', 'delete', 'reindex')),
  document_id VARCHAR(255),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rag_vector_namespaces_org_id ON rag_vector_namespaces(org_id);
CREATE INDEX IF NOT EXISTS idx_rag_vector_namespaces_status ON rag_vector_namespaces(status);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_org_namespace ON rag_vectors(org_id, namespace);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_document_id ON rag_vectors(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_status ON rag_vectors(status);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_last_reindexed ON rag_vectors(last_reindexed);
CREATE INDEX IF NOT EXISTS idx_rag_context_manifests_org_id ON rag_context_manifests(org_id);
CREATE INDEX IF NOT EXISTS idx_rag_context_manifests_created_at ON rag_context_manifests(created_at);
CREATE INDEX IF NOT EXISTS idx_rag_reindexing_logs_org_date ON rag_reindexing_logs(org_id, started_at);
CREATE INDEX IF NOT EXISTS idx_rag_access_logs_org_date ON rag_access_logs(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rag_access_logs_operation ON rag_access_logs(operation_type);

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE ON rag_vector_namespaces TO application_role;
GRANT SELECT, INSERT, UPDATE ON rag_vectors TO application_role;
GRANT SELECT, INSERT ON rag_context_manifests TO application_role;
GRANT SELECT, INSERT ON rag_reindexing_logs TO application_role;
GRANT SELECT, INSERT ON rag_access_logs TO application_role;

-- Add comments for documentation
COMMENT ON TABLE rag_vector_namespaces IS 'Per-tenant vector namespaces for RAG isolation';
COMMENT ON TABLE rag_vectors IS 'Vector embeddings with tenant isolation and content integrity';
COMMENT ON TABLE rag_context_manifests IS 'Signed manifests for RAG context validation';
COMMENT ON TABLE rag_reindexing_logs IS 'Logs of RAG vector reindexing operations';
COMMENT ON TABLE rag_access_logs IS 'Audit log of RAG operations for security monitoring';

COMMENT ON COLUMN rag_vectors.content_hash IS 'SHA-256 hash of original content for integrity verification';
COMMENT ON COLUMN rag_vectors.vector_data IS 'Vector embedding data (JSON format)';
COMMENT ON COLUMN rag_context_manifests.signature IS 'HMAC signature of manifest for authenticity verification';
COMMENT ON COLUMN rag_context_manifests.key_id IS 'KMS key identifier used for signing';

-- Create function to get RAG statistics for tenant
CREATE OR REPLACE FUNCTION get_rag_stats(org_id_param BIGINT)
RETURNS TABLE (
  total_namespaces BIGINT,
  active_namespaces BIGINT,
  total_vectors BIGINT,
  active_vectors BIGINT,
  total_manifests BIGINT,
  last_reindexed TIMESTAMP,
  oldest_vector TIMESTAMP,
  newest_vector TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM rag_vector_namespaces WHERE org_id = org_id_param) as total_namespaces,
    (SELECT COUNT(*) FROM rag_vector_namespaces WHERE org_id = org_id_param AND status = 'active') as active_namespaces,
    (SELECT COUNT(*) FROM rag_vectors WHERE org_id = org_id_param) as total_vectors,
    (SELECT COUNT(*) FROM rag_vectors WHERE org_id = org_id_param AND status = 'active') as active_vectors,
    (SELECT COUNT(*) FROM rag_context_manifests WHERE org_id = org_id_param) as total_manifests,
    (SELECT MAX(last_reindexed) FROM rag_vectors WHERE org_id = org_id_param) as last_reindexed,
    (SELECT MIN(created_at) FROM rag_vectors WHERE org_id = org_id_param) as oldest_vector,
    (SELECT MAX(created_at) FROM rag_vectors WHERE org_id = org_id_param) as newest_vector;
END;
$$ LANGUAGE plpgsql;

-- Create function to get vectors needing reindexing
CREATE OR REPLACE FUNCTION get_vectors_needing_reindexing(org_id_param BIGINT, namespace_param VARCHAR(255))
RETURNS TABLE (
  id BIGINT,
  document_id VARCHAR(255),
  content_hash VARCHAR(64),
  created_at TIMESTAMP,
  last_reindexed TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rv.id,
    rv.document_id,
    rv.content_hash,
    rv.created_at,
    rv.last_reindexed
  FROM rag_vectors rv
  WHERE rv.org_id = org_id_param 
    AND rv.namespace = namespace_param
    AND rv.status = 'active'
    AND (rv.last_reindexed IS NULL OR rv.last_reindexed < rv.created_at)
  ORDER BY rv.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to log RAG access
CREATE OR REPLACE FUNCTION log_rag_access(
  org_id_param BIGINT,
  namespace_param VARCHAR(255),
  operation_type_param VARCHAR(50),
  document_id_param VARCHAR(255) DEFAULT NULL,
  success_param BOOLEAN DEFAULT TRUE,
  error_message_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rag_access_logs (
    org_id, namespace, operation_type, document_id, 
    success, error_message, metadata
  ) VALUES (
    org_id_param, namespace_param, operation_type_param, document_id_param,
    success_param, error_message_param, metadata_param
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to validate namespace ownership
CREATE OR REPLACE FUNCTION validate_namespace_ownership(
  org_id_param BIGINT,
  namespace_param VARCHAR(255)
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM rag_vector_namespaces 
    WHERE org_id = org_id_param 
      AND namespace = namespace_param 
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION get_rag_stats(BIGINT) TO application_role;
GRANT EXECUTE ON FUNCTION get_vectors_needing_reindexing(BIGINT, VARCHAR(255)) TO application_role;
GRANT EXECUTE ON FUNCTION log_rag_access(BIGINT, VARCHAR(255), VARCHAR(50), VARCHAR(255), BOOLEAN, TEXT, JSONB) TO application_role;
GRANT EXECUTE ON FUNCTION validate_namespace_ownership(BIGINT, VARCHAR(255)) TO application_role;

-- Add comments for functions
COMMENT ON FUNCTION get_rag_stats(BIGINT) IS 'Get comprehensive RAG statistics for tenant';
COMMENT ON FUNCTION get_vectors_needing_reindexing(BIGINT, VARCHAR(255)) IS 'Get vectors that need reindexing for tenant namespace';
COMMENT ON FUNCTION log_rag_access(BIGINT, VARCHAR(255), VARCHAR(50), VARCHAR(255), BOOLEAN, TEXT, JSONB) IS 'Log RAG access for audit trail';
COMMENT ON FUNCTION validate_namespace_ownership(BIGINT, VARCHAR(255)) IS 'Validate that namespace belongs to tenant';

-- Create trigger to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_rag_namespace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rag_namespace_timestamp
  BEFORE UPDATE ON rag_vector_namespaces
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_namespace_timestamp();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'RAG hardening schema created successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Integrate RAG hardening with existing AI services';
    RAISE NOTICE '2. Set up automated reindexing schedules';
    RAISE NOTICE '3. Configure vector database (Pinecone, Weaviate, or pgvector)';
    RAISE NOTICE '4. Implement manifest validation in AI workflows';
    RAISE NOTICE '5. Set up monitoring for RAG access patterns';
END $$;
