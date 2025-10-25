-- Solutioning Feature Database Schema
-- Transforms reviewed briefs into structured work breakdown

-- Main solution container
CREATE TABLE IF NOT EXISTS solutions (
  id BIGSERIAL PRIMARY KEY,
  brief_id BIGINT REFERENCES project_briefs(id) ON DELETE CASCADE,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_duration_weeks INTEGER,
  estimated_effort_points INTEGER,
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Solution epics (high-level features/capabilities)
CREATE TABLE IF NOT EXISTS solution_epics (
  id BIGSERIAL PRIMARY KEY,
  solution_id BIGINT REFERENCES solutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  business_value TEXT,
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  estimated_story_points INTEGER,
  jira_epic_key TEXT, -- For future Jira sync
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User stories and technical stories
CREATE TABLE IF NOT EXISTS solution_stories (
  id BIGSERIAL PRIMARY KEY,
  epic_id BIGINT REFERENCES solution_epics(id) ON DELETE CASCADE,
  story_type TEXT DEFAULT 'user_story' CHECK (story_type IN ('user_story', 'technical_story', 'spike', 'bug')),
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT[],
  story_points INTEGER,
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  jira_issue_key TEXT, -- For future Jira sync
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual tasks within stories
CREATE TABLE IF NOT EXISTS solution_tasks (
  id BIGSERIAL PRIMARY KEY,
  story_id BIGINT REFERENCES solution_stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'development' CHECK (task_type IN ('development', 'testing', 'documentation', 'deployment', 'research')),
  estimated_hours DECIMAL(5,2),
  jira_issue_key TEXT, -- For future Jira sync
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requirements documentation
CREATE TABLE IF NOT EXISTS solution_requirements (
  id BIGSERIAL PRIMARY KEY,
  solution_id BIGINT REFERENCES solutions(id) ON DELETE CASCADE,
  requirement_type TEXT CHECK (requirement_type IN ('functional', 'technical', 'performance', 'security', 'compliance')),
  category TEXT, -- e.g., 'Authentication', 'Data Management', 'UI/UX'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  acceptance_criteria TEXT[],
  related_stories INTEGER[], -- Array of story IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Technical architecture components
CREATE TABLE IF NOT EXISTS solution_architecture (
  id BIGSERIAL PRIMARY KEY,
  solution_id BIGINT REFERENCES solutions(id) ON DELETE CASCADE,
  component_type TEXT CHECK (component_type IN ('frontend', 'backend', 'database', 'integration', 'infrastructure')),
  name TEXT NOT NULL,
  description TEXT,
  technology_stack TEXT[],
  dependencies TEXT[],
  complexity_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk and assumption tracking
CREATE TABLE IF NOT EXISTS solution_risks (
  id BIGSERIAL PRIMARY KEY,
  solution_id BIGINT REFERENCES solutions(id) ON DELETE CASCADE,
  risk_type TEXT CHECK (risk_type IN ('technical', 'business', 'timeline', 'resource', 'integration')),
  title TEXT NOT NULL,
  description TEXT,
  probability INTEGER CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER CHECK (impact >= 1 AND impact <= 5),
  mitigation_strategy TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_solutions_brief_id ON solutions (brief_id);
CREATE INDEX IF NOT EXISTS idx_solutions_org_id ON solutions (org_id);
CREATE INDEX IF NOT EXISTS idx_solution_epics_solution_id ON solution_epics (solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_stories_epic_id ON solution_stories (epic_id);
CREATE INDEX IF NOT EXISTS idx_solution_tasks_story_id ON solution_tasks (story_id);
CREATE INDEX IF NOT EXISTS idx_solution_requirements_solution_id ON solution_requirements (solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_architecture_solution_id ON solution_architecture (solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_risks_solution_id ON solution_risks (solution_id);

-- Add updated_at trigger for solutions table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_solutions_updated_at ON solutions;
CREATE TRIGGER update_solutions_updated_at
    BEFORE UPDATE ON solutions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
