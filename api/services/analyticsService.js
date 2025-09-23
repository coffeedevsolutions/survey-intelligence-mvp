/**
 * Analytics Service
 * Provides comprehensive analytics data for dashboard
 */

import { pool } from '../config/database.js';

export class AnalyticsService {
  
  /**
   * Get organizational analytics
   */
  async getOrganizationalAnalytics(orgId = null, timeRange = '30d') {
    const whereClause = orgId ? 'WHERE o.id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const dateFilter = this.getDateFilter(timeRange);
    
    const query = `
      SELECT 
        -- Growth Metrics
        COUNT(*) as total_organizations,
        COUNT(CASE WHEN o.created_at >= $${params.length + 1} THEN 1 END) as new_organizations,
        AVG(o.seats_used::float / NULLIF(o.seats_total, 0)) as avg_seat_utilization,
        AVG(o.seats_used) as avg_team_size,
        
        -- Plan Distribution
        COUNT(CASE WHEN o.plan = 'trial' THEN 1 END) as trial_orgs,
        COUNT(CASE WHEN o.plan = 'paid' THEN 1 END) as paid_orgs,
        
        -- Feature Adoption
        COUNT(CASE WHEN jc.id IS NOT NULL THEN 1 END) as jira_connected_orgs,
        COUNT(CASE WHEN pt.id IS NOT NULL THEN 1 END) as custom_template_orgs,
        COUNT(CASE WHEN o.document_settings->>'company_name' != '' THEN 1 END) as branded_orgs
        
      FROM organizations o
      LEFT JOIN jira_connections jc ON o.id = jc.org_id AND jc.is_active = true
      LEFT JOIN pm_templates pt ON o.id = pt.org_id AND pt.is_default = false
      ${whereClause}
    `;
    
    params.push(dateFilter);
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Analytics query error:', error);
      return {};
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(orgId = null, timeRange = '30d') {
    const whereClause = orgId ? 'WHERE uor.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const dateFilter = this.getDateFilter(timeRange);
    
    const query = `
      SELECT 
        -- User Metrics
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.created_at >= $${params.length + 1} THEN u.id END) as new_users,
        COUNT(DISTINCT CASE WHEN u.email_verified THEN u.id END) as verified_users,
        COUNT(DISTINCT CASE WHEN u.mfa_enabled THEN u.id END) as mfa_users,
        
        -- Role Distribution
        COUNT(CASE WHEN uor.role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN uor.role = 'reviewer' THEN 1 END) as reviewer_users,
        COUNT(CASE WHEN uor.role = 'member' THEN 1 END) as member_users,
        
        -- Activity Metrics
        AVG(user_stats.session_count) as avg_sessions_per_user,
        AVG(user_stats.brief_count) as avg_briefs_per_user
        
      FROM users u
      JOIN user_org_roles uor ON u.id = uor.user_id
      LEFT JOIN (
        SELECT 
          pb.created_by,
          COUNT(DISTINCT s.id) as session_count,
          COUNT(pb.id) as brief_count
        FROM project_briefs pb
        LEFT JOIN sessions s ON pb.session_id = s.id
        WHERE pb.created_at >= $${params.length + 1}
        GROUP BY pb.created_by
      ) user_stats ON u.id = user_stats.created_by
      ${whereClause}
    `;
    
    params.push(dateFilter);
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Analytics query error:', error);
      return {};
    }
  }

  /**
   * Get survey and conversation analytics
   */
  async getSurveyAnalytics(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND pb.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const dateFilter = this.getDateFilter(timeRange);
    
    const query = `
      SELECT 
        -- Survey Metrics
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN s.completed THEN s.id END) as completed_sessions,
        COUNT(DISTINCT pb.id) as total_briefs,
        
        -- Completion Rates
        COALESCE(ROUND(
          COUNT(DISTINCT CASE WHEN s.completed THEN s.id END)::float / 
          NULLIF(COUNT(DISTINCT s.id), 0) * 100, 2
        ), 0) as completion_rate,
        
        -- Conversation Quality
        AVG(cs.completion_percentage) as avg_completion_percentage,
        AVG(cs.ai_confidence) as avg_ai_confidence,
        AVG(cs.current_turn) as avg_conversation_turns,
        
        -- Content Metrics
        AVG(LENGTH(pb.summary_md)) as avg_brief_length,
        COUNT(DISTINCT ch.id) as total_conversation_turns,
        COUNT(DISTINCT aci.id) as total_ai_insights
        
      FROM sessions s
      LEFT JOIN project_briefs pb ON s.id = pb.session_id
      LEFT JOIN conversation_state cs ON s.id = cs.session_id
      LEFT JOIN conversation_history ch ON s.id = ch.session_id
      LEFT JOIN ai_conversation_insights aci ON s.id = aci.session_id
      WHERE s.created_at >= $${params.length + 1} ${orgFilter}
    `;
    
    params.push(dateFilter);
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Analytics query error:', error);
      return {};
    }
  }

  /**
   * Get solution engineering analytics
   */
  async getSolutionAnalytics(orgId = null, timeRange = '30d') {
    const whereClause = orgId ? 'WHERE sol.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const dateFilter = this.getDateFilter(timeRange);
    
    const query = `
      SELECT 
        -- Solution Metrics
        COUNT(DISTINCT sol.id) as total_solutions,
        AVG(sol.complexity_score) as avg_complexity,
        AVG(sol.estimated_duration_weeks) as avg_duration_weeks,
        AVG(sol.estimated_effort_points) as avg_effort_points,
        
        -- Status Distribution
        COUNT(CASE WHEN sol.status = 'draft' THEN 1 END) as draft_solutions,
        COUNT(CASE WHEN sol.status = 'approved' THEN 1 END) as approved_solutions,
        COUNT(CASE WHEN sol.status = 'in_progress' THEN 1 END) as in_progress_solutions,
        COUNT(CASE WHEN sol.status = 'completed' THEN 1 END) as completed_solutions,
        
        -- Work Breakdown
        COUNT(DISTINCT se.id) as total_epics,
        COUNT(DISTINCT ss.id) as total_stories,
        COUNT(DISTINCT st.id) as total_tasks,
        COUNT(DISTINCT sr.id) as total_requirements,
        
        -- Averages
        ROUND(COUNT(DISTINCT se.id)::float / NULLIF(COUNT(DISTINCT sol.id), 0), 2) as avg_epics_per_solution,
        ROUND(COUNT(DISTINCT ss.id)::float / NULLIF(COUNT(DISTINCT se.id), 0), 2) as avg_stories_per_epic,
        ROUND(COUNT(DISTINCT st.id)::float / NULLIF(COUNT(DISTINCT ss.id), 0), 2) as avg_tasks_per_story,
        
        -- Estimation Totals
        SUM(st.estimated_hours) as total_estimated_hours,
        AVG(st.estimated_hours) as avg_hours_per_task,
        SUM(ss.story_points) as total_story_points
        
      FROM solutions sol
      LEFT JOIN solution_epics se ON sol.id = se.solution_id
      LEFT JOIN solution_stories ss ON se.id = ss.epic_id
      LEFT JOIN solution_tasks st ON ss.id = st.story_id
      LEFT JOIN solution_requirements sr ON sol.id = sr.solution_id
      WHERE sol.created_at >= $${params.length + 1} ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
    `;
    
    params.push(dateFilter);
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Analytics query error:', error);
      return {};
    }
  }

  /**
   * Get detailed breakdowns for charts
   */
  async getDetailedAnalytics(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    const dateFilter = this.getDateFilter(timeRange);
    
    // Story type distribution
    const storyTypeQuery = `
      SELECT 
        ss.story_type,
        COUNT(*) as count,
        AVG(ss.story_points) as avg_story_points,
        AVG(ss.priority) as avg_priority
      FROM solution_stories ss
      JOIN solution_epics se ON ss.epic_id = se.id
      JOIN solutions sol ON se.solution_id = sol.id
      WHERE sol.created_at >= $${params.length + 1} ${orgFilter}
      GROUP BY ss.story_type
      ORDER BY count DESC
    `;
    
    // Task type distribution
    const taskTypeQuery = `
      SELECT 
        st.task_type,
        COUNT(*) as count,
        AVG(st.estimated_hours) as avg_hours,
        SUM(st.estimated_hours) as total_hours
      FROM solution_tasks st
      JOIN solution_stories ss ON st.story_id = ss.id
      JOIN solution_epics se ON ss.epic_id = se.id
      JOIN solutions sol ON se.solution_id = sol.id
      WHERE sol.created_at >= $${params.length + 1} ${orgFilter}
      GROUP BY st.task_type
      ORDER BY count DESC
    `;
    
    // Architecture component distribution
    const architectureQuery = `
      SELECT 
        sa.component_type,
        COUNT(*) as count,
        array_agg(DISTINCT tech) as technologies
      FROM solution_architecture sa
      JOIN solutions sol ON sa.solution_id = sol.id,
      LATERAL unnest(sa.technology_stack) as tech
      WHERE sol.created_at >= $${params.length + 1} ${orgFilter}
      GROUP BY sa.component_type
      ORDER BY count DESC
    `;
    
    // Time series data for growth charts
    const timeSeriesQuery = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(DISTINCT id) as solutions_created,
        AVG(complexity_score) as avg_complexity
      FROM solutions
      WHERE created_at >= $${params.length + 1} ${orgFilter}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `;
    
    params.push(dateFilter);
    
    const [storyTypes, taskTypes, architecture, timeSeries] = await Promise.all([
      pool.query(storyTypeQuery, params).catch(err => ({ rows: [] })),
      pool.query(taskTypeQuery, params).catch(err => ({ rows: [] })),
      pool.query(architectureQuery, params).catch(err => ({ rows: [] })),
      pool.query(timeSeriesQuery, params).catch(err => ({ rows: [] }))
    ]);
    
    return {
      storyTypeDistribution: storyTypes.rows,
      taskTypeDistribution: taskTypes.rows,
      architectureDistribution: architecture.rows,
      timeSeriesData: timeSeries.rows
    };
  }

  /**
   * Get Jira integration analytics
   */
  async getJiraAnalytics(orgId = null) {
    const whereClause = orgId ? 'WHERE sol.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const query = `
      SELECT 
        COUNT(DISTINCT jc.id) as total_connections,
        COUNT(DISTINCT CASE WHEN jc.is_active THEN jc.id END) as active_connections,
        COUNT(DISTINCT jpl.id) as total_project_links,
        COUNT(DISTINCT sol.id) as solutions_with_jira_export,
        COUNT(DISTINCT se.jira_epic_key) as exported_epics,
        COUNT(DISTINCT ss.jira_issue_key) as exported_stories,
        COUNT(DISTINCT st.jira_issue_key) as exported_tasks
        
      FROM solutions sol
      LEFT JOIN jira_connections jc ON sol.org_id = jc.org_id
      LEFT JOIN jira_project_links jpl ON jc.id = jpl.connection_id
      LEFT JOIN solution_epics se ON sol.id = se.solution_id
      LEFT JOIN solution_stories ss ON se.id = ss.epic_id
      LEFT JOIN solution_tasks st ON ss.id = st.story_id
      ${whereClause}
    `;
    
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Analytics query error:', error);
      return {};
    }
  }

  /**
   * Get AI insights analytics
   */
  async getAIInsightsAnalytics(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND pb.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    const dateFilter = this.getDateFilter(timeRange);
    
    const query = `
      SELECT 
        insight_type,
        COUNT(*) as total_insights,
        AVG(confidence) as avg_confidence,
        COUNT(DISTINCT aci.session_id) as sessions_with_insights
      FROM ai_conversation_insights aci
      JOIN sessions s ON aci.session_id = s.id
      LEFT JOIN project_briefs pb ON s.id = pb.session_id
      WHERE aci.created_at >= $${params.length + 1} ${orgFilter}
      GROUP BY insight_type
      ORDER BY total_insights DESC
    `;
    
    params.push(dateFilter);
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND pb.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    const dateFilter = this.getDateFilter(timeRange);
    
    const query = `
      SELECT 
        -- Performance Metrics
        AVG(EXTRACT(EPOCH FROM (pb.created_at - s.created_at))) as avg_brief_generation_time,
        AVG(EXTRACT(EPOCH FROM (sol.created_at - pb.created_at))) as avg_solution_generation_time,
        COUNT(DISTINCT CASE WHEN pb.created_at IS NOT NULL THEN s.id END)::float / 
          NULLIF(COUNT(DISTINCT s.id), 0) as brief_conversion_rate,
        COUNT(DISTINCT CASE WHEN sol.id IS NOT NULL THEN pb.id END)::float / 
          NULLIF(COUNT(DISTINCT pb.id), 0) as solution_conversion_rate
          
      FROM sessions s
      LEFT JOIN project_briefs pb ON s.id = pb.session_id
      LEFT JOIN solutions sol ON pb.id = sol.brief_id
      WHERE s.created_at >= $${params.length + 1} ${orgFilter}
    `;
    
    params.push(dateFilter);
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Analytics query error:', error);
      return {};
    }
  }

  /**
   * Helper method to get date filter based on time range
   */
  getDateFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

export const analyticsService = new AnalyticsService();
