// api/config/database.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { Pool } from "pg"; // ✅ ESM-friendly import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer api/.env; fall back to repo root .env
const candidates = [path.join(__dirname, "..", ".env"), path.join(__dirname, "..", "..", ".env")];
const envPath = candidates.find((p) => fs.existsSync(p));

// Ensure UTF-8 (Windows Notepad sometimes saves UTF-16)
dotenv.config(envPath ? { path: envPath, encoding: "utf8" } : {});

// DEBUG (remove after confirming):
console.log("DB env seen by Node:", {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD_SET: !!process.env.DB_PASSWORD,
  loaded_from: envPath || "(none)",
});

// ---------- Connection pool ----------
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432), // ✅ ensure number
  database: process.env.DB_NAME || "survey_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  ssl: false, // local dev
});

// ---------- Schema init ----------
export async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        current_question_id VARCHAR(255),
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
        question_id VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        UNIQUE(session_id, key)
      )
    `);

    // Create project_briefs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_briefs (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
        title TEXT,
        summary_md TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create authentication tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id BIGSERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add enterprise columns to organizations table
    await pool.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
        ADD COLUMN IF NOT EXISTS seats_total INT DEFAULT 5,
        ADD COLUMN IF NOT EXISTS seats_used INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS billing_customer_id TEXT
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

    // Add columns to existing users table if they don't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE
    `);

    // Provider-neutral identities table for Auth0 readiness
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

    // CAMPAIGNS: top-level container
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SURVEY FLOWS (versioned rules/graphs for a campaign)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS survey_flows (
        id BIGSERIAL PRIMARY KEY,
        campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
        version INT NOT NULL,
        title TEXT,
        spec_json JSONB NOT NULL,
        use_ai BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (campaign_id, version)
      )
    `);

    // SHAREABLE LINKS (tokenized entrypoints to a campaign flow)
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

    // Add org_id columns to existing tables for multi-tenancy
    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await pool.query(`
      ALTER TABLE answers ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await pool.query(`
      ALTER TABLE facts ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await pool.query(`
      ALTER TABLE project_briefs ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE
    `);

    // Add campaign-related columns to sessions
    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE
    `);
    
    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS flow_id BIGINT REFERENCES survey_flows(id) ON DELETE SET NULL
    `);
    
    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS link_id BIGINT REFERENCES survey_links(id) ON DELETE SET NULL
    `);

    // Add campaign_id to project_briefs
    await pool.query(`
      ALTER TABLE project_briefs ADD COLUMN IF NOT EXISTS campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL
    `);

    // Add review columns to project_briefs
    await pool.query(`
      ALTER TABLE project_briefs ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed'))
    `);
    
    await pool.query(`
      ALTER TABLE project_briefs ADD COLUMN IF NOT EXISTS priority INTEGER CHECK (priority >= 1 AND priority <= 5)
    `);
    
    await pool.query(`
      ALTER TABLE project_briefs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP
    `);
    
    await pool.query(`
      ALTER TABLE project_briefs ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id)
    `);

    // Add archive functionality - archived_at timestamps for soft delete
    await pool.query(`
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP
    `);
    
    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP
    `);

    // Tech Stack & Solutions schema
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

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_systems_org_id ON systems(org_id);
      CREATE INDEX IF NOT EXISTS idx_capabilities_system_id ON capabilities(system_id);
      CREATE INDEX IF NOT EXISTS idx_capability_synonyms_capability_id ON capability_synonyms(capability_id);
      CREATE INDEX IF NOT EXISTS idx_stack_policies_org_id ON stack_policies(org_id);
    `);

    // Share links table for link-based reviewers (no seat)
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
      CREATE INDEX IF NOT EXISTS idx_share_links_lookup ON share_links(token) WHERE revoked = false
    `);

    // Enable CITEXT extension for case-insensitive emails
    await pool.query(`CREATE EXTENSION IF NOT EXISTS citext`);

    // Member invitations table
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
      CREATE INDEX IF NOT EXISTS idx_invites_open ON invites(org_id, email) WHERE accepted = false
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite ON invites(org_id, email) WHERE accepted = false
    `);

    // Share link access log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS share_link_views (
        id BIGSERIAL PRIMARY KEY,
        share_link_id BIGINT REFERENCES share_links(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_answers_session_id ON answers(session_id);
      CREATE INDEX IF NOT EXISTS idx_facts_session_id ON facts(session_id);
      CREATE INDEX IF NOT EXISTS idx_project_briefs_session_id ON project_briefs(session_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_org_roles_user ON user_org_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_org_roles_org ON user_org_roles(org_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(org_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_answers_org ON answers(org_id);
      CREATE INDEX IF NOT EXISTS idx_facts_org ON facts(org_id);
      CREATE INDEX IF NOT EXISTS idx_project_briefs_org ON project_briefs(org_id);
      CREATE INDEX IF NOT EXISTS idx_share_links_org ON share_links(org_id);
      CREATE INDEX IF NOT EXISTS idx_invites_org ON invites(org_id);
    `);

    // Drop and recreate session summaries view to include org_id, campaign details, and exclude archived
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

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

// ---------- Sessions ----------
export async function createSession(sessionData) {
  const { id, currentQuestionId, completed = false } = sessionData;
  const q = `
    INSERT INTO sessions (id, current_question_id, completed)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const r = await pool.query(q, [id, currentQuestionId, completed]);
  return r.rows[0];
}

export async function getSession(sessionId) {
  const sRes = await pool.query("SELECT * FROM sessions WHERE id = $1", [sessionId]);
  if (sRes.rows.length === 0) return null;

  const session = sRes.rows[0];

  const aRes = await pool.query(
    "SELECT question_id, text FROM answers WHERE session_id = $1 ORDER BY created_at",
    [sessionId]
  );
  const fRes = await pool.query(
    "SELECT key, value FROM facts WHERE session_id = $1",
    [sessionId]
  );

  const facts = {};
  for (const row of fRes.rows) facts[row.key] = row.value;

  return {
    id: session.id,
    currentQuestionId: session.current_question_id,
    completed: session.completed,
    answers: aRes.rows.map((row) => ({ questionId: row.question_id, text: row.text })),
    facts,
  };
}

export async function updateSession(sessionId, updates) {
  const { currentQuestionId, completed } = updates;
  const q = `
    UPDATE sessions
    SET current_question_id = $1,
        completed = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const r = await pool.query(q, [currentQuestionId, completed, sessionId]);
  return r.rows[0];
}

// ---------- Answers ----------
export async function addAnswer(sessionId, questionId, text) {
  const q = `
    INSERT INTO answers (session_id, question_id, text)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const r = await pool.query(q, [sessionId, questionId, text]);
  return r.rows[0];
}

export async function addAnswerWithOrg(sessionId, questionId, text, orgId) {
  const q = `
    INSERT INTO answers (session_id, question_id, text, org_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const r = await pool.query(q, [sessionId, questionId, text, orgId]);
  return r.rows[0];
}

// ---------- Facts ----------
export async function upsertFact(sessionId, key, value) {
  const q = `
    INSERT INTO facts (session_id, key, value)
    VALUES ($1, $2, $3)
    ON CONFLICT (session_id, key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const r = await pool.query(q, [sessionId, key, value]);
  return r.rows[0];
}

export async function upsertMultipleFacts(sessionId, factsObject) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(factsObject)) {
      await client.query(
        `
        INSERT INTO facts (session_id, key, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (session_id, key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `,
        [sessionId, key, value]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertMultipleFactsWithOrg(sessionId, factsObject, orgId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(factsObject)) {
      await client.query(
        `
        INSERT INTO facts (session_id, key, value, org_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (session_id, key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `,
        [sessionId, key, value, orgId]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------- Utility ----------
export async function closeDatabase() {
  await pool.end();
}

// Optional: wrappers to match names some code expects
export async function addAnswerToSession(sessionId, questionId, text) {
  return addAnswer(sessionId, questionId, text);
}
export async function updateSessionFacts(sessionId, factsObject) {
  return upsertMultipleFacts(sessionId, factsObject);
}
export async function updateSessionStatus(sessionId, { currentQuestionId = null, completed = null }) {
  const s = await getSession(sessionId);
  if (!s) throw new Error(`Session not found: ${sessionId}`);
  const next = {
    currentQuestionId: currentQuestionId !== null ? currentQuestionId : s.currentQuestionId,
    completed: completed !== null ? completed : s.completed,
  };
  return updateSession(sessionId, next);
}
export async function startSession() {
  const id = (crypto.randomUUID?.() || Math.random().toString(36).slice(2));
  const row = await createSession({ id, currentQuestionId: "intro", completed: false });
  return { id: row.id, currentQuestionId: row.current_question_id, completed: row.completed };
}

// ---------- Enterprise functions ----------

// Seat management
export async function checkSeatsAvailable(orgId, seatsNeeded = 1) {
  const result = await pool.query(
    'SELECT seats_total, seats_used FROM organizations WHERE id = $1',
    [orgId]
  );
  if (!result.rowCount) throw new Error('Organization not found');
  const { seats_total, seats_used } = result.rows[0];
  return (seats_used + seatsNeeded) <= seats_total;
}

export async function incrementSeatsUsed(orgId, count = 1) {
  await pool.query(
    'UPDATE organizations SET seats_used = seats_used + $1 WHERE id = $2',
    [count, orgId]
  );
}

export async function decrementSeatsUsed(orgId, count = 1) {
  await pool.query(
    'UPDATE organizations SET seats_used = GREATEST(0, seats_used - $1) WHERE id = $2',
    [count, orgId]
  );
}

// Share links
export async function createShareLink({ orgId, artifactType, artifactId, scope, expiresAt, maxUses, createdBy }) {
  const token = crypto.randomBytes(32).toString('base64url'); // 43 chars, URL-safe
  const result = await pool.query(`
    INSERT INTO share_links (org_id, artifact_type, artifact_id, scope, token, expires_at, max_uses, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [orgId, artifactType, artifactId, scope, token, expiresAt, maxUses, createdBy]);
  
  return result.rows[0];
}

export async function getShareLink(token) {
  const result = await pool.query(`
    SELECT * FROM share_links 
    WHERE token = $1 AND revoked = false 
    AND (expires_at IS NULL OR expires_at > now())
  `, [token]);
  
  return result.rows[0] || null;
}

export async function revokeShareLink(linkId, orgId) {
  await pool.query(
    'UPDATE share_links SET revoked = true WHERE id = $1 AND org_id = $2',
    [linkId, orgId]
  );
}

export async function incrementShareLinkUse(linkId, ipAddress, userAgent) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE share_links SET uses = uses + 1 WHERE id = $1',
      [linkId]
    );
    await client.query(
      'INSERT INTO share_link_views (share_link_id, ip_address, user_agent) VALUES ($1, $2, $3)',
      [linkId, ipAddress, userAgent]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Invitations
export async function createInvite({ orgId, email, role, createdBy }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // First, try to update any existing pending invite
  const updateResult = await pool.query(`
    UPDATE invites 
    SET role = $1, token = $2, expires_at = $3, created_by = $4, created_at = CURRENT_TIMESTAMP
    WHERE org_id = $5 AND email = $6 AND accepted = false
    RETURNING *
  `, [role, token, expiresAt, createdBy, orgId, email.toLowerCase()]);
  
  if (updateResult.rowCount > 0) {
    return updateResult.rows[0];
  }
  
  // If no existing invite, create new one
  const result = await pool.query(`
    INSERT INTO invites (org_id, email, role, token, expires_at, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [orgId, email.toLowerCase(), role, token, expiresAt, createdBy]);
  
  return result.rows[0];
}

export async function getInvite(token) {
  const result = await pool.query(`
    SELECT i.*, o.name as org_name, o.slug as org_slug
    FROM invites i
    JOIN organizations o ON i.org_id = o.id
    WHERE i.token = $1 AND i.accepted = false AND i.expires_at > now()
  `, [token]);
  
  return result.rows[0] || null;
}

export async function acceptInvite(token, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const invite = await getInvite(token);
    if (!invite) throw new Error('Invalid or expired invite');
    
    // Check seat availability
    const seatsOk = await checkSeatsAvailable(invite.org_id, 1);
    if (!seatsOk) throw new Error('No seats available');
    
    // Add user to org with role
    await client.query(`
      INSERT INTO user_org_roles (org_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role
    `, [invite.org_id, userId, invite.role]);
    
    // Increment seat count
    await client.query(
      'UPDATE organizations SET seats_used = seats_used + 1 WHERE id = $1',
      [invite.org_id]
    );
    
    // Mark invite as accepted
    await client.query(
      'UPDATE invites SET accepted = true WHERE token = $1',
      [token]
    );
    
    await client.query('COMMIT');
    return invite;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Multi-tenant aware session creation
export async function createSessionWithOrg(sessionData, orgId) {
  const { id, currentQuestionId, completed = false } = sessionData;
  const q = `
    INSERT INTO sessions (id, current_question_id, completed, org_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const r = await pool.query(q, [id, currentQuestionId, completed, orgId]);
  return r.rows[0];
}

// Multi-tenant aware queries
export async function getSessionsByOrg(orgId, limit = 50) {
  const result = await pool.query(`
    SELECT * FROM session_summaries 
    WHERE org_id = $1 AND archived_at IS NULL
    ORDER BY last_answer_at DESC NULLS LAST 
    LIMIT $2
  `, [orgId, limit]);
  return result.rows;
}

export async function getBriefByIdAndOrg(briefId, orgId) {
  const result = await pool.query(`
    SELECT id, title, summary_md, created_at, session_id
    FROM project_briefs 
    WHERE id = $1 AND org_id = $2
  `, [briefId, orgId]);
  return result.rows[0] || null;
}

export async function getBriefsForReview(orgId, limit = 50) {
  const result = await pool.query(`
    SELECT 
      pb.id,
      pb.title,
      pb.summary_md,
      pb.created_at,
      pb.review_status,
      pb.priority,
      pb.reviewed_at,
      pb.reviewed_by,
      pb.campaign_id,
      pb.session_id,
      c.name as campaign_name,
      reviewer.email as reviewed_by_email
    FROM project_briefs pb
    LEFT JOIN campaigns c ON pb.campaign_id = c.id
    LEFT JOIN users reviewer ON pb.reviewed_by = reviewer.id
    WHERE pb.org_id = $1
    ORDER BY 
      CASE WHEN pb.review_status = 'pending' THEN 0 ELSE 1 END,
      pb.created_at DESC
    LIMIT $2
  `, [orgId, limit]);
  
  return result.rows;
}

export async function updateBriefReview(briefId, orgId, reviewData) {
  const { priority, reviewedBy } = reviewData;
  
  const result = await pool.query(`
    UPDATE project_briefs 
    SET 
      priority = $1,
      review_status = 'reviewed',
      reviewed_at = CURRENT_TIMESTAMP,
      reviewed_by = $2
    WHERE id = $3 AND org_id = $4
    RETURNING *
  `, [priority, reviewedBy, briefId, orgId]);
  
  return result.rows[0];
}

// Campaign management functions
export async function createCampaign({ orgId, slug, name, purpose, templateMd, createdBy }) {
  const result = await pool.query(`
    INSERT INTO campaigns (org_id, slug, name, purpose, template_md, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [orgId, slug, name, purpose, templateMd, createdBy]);
  return result.rows[0];
}

export async function getCampaignsByOrg(orgId) {
  const result = await pool.query(`
    SELECT c.*, u.email as created_by_email,
           (SELECT COUNT(*) FROM survey_flows sf WHERE sf.campaign_id = c.id) as flow_count,
           (SELECT COUNT(*) FROM sessions s WHERE s.campaign_id = c.id) as response_count
    FROM campaigns c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.org_id = $1 AND c.archived_at IS NULL
    ORDER BY c.updated_at DESC
  `, [orgId]);
  return result.rows;
}

export async function getCampaignById(campaignId, orgId) {
  const result = await pool.query(
    'SELECT * FROM campaigns WHERE id = $1 AND org_id = $2',
    [campaignId, orgId]
  );
  return result.rows[0];
}

export async function updateCampaign(campaignId, orgId, updates) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (['name', 'purpose', 'template_md', 'is_active'].includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(campaignId, orgId);

  const query = `
    UPDATE campaigns 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount} AND org_id = $${paramCount + 1}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

// Survey flow functions
export async function createSurveyFlow({ campaignId, title, specJson, useAi = true }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get next version number for this campaign
    const versionResult = await client.query(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM survey_flows WHERE campaign_id = $1',
      [campaignId]
    );
    const version = versionResult.rows[0].next_version;

    // Create the flow
    const result = await client.query(`
      INSERT INTO survey_flows (campaign_id, version, title, spec_json, use_ai)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [campaignId, version, title, specJson, useAi]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getFlowsByCampaign(campaignId) {
  const result = await pool.query(
    'SELECT * FROM survey_flows WHERE campaign_id = $1 ORDER BY version DESC',
    [campaignId]
  );
  return result.rows;
}

export async function getFlowById(flowId) {
  const result = await pool.query(
    'SELECT * FROM survey_flows WHERE id = $1',
    [flowId]
  );
  return result.rows[0];
}

// Survey link functions
export async function createSurveyLink({ orgId, campaignId, flowId, expiresAt, maxUses, createdBy }) {
  const token = crypto.randomBytes(16).toString('base64url');
  
  const result = await pool.query(`
    INSERT INTO survey_links (org_id, campaign_id, flow_id, token, expires_at, max_uses, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [orgId, campaignId, flowId, token, expiresAt, maxUses, createdBy]);
  
  return result.rows[0];
}

export async function getSurveyLinkByToken(token) {
  const result = await pool.query(`
    SELECT sl.*, c.name as campaign_name, sf.spec_json, sf.use_ai
    FROM survey_links sl
    JOIN campaigns c ON sl.campaign_id = c.id
    JOIN survey_flows sf ON sl.flow_id = sf.id
    WHERE sl.token = $1 
      AND sl.revoked = false 
      AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
      AND (sl.max_uses IS NULL OR sl.uses < sl.max_uses)
  `, [token]);
  
  return result.rows[0];
}

export async function getSurveyLinksByOrg(orgId) {
  const result = await pool.query(`
    SELECT sl.*, c.name as campaign_name, sf.version as flow_version, u.email as created_by_email
    FROM survey_links sl
    JOIN campaigns c ON sl.campaign_id = c.id
    JOIN survey_flows sf ON sl.flow_id = sf.id
    LEFT JOIN users u ON sl.created_by = u.id
    WHERE sl.org_id = $1
    ORDER BY sl.created_at DESC
  `, [orgId]);
  
  return result.rows;
}

export async function revokeSurveyLink(linkId, orgId) {
  const result = await pool.query(
    'UPDATE survey_links SET revoked = true WHERE id = $1 AND org_id = $2 RETURNING *',
    [linkId, orgId]
  );
  return result.rows[0];
}

export async function incrementSurveyLinkUse(linkId) {
  await pool.query(
    'UPDATE survey_links SET uses = uses + 1 WHERE id = $1',
    [linkId]
  );
}

// Campaign-aware session creation
export async function createCampaignSession({ id, orgId, campaignId, flowId, linkId }) {
  const result = await pool.query(`
    INSERT INTO sessions (id, org_id, campaign_id, flow_id, link_id, current_question_id, completed)
    VALUES ($1, $2, $3, $4, $5, 'intro', false)
    RETURNING *
  `, [id, orgId, campaignId, flowId, linkId]);
  
  return result.rows[0];
}

export async function getCampaignResponses(campaignId, orgId) {
  const result = await pool.query(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM answers a WHERE a.session_id = s.id) as answer_count,
           (SELECT MAX(a.created_at) FROM answers a WHERE a.session_id = s.id) as last_answer_at,
           EXISTS(SELECT 1 FROM project_briefs pb WHERE pb.session_id = s.id) as has_brief
    FROM sessions s
    WHERE s.campaign_id = $1 AND s.org_id = $2
    ORDER BY s.created_at DESC
  `, [campaignId, orgId]);
  
  return result.rows;
}

// ---------- Tech Stack & Solutions Functions ----------

// Systems CRUD
export async function getSystemsByOrg(orgId) {
  const result = await pool.query(`
    SELECT * FROM systems 
    WHERE org_id = $1 
    ORDER BY 
      CASE status WHEN 'active' THEN 1 WHEN 'trial' THEN 2 ELSE 3 END,
      name ASC
  `, [orgId]);
  return result.rows;
}

export async function createSystem(orgId, systemData) {
  const { name, vendor, category, status, url, notes } = systemData;
  const result = await pool.query(`
    INSERT INTO systems (org_id, name, vendor, category, status, url, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [orgId, name, vendor, category, status || 'active', url, notes]);
  return result.rows[0];
}

export async function updateSystem(systemId, orgId, systemData) {
  const { name, vendor, category, status, url, notes } = systemData;
  const result = await pool.query(`
    UPDATE systems 
    SET name = $1, vendor = $2, category = $3, status = $4, url = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7 AND org_id = $8
    RETURNING *
  `, [name, vendor, category, status, url, notes, systemId, orgId]);
  return result.rows[0] || null;
}

export async function deleteSystem(systemId, orgId) {
  const result = await pool.query(`
    DELETE FROM systems WHERE id = $1 AND org_id = $2 RETURNING id
  `, [systemId, orgId]);
  return result.rowCount > 0;
}

// Capabilities CRUD
export async function getCapabilitiesBySystem(systemId, orgId) {
  const result = await pool.query(`
    SELECT c.*, s.name as system_name, s.category as system_category
    FROM capabilities c
    JOIN systems s ON s.id = c.system_id
    WHERE c.system_id = $1 AND s.org_id = $2 AND NOT c.deprecated
    ORDER BY c.name ASC
  `, [systemId, orgId]);
  return result.rows;
}

export async function getCapabilitiesByOrg(orgId) {
  const result = await pool.query(`
    SELECT c.*, s.name as system_name, s.category as system_category, s.vendor
    FROM capabilities c
    JOIN systems s ON s.id = c.system_id
    WHERE s.org_id = $1 AND NOT c.deprecated AND s.status = 'active'
    ORDER BY s.name ASC, c.name ASC
  `, [orgId]);
  return result.rows;
}

export async function createCapability(systemId, orgId, capabilityData) {
  // Verify system belongs to org
  const systemCheck = await pool.query('SELECT id FROM systems WHERE id = $1 AND org_id = $2', [systemId, orgId]);
  if (!systemCheck.rowCount) {
    throw new Error('System not found or access denied');
  }

  const { name, description, domain_tags, inputs, outputs, how_to, constraints } = capabilityData;
  const result = await pool.query(`
    INSERT INTO capabilities (system_id, name, description, domain_tags, inputs, outputs, how_to, constraints)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [systemId, name, description, domain_tags, inputs, outputs, how_to, constraints]);
  return result.rows[0];
}

export async function updateCapability(capabilityId, orgId, capabilityData) {
  const { name, description, domain_tags, inputs, outputs, how_to, constraints } = capabilityData;
  const result = await pool.query(`
    UPDATE capabilities 
    SET name = $1, description = $2, domain_tags = $3, inputs = $4, outputs = $5, how_to = $6, constraints = $7, updated_at = CURRENT_TIMESTAMP
    WHERE id = $8 AND system_id IN (SELECT id FROM systems WHERE org_id = $9)
    RETURNING *
  `, [name, description, domain_tags, inputs, outputs, how_to, constraints, capabilityId, orgId]);
  return result.rows[0] || null;
}

export async function deleteCapability(capabilityId, orgId) {
  const result = await pool.query(`
    UPDATE capabilities 
    SET deprecated = true, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND system_id IN (SELECT id FROM systems WHERE org_id = $2)
    RETURNING id
  `, [capabilityId, orgId]);
  return result.rowCount > 0;
}

// Capability Synonyms CRUD
export async function getCapabilitySynonyms(capabilityId) {
  const result = await pool.query(`
    SELECT * FROM capability_synonyms WHERE capability_id = $1 ORDER BY phrase ASC
  `, [capabilityId]);
  return result.rows;
}

export async function addCapabilitySynonym(capabilityId, orgId, phrase) {
  // Verify capability belongs to org
  const capCheck = await pool.query(`
    SELECT c.id FROM capabilities c 
    JOIN systems s ON s.id = c.system_id 
    WHERE c.id = $1 AND s.org_id = $2
  `, [capabilityId, orgId]);
  if (!capCheck.rowCount) {
    throw new Error('Capability not found or access denied');
  }

  const result = await pool.query(`
    INSERT INTO capability_synonyms (capability_id, phrase) VALUES ($1, $2) RETURNING *
  `, [capabilityId, phrase]);
  return result.rows[0];
}

export async function deleteCapabilitySynonym(synonymId, orgId) {
  const result = await pool.query(`
    DELETE FROM capability_synonyms 
    WHERE id = $1 AND capability_id IN (
      SELECT c.id FROM capabilities c 
      JOIN systems s ON s.id = c.system_id 
      WHERE s.org_id = $2
    )
    RETURNING id
  `, [synonymId, orgId]);
  return result.rowCount > 0;
}

// Stack Policies CRUD
export async function getStackPolicies(orgId) {
  const result = await pool.query(`
    SELECT * FROM stack_policies WHERE org_id = $1 ORDER BY priority ASC, rule_name ASC
  `, [orgId]);
  return result.rows;
}

export async function createStackPolicy(orgId, policyData) {
  const { rule_name, applies_to_tags, guidance, priority } = policyData;
  const result = await pool.query(`
    INSERT INTO stack_policies (org_id, rule_name, applies_to_tags, guidance, priority)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [orgId, rule_name, applies_to_tags, guidance, priority || 100]);
  return result.rows[0];
}

export async function updateStackPolicy(policyId, orgId, policyData) {
  const { rule_name, applies_to_tags, guidance, priority } = policyData;
  const result = await pool.query(`
    UPDATE stack_policies 
    SET rule_name = $1, applies_to_tags = $2, guidance = $3, priority = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5 AND org_id = $6
    RETURNING *
  `, [rule_name, applies_to_tags, guidance, priority, policyId, orgId]);
  return result.rows[0] || null;
}

export async function deleteStackPolicy(policyId, orgId) {
  const result = await pool.query(`
    DELETE FROM stack_policies WHERE id = $1 AND org_id = $2 RETURNING id
  `, [policyId, orgId]);
  return result.rowCount > 0;
}

// Search and discovery functions
export async function searchCapabilities(orgId, searchText, limit = 25) {
  const result = await pool.query(`
    SELECT DISTINCT c.*, s.name as system_name, s.category as system_category, s.vendor
    FROM capabilities c
    JOIN systems s ON s.id = c.system_id
    LEFT JOIN capability_synonyms cs ON cs.capability_id = c.id
    WHERE s.org_id = $1 AND NOT c.deprecated AND s.status = 'active'
    AND (
      c.name ILIKE $2 OR 
      c.description ILIKE $2 OR 
      cs.phrase ILIKE $2 OR
      $3 = ANY(c.domain_tags)
    )
    ORDER BY s.name ASC, c.name ASC
    LIMIT $4
  `, [orgId, `%${searchText}%`, searchText, limit]);
  return result.rows;
}

export async function getStackSnapshot(orgId) {
  const systems = await getSystemsByOrg(orgId);
  const capabilities = await getCapabilitiesByOrg(orgId);
  const policies = await getStackPolicies(orgId);
  
  return { systems, capabilities, policies };
}

// ---------- Archive Functions ----------

// Campaign archive operations
export async function archiveCampaign(campaignId, orgId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Archive the campaign
    const campaignResult = await client.query(`
      UPDATE campaigns 
      SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND org_id = $2 AND archived_at IS NULL
      RETURNING *
    `, [campaignId, orgId]);
    
    if (campaignResult.rows.length === 0) {
      throw new Error('Campaign not found or already archived');
    }
    
    // Archive all sessions in this campaign
    await client.query(`
      UPDATE sessions 
      SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE campaign_id = $1 AND org_id = $2 AND archived_at IS NULL
    `, [campaignId, orgId]);
    
    await client.query('COMMIT');
    return campaignResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function restoreCampaign(campaignId, orgId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Restore the campaign
    const campaignResult = await client.query(`
      UPDATE campaigns 
      SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
      RETURNING *
    `, [campaignId, orgId]);
    
    if (campaignResult.rows.length === 0) {
      throw new Error('Campaign not found or not archived');
    }
    
    // Restore all sessions in this campaign
    await client.query(`
      UPDATE sessions 
      SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE campaign_id = $1 AND org_id = $2 AND archived_at IS NOT NULL
    `, [campaignId, orgId]);
    
    await client.query('COMMIT');
    return campaignResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCampaignPermanently(campaignId, orgId) {
  const result = await pool.query(`
    DELETE FROM campaigns 
    WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
    RETURNING *
  `, [campaignId, orgId]);
  
  if (result.rows.length === 0) {
    throw new Error('Campaign not found or not archived');
  }
  
  return result.rows[0];
}

// Session archive operations
export async function archiveSession(sessionId, orgId) {
  const result = await pool.query(`
    UPDATE sessions 
    SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND org_id = $2 AND archived_at IS NULL
    RETURNING *
  `, [sessionId, orgId]);
  
  if (result.rows.length === 0) {
    throw new Error('Session not found or already archived');
  }
  
  return result.rows[0];
}

export async function restoreSession(sessionId, orgId) {
  const result = await pool.query(`
    UPDATE sessions 
    SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
    RETURNING *
  `, [sessionId, orgId]);
  
  if (result.rows.length === 0) {
    throw new Error('Session not found or not archived');
  }
  
  return result.rows[0];
}

export async function deleteSessionPermanently(sessionId, orgId) {
  const result = await pool.query(`
    DELETE FROM sessions 
    WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
    RETURNING *
  `, [sessionId, orgId]);
  
  if (result.rows.length === 0) {
    throw new Error('Session not found or not archived');
  }
  
  return result.rows[0];
}

// Get archived items
export async function getArchivedCampaigns(orgId) {
  const result = await pool.query(`
    SELECT 
      c.*,
      COUNT(s.id) as session_count,
      MAX(s.created_at) as last_session_at
    FROM campaigns c
    LEFT JOIN sessions s ON s.campaign_id = c.id AND s.archived_at IS NOT NULL
    WHERE c.org_id = $1 AND c.archived_at IS NOT NULL
    GROUP BY c.id
    ORDER BY c.archived_at DESC
  `, [orgId]);
  
  return result.rows;
}

export async function getArchivedSessions(orgId) {
  const result = await pool.query(`
    SELECT 
      s.id AS session_id,
      s.org_id,
      s.campaign_id,
      s.completed,
      s.created_at,
      s.archived_at,
      COALESCE(MAX(a.created_at), s.created_at) AS last_answer_at,
      (SELECT COUNT(*) FROM answers a2 WHERE a2.session_id = s.id) AS answer_count,
      EXISTS (SELECT 1 FROM project_briefs pb WHERE pb.session_id = s.id) AS has_brief,
      c.name as campaign_name
    FROM sessions s
    LEFT JOIN answers a ON a.session_id = s.id
    LEFT JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.org_id = $1 AND s.archived_at IS NOT NULL
    GROUP BY s.id, s.org_id, s.campaign_id, s.completed, s.created_at, s.archived_at, c.name
    ORDER BY s.archived_at DESC
  `, [orgId]);
  
  return result.rows;
}


