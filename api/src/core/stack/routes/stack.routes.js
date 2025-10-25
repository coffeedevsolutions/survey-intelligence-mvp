import express from 'express';
import { pool } from '../../../database/connection.js';
import { requireMember } from '../../../platform/auth/services/auth-enhanced.js';

const router = express.Router();

// ---------- Stack Overview ----------

// Get complete stack snapshot for AI + admin UI
router.get('/orgs/:orgId/stack', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const snapshot = await getStackSnapshot(orgId);
    res.json(snapshot);
  } catch (error) {
    console.error('Error getting stack snapshot:', error);
    res.status(500).json({ error: 'Failed to get stack snapshot' });
  }
});

// Search capabilities (for AI and user search)
router.get('/orgs/:orgId/capabilities/search', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const searchText = req.query.q || '';
    const limit = parseInt(req.query.limit) || 25;
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!searchText.trim()) {
      return res.json({ results: [] });
    }
    
    const results = await searchCapabilities(orgId, searchText, limit);
    res.json({ results });
  } catch (error) {
    console.error('Error searching capabilities:', error);
    res.status(500).json({ error: 'Failed to search capabilities' });
  }
});

// ---------- Systems Management ----------

// Get all systems for organization
router.get('/orgs/:orgId/systems', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const systems = await pool.query(
      'SELECT * FROM systems WHERE org_id = $1 ORDER BY name',
      [orgId]
    );
    res.json({ systems });
  } catch (error) {
    console.error('Error getting systems:', error);
    res.status(500).json({ error: 'Failed to get systems' });
  }
});

// Create new system
router.post('/orgs/:orgId/systems', requireMember('admin'), async (req, res) => {
  console.log('🔧 POST /orgs/:orgId/systems endpoint hit');
  console.log('📋 Request params:', req.params);
  console.log('👤 Request user:', req.user);
  console.log('📦 Request body:', req.body);
  
  try {
    const orgId = parseInt(req.params.orgId);
    console.log('🏢 Parsed orgId:', orgId);
    console.log('🏢 User orgId:', req.user.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      console.log('❌ Access denied - org mismatch');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, vendor, category, status, url, notes } = req.body;
    
    if (!name || !name.trim()) {
      console.log('❌ Validation failed - name is required');
      return res.status(400).json({ error: 'System name is required' });
    }
    
    console.log('✅ Validation passed, creating system...');
    const systemData = {
      name: name.trim(),
      vendor: vendor?.trim() || null,
      category: category?.trim() || null,
      status: status || 'active',
      url: url?.trim() || null,
      notes: notes?.trim() || null
    };
    console.log('📦 System data to create:', systemData);
    
    const systemResult = await pool.query(
      'INSERT INTO systems (org_id, name, description, category, vendor, version, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [orgId, systemData.name, systemData.description, systemData.category, systemData.vendor, systemData.version, systemData.status || 'active']
    );
    const system = systemResult.rows[0];
    console.log('✅ System created successfully:', system);
    
    res.status(201).json(system);
  } catch (error) {
    console.error('❌ Error creating system:', error);
    res.status(500).json({ error: 'Failed to create system' });
  }
});

// Update existing system
router.put('/orgs/:orgId/systems/:systemId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const systemId = parseInt(req.params.systemId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, vendor, category, status, url, notes } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'System name is required' });
    }
    
    const systemResult = await pool.query(
      'UPDATE systems SET name = $1, description = $2, category = $3, vendor = $4, version = $5, status = $6, url = $7, notes = $8 WHERE id = $9 AND org_id = $10 RETURNING *',
      [name.trim(), null, category?.trim() || null, vendor?.trim() || null, null, status || 'active', url?.trim() || null, notes?.trim() || null, systemId, orgId]
    );
    const system = systemResult.rows[0];
    
    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }
    
    res.json(system);
  } catch (error) {
    console.error('Error updating system:', error);
    res.status(500).json({ error: 'Failed to update system' });
  }
});

// Delete system
router.delete('/orgs/:orgId/systems/:systemId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const systemId = parseInt(req.params.systemId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await pool.query(
      'DELETE FROM systems WHERE id = $1 AND org_id = $2',
      [systemId, orgId]
    );
    
    if (!deleted) {
      return res.status(404).json({ error: 'System not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting system:', error);
    res.status(500).json({ error: 'Failed to delete system' });
  }
});

// ---------- Capabilities Management ----------

// Get capabilities for a specific system
router.get('/orgs/:orgId/systems/:systemId/capabilities', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const systemId = parseInt(req.params.systemId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const capabilities = await getCapabilitiesBySystem(systemId, orgId);
    res.json({ capabilities });
  } catch (error) {
    console.error('Error getting capabilities:', error);
    res.status(500).json({ error: 'Failed to get capabilities' });
  }
});

// Get all capabilities for organization
router.get('/orgs/:orgId/capabilities', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const capabilities = await getCapabilitiesByOrg(orgId);
    res.json({ capabilities });
  } catch (error) {
    console.error('Error getting capabilities:', error);
    res.status(500).json({ error: 'Failed to get capabilities' });
  }
});

// Create new capability
router.post('/orgs/:orgId/systems/:systemId/capabilities', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const systemId = parseInt(req.params.systemId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, description, domain_tags, inputs, outputs, how_to, constraints } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Capability name is required' });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Capability description is required' });
    }
    
    const capability = await createCapability(systemId, orgId, {
      name: name.trim(),
      description: description.trim(),
      domain_tags: Array.isArray(domain_tags) ? domain_tags.filter(t => t.trim()) : [],
      inputs: Array.isArray(inputs) ? inputs.filter(i => i.trim()) : [],
      outputs: Array.isArray(outputs) ? outputs.filter(o => o.trim()) : [],
      how_to: how_to?.trim() || null,
      constraints: constraints?.trim() || null
    });
    
    res.status(201).json(capability);
  } catch (error) {
    console.error('Error creating capability:', error);
    if (error.message === 'System not found or access denied') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create capability' });
    }
  }
});

// Update existing capability
router.put('/orgs/:orgId/capabilities/:capabilityId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const capabilityId = parseInt(req.params.capabilityId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, description, domain_tags, inputs, outputs, how_to, constraints } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Capability name is required' });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Capability description is required' });
    }
    
    const capability = await updateCapability(capabilityId, orgId, {
      name: name.trim(),
      description: description.trim(),
      domain_tags: Array.isArray(domain_tags) ? domain_tags.filter(t => t.trim()) : [],
      inputs: Array.isArray(inputs) ? inputs.filter(i => i.trim()) : [],
      outputs: Array.isArray(outputs) ? outputs.filter(o => o.trim()) : [],
      how_to: how_to?.trim() || null,
      constraints: constraints?.trim() || null
    });
    
    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }
    
    res.json(capability);
  } catch (error) {
    console.error('Error updating capability:', error);
    res.status(500).json({ error: 'Failed to update capability' });
  }
});

// Delete capability (mark as deprecated)
router.delete('/orgs/:orgId/capabilities/:capabilityId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const capabilityId = parseInt(req.params.capabilityId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await deleteCapability(capabilityId, orgId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Capability not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting capability:', error);
    res.status(500).json({ error: 'Failed to delete capability' });
  }
});

// ---------- Capability Synonyms ----------

// Get synonyms for a capability
router.get('/orgs/:orgId/capabilities/:capabilityId/synonyms', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const capabilityId = parseInt(req.params.capabilityId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const synonyms = await getCapabilitySynonyms(capabilityId);
    res.json({ synonyms });
  } catch (error) {
    console.error('Error getting capability synonyms:', error);
    res.status(500).json({ error: 'Failed to get capability synonyms' });
  }
});

// Add synonym to capability
router.post('/orgs/:orgId/capabilities/:capabilityId/synonyms', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const capabilityId = parseInt(req.params.capabilityId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { phrase } = req.body;
    
    if (!phrase || !phrase.trim()) {
      return res.status(400).json({ error: 'Synonym phrase is required' });
    }
    
    const synonym = await addCapabilitySynonym(capabilityId, orgId, phrase.trim());
    res.status(201).json(synonym);
  } catch (error) {
    console.error('Error adding capability synonym:', error);
    if (error.message === 'Capability not found or access denied') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to add capability synonym' });
    }
  }
});

// Delete capability synonym
router.delete('/orgs/:orgId/synonyms/:synonymId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const synonymId = parseInt(req.params.synonymId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await deleteCapabilitySynonym(synonymId, orgId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Synonym not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting capability synonym:', error);
    res.status(500).json({ error: 'Failed to delete capability synonym' });
  }
});

// ---------- Stack Policies ----------

// Get all stack policies for organization
router.get('/orgs/:orgId/policies', requireMember('admin', 'reviewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const policies = await getStackPolicies(orgId);
    res.json({ policies });
  } catch (error) {
    console.error('Error getting stack policies:', error);
    res.status(500).json({ error: 'Failed to get stack policies' });
  }
});

// Create new stack policy
router.post('/orgs/:orgId/policies', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { rule_name, applies_to_tags, guidance, priority } = req.body;
    
    if (!rule_name || !rule_name.trim()) {
      return res.status(400).json({ error: 'Policy rule name is required' });
    }
    
    if (!guidance || !guidance.trim()) {
      return res.status(400).json({ error: 'Policy guidance is required' });
    }
    
    const policy = await createStackPolicy(orgId, {
      rule_name: rule_name.trim(),
      applies_to_tags: Array.isArray(applies_to_tags) ? applies_to_tags.filter(t => t.trim()) : [],
      guidance: guidance.trim(),
      priority: priority ? parseInt(priority) : 100
    });
    
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating stack policy:', error);
    res.status(500).json({ error: 'Failed to create stack policy' });
  }
});

// Update existing stack policy
router.put('/orgs/:orgId/policies/:policyId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const policyId = parseInt(req.params.policyId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { rule_name, applies_to_tags, guidance, priority } = req.body;
    
    if (!rule_name || !rule_name.trim()) {
      return res.status(400).json({ error: 'Policy rule name is required' });
    }
    
    if (!guidance || !guidance.trim()) {
      return res.status(400).json({ error: 'Policy guidance is required' });
    }
    
    const policy = await updateStackPolicy(policyId, orgId, {
      rule_name: rule_name.trim(),
      applies_to_tags: Array.isArray(applies_to_tags) ? applies_to_tags.filter(t => t.trim()) : [],
      guidance: guidance.trim(),
      priority: priority ? parseInt(priority) : 100
    });
    
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(policy);
  } catch (error) {
    console.error('Error updating stack policy:', error);
    res.status(500).json({ error: 'Failed to update stack policy' });
  }
});

// Delete stack policy
router.delete('/orgs/:orgId/policies/:policyId', requireMember('admin'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const policyId = parseInt(req.params.policyId);
    
    if (parseInt(req.user.orgId) !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await deleteStackPolicy(policyId, orgId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stack policy:', error);
    res.status(500).json({ error: 'Failed to delete stack policy' });
  }
});

export default router;
