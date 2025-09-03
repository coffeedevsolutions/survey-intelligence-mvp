import express from 'express';
import { solutioningService } from '../services/solutioningService.js';
import { requireMember } from '../auth/auth-enhanced.js';
import { pool } from '../config/database.js';

const router = express.Router();

/**
 * Generate solution from brief
 * POST /api/orgs/:orgId/solutions/generate
 */
router.post('/orgs/:orgId/solutions/generate', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { briefId } = req.body;

    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!briefId) {
      return res.status(400).json({ error: 'briefId is required' });
    }

    console.log(`🚀 Generating solution for brief ${briefId} in org ${orgId}`);
    
    const solution = await solutioningService.generateSolutionFromBrief(
      briefId, 
      orgId, 
      req.user.id
    );

    console.log(`✅ Solution generated with ID: ${solution.id}`);
    
    res.json({ 
      success: true, 
      solution: {
        id: solution.id,
        name: solution.name,
        description: solution.description,
        briefId: solution.brief_id,
        status: solution.status
      },
      message: 'Solution generated successfully'
    });
  } catch (error) {
    console.error('Error generating solution:', error);
    res.status(500).json({ 
      error: 'Failed to generate solution',
      details: error.message 
    });
  }
});

/**
 * List solutions for organization
 * GET /api/orgs/:orgId/solutions
 */
router.get('/orgs/:orgId/solutions', requireMember('reviewer', 'admin'), async (req, res) => {
  console.log('🎯 [Solutioning Route] Handler started - THIS SHOULD APPEAR IN LOGS');
  try {
    const { orgId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log('🎯 [Solutioning Route] Params:', { orgId, limit, offset });
    console.log('🎯 [Solutioning Route] User:', req.user?.email, 'orgId:', req.user?.orgId);

    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      console.log('🎯 [Solutioning Route] Access denied - orgId mismatch');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('🎯 [Solutioning Route] Auth validated, executing query...');

    console.log('🎯 [Solutioning Route] About to execute SQL query...');
    const result = await pool.query(`
      SELECT 
        s.*,
        pb.title as brief_title,
        u.email as created_by_email,
        (SELECT COUNT(*) FROM solution_epics WHERE solution_id = s.id) as epic_count,
        (SELECT COUNT(*) FROM solution_stories ss 
         JOIN solution_epics se ON ss.epic_id = se.id 
         WHERE se.solution_id = s.id) as story_count,
        s.jira_exported_at,
        s.jira_export_project_key,
        s.jira_export_epic_key,
        s.jira_export_issue_count
      FROM solutions s
      LEFT JOIN project_briefs pb ON s.brief_id = pb.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.org_id = $1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `, [orgId, limit, offset]);

    console.log('🎯 [Solutioning Route] Query completed, rows:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('🎯 [Solutioning Route] Error fetching solutions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch solutions',
      details: error.message 
    });
  }
});

/**
 * Get solution by ID
 * GET /api/orgs/:orgId/solutions/:solutionId
 */
router.get('/orgs/:orgId/solutions/:solutionId', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, solutionId } = req.params;

    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const solution = await solutioningService.getSolutionById(solutionId, orgId);
    
    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    res.json(solution);
  } catch (error) {
    console.error('Error fetching solution:', error);
    res.status(500).json({ 
      error: 'Failed to fetch solution',
      details: error.message 
    });
  }
});

/**
 * Export solution to Jira format
 * GET /api/orgs/:orgId/solutions/:solutionId/export/jira
 */
router.get('/orgs/:orgId/solutions/:solutionId/export/jira', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, solutionId } = req.params;

    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const jiraExport = await solutioningService.exportToJira(solutionId, orgId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="solution-${solutionId}-jira-export.json"`);
    
    res.json(jiraExport);
  } catch (error) {
    console.error('Error exporting to Jira:', error);
    res.status(500).json({ 
      error: 'Failed to export solution',
      details: error.message 
    });
  }
});

/**
 * Update solution status
 * PATCH /api/orgs/:orgId/solutions/:solutionId/status
 */
router.patch('/orgs/:orgId/solutions/:solutionId/status', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { orgId, solutionId } = req.params;
    const { status } = req.body;

    // Validate org access
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validStatuses = ['draft', 'approved', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses 
      });
    }

    const result = await pool.query(`
      UPDATE solutions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND org_id = $3
      RETURNING *
    `, [status, solutionId, orgId]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    res.json({ 
      success: true, 
      solution: result.rows[0],
      message: `Solution status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating solution status:', error);
    res.status(500).json({ 
      error: 'Failed to update solution status',
      details: error.message 
    });
  }
});

/**
 * Delete solution
 * DELETE /api/orgs/:orgId/solutions/:solutionId
 */
router.delete('/orgs/:orgId/solutions/:solutionId', requireMember('admin'), async (req, res) => {
  try {
    const { orgId, solutionId } = req.params;

    // Validate org access and admin role
    if (parseInt(req.user.orgId) !== parseInt(orgId) || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(`
      DELETE FROM solutions 
      WHERE id = $1 AND org_id = $2
      RETURNING *
    `, [solutionId, orgId]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    res.json({ 
      success: true,
      message: 'Solution deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting solution:', error);
    res.status(500).json({ 
      error: 'Failed to delete solution',
      details: error.message 
    });
  }
});

export default router;
