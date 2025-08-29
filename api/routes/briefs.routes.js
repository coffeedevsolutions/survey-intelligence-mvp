import express from 'express';
import { 
  getBriefsForReview,
  updateBriefReview,
  getBriefByIdAndOrg,
  pool
} from '../config/database.js';
import { requireMember } from '../auth/auth-enhanced.js';

const router = express.Router();

// Get briefs for review (for admins and reviewers)
router.get('/orgs/:orgId/briefs/review', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const briefs = await getBriefsForReview(orgId);
    res.json({ briefs });
  } catch (error) {
    console.error('Error getting briefs for review:', error);
    res.status(500).json({ error: 'Failed to get briefs for review' });
  }
});

// Update brief review with priority
router.post('/orgs/:orgId/briefs/:briefId/review', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const briefId = parseInt(req.params.briefId);
    const { priority } = req.body;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!priority || priority < 1 || priority > 5) {
      return res.status(400).json({ error: 'Priority must be between 1 and 5' });
    }
    
    // Verify brief exists and belongs to org
    const brief = await getBriefByIdAndOrg(briefId, orgId);
    if (!brief) {
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    const updatedBrief = await updateBriefReview(briefId, orgId, {
      priority,
      reviewedBy: req.user.id
    });
    
    res.json({ brief: updatedBrief });
  } catch (error) {
    console.error('Error updating brief review:', error);
    res.status(500).json({ error: 'Failed to update brief review' });
  }
});

// Get brief details for review
router.get('/orgs/:orgId/briefs/:briefId', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const briefId = parseInt(req.params.briefId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get detailed brief info with campaign and session data
    const result = await pool.query(`
      SELECT 
        pb.*,
        c.name as campaign_name,
        c.purpose as campaign_purpose,
        reviewer.email as reviewed_by_email,
        s.created_at as session_created_at
      FROM project_briefs pb
      LEFT JOIN campaigns c ON pb.campaign_id = c.id
      LEFT JOIN users reviewer ON pb.reviewed_by = reviewer.id
      LEFT JOIN sessions s ON pb.session_id = s.id
      WHERE pb.id = $1 AND pb.org_id = $2
    `, [briefId, orgId]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    res.json({ brief: result.rows[0] });
  } catch (error) {
    console.error('Error getting brief details:', error);
    res.status(500).json({ error: 'Failed to get brief details' });
  }
});

export default router;
