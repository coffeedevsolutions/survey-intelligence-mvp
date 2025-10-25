-- Row-Level Security (RLS) Implementation for Tenant Isolation
-- This migration enables RLS on all tenant-scoped tables to prevent cross-tenant data leaks
-- 
-- Rollout Strategy:
-- 1. Preflight: Create policies but don't enable RLS yet
-- 2. Enable: Turn on RLS for testing
-- 3. Verify: Run isolation tests
-- 4. Force: Remove bypassrls privileges

-- Create application role for the application to use
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'application_role') THEN
        CREATE ROLE application_role;
    END IF;
END $$;

-- Grant necessary permissions to application_role
GRANT USAGE ON SCHEMA public TO application_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_role;

-- Enable RLS on all tenant-scoped tables
-- Core tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;

-- AI tables
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_domain_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_embeddings ENABLE ROW LEVEL SECURITY;

-- Campaign tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

-- Stack tables
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_policies ENABLE ROW LEVEL SECURITY;

-- Access tables
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_org_roles ENABLE ROW LEVEL SECURITY;

-- Solutions tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solutions') THEN
        ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'epics') THEN
        ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stories') THEN
        ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jira_exports') THEN
        ALTER TABLE jira_exports ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_templates') THEN
        ALTER TABLE pm_templates ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_favorites') THEN
        ALTER TABLE analytics_favorites ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for each table
-- Template: CREATE POLICY policy_name ON table_name FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);

-- Core tables policies
CREATE POLICY sessions_org_isolation ON sessions FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY answers_org_isolation ON answers FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY facts_org_isolation ON facts FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY project_briefs_org_isolation ON project_briefs FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);

-- AI tables policies
CREATE POLICY ai_prompt_templates_org_isolation ON ai_prompt_templates FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY ai_domain_knowledge_org_isolation ON ai_domain_knowledge FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY ai_session_logs_org_isolation ON ai_session_logs FOR ALL TO application_role USING (
    session_id IN (
        SELECT id FROM sessions WHERE org_id = current_setting('app.current_org_id')::bigint
    )
);
CREATE POLICY conversation_history_org_isolation ON conversation_history FOR ALL TO application_role USING (
    session_id IN (
        SELECT id FROM sessions WHERE org_id = current_setting('app.current_org_id')::bigint
    )
);
CREATE POLICY conversation_state_org_isolation ON conversation_state FOR ALL TO application_role USING (
    session_id IN (
        SELECT id FROM sessions WHERE org_id = current_setting('app.current_org_id')::bigint
    )
);
CREATE POLICY ai_conversation_insights_org_isolation ON ai_conversation_insights FOR ALL TO application_role USING (
    session_id IN (
        SELECT id FROM sessions WHERE org_id = current_setting('app.current_org_id')::bigint
    )
);
CREATE POLICY question_embeddings_org_isolation ON question_embeddings FOR ALL TO application_role USING (
    session_id IN (
        SELECT id FROM sessions WHERE org_id = current_setting('app.current_org_id')::bigint
    )
);

-- Campaign tables policies
CREATE POLICY campaigns_org_isolation ON campaigns FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY survey_flows_org_isolation ON survey_flows FOR ALL TO application_role USING (
    campaign_id IN (
        SELECT id FROM campaigns WHERE org_id = current_setting('app.current_org_id')::bigint
    )
);
CREATE POLICY survey_links_org_isolation ON survey_links FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY survey_templates_org_isolation ON survey_templates FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);

-- Stack tables policies
CREATE POLICY systems_org_isolation ON systems FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY capabilities_org_isolation ON capabilities FOR ALL TO application_role USING (
    system_id IN (
        SELECT id FROM systems WHERE org_id = current_setting('app.current_org_id')::bigint
    )
);
CREATE POLICY capability_synonyms_org_isolation ON capability_synonyms FOR ALL TO application_role USING (
    capability_id IN (
        SELECT c.id FROM capabilities c 
        JOIN systems s ON s.id = c.system_id 
        WHERE s.org_id = current_setting('app.current_org_id')::bigint
    )
);
CREATE POLICY stack_policies_org_isolation ON stack_policies FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);

-- Access tables policies
CREATE POLICY share_links_org_isolation ON share_links FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY invites_org_isolation ON invites FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);
CREATE POLICY user_org_roles_org_isolation ON user_org_roles FOR ALL TO application_role USING (org_id = current_setting('app.current_org_id')::bigint);

-- Solutions tables policies (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solutions') THEN
        EXECUTE 'CREATE POLICY solutions_org_isolation ON solutions FOR ALL TO application_role USING (org_id = current_setting(''app.current_org_id'')::bigint)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'epics') THEN
        EXECUTE 'CREATE POLICY epics_org_isolation ON epics FOR ALL TO application_role USING (org_id = current_setting(''app.current_org_id'')::bigint)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stories') THEN
        EXECUTE 'CREATE POLICY stories_org_isolation ON stories FOR ALL TO application_role USING (org_id = current_setting(''app.current_org_id'')::bigint)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jira_exports') THEN
        EXECUTE 'CREATE POLICY jira_exports_org_isolation ON jira_exports FOR ALL TO application_role USING (org_id = current_setting(''app.current_org_id'')::bigint)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_templates') THEN
        EXECUTE 'CREATE POLICY pm_templates_org_isolation ON pm_templates FOR ALL TO application_role USING (org_id = current_setting(''app.current_org_id'')::bigint)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_favorites') THEN
        EXECUTE 'CREATE POLICY analytics_favorites_org_isolation ON analytics_favorites FOR ALL TO application_role USING (org_id = current_setting(''app.current_org_id'')::bigint)';
    END IF;
END $$;

-- Create indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_sessions_org_id ON sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_answers_org_id ON answers(org_id);
CREATE INDEX IF NOT EXISTS idx_facts_org_id ON facts(org_id);
CREATE INDEX IF NOT EXISTS idx_project_briefs_org_id ON project_briefs(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_org_id ON ai_prompt_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_domain_knowledge_org_id ON ai_domain_knowledge(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_survey_links_org_id ON survey_links(org_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_org_id ON survey_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_systems_org_id ON systems(org_id);
CREATE INDEX IF NOT EXISTS idx_stack_policies_org_id ON stack_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_share_links_org_id ON share_links(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_org_id ON invites(org_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_org_id ON user_org_roles(org_id);

-- Add comments for documentation
COMMENT ON ROLE application_role IS 'Application role for tenant-isolated database access via RLS';
COMMENT ON POLICY sessions_org_isolation ON sessions IS 'Ensures sessions are only accessible within the same organization';
COMMENT ON POLICY answers_org_isolation ON answers IS 'Ensures answers are only accessible within the same organization';
COMMENT ON POLICY facts_org_isolation ON facts IS 'Ensures facts are only accessible within the same organization';
COMMENT ON POLICY project_briefs_org_isolation ON project_briefs IS 'Ensures project briefs are only accessible within the same organization';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'RLS policies created successfully. Next steps:';
    RAISE NOTICE '1. Test policies in staging environment';
    RAISE NOTICE '2. Run isolation verification tests';
    RAISE NOTICE '3. Update application to use application_role';
    RAISE NOTICE '4. Remove bypassrls privileges from application user';
END $$;
