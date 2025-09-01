-- Add support for brief comments and resubmit functionality
-- Run this migration to add the required database tables and columns

-- Add email column to sessions to capture user contact information
-- This will allow us to contact users for resubmit requests
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_email 
ON sessions (user_email);

-- Create table to track brief comments from reviewers
CREATE TABLE IF NOT EXISTS brief_comments (
  id BIGSERIAL PRIMARY KEY,
  brief_id BIGINT NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
  org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brief_comments_brief_id 
ON brief_comments (brief_id);

CREATE INDEX IF NOT EXISTS idx_brief_comments_org_id 
ON brief_comments (org_id);

CREATE INDEX IF NOT EXISTS idx_brief_comments_reviewer_id 
ON brief_comments (reviewer_id);

-- Create table to track resubmit requests
CREATE TABLE IF NOT EXISTS brief_resubmit_requests (
  id BIGSERIAL PRIMARY KEY,
  brief_id BIGINT NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  request_status VARCHAR(50) DEFAULT 'sent',
  email_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resubmit_requests_brief_id 
ON brief_resubmit_requests (brief_id);

CREATE INDEX IF NOT EXISTS idx_resubmit_requests_session_id 
ON brief_resubmit_requests (session_id);

CREATE INDEX IF NOT EXISTS idx_resubmit_requests_user_email 
ON brief_resubmit_requests (user_email);

CREATE INDEX IF NOT EXISTS idx_resubmit_requests_status 
ON brief_resubmit_requests (request_status);

-- Add flag to track if brief has resubmit requests
ALTER TABLE project_briefs 
ADD COLUMN IF NOT EXISTS has_resubmit_requests BOOLEAN DEFAULT FALSE;

-- Create update trigger to maintain the has_resubmit_requests flag
CREATE OR REPLACE FUNCTION update_brief_resubmit_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the brief to indicate it has resubmit requests
  UPDATE project_briefs 
  SET has_resubmit_requests = TRUE 
  WHERE id = NEW.brief_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS brief_resubmit_flag_trigger ON brief_resubmit_requests;
CREATE TRIGGER brief_resubmit_flag_trigger
  AFTER INSERT ON brief_resubmit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_brief_resubmit_flag();

-- Add comments for documentation
COMMENT ON TABLE brief_comments IS 'Comments added by reviewers on project briefs during the review process';
COMMENT ON TABLE brief_resubmit_requests IS 'Track resubmit requests sent to users who submitted surveys';
COMMENT ON COLUMN sessions.user_email IS 'Email address of the user who took the survey (if provided)';
COMMENT ON COLUMN brief_resubmit_requests.request_status IS 'Status of resubmit request: sent, responded, expired';
