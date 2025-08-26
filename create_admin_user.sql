-- Create Organization and Admin User
-- Run this in psql or pgAdmin

BEGIN;

-- 1. Create organization
INSERT INTO organizations(slug, name) 
VALUES ('acme', 'Acme Inc') 
ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name
RETURNING id;

-- Note the organization ID returned above, use it below

-- 2. Create admin user (replace 'your_org_id' with actual ID from step 1)
INSERT INTO users(email, password_hash, email_verified) 
VALUES (
  'admin@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdwY0K8OTzxfg0G', -- bcrypt hash of 'secret123'
  true
)
ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash
RETURNING id;

-- Note the user ID returned above, use it below

-- 3. Create identity record (replace IDs with actual values)
INSERT INTO identities(user_id, provider, provider_user_id)
VALUES (1, 'local', 'admin@example.com')  -- Replace 1 with actual user_id
ON CONFLICT (provider, provider_user_id) DO UPDATE SET last_login_at = CURRENT_TIMESTAMP;

-- 4. Set admin role (replace IDs with actual values)
INSERT INTO user_org_roles(org_id, user_id, role)
VALUES (1, 1, 'admin')  -- Replace both 1s with actual org_id and user_id
ON CONFLICT (org_id, user_id) DO UPDATE SET role='admin';

COMMIT;

-- Verify the setup
SELECT 
  o.slug as org_slug,
  u.email,
  uor.role,
  i.provider
FROM organizations o
JOIN user_org_roles uor ON o.id = uor.org_id
JOIN users u ON uor.user_id = u.id
JOIN identities i ON u.id = i.user_id
WHERE o.slug = 'acme';
