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
   * Get previous period data for comparison
   */
  async getPreviousPeriodData(orgId = null, timeRange = '30d') {
    // For custom date ranges, we don't calculate previous period trends
    if (typeof timeRange === 'object' && timeRange.startDate && timeRange.endDate) {
      console.log('Skipping previous period data for custom date range');
      return {};
    }
    
    const dateFilter = this.getDateFilter(timeRange);
    const previousDateFilter = this.getPreviousPeriodFilter(timeRange);
    
    let params = [];
    let orgFilter = '';
    
    if (orgId) {
      params = [parseInt(orgId), previousDateFilter, dateFilter];
      orgFilter = 'AND s.org_id = $1::bigint';
    } else {
      params = [previousDateFilter, dateFilter];
      orgFilter = '';
    }
    
    const query = `
      SELECT 
        COUNT(DISTINCT CASE WHEN s.created_at >= $${orgId ? 2 : 1}::timestamp AND s.created_at < $${orgId ? 3 : 2}::timestamp THEN s.id END) as prev_new_requests,
        COUNT(DISTINCT CASE WHEN pb.review_status = 'pending' AND pb.created_at >= $${orgId ? 2 : 1}::timestamp AND pb.created_at < $${orgId ? 3 : 2}::timestamp THEN pb.id END) as prev_awaiting_review,
        COUNT(DISTINCT CASE WHEN pb.review_status = 'reviewed' AND pb.priority IS NOT NULL AND pb.created_at >= $${orgId ? 2 : 1}::timestamp AND pb.created_at < $${orgId ? 3 : 2}::timestamp THEN pb.id END) as prev_prioritized,
        COUNT(DISTINCT CASE WHEN pb.created_at >= $${orgId ? 2 : 1}::timestamp AND pb.created_at < $${orgId ? 3 : 2}::timestamp THEN pb.id END) as prev_total_briefs,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN pb.created_at >= $${orgId ? 2 : 1}::timestamp AND pb.created_at < $${orgId ? 3 : 2}::timestamp THEN pb.id END) = 0 THEN 0
          ELSE ROUND((COUNT(DISTINCT CASE WHEN sol.jira_exported_at IS NOT NULL AND pb.created_at >= $${orgId ? 2 : 1}::timestamp AND pb.created_at < $${orgId ? 3 : 2}::timestamp THEN pb.id END)::numeric / COUNT(DISTINCT CASE WHEN pb.created_at >= $${orgId ? 2 : 1}::timestamp AND pb.created_at < $${orgId ? 3 : 2}::timestamp THEN pb.id END)::numeric * 100)::numeric, 2)
        END as prev_brief_to_backlog_conversion,
        COALESCE(
          ROUND(
            AVG(EXTRACT(EPOCH FROM (sol.jira_exported_at - pb.created_at)) / 86400)::numeric, 1
          ), 0
        ) as prev_avg_time_to_backlog_days
      FROM sessions s
      LEFT JOIN project_briefs pb ON s.id = pb.session_id
      LEFT JOIN solutions sol ON pb.id = sol.brief_id AND sol.jira_exported_at IS NOT NULL
      WHERE s.created_at >= $${orgId ? 2 : 1}::timestamp ${orgFilter}
    `;
    
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Previous period query error:', error);
      return {};
    }
  }

  /**
   * Get dashboard-specific analytics for intake and delivery overview
   */
  async getDashboardAnalytics(orgId = null, timeRange = '30d') {
    console.log('=== DASHBOARD ANALYTICS DEBUG START ===');
    console.log('Input params:', { orgId, timeRange });
    
    try {
      // First, let's check if we can connect to the database and see what tables exist
      console.log('🔍 Checking database connectivity...');
      const tableCheckQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sessions', 'project_briefs', 'campaigns', 'organizations')
        ORDER BY table_name
      `;
      
      const tableResult = await pool.query(tableCheckQuery);
      console.log('📋 Available tables:', tableResult.rows.map(r => r.table_name));
      
      // Check if we have any sessions at all
      console.log('🔢 Counting total sessions...');
      const sessionCountQuery = 'SELECT COUNT(*) as total_sessions FROM sessions';
      const sessionCountResult = await pool.query(sessionCountQuery);
      console.log('📊 Total sessions in database:', sessionCountResult.rows[0]);
      
      // Check if we have any sessions with org_id
      console.log('🏢 Checking sessions with org_id...');
      const orgSessionQuery = 'SELECT COUNT(*) as org_sessions FROM sessions WHERE org_id IS NOT NULL';
      const orgSessionResult = await pool.query(orgSessionQuery);
      console.log('📈 Sessions with org_id:', orgSessionResult.rows[0]);
      
      // Check if we have any sessions for the specific org
      if (orgId) {
        console.log(`🎯 Checking sessions for org ${orgId}...`);
        const specificOrgQuery = 'SELECT COUNT(*) as specific_org_sessions FROM sessions WHERE org_id = $1::bigint';
        const specificOrgResult = await pool.query(specificOrgQuery, [parseInt(orgId)]);
        console.log(`📊 Sessions for org ${orgId}:`, specificOrgResult.rows[0]);
      }
      
      // Check recent sessions regardless of org
      console.log('📅 Getting recent sessions...');
      const recentSessionsQuery = `
        SELECT id, org_id, campaign_id, created_at 
        FROM sessions 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      const recentSessionsResult = await pool.query(recentSessionsQuery);
      console.log('🕒 Recent sessions:', recentSessionsResult.rows);
      
    } catch (error) {
      console.error('❌ Database connectivity check failed:', error);
      return {
        error: 'Database connectivity issue',
        message: error.message,
        stack: error.stack
      };
    }
    
    // Build parameters with explicit types
    const dateFilter = this.getDateFilter(timeRange);
    console.log('📅 Date filter:', dateFilter);
    
    let params = [];
    let orgFilter = '';
    let dateFilterClause = '';
    
    // Handle custom date range
    if (typeof timeRange === 'object' && timeRange.startDate && timeRange.endDate) {
      const startDate = new Date(timeRange.startDate);
      const endDate = new Date(timeRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      if (orgId) {
        params = [parseInt(orgId), startDate, endDate];
        orgFilter = 'AND s.org_id = $1::bigint';
        dateFilterClause = 'AND s.created_at >= $2::timestamp AND s.created_at <= $3::timestamp';
      } else {
        params = [startDate, endDate];
        orgFilter = '';
        dateFilterClause = 'AND s.created_at >= $1::timestamp AND s.created_at <= $2::timestamp';
      }
    } else {
      if (orgId) {
        params = [parseInt(orgId), dateFilter];
        orgFilter = 'AND s.org_id = $1::bigint';
        dateFilterClause = 'AND s.created_at >= $2::timestamp';
      } else {
        params = [dateFilter];
        orgFilter = '';
        dateFilterClause = 'AND s.created_at >= $1::timestamp';
      }
    }
    
    console.log('🔧 Query parameters:', { params, orgFilter, dateFilterClause });
    
    // Determine parameter indices based on the parameter structure
    let startDateParamIndex, endDateParamIndex;
    if (typeof timeRange === 'object' && timeRange.startDate && timeRange.endDate) {
      // Custom date range: [orgId?, startDate, endDate]
      startDateParamIndex = orgId ? 2 : 1;
      endDateParamIndex = orgId ? 3 : 2;
    } else {
      // Predefined range: [orgId?, dateFilter]
      startDateParamIndex = orgId ? 2 : 1;
      endDateParamIndex = null; // No end date for predefined ranges
    }
    
    try {
      // Main dashboard metrics query - simplified and with explicit parameter types
      console.log('📊 Executing main metrics query...');
      const mainQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN s.created_at >= $${startDateParamIndex}::timestamp THEN s.id END) as new_requests,
          COUNT(DISTINCT CASE WHEN pb.review_status = 'pending' THEN pb.id END) as awaiting_review,
          COUNT(DISTINCT CASE WHEN pb.review_status = 'reviewed' AND pb.priority IS NOT NULL THEN pb.id END) as prioritized,
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT pb.id) as total_briefs,
          CASE 
            WHEN COUNT(DISTINCT pb.id) = 0 THEN 0
            ELSE ROUND((COUNT(DISTINCT CASE WHEN sol.jira_exported_at IS NOT NULL THEN pb.id END)::numeric / COUNT(DISTINCT pb.id)::numeric * 100)::numeric, 2)
          END as brief_to_backlog_conversion,
          COALESCE(
            ROUND(
              AVG(EXTRACT(EPOCH FROM (sol.jira_exported_at - pb.created_at)) / 86400)::numeric, 1
            ), 0
          ) as avg_time_to_backlog_days
        FROM sessions s
        LEFT JOIN project_briefs pb ON s.id = pb.session_id
        LEFT JOIN solutions sol ON pb.id = sol.brief_id AND sol.jira_exported_at IS NOT NULL
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
      `;
      
      console.log('🔍 Main query:', mainQuery);
      console.log('📝 Main query params:', params);
      
      const mainResult = await pool.query(mainQuery, params);
      const mainData = mainResult.rows[0] || {};
      console.log('✅ Main query result:', mainData);
      
      // Get intake volume over time by campaign
      console.log('📈 Getting intake volume data...');
      const intakeVolumeQuery = `
        SELECT 
          DATE_TRUNC('day', s.created_at) as date,
          COALESCE(c.id, 0) as campaign_id,
          COALESCE(c.name, 'No Campaign') as campaign_name,
          COUNT(DISTINCT s.id) as requests
        FROM sessions s
        LEFT JOIN campaigns c ON s.campaign_id = c.id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        GROUP BY DATE_TRUNC('day', s.created_at), c.id, c.name
        ORDER BY date DESC
        LIMIT 30
      `;
      
      const intakeResult = await pool.query(intakeVolumeQuery, params);
      console.log('📊 Intake volume result:', intakeResult.rows.length, 'rows');
      
      // Get requests by category (campaign)
      console.log('📋 Getting category data...');
      const categoryQuery = `
        SELECT 
          COALESCE(c.id, 0) as campaign_id,
          COALESCE(c.name, 'No Campaign') as campaign_name,
          COUNT(DISTINCT s.id) as count
        FROM sessions s
        LEFT JOIN campaigns c ON s.campaign_id = c.id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        GROUP BY c.id, c.name
        ORDER BY count DESC
        LIMIT 10
      `;
      
      const categoryResult = await pool.query(categoryQuery, params);
      console.log('📊 Category result:', categoryResult.rows.length, 'rows');
      
      // Get status distribution
      console.log('📊 Getting status distribution...');
      const statusQuery = `
        SELECT 
          CASE 
            WHEN pb.id IS NULL THEN 'Incomplete survey'
            WHEN pb.review_status = 'pending' THEN 'Awaiting Review'
            WHEN pb.review_status = 'reviewed' AND pb.priority IS NOT NULL THEN 'Prioritized'
            WHEN pb.review_status = 'reviewed' AND pb.priority IS NULL THEN 'Needs Info'
            ELSE 'Rejected'
          END as status,
          COUNT(DISTINCT s.id) as count
        FROM sessions s
        LEFT JOIN project_briefs pb ON s.id = pb.session_id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        GROUP BY 
          CASE 
            WHEN pb.id IS NULL THEN 'Incomplete survey'
            WHEN pb.review_status = 'pending' THEN 'Awaiting Review'
            WHEN pb.review_status = 'reviewed' AND pb.priority IS NOT NULL THEN 'Prioritized'
            WHEN pb.review_status = 'reviewed' AND pb.priority IS NULL THEN 'Needs Info'
            ELSE 'Rejected'
          END
      `;
      
      const statusResult = await pool.query(statusQuery, params);
      console.log('📊 Status result:', statusResult.rows.length, 'rows');
      
      // Get submission patterns (heatmap data)
      console.log('🔥 Getting heatmap data...');
      const heatmapQuery = `
        SELECT 
          EXTRACT(DOW FROM s.created_at) as day_of_week,
          EXTRACT(HOUR FROM s.created_at) as hour_of_day,
          COUNT(*) as submissions
        FROM sessions s
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        GROUP BY EXTRACT(DOW FROM s.created_at), EXTRACT(HOUR FROM s.created_at)
        ORDER BY day_of_week, hour_of_day
      `;
      
      const heatmapResult = await pool.query(heatmapQuery, params);
      console.log('📊 Heatmap result:', heatmapResult.rows.length, 'rows');
      
      // Get top active campaigns
      console.log('🏆 Getting campaigns data...');
      const campaignsQuery = `
        SELECT 
          COALESCE(c.id, 0) as id,
          COALESCE(c.name, 'No Campaign') as name,
          COALESCE(c.purpose, '') as purpose,
          COUNT(DISTINCT s.id) as requests,
          CASE 
            WHEN COUNT(DISTINCT s.id) = 0 THEN 0
            ELSE ROUND((COUNT(DISTINCT CASE WHEN pb.id IS NOT NULL THEN s.id END)::numeric / COUNT(DISTINCT s.id)::numeric * 100)::numeric, 2)
          END as conversion_rate,
          CASE WHEN c.is_active IS NOT FALSE THEN 'Active' ELSE 'Paused' END as status
        FROM sessions s
        LEFT JOIN campaigns c ON s.campaign_id = c.id
        LEFT JOIN project_briefs pb ON s.id = pb.session_id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        GROUP BY c.id, c.name, c.purpose, c.is_active
        ORDER BY requests DESC
        LIMIT 10
      `;
      
      const campaignsResult = await pool.query(campaignsQuery, params);
      console.log('📊 Campaigns result:', campaignsResult.rows.length, 'rows');
      
      // Get recently generated documents
      console.log('📄 Getting recent documents...');
      const recentDocsQuery = `
        SELECT 
          pb.id,
          pb.title,
          pb.created_at,
          pb.review_status,
          s.id as session_id,
          COALESCE(c.name, 'No Campaign') as campaign_name,
          CASE 
            WHEN pb.review_status = 'reviewed' THEN 'Ready for solutioning'
            ELSE 'Awaiting Review'
          END as status
        FROM project_briefs pb
        LEFT JOIN sessions s ON pb.session_id = s.id
        LEFT JOIN campaigns c ON s.campaign_id = c.id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        ORDER BY pb.created_at DESC
        LIMIT 10
      `;
      
      const recentDocsResult = await pool.query(recentDocsQuery, params);
      console.log('📊 Recent docs result:', recentDocsResult.rows.length, 'rows');
      
      // Get additional funnel data
      console.log('🔢 Getting funnel data...');
      const funnelQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN pb.review_status = 'reviewed' AND pb.priority IS NULL THEN pb.id END) as needs_info,
          COUNT(DISTINCT CASE WHEN pb.review_status = 'reviewed' AND pb.priority IS NULL THEN pb.id END) as rejected,
          COUNT(DISTINCT s.id) as solutions_generated,
          COUNT(DISTINCT CASE WHEN s.jira_exported_at IS NOT NULL THEN s.id END) as jira_exported
        FROM project_briefs pb
        LEFT JOIN sessions sess ON pb.session_id = sess.id
        LEFT JOIN solutions s ON pb.id = s.brief_id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
      `;
      
      const funnelResult = await pool.query(funnelQuery, params);
      const funnelData = funnelResult.rows[0] || {};
      console.log('📊 Funnel data:', funnelData);

      // Get previous period data for trend calculations
      console.log('📈 Getting previous period data...');
      const previousPeriodData = await this.getPreviousPeriodData(orgId, timeRange);
      console.log('📊 Previous period data:', previousPeriodData);

      // Calculate trend percentages
      const calculateTrend = (current, previous) => {
        if (!previous || previous === 0) {
          // If previous period is 0 or doesn't exist, treat as 100% increase
          return current > 0 ? 100 : 0;
        }
        return Math.round(((current - previous) / previous) * 100);
      };

      const trends = {
        newRequestsTrend: calculateTrend(mainData.new_requests || 0, previousPeriodData.prev_new_requests || 0),
        awaitingReviewTrend: calculateTrend(mainData.awaiting_review || 0, previousPeriodData.prev_awaiting_review || 0),
        prioritizedTrend: calculateTrend(mainData.prioritized || 0, previousPeriodData.prev_prioritized || 0),
        avgTimeToBacklogTrend: calculateTrend(
          previousPeriodData.prev_avg_time_to_backlog_days || 0, 
          mainData.avg_time_to_backlog_days || 0
        ), // Inverted because lower time is better
        briefToBacklogConversionTrend: calculateTrend(
          mainData.brief_to_backlog_conversion || 0, 
          previousPeriodData.prev_brief_to_backlog_conversion || 0
        )
      };

      const result = {
        ...mainData,
        ...funnelData,
        ...trends,
        intakeVolumeOverTime: intakeResult.rows,
        requestsByCategory: categoryResult.rows,
        statusDistribution: statusResult.rows,
        submissionPatterns: heatmapResult.rows,
        topActiveCampaigns: campaignsResult.rows,
        recentlyGeneratedDocuments: recentDocsResult.rows
      };
      
      console.log('✅ Final dashboard result keys:', Object.keys(result));
      console.log('📊 Final dashboard result summary:', {
        new_requests: result.new_requests,
        total_sessions: result.total_sessions,
        total_briefs: result.total_briefs,
        intakeVolumeRows: result.intakeVolumeOverTime.length,
        categoryRows: result.requestsByCategory.length,
        statusRows: result.statusDistribution.length,
        heatmapRows: result.submissionPatterns.length,
        campaignRows: result.topActiveCampaigns.length,
        docRows: result.recentlyGeneratedDocuments.length
      });
      console.log('=== DASHBOARD ANALYTICS DEBUG END ===');
      return result;
      
    } catch (error) {
      console.error('❌ Dashboard analytics query error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      });
      console.log('=== DASHBOARD ANALYTICS DEBUG END (ERROR) ===');
      return {
        error: 'Query execution failed',
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      };
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
   * Get user behavior and engagement analytics
   */
  async getUserBehaviorAnalytics(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND s.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    // Handle custom date range
    let dateFilterClause = '';
    let startDateParamIndex, endDateParamIndex;
    
    if (typeof timeRange === 'object' && timeRange.startDate && timeRange.endDate) {
      const startDate = new Date(timeRange.startDate);
      const endDate = new Date(timeRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      if (orgId) {
        params.push(startDate, endDate);
        dateFilterClause = 'AND s.created_at >= $2::timestamp AND s.created_at <= $3::timestamp';
        startDateParamIndex = 2;
        endDateParamIndex = 3;
      } else {
        params.push(startDate, endDate);
        dateFilterClause = 'AND s.created_at >= $1::timestamp AND s.created_at <= $2::timestamp';
        startDateParamIndex = 1;
        endDateParamIndex = 2;
      }
    } else {
      const dateFilter = this.getDateFilter(timeRange);
      if (orgId) {
        params.push(dateFilter);
        dateFilterClause = 'AND s.created_at >= $2::timestamp';
        startDateParamIndex = 2;
      } else {
        params.push(dateFilter);
        dateFilterClause = 'AND s.created_at >= $1::timestamp';
        startDateParamIndex = 1;
      }
    }

    // Create separate filter clauses for subqueries to avoid table alias conflicts
    const subqueryOrgFilter = orgId ? 'AND s2.org_id = $1' : '';
    const subqueryDateFilter = (() => {
      if (typeof timeRange === 'object' && timeRange.startDate && timeRange.endDate) {
        if (orgId) {
          return 'AND s2.created_at >= $2::timestamp AND s2.created_at <= $3::timestamp';
        } else {
          return 'AND s2.created_at >= $1::timestamp AND s2.created_at <= $2::timestamp';
        }
      } else {
        if (orgId) {
          return 'AND s2.created_at >= $2::timestamp';
        } else {
          return 'AND s2.created_at >= $1::timestamp';
        }
      }
    })();

    // Create filter clauses for main query subqueries (no table alias)
    const mainSubqueryOrgFilter = orgId ? 'AND org_id = $1' : '';
    const mainSubqueryDateFilter = (() => {
      if (typeof timeRange === 'object' && timeRange.startDate && timeRange.endDate) {
        if (orgId) {
          return 'AND created_at >= $2::timestamp AND created_at <= $3::timestamp';
        } else {
          return 'AND created_at >= $1::timestamp AND created_at <= $2::timestamp';
        }
      } else {
        if (orgId) {
          return 'AND created_at >= $2::timestamp';
        } else {
          return 'AND created_at >= $1::timestamp';
        }
      }
    })();

    try {
      // Simplified approach - just get basic metrics without complex subqueries
      const basicQuery = `
        SELECT 
          -- Basic session metrics
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN s.completed = true THEN 1 END) as completed_sessions,
          ROUND(
            (COUNT(CASE WHEN s.completed = true THEN 1 END)::float / 
            NULLIF(COUNT(*), 0) * 100)::numeric, 2
          ) as completion_rate,
          
          -- User metrics (fixed)
          COUNT(DISTINCT s.user_email) FILTER (WHERE s.user_email IS NOT NULL) as unique_users,
          COUNT(DISTINCT s.user_email) FILTER (WHERE s.user_email IS NOT NULL) as total_user_emails,
          
          -- Duration metrics (fixed - handle NULL values and zero duration)
          AVG(
            CASE 
              WHEN s.updated_at IS NOT NULL AND s.created_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60.0
              ELSE NULL 
            END
          ) as avg_session_duration_minutes,
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY 
              CASE 
                WHEN s.updated_at IS NOT NULL AND s.created_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60.0
                ELSE NULL 
              END
          ) as median_session_duration_minutes,
          
          -- More realistic duration metrics (excluding extreme outliers > 8 hours)
          AVG(
            CASE 
              WHEN s.updated_at IS NOT NULL AND s.created_at IS NOT NULL 
              AND EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60.0 <= 480
              THEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60.0
              ELSE NULL 
            END
          ) as realistic_avg_duration_minutes,
          
          -- Question metrics
          AVG(cs.current_turn) as avg_questions_asked,
          AVG(CASE WHEN s.completed = true THEN cs.current_turn ELSE NULL END) as avg_questions_completed,
          AVG(CASE WHEN s.completed = false THEN cs.current_turn ELSE NULL END) as avg_questions_incomplete,
          
          -- Debug info
          COUNT(CASE WHEN s.user_email IS NOT NULL THEN 1 END) as sessions_with_email,
          COUNT(CASE WHEN s.updated_at IS NOT NULL AND s.created_at IS NOT NULL THEN 1 END) as sessions_with_duration,
          COUNT(CASE WHEN cs.current_turn IS NOT NULL THEN 1 END) as sessions_with_questions,
          MIN(s.created_at) as earliest_session,
          MAX(s.created_at) as latest_session
          
        FROM sessions s
        LEFT JOIN conversation_state cs ON s.id = cs.session_id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
      `;
      
      console.log('Executing basic user behavior query...');
      console.log('Query:', basicQuery);
      console.log('Params:', params);
      const basicResult = await pool.query(basicQuery, params);
      const basicData = basicResult.rows[0] || {};
      console.log('Basic query result:', basicData);
      console.log('Debug info:', {
        sessions_with_email: basicData.sessions_with_email,
        sessions_with_duration: basicData.sessions_with_duration,
        sessions_with_questions: basicData.sessions_with_questions,
        avg_questions_asked: basicData.avg_questions_asked,
        avg_questions_completed: basicData.avg_questions_completed,
        avg_questions_incomplete: basicData.avg_questions_incomplete,
        earliest_session: basicData.earliest_session,
        latest_session: basicData.latest_session
      });
      
      // Quick check if conversation_state table has any data
      try {
        const quickCheckQuery = `SELECT COUNT(*) as total_conversation_states FROM conversation_state`;
        const quickCheckResult = await pool.query(quickCheckQuery);
        console.log('🔍 Total conversation states in database:', quickCheckResult.rows[0]);
        
        // Also check conversation_history
        const historyCheckQuery = `SELECT COUNT(*) as total_conversation_history FROM conversation_history`;
        const historyCheckResult = await pool.query(historyCheckQuery);
        console.log('🔍 Total conversation history records:', historyCheckResult.rows[0]);
      } catch (error) {
        console.log('❌ Quick check failed:', error.message);
      }
      
      // Let's also check a few sample sessions to see what the data looks like
      try {
        const sampleQuery = `
          SELECT 
            s.id, 
            s.created_at, 
            s.updated_at, 
            s.completed, 
            s.user_email,
            cs.current_turn,
            cs.completion_percentage,
            cs.ai_confidence,
            EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 as duration_minutes
          FROM sessions s
          LEFT JOIN conversation_state cs ON s.id = cs.session_id
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
          ORDER BY s.created_at DESC
          LIMIT 5
        `;
        const sampleResult = await pool.query(sampleQuery, params);
        console.log('📊 Sample sessions with conversation state:', sampleResult.rows);
        
        // Also check if there are ANY sessions with questions (no time filter)
        const anyQuestionsQuery = `
          SELECT 
            COUNT(DISTINCT s.id) as sessions_with_questions,
            AVG(cs.current_turn) as avg_questions_any_time
          FROM sessions s
          LEFT JOIN conversation_state cs ON s.id = cs.session_id
          WHERE s.org_id = $1 AND cs.current_turn > 0
        `;
        const anyQuestionsResult = await pool.query(anyQuestionsQuery, [orgId]);
        console.log('📊 Sessions with questions (any time):', anyQuestionsResult.rows[0]);
        
        // Check conversation_history for any questions
        const historyQuestionsQuery = `
          SELECT 
            COUNT(DISTINCT session_id) as sessions_with_history_questions,
            AVG(question_count) as avg_questions_from_history
          FROM (
            SELECT session_id, COUNT(*) as question_count
            FROM conversation_history
            GROUP BY session_id
          ) question_counts
        `;
        const historyQuestionsResult = await pool.query(historyQuestionsQuery);
        console.log('📊 Sessions with questions from history:', historyQuestionsResult.rows[0]);
        
        // Check conversation state data specifically
        const conversationStateQuery = `
          SELECT 
            COUNT(*) as total_conversation_states,
            COUNT(CASE WHEN current_turn > 0 THEN 1 END) as states_with_questions,
            AVG(current_turn) as avg_current_turn,
            MIN(current_turn) as min_current_turn,
            MAX(current_turn) as max_current_turn
          FROM conversation_state cs
          JOIN sessions s ON cs.session_id = s.id
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        `;
        const conversationResult = await pool.query(conversationStateQuery, params);
        console.log('Conversation state analysis:', conversationResult.rows[0]);
        
        // Alternative: Check conversation_history table for actual question counts
        const conversationHistoryQuery = `
          SELECT 
            COUNT(DISTINCT ch.session_id) as sessions_with_history,
            AVG(question_counts.question_count) as avg_questions_from_history,
            MIN(question_counts.question_count) as min_questions,
            MAX(question_counts.question_count) as max_questions
          FROM conversation_history ch
          JOIN sessions s ON ch.session_id = s.id
          JOIN (
            SELECT session_id, COUNT(*) as question_count
            FROM conversation_history
            GROUP BY session_id
          ) question_counts ON ch.session_id = question_counts.session_id
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        `;
        try {
          const historyResult = await pool.query(conversationHistoryQuery, params);
          console.log('Conversation history analysis:', historyResult.rows[0]);
        } catch (error) {
          console.log('Conversation history query failed:', error.message);
        }
        
        // Check for extreme durations
        const extremeDurationQuery = `
          SELECT 
            COUNT(*) as extreme_duration_count,
            MAX(EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60) as max_duration_minutes,
            AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60) as avg_duration_minutes
          FROM sessions s
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
          AND EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 > 120
        `;
        const extremeResult = await pool.query(extremeDurationQuery, params);
        console.log('Extreme duration sessions (>2 hours):', extremeResult.rows[0]);
        
      } catch (error) {
        console.log('Sample query failed:', error.message);
      }
      
      // Get additional metrics with separate queries
      let responseMetrics = { avg_response_length: 0, median_response_length: 0, total_responses: 0 };
      let conversationMetrics = { avg_conversation_turns: 0, avg_completion_percentage: 0, avg_ai_confidence: 0 };
      let briefMetrics = { total_briefs: 0, avg_brief_length: 0 };
      let questionMetrics = { avg_questions_asked: 0, avg_questions_completed: 0, avg_questions_incomplete: 0 };
      
      try {
        // Response metrics
        const responseQuery = `
          SELECT 
            AVG(LENGTH(a.text)) as avg_response_length,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(a.text)) as median_response_length,
            COUNT(DISTINCT a.id) as total_responses
          FROM answers a 
          JOIN sessions s ON a.session_id = s.id 
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        `;
        const responseResult = await pool.query(responseQuery, params);
        responseMetrics = responseResult.rows[0] || responseMetrics;
      } catch (error) {
        console.log('Response metrics query failed:', error.message);
      }
      
      try {
        // First check if conversation_state table has any data
        const conversationCheckQuery = `
          SELECT COUNT(*) as total_conversation_states
          FROM conversation_state cs 
          JOIN sessions s ON cs.session_id = s.id 
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        `;
        const conversationCheckResult = await pool.query(conversationCheckQuery, params);
        console.log('Conversation states count:', conversationCheckResult.rows[0]);
        
        // Conversation metrics
        const conversationQuery = `
          SELECT 
            AVG(cs.current_turn) as avg_conversation_turns,
            AVG(cs.completion_percentage) as avg_completion_percentage,
            AVG(cs.ai_confidence) as avg_ai_confidence
          FROM conversation_state cs 
          JOIN sessions s ON cs.session_id = s.id 
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        `;
        const conversationResult = await pool.query(conversationQuery, params);
        conversationMetrics = conversationResult.rows[0] || conversationMetrics;
        console.log('Conversation metrics result:', conversationMetrics);
      } catch (error) {
        console.log('Conversation metrics query failed:', error.message);
      }
      
      try {
        // Brief metrics
        const briefQuery = `
          SELECT 
            COUNT(DISTINCT pb.id) as total_briefs,
            AVG(LENGTH(pb.summary_md)) as avg_brief_length
          FROM project_briefs pb 
          JOIN sessions s ON pb.session_id = s.id 
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        `;
        const briefResult = await pool.query(briefQuery, params);
        briefMetrics = briefResult.rows[0] || briefMetrics;
      } catch (error) {
        console.log('Brief metrics query failed:', error.message);
      }
      
      // Try to get question metrics from conversation_history as fallback
      try {
        console.log('🔄 Attempting to get question metrics from conversation_history...');
        const questionQuery = `
          SELECT 
            AVG(question_counts.question_count) as avg_questions_asked,
            AVG(CASE WHEN s.completed = true THEN question_counts.question_count ELSE NULL END) as avg_questions_completed,
            AVG(CASE WHEN s.completed = false THEN question_counts.question_count ELSE NULL END) as avg_questions_incomplete
          FROM sessions s
          JOIN (
            SELECT session_id, COUNT(*) as question_count
            FROM conversation_history
            GROUP BY session_id
          ) question_counts ON s.id = question_counts.session_id
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        `;
        const questionResult = await pool.query(questionQuery, params);
        questionMetrics = questionResult.rows[0] || questionMetrics;
        console.log('✅ Question metrics from conversation_history:', questionMetrics);
        
        // If we got data from conversation_history, use it
        if (questionMetrics.avg_questions_asked > 0) {
          console.log('✅ Using conversation_history data for question metrics');
        } else {
          console.log('⚠️ No question data found in conversation_history either');
        }
      } catch (error) {
        console.log('❌ Question metrics query failed:', error.message);
      }

      // Session duration distribution
      let durationResult = { rows: [] };
      try {
        console.log('Executing duration distribution query...');
        const durationDistributionQuery = `
          WITH duration_ranges AS (
            SELECT 
              CASE 
                WHEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 < 2 THEN 'Quick (0-2 min)'
                WHEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 < 10 THEN 'Standard (2-10 min)'
                ELSE 'Long (10+ min)'
              END as duration_range
            FROM sessions s
            WHERE 1=1 ${orgFilter} ${dateFilterClause}
          )
          SELECT 
            duration_range,
            COUNT(*) as count,
            ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM sessions s2 WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) * 100)::numeric, 1) as percentage
          FROM duration_ranges
          GROUP BY duration_range
          ORDER BY 
            CASE duration_range
              WHEN 'Quick (0-2 min)' THEN 1
              WHEN 'Standard (2-10 min)' THEN 2
              WHEN 'Long (10+ min)' THEN 3
            END
        `;
        
        durationResult = await pool.query(durationDistributionQuery, params);
      } catch (error) {
        console.error('Duration distribution query failed:', error);
        durationResult = { rows: [] };
      }

      // Response length distribution
      let responseLengthResult = { rows: [] };
      try {
        console.log('Executing response length distribution query...');
        const responseLengthQuery = `
          WITH length_ranges AS (
            SELECT 
              CASE 
                WHEN LENGTH(a.text) < 50 THEN '0-50 chars'
                WHEN LENGTH(a.text) < 100 THEN '50-100 chars'
                WHEN LENGTH(a.text) < 200 THEN '100-200 chars'
                WHEN LENGTH(a.text) < 500 THEN '200-500 chars'
                ELSE '500+ chars'
              END as length_range
            FROM answers a
            JOIN sessions s ON a.session_id = s.id
            WHERE 1=1 ${orgFilter} ${dateFilterClause}
          )
          SELECT 
            length_range,
            COUNT(*) as count,
            ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM answers a2 JOIN sessions s2 ON a2.session_id = s2.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) * 100)::numeric, 1) as percentage
          FROM length_ranges
          GROUP BY length_range
          ORDER BY 
            CASE length_range
              WHEN '0-50 chars' THEN 1
              WHEN '50-100 chars' THEN 2
              WHEN '100-200 chars' THEN 3
              WHEN '200-500 chars' THEN 4
              WHEN '500+ chars' THEN 5
            END
        `;
        
        responseLengthResult = await pool.query(responseLengthQuery, params);
      } catch (error) {
        console.error('Response length distribution query failed:', error);
        responseLengthResult = { rows: [] };
      }

      // Return the combined results
      return {
        avgSessionDurationMinutes: parseFloat(basicData.realistic_avg_duration_minutes || basicData.avg_session_duration_minutes || 0),
        medianSessionDurationMinutes: parseFloat(basicData.median_session_duration_minutes || 0),
        p25SessionDurationMinutes: 0, // Not calculated in basic version
        p75SessionDurationMinutes: 0, // Not calculated in basic version
        totalSessions: parseInt(basicData.total_sessions || 0),
        completedSessions: parseInt(basicData.completed_sessions || 0),
        completionRate: parseFloat(basicData.completion_rate || 0),
        avgResponseLength: parseFloat(responseMetrics.avg_response_length || 0),
        medianResponseLength: parseFloat(responseMetrics.median_response_length || 0),
        totalResponses: parseInt(responseMetrics.total_responses || 0),
        avgConversationTurns: parseFloat(conversationMetrics.avg_conversation_turns || 0),
        avgCompletionPercentage: parseFloat(conversationMetrics.avg_completion_percentage || 0),
        avgAiConfidence: parseFloat(conversationMetrics.avg_ai_confidence || 0),
        
        // Question metrics (use conversation_state if available, otherwise fallback to conversation_history)
        avgQuestionsAsked: parseFloat(basicData.avg_questions_asked || questionMetrics.avg_questions_asked || 0),
        avgQuestionsCompleted: parseFloat(basicData.avg_questions_completed || questionMetrics.avg_questions_completed || 0),
        avgQuestionsIncomplete: parseFloat(basicData.avg_questions_incomplete || questionMetrics.avg_questions_incomplete || 0),
        uniqueUsers: parseInt(basicData.unique_users || 0),
        totalUserEmails: parseInt(basicData.total_user_emails || 0),
        totalBriefs: parseInt(briefMetrics.total_briefs || 0),
        avgBriefLength: parseFloat(briefMetrics.avg_brief_length || 0),
        briefGenerationRate: basicData.total_sessions > 0 ? 
          parseFloat(((briefMetrics.total_briefs || 0) / basicData.total_sessions * 100).toFixed(2)) : 0,
        
        // User journey flow for Sankey diagram
        userJourneyFlow: await this.getUserJourneyFlow(orgId, timeRange),
        
        // Drop-off analysis
        dropoffAnalysis: await this.getDropoffAnalysis(orgId, timeRange),
        
        // Distribution data
        durationDistribution: durationResult.rows.map(row => ({
          range: row.duration_range,
          percentage: parseFloat(row.percentage),
          count: parseInt(row.count)
        })),
        
        responseLengthDistribution: responseLengthResult.rows.map(row => ({
          range: row.length_range,
          percentage: parseFloat(row.percentage),
          count: parseInt(row.count)
        })),
        conversationSteps: [],
        questionEffectiveness: [],
        timePatterns: [],
        returnUserAnalysis: []
      };

    } catch (error) {
      console.error('User behavior analytics query error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      });
      return {
        error: 'Query execution failed',
        message: error.message,
        code: error.code,
        detail: error.detail
      };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND s.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const dateFilter = this.getDateFilter(timeRange);
    params.push(dateFilter);
    
    try {
      const query = `
        SELECT 
          -- Session Duration Metrics (using subqueries to avoid GROUP BY issues)
          (SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) FROM sessions WHERE 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as avg_session_duration_minutes,
          (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) FROM sessions WHERE 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as median_session_duration_minutes,
          (SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) FROM sessions WHERE 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as p25_session_duration_minutes,
          (SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) FROM sessions WHERE 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as p75_session_duration_minutes,
          
          -- Completion Metrics
          (SELECT COUNT(DISTINCT id) FROM sessions WHERE 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as total_sessions,
          (SELECT COUNT(DISTINCT id) FROM sessions WHERE completed = true AND 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as completed_sessions,
          ROUND(
            ((SELECT COUNT(DISTINCT id) FROM sessions WHERE completed = true AND 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter})::float / 
            NULLIF((SELECT COUNT(DISTINCT id) FROM sessions WHERE 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}), 0) * 100)::numeric, 2
          ) as completion_rate,
          
          -- Response Quality Metrics
          (SELECT AVG(LENGTH(a.text)) FROM answers a JOIN sessions s ON a.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as avg_response_length,
          (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(a.text)) FROM answers a JOIN sessions s ON a.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as median_response_length,
          (SELECT COUNT(DISTINCT a.id) FROM answers a JOIN sessions s ON a.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as total_responses,
          
          -- Conversation Metrics
          (SELECT AVG(cs.current_turn) FROM conversation_state cs JOIN sessions s ON cs.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as avg_conversation_turns,
          (SELECT AVG(cs.completion_percentage) FROM conversation_state cs JOIN sessions s ON cs.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as avg_completion_percentage,
          (SELECT AVG(cs.ai_confidence) FROM conversation_state cs JOIN sessions s ON cs.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as avg_ai_confidence,
          
          -- Return User Analysis
          (SELECT COUNT(DISTINCT user_email) FROM sessions WHERE user_email IS NOT NULL AND 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as unique_users,
          (SELECT COUNT(DISTINCT user_email) FROM sessions WHERE user_email IS NOT NULL AND 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}) as total_user_emails,
          
          -- Brief Generation Metrics
          (SELECT COUNT(DISTINCT pb.id) FROM project_briefs pb JOIN sessions s ON pb.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as total_briefs,
          (SELECT AVG(LENGTH(pb.summary_md)) FROM project_briefs pb JOIN sessions s ON pb.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) as avg_brief_length,
          ROUND(
            ((SELECT COUNT(DISTINCT pb.id) FROM project_briefs pb JOIN sessions s ON pb.session_id = s.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter})::float / 
            NULLIF((SELECT COUNT(DISTINCT id) FROM sessions WHERE 1=1 ${mainSubqueryOrgFilter} ${mainSubqueryDateFilter}), 0) * 100)::numeric, 2
          ) as brief_generation_rate
      `;

      console.log('Executing main user behavior query...');
      console.log('Query:', mainQuery);
      console.log('Params:', params);
      const mainResult = await pool.query(mainQuery, params);
      const mainData = mainResult.rows[0] || {};
      console.log('Main query completed successfully');

      // Session duration distribution
      const durationDistributionQuery = `
        WITH duration_ranges AS (
          SELECT 
            CASE 
              WHEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 < 5 THEN '0-5 min'
              WHEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 < 10 THEN '5-10 min'
              WHEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 < 15 THEN '10-15 min'
              WHEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 < 30 THEN '15-30 min'
              ELSE '30+ min'
            END as duration_range
          FROM sessions s
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        )
        SELECT 
          duration_range,
          COUNT(*) as count,
          ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM sessions s2 WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) * 100)::numeric, 1) as percentage
        FROM duration_ranges
        GROUP BY duration_range
        ORDER BY 
          CASE duration_range
            WHEN '0-5 min' THEN 1
            WHEN '5-10 min' THEN 2
            WHEN '10-15 min' THEN 3
            WHEN '15-30 min' THEN 4
            WHEN '30+ min' THEN 5
          END
      `;

      console.log('Executing duration distribution query...');
      let durationResult;
      try {
        durationResult = await pool.query(durationDistributionQuery, params);
        console.log('Duration distribution query completed, rows:', durationResult.rows.length);
        console.log('Duration distribution data:', durationResult.rows);
      } catch (error) {
        console.error('Duration distribution query failed:', error);
        durationResult = { rows: [] };
      }

      // Response length distribution
      const responseLengthQuery = `
        WITH length_ranges AS (
          SELECT 
            CASE 
              WHEN LENGTH(a.text) < 50 THEN '0-50 chars'
              WHEN LENGTH(a.text) < 100 THEN '50-100 chars'
              WHEN LENGTH(a.text) < 200 THEN '100-200 chars'
              WHEN LENGTH(a.text) < 500 THEN '200-500 chars'
              ELSE '500+ chars'
            END as length_range
          FROM answers a
          JOIN sessions s ON a.session_id = s.id
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
        )
        SELECT 
          length_range,
          COUNT(*) as count,
          ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM answers a2 JOIN sessions s2 ON a2.session_id = s2.id WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) * 100)::numeric, 1) as percentage
        FROM length_ranges
        GROUP BY length_range
        ORDER BY 
          CASE length_range
            WHEN '0-50 chars' THEN 1
            WHEN '50-100 chars' THEN 2
            WHEN '100-200 chars' THEN 3
            WHEN '200-500 chars' THEN 4
            WHEN '500+ chars' THEN 5
          END
      `;

      console.log('Executing response length distribution query...');
      let responseLengthResult;
      try {
        responseLengthResult = await pool.query(responseLengthQuery, params);
        console.log('Response length distribution query completed, rows:', responseLengthResult.rows.length);
        console.log('Response length distribution data:', responseLengthResult.rows);
      } catch (error) {
        console.error('Response length distribution query failed:', error);
        responseLengthResult = { rows: [] };
      }

      // User journey flow (conversation turns)
      const journeyFlowQuery = `
        SELECT 
          cs.current_turn as step_number,
          'Question ' || cs.current_turn as step_name,
          ROUND(
            (COUNT(DISTINCT s.id)::float / 
            (SELECT COUNT(DISTINCT s2.id) FROM sessions s2 WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) * 100)::numeric, 1
          ) as completion_percentage,
          ROUND(
            ((COUNT(DISTINCT s.id) - LAG(COUNT(DISTINCT s.id)) OVER (ORDER BY cs.current_turn))::float / 
            NULLIF(LAG(COUNT(DISTINCT s.id)) OVER (ORDER BY cs.current_turn), 0) * 100)::numeric, 1
          ) as dropoff_percentage
        FROM sessions s
        JOIN conversation_state cs ON s.id = cs.session_id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        GROUP BY cs.current_turn
        ORDER BY cs.current_turn
      `;

      const journeyResult = await pool.query(journeyFlowQuery, params);

      // Question effectiveness analysis
      const questionEffectivenessQuery = `
        SELECT 
          ch.question_text,
          ch.question_type,
          COUNT(*) as total_answers,
          ROUND(AVG(LENGTH(ch.answer_text))::numeric, 0) as avg_answer_length,
          ROUND((COUNT(*)::float / (SELECT COUNT(DISTINCT s2.id) FROM sessions s2 WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) * 100)::numeric, 1) as completion_rate,
          CASE 
            WHEN COUNT(*)::float / (SELECT COUNT(DISTINCT s2.id) FROM sessions s2 WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) > 0.8 
                 AND AVG(LENGTH(ch.answer_text)) > 50 THEN 'High'
            WHEN COUNT(*)::float / (SELECT COUNT(DISTINCT s2.id) FROM sessions s2 WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) > 0.6 
                 AND AVG(LENGTH(ch.answer_text)) > 30 THEN 'Medium'
            ELSE 'Low'
          END as quality_rating
        FROM conversation_history ch
        JOIN sessions s ON ch.session_id = s.id
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
          AND ch.answer_text IS NOT NULL
          AND LENGTH(ch.answer_text) > 0
        GROUP BY ch.question_text, ch.question_type
        HAVING COUNT(*) >= 3
        ORDER BY 
          COUNT(*)::float / (SELECT COUNT(DISTINCT s2.id) FROM sessions s2 WHERE 1=1 ${subqueryOrgFilter} ${subqueryDateFilter}) DESC,
          AVG(LENGTH(ch.answer_text)) DESC
        LIMIT 10
      `;

      const questionResult = await pool.query(questionEffectivenessQuery, params);

      // Drop-off analysis
      const dropoffAnalysisQuery = `
        WITH turn_stats AS (
          SELECT 
            cs.current_turn,
            COUNT(DISTINCT s.id) as sessions_at_turn,
            LAG(COUNT(DISTINCT s.id)) OVER (ORDER BY cs.current_turn) as previous_turn_sessions
          FROM sessions s
          JOIN conversation_state cs ON s.id = cs.session_id
          WHERE 1=1 ${orgFilter} ${dateFilterClause}
          GROUP BY cs.current_turn
        )
        SELECT 
          'Question ' || current_turn as question,
          ROUND(
            ((previous_turn_sessions - sessions_at_turn)::float / 
            NULLIF(previous_turn_sessions, 0) * 100)::numeric, 1
          ) as dropoff_rate,
          CASE 
            WHEN current_turn = 1 THEN 'Initial engagement'
            WHEN current_turn <= 3 THEN 'Early stage'
            WHEN current_turn <= 6 THEN 'Mid stage'
            ELSE 'Late stage'
          END as stage,
          CASE 
            WHEN ROUND(((previous_turn_sessions - sessions_at_turn)::float / NULLIF(previous_turn_sessions, 0) * 100)::numeric, 1) > 20 
            THEN 'High drop-off - consider simplifying or making more engaging'
            WHEN ROUND(((previous_turn_sessions - sessions_at_turn)::float / NULLIF(previous_turn_sessions, 0) * 100)::numeric, 1) > 10 
            THEN 'Moderate drop-off - review question clarity'
            ELSE 'Low drop-off - performing well'
          END as recommendation
        FROM turn_stats
        WHERE previous_turn_sessions IS NOT NULL
          AND ROUND(((previous_turn_sessions - sessions_at_turn)::float / NULLIF(previous_turn_sessions, 0) * 100)::numeric, 1) > 5
        ORDER BY dropoff_rate DESC
      `;

      const dropoffResult = await pool.query(dropoffAnalysisQuery, params);

      // Time-based patterns
      const timePatternsQuery = `
        SELECT 
          EXTRACT(DOW FROM s.created_at) as day_of_week,
          EXTRACT(HOUR FROM s.created_at) as hour_of_day,
          COUNT(*) as session_count,
          AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60.0) as avg_duration_minutes,
          ROUND((COUNT(CASE WHEN s.completed THEN 1 END)::float / COUNT(*) * 100)::numeric, 1) as completion_rate
        FROM sessions s
        WHERE 1=1 ${orgFilter} ${dateFilterClause}
        GROUP BY EXTRACT(DOW FROM s.created_at), EXTRACT(HOUR FROM s.created_at)
        ORDER BY day_of_week, hour_of_day
      `;

      const timePatternsResult = await pool.query(timePatternsQuery, params);

      // Return user analysis
      const returnUserQuery = `
        WITH user_sessions AS (
          SELECT 
            s.user_email,
            COUNT(*) as session_count,
            MIN(s.created_at) as first_session,
            MAX(s.created_at) as last_session,
            COUNT(CASE WHEN s.completed THEN 1 END) as completed_sessions
          FROM sessions s
          WHERE s.user_email IS NOT NULL 
            AND 1=1 ${orgFilter} ${dateFilterClause}
          GROUP BY s.user_email
        )
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN session_count > 1 THEN 1 END) as return_users,
          ROUND((COUNT(CASE WHEN session_count > 1 THEN 1 END)::float / COUNT(*) * 100)::numeric, 1) as return_user_rate,
          AVG(session_count) as avg_sessions_per_user,
          AVG(completed_sessions::float / session_count) as avg_completion_rate_per_user
        FROM user_sessions
      `;

      const returnUserResult = await pool.query(returnUserQuery, params);

      return {
        // Main metrics
        avgSessionDuration: Math.round((mainData.avg_session_duration_minutes || 0) * 10) / 10,
        medianSessionDuration: Math.round((mainData.median_session_duration_minutes || 0) * 10) / 10,
        completionRate: mainData.completion_rate || 0,
        avgResponseLength: Math.round(mainData.avg_response_length || 0),
        medianResponseLength: Math.round(mainData.median_response_length || 0),
        avgConversationTurns: Math.round((mainData.avg_conversation_turns || 0) * 10) / 10,
        avgCompletionPercentage: Math.round((mainData.avg_completion_percentage || 0) * 10) / 10,
        avgAiConfidence: Math.round((mainData.avg_ai_confidence || 0) * 100) / 100,
        briefGenerationRate: mainData.brief_generation_rate || 0,
        
        // Return user metrics
        returnUserRate: returnUserResult.rows[0]?.return_user_rate || 0,
        avgSessionsPerUser: Math.round((returnUserResult.rows[0]?.avg_sessions_per_user || 0) * 10) / 10,
        
        // Distribution data
        sessionDurationDistribution: (() => {
          console.log('Mapping duration distribution, raw rows:', durationResult.rows);
          const mapped = durationResult.rows.map(row => ({
            range: row.duration_range,
            percentage: parseFloat(row.percentage),
            count: parseInt(row.count)
          }));
          console.log('Mapped duration distribution:', mapped);
          return mapped;
        })(),
        
        responseLengthDistribution: (() => {
          console.log('Mapping response length distribution, raw rows:', responseLengthResult.rows);
          const mapped = responseLengthResult.rows.map(row => ({
            range: row.length_range,
            percentage: parseFloat(row.percentage),
            count: parseInt(row.count)
          }));
          console.log('Mapped response length distribution:', mapped);
          return mapped;
        })(),
        
        // Journey flow data
        userJourneyFlow: journeyResult.rows.map(row => ({
          step: row.step_name,
          completion: parseFloat(row.completion_percentage),
          dropoff: parseFloat(row.dropoff_percentage) || 0
        })),
        
        // Question effectiveness
        questionEffectiveness: questionResult.rows.map(row => ({
          question: row.question_text,
          completion: parseFloat(row.completion_rate),
          quality: row.quality_rating,
          avgLength: Math.round(row.avg_answer_length),
          type: row.quality_rating === 'High' ? 'most' : 'least'
        })),
        
        // Drop-off analysis
        dropoffAnalysis: dropoffResult.rows.map(row => ({
          question: row.question,
          dropoffRate: parseFloat(row.dropoff_rate),
          reason: `${row.stage} - ${row.dropoff_rate}% drop-off`,
          suggestion: row.recommendation
        })),
        
        // Time patterns
        timePatterns: timePatternsResult.rows.map(row => ({
          dayOfWeek: parseInt(row.day_of_week),
          hourOfDay: parseInt(row.hour_of_day),
          sessionCount: parseInt(row.session_count),
          avgDuration: Math.round(row.avg_duration_minutes * 10) / 10,
          completionRate: parseFloat(row.completion_rate)
        })),
        
        // Summary stats
        totalSessions: parseInt(mainData.total_sessions || 0),
        completedSessions: parseInt(mainData.completed_sessions || 0),
        totalResponses: parseInt(mainData.total_responses || 0),
        totalBriefs: parseInt(mainData.total_briefs || 0),
        uniqueUsers: parseInt(mainData.unique_users || 0)
      };

    } catch (error) {
      console.error('User behavior analytics query error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      });
      return {
        error: 'Query execution failed',
        message: error.message,
        code: error.code,
        detail: error.detail
      };
    }
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
    
    // Handle custom date range object
    if (typeof timeRange === 'object' && timeRange.startDate && timeRange.endDate) {
      console.log('Using custom date range:', timeRange);
      return new Date(timeRange.startDate);
    }
    
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

  /**
   * Helper method to get previous period date filter based on time range
   */
  getPreviousPeriodFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      case '30d':
        return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      case '90d':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 days ago
      case '1y':
        return new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000); // 2 years ago
      default:
        return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get user journey flow data for Sankey diagram
   */
  async getUserJourneyFlow(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND s.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const dateFilter = this.getDateFilter(timeRange);
    params.push(dateFilter);
    
    try {
      const journeyQuery = `
        WITH session_questions AS (
          -- Get the sequence of questions per session
          SELECT 
            ch.session_id,
            ch.question_id,
            ch.question_text,
            ROW_NUMBER() OVER (PARTITION BY ch.session_id ORDER BY ch.created_at) as question_sequence,
            CASE WHEN ch.answer_text IS NOT NULL THEN 1 ELSE 0 END as is_answered
          FROM conversation_history ch
          JOIN sessions s ON ch.session_id = s.id
          WHERE 1=1 ${orgFilter} AND s.created_at >= $${params.length}::timestamp
        ),
        question_flow AS (
          -- Aggregate by question sequence position
          SELECT 
            sq.question_sequence,
            sq.question_text,
            sq.question_id,
            COUNT(DISTINCT sq.session_id) as sessions_reached,
            COUNT(CASE WHEN sq.is_answered = 1 THEN 1 END) as sessions_answered,
            COUNT(CASE WHEN sq.is_answered = 0 THEN 1 END) as sessions_unanswered,
            -- Count sessions that completed at this specific question
            COUNT(CASE WHEN sq.is_answered = 1 AND s.completed = true AND sq.question_sequence = (
              SELECT MAX(sq2.question_sequence) 
              FROM session_questions sq2 
              WHERE sq2.session_id = sq.session_id AND sq2.is_answered = 1
            ) THEN 1 END) as sessions_completed_at_this_question
          FROM session_questions sq
          JOIN sessions s ON sq.session_id = s.id
          GROUP BY sq.question_sequence, sq.question_text, sq.question_id
          ORDER BY sq.question_sequence
        ),
        session_completion AS (
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN completed = true THEN 1 END) as completed_sessions,
            COUNT(CASE WHEN completed = false THEN 1 END) as incomplete_sessions
          FROM (
            SELECT DISTINCT s.id, s.completed
            FROM sessions s
            JOIN conversation_history ch ON s.id = ch.session_id
            WHERE 1=1 ${orgFilter} AND s.created_at >= $${params.length}::timestamp
          ) sessions_with_history
        )
        SELECT 
          json_agg(
            json_build_object(
              'turnNumber', qf.question_sequence,
              'questionText', qf.question_text,
              'questionId', qf.question_id,
              'questionCount', qf.sessions_reached,
              'answeredCount', qf.sessions_answered,
              'unansweredCount', qf.sessions_unanswered,
              'completedAtThisQuestion', qf.sessions_completed_at_this_question,
              'dropOffRate', CASE 
                WHEN qf.sessions_reached > 0 
                THEN ((qf.sessions_unanswered::float / qf.sessions_reached) * 100)::numeric(5,2)
                ELSE 0 
              END
            ) ORDER BY qf.question_sequence
          ) as question_flow,
          sc.total_sessions,
          sc.completed_sessions,
          sc.incomplete_sessions
        FROM question_flow qf
        CROSS JOIN session_completion sc
        GROUP BY sc.total_sessions, sc.completed_sessions, sc.incomplete_sessions
      `;
      
      const journeyResult = await pool.query(journeyQuery, params);
      const result = journeyResult.rows[0];
      
      console.log('📊 User journey flow data:', result?.question_flow?.length || 0, 'questions tracked');
      
      return {
        questionFlow: result?.question_flow || [],
        totalSessions: parseInt(result?.total_sessions || 0),
        completedSessions: parseInt(result?.completed_sessions || 0),
        incompleteSessions: parseInt(result?.incomplete_sessions || 0)
      };
      
    } catch (error) {
      console.error('User journey flow query error:', error);
      return {
        questionFlow: [],
        totalSessions: 0,
        completedSessions: 0,
        incompleteSessions: 0
      };
    }
  }

  /**
   * Get drop-off analysis for abandoned sessions
   */
  async getDropoffAnalysis(orgId = null, timeRange = '30d') {
    const orgFilter = orgId ? 'AND s.org_id = $1' : '';
    const params = orgId ? [orgId] : [];
    
    const dateFilter = this.getDateFilter(timeRange);
    params.push(dateFilter);
    
    const dateFilterClause = orgId ? 'AND s.created_at >= $2::timestamp' : 'AND s.created_at >= $1::timestamp';
    
    try {
      const dropoffQuery = `
        WITH abandoned_sessions AS (
          SELECT 
            s.id as session_id,
            s.created_at,
            s.updated_at,
            EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60 as duration_minutes
          FROM sessions s
          WHERE s.completed = false 
            AND 1=1 ${orgFilter} ${dateFilterClause}
        ),
        question_sequence AS (
          SELECT 
            session_id,
            question_text,
            answer_text,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) as actual_question_number
          FROM conversation_history
        ),
        last_activities AS (
          SELECT 
            abandoned_sessions.session_id,
            abandoned_sessions.created_at,
            abandoned_sessions.updated_at,
            abandoned_sessions.duration_minutes,
            qs.question_text as last_question_text,
            qs.actual_question_number as last_question_number,
            qs.answer_text as last_answer_text,
            COALESCE(LENGTH(qs.answer_text), 0) as last_answer_length,
            qs.created_at as last_activity_at,
            -- Get the second-to-last answer length
            COALESCE((
              SELECT LENGTH(qs_prev.answer_text)
              FROM question_sequence qs_prev
              WHERE qs_prev.session_id = abandoned_sessions.session_id
                AND qs_prev.answer_text IS NOT NULL
                AND qs_prev.created_at < qs.created_at
              ORDER BY qs_prev.created_at DESC
              LIMIT 1
            ), 0) as second_to_last_answer_length
          FROM abandoned_sessions
          JOIN question_sequence qs ON abandoned_sessions.session_id = qs.session_id
          WHERE qs.created_at = (
            SELECT MAX(qs2.created_at) 
            FROM question_sequence qs2 
            WHERE qs2.session_id = abandoned_sessions.session_id
          )
        ),
        session_metrics AS (
          SELECT 
            la.*,
            (SELECT COUNT(*) FROM question_sequence qs_count WHERE qs_count.session_id = la.session_id) as total_questions_answered,
            CASE 
              WHEN la.duration_minutes < 2 THEN 'Quick (<2 min)'
              WHEN la.duration_minutes < 10 THEN 'Standard (2-10 min)'
              ELSE 'Long (10+ min)'
            END as duration_category,
            CASE 
              WHEN la.last_answer_length < 50 THEN 'Very Short'
              WHEN la.last_answer_length < 200 THEN 'Short'
              WHEN la.last_answer_length < 500 THEN 'Medium'
              ELSE 'Long'
            END as answer_length_category
          FROM last_activities la
        )
        SELECT 
          session_id,
          ROUND(duration_minutes::numeric, 1) || ' min' as duration,
          total_questions_answered,
          last_question_number as abandoned_at_question,
          last_question_text as question_text,
          ROUND(EXTRACT(EPOCH FROM (last_activity_at - created_at)) / 60::numeric, 1) || ' min' as time_spent,
          second_to_last_answer_length,
          duration_category,
          answer_length_category
        FROM session_metrics
        ORDER BY duration_minutes DESC, total_questions_answered DESC
      `;
      
      const result = await pool.query(dropoffQuery, params);
      
      return result.rows.map(row => ({
        sessionId: row.session_id,
        duration: row.duration,
        questionsAnswered: parseInt(row.total_questions_answered),
        abandonedAtQuestion: parseInt(row.abandoned_at_question),
        questionText: row.question_text,
        timeSpent: row.time_spent,
        lastAnswerLength: parseInt(row.second_to_last_answer_length),
        durationCategory: row.duration_category,
        answerLengthCategory: row.answer_length_category
      }));
      
    } catch (error) {
      console.error('Drop-off analysis query error:', error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();
