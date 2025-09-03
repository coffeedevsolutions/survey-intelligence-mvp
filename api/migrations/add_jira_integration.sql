-- Jira Integration Tables
-- For storing Jira connections and project links per organization

-- Jira connections per organization
CREATE TABLE IF NOT EXISTS jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('basic', 'oauth')),
  email TEXT,
  api_token_encrypted TEXT, -- encrypted API token for basic auth
  access_token_encrypted TEXT, -- encrypted access token for OAuth
  refresh_token_encrypted TEXT, -- encrypted refresh token for OAuth
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id) -- one connection per organization for now
);

-- Jira project links for each organization
CREATE TABLE IF NOT EXISTS jira_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES jira_connections(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL,
  project_name TEXT,
  default_board_id BIGINT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, project_key)
);

-- Add jira_integration_config to organizations table as JSONB
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS jira_integration_config JSONB DEFAULT '{}';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_jira_connections_org_id ON jira_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_jira_project_links_connection_id ON jira_project_links(connection_id);
