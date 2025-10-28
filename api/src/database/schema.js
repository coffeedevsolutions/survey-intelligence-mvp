/**
 * Database Schema Management
 * 
 * Handles database schema initialization and migrations
 */

import { pool } from './connection.js';
import { isFeatureEnabled } from '../config/features.js';

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database schema...');
    
    // Create core tables
    await createCoreTables();
    
    // Create authentication tables
    await createAuthTables();
    
    // Create campaign tables
    await createCampaignTables();
    
    // Create stack tables
    await createStackTables();
    
    // Create template tables
    await createTemplateTables();
    
    // Add enterprise features if enabled
    if (isFeatureEnabled('SOC2_COMPLIANCE') || isFeatureEnabled('MFA_AUTHENTICATION')) {
      await createEnterpriseTables();
    }
    
    // Run migrations
    await runMigrations();
    
    // Create indexes
    await createIndexes();
    
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Create core tables (sessions, answers, facts, project_briefs)
 */
async function createCoreTables() {
  console.log('📋 Creating core tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      current_question_id VARCHAR(255),
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
      flow_id BIGINT REFERENCES survey_flows(id) ON DELETE SET NULL,
      link_id BIGINT REFERENCES survey_links(id) ON DELETE SET NULL,
      archived_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
      question_id VARCHAR(255) NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS facts (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
      key VARCHAR(255) NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(session_id, key)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_briefs (
      id BIGSERIAL PRIMARY KEY,
      session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
      title TEXT,
      summary_md TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
      review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed')),
      priority INTEGER CHECK (priority >= 1 AND priority <= 5),
      priority_data JSONB DEFAULT NULL,
      framework_id VARCHAR(50) DEFAULT 'simple',
      reviewed_at TIMESTAMP,
      reviewed_by BIGINT REFERENCES users(id)
    )
  `);
}

/**
 * Create authentication tables
 */
async function createAuthTables() {
  console.log('🔐 Creating authentication tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      plan TEXT DEFAULT 'trial',
      seats_total INT DEFAULT 5,
      seats_used INT DEFAULT 0,
      billing_customer_id TEXT,
      document_settings JSONB DEFAULT '{
        "company_name": "",
        "logo_url": "",
        "document_header": "",
        "document_footer": "",
        "theme": "professional",
        "primary_color": "#1f2937",
        "secondary_color": "#6b7280",
        "font_family": "Inter, Arial, sans-serif",
        "letterhead_enabled": true,
        "page_margins": "1in",
        "export_formats": ["html", "pdf", "markdown"],
        "prioritization_framework": "simple",
        "prioritization_framework_config": {},
        "enabled_prioritization_frameworks": ["simple", "ice", "moscow"]
      }'::jsonb
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      mfa_enabled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS identities (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_identities_provider_uid
      ON identities(provider, provider_user_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_org_roles (
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('requestor','reviewer','admin')),
      PRIMARY KEY (org_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      token_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )
  `);

  // Share links and invitations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS share_links (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      artifact_type TEXT NOT NULL CHECK (artifact_type IN ('session','brief','dashboard')),
      artifact_id TEXT NOT NULL,
      scope TEXT NOT NULL CHECK (scope IN ('view','comment')),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP,
      max_uses INT,
      uses INT DEFAULT 0,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      revoked BOOLEAN DEFAULT FALSE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invites (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      email CITEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','reviewer','requestor')),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      accepted BOOLEAN DEFAULT FALSE,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS share_link_views (
      id BIGSERIAL PRIMARY KEY,
      share_link_id BIGINT REFERENCES share_links(id) ON DELETE CASCADE,
      ip_address INET,
      user_agent TEXT,
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Enable CITEXT extension for case-insensitive emails
  await pool.query(`CREATE EXTENSION IF NOT EXISTS citext`);
}

/**
 * Create campaign tables
 */
async function createCampaignTables() {
  console.log('📊 Creating campaign tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      slug TEXT UNIQUE,
      name TEXT NOT NULL,
      purpose TEXT,
      template_md TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMP,
      unified_template_id BIGINT REFERENCES unified_templates(id) ON DELETE SET NULL,
      brief_template TEXT,
      brief_ai_instructions TEXT,
      survey_template_id BIGINT REFERENCES survey_templates(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS survey_flows (
      id BIGSERIAL PRIMARY KEY,
      campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
      version INT NOT NULL,
      title TEXT,
      spec_json JSONB NOT NULL,
      use_ai BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      survey_template_id BIGINT REFERENCES survey_templates(id) ON DELETE SET NULL,
      unified_template_id BIGINT REFERENCES unified_templates(id) ON DELETE SET NULL,
      UNIQUE (campaign_id, version)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS survey_links (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
      flow_id BIGINT REFERENCES survey_flows(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP,
      max_uses INT,
      uses INT DEFAULT 0,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      revoked BOOLEAN DEFAULT FALSE
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_survey_links_token ON survey_links(token)
  `);
}

/**
 * Create stack tables
 */
async function createStackTables() {
  console.log('🏗️ Creating stack tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS systems (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      vendor TEXT,
      category TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trial', 'retired')),
      url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS capabilities (
      id BIGSERIAL PRIMARY KEY,
      system_id BIGINT REFERENCES systems(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      domain_tags TEXT[],
      inputs TEXT[],
      outputs TEXT[],
      how_to TEXT,
      constraints TEXT,
      deprecated BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS capability_synonyms (
      id BIGSERIAL PRIMARY KEY,
      capability_id BIGINT REFERENCES capabilities(id) ON DELETE CASCADE,
      phrase TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stack_policies (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      rule_name TEXT NOT NULL,
      applies_to_tags TEXT[],
      guidance TEXT NOT NULL,
      priority INTEGER DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create template tables
 */
async function createTemplateTables() {
  console.log('📝 Creating template tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS survey_templates (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      settings JSONB NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      enable_ai BOOLEAN DEFAULT FALSE,
      ai_template_id BIGINT REFERENCES unified_templates(id) ON DELETE SET NULL,
      brief_template TEXT,
      brief_ai_instructions TEXT,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (org_id, name)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS unified_templates (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      template_type TEXT NOT NULL CHECK (template_type IN ('survey', 'brief', 'solution')),
      content JSONB NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (org_id, name, template_type)
    )
  `);
}

/**
 * Create enterprise tables (conditional)
 */
async function createEnterpriseTables() {
  console.log('🏢 Creating enterprise tables...');
  
  // Add enterprise columns to existing tables
  await pool.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE
  `);
  
  // Add enterprise-specific tables here as needed
  // This would include tables for SOC2 compliance, advanced monitoring, etc.
}

/**
 * Run database migrations
 */
async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Import and run migration files
    const migrationFiles = [
      'add_comments_and_resubmit.js',
      'add_solutioning_schema.js', 
      'add_conversation_tracking.js',
      'add_pm_templates.sql',
      'update_pm_templates_structure.sql',
      'create_unified_template_system.sql',
      'update_survey_categories.sql',
      'add_documentation_templates.sql'
    ];
    
    for (const file of migrationFiles) {
      try {
        if (file.endsWith('.js')) {
          const migration = await import(`../../migrations/${file}`);
          if (migration.default) {
            await migration.default();
          }
        } else if (file.endsWith('.sql')) {
          const fs = await import('fs/promises');
          const sql = await fs.readFile(`../../migrations/${file}`, 'utf8');
          await pool.query(sql);
        }
        console.log(`✅ Migration completed: ${file}`);
      } catch (error) {
        console.log(`⚠️ Migration skipped (may already be applied): ${file} - ${error.message}`);
      }
    }
  } catch (error) {
    console.log('⚠️ Error running migrations:', error.message);
  }
}

/**
 * Create database indexes
 */
async function createIndexes() {
  console.log('📊 Creating database indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_answers_session_id ON answers(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_facts_session_id ON facts(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_briefs_session_id ON project_briefs(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_org_roles_user ON user_org_roles(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_org_roles_org ON user_org_roles(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_answers_org ON answers(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_facts_org ON facts(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_briefs_org ON project_briefs(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_share_links_org ON share_links(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_invites_org ON invites(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_systems_org_id ON systems(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_capabilities_system_id ON capabilities(system_id)',
    'CREATE INDEX IF NOT EXISTS idx_capability_synonyms_capability_id ON capability_synonyms(capability_id)',
    'CREATE INDEX IF NOT EXISTS idx_stack_policies_org_id ON stack_policies(org_id)',
    'CREATE INDEX IF NOT EXISTS idx_share_links_lookup ON share_links(token) WHERE revoked = false',
    'CREATE INDEX IF NOT EXISTS idx_invites_open ON invites(org_id, email) WHERE accepted = false',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite ON invites(org_id, email) WHERE accepted = false'
  ];
  
  for (const indexQuery of indexes) {
    try {
      await pool.query(indexQuery);
    } catch (error) {
      console.log(`⚠️ Index creation skipped: ${error.message}`);
    }
  }
  
  // Create session summaries view
  await pool.query(`DROP VIEW IF EXISTS session_summaries`);
  await pool.query(`
    CREATE VIEW session_summaries AS
    SELECT
      s.id AS session_id,
      s.org_id,
      s.campaign_id,
      s.flow_id,
      s.link_id,
      s.completed,
      s.created_at,
      s.archived_at,
      c.name AS campaign_name,
      c.purpose AS campaign_purpose,
      c.slug AS campaign_slug,
      sf.title AS flow_title,
      sf.version AS flow_version,
      sl.token AS survey_token,
      sl.uses AS link_uses,
      sl.max_uses AS link_max_uses,
      COALESCE(MAX(a.created_at), s.created_at) AS last_answer_at,
      (SELECT COUNT(*) FROM answers a2 WHERE a2.session_id = s.id) AS answer_count,
      EXISTS (SELECT 1 FROM project_briefs pb WHERE pb.session_id = s.id) AS has_brief
    FROM sessions s
    LEFT JOIN answers a ON a.session_id = s.id
    LEFT JOIN campaigns c ON s.campaign_id = c.id
    LEFT JOIN survey_flows sf ON s.flow_id = sf.id
    LEFT JOIN survey_links sl ON s.link_id = sl.id
    WHERE s.org_id IS NOT NULL
    GROUP BY s.id, s.org_id, s.campaign_id, s.flow_id, s.link_id, s.completed, s.created_at, s.archived_at, 
             c.name, c.purpose, c.slug, sf.title, sf.version, sl.token, sl.uses, sl.max_uses
  `);
}

export default initializeDatabase;
