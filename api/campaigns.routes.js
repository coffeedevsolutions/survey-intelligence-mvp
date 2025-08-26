import express from 'express';
import { 
  createCampaign, 
  getCampaignsByOrg, 
  getCampaignById, 
  updateCampaign,
  createSurveyFlow,
  getFlowsByCampaign,
  getFlowById,
  createSurveyLink,
  getSurveyLinksByOrg,
  revokeSurveyLink,
  getCampaignResponses,
  pool
} from './database.js';
import { requireMember } from './auth-enhanced.js';
import { DEFAULT_FLOW_SPEC, DEFAULT_TEMPLATE } from './adaptiveEngine.js';

const router = express.Router();

// Campaign CRUD
router.post('/orgs/:orgId/campaigns', requireMember('admin'), async (req, res) => {
  try {
    const { slug, name, purpose, template_md } = req.body;
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!slug || !name || !template_md) {
      return res.status(400).json({ error: 'slug, name, and template_md are required' });
    }
    
    const campaign = await createCampaign({
      orgId,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name,
      purpose: purpose || '',
      templateMd: template_md,
      createdBy: req.user.id
    });
    
    res.json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Campaign slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.get('/orgs/:orgId/campaigns', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const campaigns = await getCampaignsByOrg(orgId);
    res.json({ campaigns });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

router.get('/orgs/:orgId/campaigns/:campaignId', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const campaignId = parseInt(req.params.campaignId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

router.put('/orgs/:orgId/campaigns/:campaignId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const campaignId = parseInt(req.params.campaignId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, purpose, template_md, is_active } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (purpose !== undefined) updates.purpose = purpose;
    if (template_md !== undefined) updates.template_md = template_md;
    if (is_active !== undefined) updates.is_active = is_active;
    
    const campaign = await updateCampaign(campaignId, orgId, updates);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Survey Flow Management
router.post('/orgs/:orgId/campaigns/:campaignId/flows', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const campaignId = parseInt(req.params.campaignId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify campaign exists and belongs to org
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const { title, spec_json, use_ai } = req.body;
    
    if (!spec_json) {
      return res.status(400).json({ error: 'spec_json is required' });
    }
    
    // Validate spec_json structure
    const spec = typeof spec_json === 'string' ? JSON.parse(spec_json) : spec_json;
    if (!spec.questions || !Array.isArray(spec.questions)) {
      return res.status(400).json({ error: 'spec_json must contain questions array' });
    }
    
    const flow = await createSurveyFlow({
      campaignId,
      title: title || `Flow v${Date.now()}`,
      specJson: spec,
      useAi: use_ai !== undefined ? use_ai : true
    });
    
    res.json(flow);
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({ error: 'Failed to create survey flow' });
  }
});

router.get('/orgs/:orgId/campaigns/:campaignId/flows', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const campaignId = parseInt(req.params.campaignId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify campaign exists and belongs to org
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const flows = await getFlowsByCampaign(campaignId);
    res.json({ flows });
  } catch (error) {
    console.error('Error listing flows:', error);
    res.status(500).json({ error: 'Failed to list flows' });
  }
});

router.get('/orgs/:orgId/flows/:flowId', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const flowId = parseInt(req.params.flowId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const flow = await getFlowById(flowId);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    
    // Verify flow belongs to user's org (via campaign)
    const campaign = await getCampaignById(flow.campaign_id, orgId);
    if (!campaign) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    
    res.json(flow);
  } catch (error) {
    console.error('Error getting flow:', error);
    res.status(500).json({ error: 'Failed to get flow' });
  }
});

// Survey Link Management
router.post('/orgs/:orgId/campaigns/:campaignId/flows/:flowId/links', requireMember('admin'), async (req, res) => {
  try {
    console.log('🔗 Creating survey link for params:', req.params);
    const orgId = parseInt(req.params.orgId);
    const campaignId = parseInt(req.params.campaignId);
    const flowId = parseInt(req.params.flowId);
    console.log('🔗 Parsed IDs:', { orgId, campaignId, flowId });
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify campaign and flow exist
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const flow = await getFlowById(flowId);
    console.log('🔗 Flow found:', flow ? { id: flow.id, campaign_id: flow.campaign_id, title: flow.title } : 'null');
    
    if (!flow || parseInt(flow.campaign_id) !== campaignId) {
      console.log('🔗 Flow validation failed:', { flowExists: !!flow, campaignIdMatch: parseInt(flow.campaign_id) === campaignId });
      return res.status(404).json({ error: 'Flow not found' });
    }
    
    const { expiresAt, maxUses } = req.body;
    
    const link = await createSurveyLink({
      orgId,
      campaignId,
      flowId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses || null,
      createdBy: req.user.id
    });
    
    const baseUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
    
    res.json({
      ...link,
      url: `${baseUrl}/reply/${link.token}`
    });
  } catch (error) {
    console.error('Error creating survey link:', error);
    res.status(500).json({ error: 'Failed to create survey link' });
  }
});

router.get('/orgs/:orgId/links', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const links = await getSurveyLinksByOrg(orgId);
    res.json({ links });
  } catch (error) {
    console.error('Error listing survey links:', error);
    res.status(500).json({ error: 'Failed to list survey links' });
  }
});

router.post('/orgs/:orgId/links/:linkId/revoke', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const linkId = parseInt(req.params.linkId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const link = await revokeSurveyLink(linkId, orgId);
    if (!link) {
      return res.status(404).json({ error: 'Survey link not found' });
    }
    
    res.json({ message: 'Survey link revoked', link });
  } catch (error) {
    console.error('Error revoking survey link:', error);
    res.status(500).json({ error: 'Failed to revoke survey link' });
  }
});

// Campaign Responses
router.get('/orgs/:orgId/campaigns/:campaignId/responses', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const campaignId = parseInt(req.params.campaignId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify campaign exists
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const responses = await getCampaignResponses(campaignId, orgId);
    console.log('📊 Campaign responses query:', { campaignId, orgId, responseCount: responses.length });
    console.log('📊 First few responses:', responses.slice(0, 2));
    res.json({ responses });
  } catch (error) {
    console.error('Error getting campaign responses:', error);
    res.status(500).json({ error: 'Failed to get campaign responses' });
  }
});

// Get detailed response data (answers and facts)
router.get('/orgs/:orgId/sessions/:sessionId/answers', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { sessionId } = req.params;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get answers
    const answersResult = await pool.query(
      'SELECT question_id, text, created_at FROM answers WHERE session_id = $1 AND org_id = $2 ORDER BY created_at',
      [sessionId, orgId]
    );
    
    // Get facts
    const factsResult = await pool.query(
      'SELECT key, value FROM facts WHERE session_id = $1 AND org_id = $2',
      [sessionId, orgId]
    );
    
    const facts = {};
    factsResult.rows.forEach(row => {
      facts[row.key] = row.value;
    });
    
    res.json({
      answers: answersResult.rows,
      facts
    });
  } catch (error) {
    console.error('Error getting session answers:', error);
    res.status(500).json({ error: 'Failed to get session answers' });
  }
});

// Get generated brief for a session
router.get('/orgs/:orgId/sessions/:sessionId/brief', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { sessionId } = req.params;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get brief
    const briefResult = await pool.query(
      'SELECT * FROM project_briefs WHERE session_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT 1',
      [sessionId, orgId]
    );
    
    if (!briefResult.rowCount) {
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    res.json(briefResult.rows[0]);
  } catch (error) {
    console.error('Error getting session brief:', error);
    res.status(500).json({ error: 'Failed to get session brief' });
  }
});

// Helper endpoints for frontend
router.get('/orgs/:orgId/templates/default', requireMember('admin'), (req, res) => {
  res.json({ 
    template_md: DEFAULT_TEMPLATE,
    flow_spec: DEFAULT_FLOW_SPEC 
  });
});

export default router;
