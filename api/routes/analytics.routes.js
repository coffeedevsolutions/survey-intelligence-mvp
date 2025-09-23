/**
 * Analytics API Routes
 * Provides comprehensive analytics endpoints for dashboard
 */

import { Router } from 'express';
import { requireMember } from '../auth/auth-enhanced.js';
import { analyticsService } from '../services/analyticsService.js';

const router = Router();

/**
 * Get comprehensive analytics overview
 * GET /api/analytics/overview
 */
router.get('/overview', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    
    // Use user's org if not admin requesting cross-org data
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const [
      organizational,
      users,
      surveys,
      solutions,
      jira,
      performance
    ] = await Promise.all([
      analyticsService.getOrganizationalAnalytics(targetOrgId, timeRange),
      analyticsService.getUserAnalytics(targetOrgId, timeRange),
      analyticsService.getSurveyAnalytics(targetOrgId, timeRange),
      analyticsService.getSolutionAnalytics(targetOrgId, timeRange),
      analyticsService.getJiraAnalytics(targetOrgId),
      analyticsService.getPerformanceMetrics(targetOrgId, timeRange)
    ]);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      organizational,
      users,
      surveys,
      solutions,
      jira,
      performance,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

/**
 * Get detailed analytics for charts and visualizations
 * GET /api/analytics/detailed
 */
router.get('/detailed', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const detailed = await analyticsService.getDetailedAnalytics(targetOrgId, timeRange);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      ...detailed,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    res.status(500).json({ error: 'Failed to fetch detailed analytics' });
  }
});

/**
 * Get AI insights analytics
 * GET /api/analytics/ai-insights
 */
router.get('/ai-insights', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const insights = await analyticsService.getAIInsightsAnalytics(targetOrgId, timeRange);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      insights,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching AI insights analytics:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights data' });
  }
});

/**
 * Get organizational metrics only
 * GET /api/analytics/organizational
 */
router.get('/organizational', requireMember('admin'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    const targetOrgId = orgId ? parseInt(orgId) : null; // Admin can see all orgs
    
    const organizational = await analyticsService.getOrganizationalAnalytics(targetOrgId, timeRange);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      organizational,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching organizational analytics:', error);
    res.status(500).json({ error: 'Failed to fetch organizational data' });
  }
});

/**
 * Get user analytics
 * GET /api/analytics/users
 */
router.get('/users', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const users = await analyticsService.getUserAnalytics(targetOrgId, timeRange);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      users,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * Get survey and conversation analytics
 * GET /api/analytics/surveys
 */
router.get('/surveys', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const surveys = await analyticsService.getSurveyAnalytics(targetOrgId, timeRange);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      surveys,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching survey analytics:', error);
    res.status(500).json({ error: 'Failed to fetch survey data' });
  }
});

/**
 * Get solution engineering analytics
 * GET /api/analytics/solutions
 */
router.get('/solutions', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const solutions = await analyticsService.getSolutionAnalytics(targetOrgId, timeRange);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      solutions,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching solution analytics:', error);
    res.status(500).json({ error: 'Failed to fetch solution data' });
  }
});

/**
 * Get Jira integration analytics
 * GET /api/analytics/jira
 */
router.get('/jira', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { orgId } = req.query;
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const jira = await analyticsService.getJiraAnalytics(targetOrgId);
    
    res.json({
      orgId: targetOrgId,
      jira,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Jira analytics:', error);
    res.status(500).json({ error: 'Failed to fetch Jira data' });
  }
});

/**
 * Get performance metrics
 * GET /api/analytics/performance
 */
router.get('/performance', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const { timeRange = '30d', orgId } = req.query;
    const targetOrgId = req.user.role === 'admin' && orgId ? parseInt(orgId) : req.user.orgId;
    
    const performance = await analyticsService.getPerformanceMetrics(targetOrgId, timeRange);
    
    res.json({
      timeRange,
      orgId: targetOrgId,
      performance,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
router.get('/export', requireMember('admin'), async (req, res) => {
  try {
    const { timeRange = '30d', format = 'json', orgId } = req.query;
    const targetOrgId = orgId ? parseInt(orgId) : null;
    
    const [
      organizational,
      users,
      surveys,
      solutions,
      detailed,
      jira,
      performance,
      insights
    ] = await Promise.all([
      analyticsService.getOrganizationalAnalytics(targetOrgId, timeRange),
      analyticsService.getUserAnalytics(targetOrgId, timeRange),
      analyticsService.getSurveyAnalytics(targetOrgId, timeRange),
      analyticsService.getSolutionAnalytics(targetOrgId, timeRange),
      analyticsService.getDetailedAnalytics(targetOrgId, timeRange),
      analyticsService.getJiraAnalytics(targetOrgId),
      analyticsService.getPerformanceMetrics(targetOrgId, timeRange),
      analyticsService.getAIInsightsAnalytics(targetOrgId, timeRange)
    ]);
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        timeRange,
        orgId: targetOrgId,
        format
      },
      analytics: {
        organizational,
        users,
        surveys,
        solutions,
        detailed,
        jira,
        performance,
        insights
      }
    };
    
    if (format === 'csv') {
      // Convert to CSV format for easy Excel import
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeRange}-${Date.now()}.csv`);
      
      // Simple CSV conversion for key metrics
      const csvData = [
        ['Metric', 'Value'],
        ['Total Organizations', organizational.total_organizations],
        ['Total Users', users.total_users],
        ['Total Solutions', solutions.total_solutions],
        ['Completion Rate', surveys.completion_rate],
        ['Avg Complexity', solutions.avg_complexity],
        // Add more key metrics as needed
      ].map(row => row.join(',')).join('\n');
      
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeRange}-${Date.now()}.json`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

export default router;
