/**
 * Jira Integration Routes
 * Handles Jira connection management and issue operations
 */

import { Router } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import { requireMember } from '../auth/auth-enhanced.js';
import { pool } from '../config/database.js';
import { createJiraClient, createJiraAgileClient, testJiraConnection } from '../services/jira/client.js';
import { adfFromText, adfForSolution } from '../services/jira/adf.js';
import { withBackoff } from '../services/jira/retry.js';
import { getEpicNameFieldId, getCreateMetadata, validateIssueType } from '../services/jira/fields.js';
import { encrypt, decrypt } from '../services/jira/encryption.js';

const router = Router();
const upload = multer();

// Authentication middleware is applied at app level via /api/jira mount

// --- Connection Management ---

/**
 * Test Jira connection
 */
router.get('/test-connection', requireMember('admin'), async (req, res) => {
  try {
    const result = await testJiraConnection(pool, req.user.orgId);
    res.json(result);
  } catch (error) {
    console.error('Error testing Jira connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Jira connection status
 */
router.get('/connection', requireMember('admin'), async (req, res) => {
  try {
    const query = `
      SELECT id, base_url, auth_type, email, is_active, created_at, updated_at
      FROM jira_connections 
      WHERE org_id = $1
    `;
    const result = await pool.query(query, [req.user.orgId]);
    
    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }
    
    const connection = result.rows[0];
    res.json({
      connected: true,
      connection: {
        id: connection.id,
        baseUrl: connection.base_url,
        authType: connection.auth_type,
        email: connection.email,
        isActive: connection.is_active,
        createdAt: connection.created_at,
        updatedAt: connection.updated_at
      }
    });
  } catch (error) {
    console.error('Error getting Jira connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create or update Jira connection
 */
router.post('/connection', requireMember('admin'), async (req, res) => {
  try {
    const { baseUrl, authType, email, apiToken } = req.body;
    
    if (!baseUrl || !authType) {
      return res.status(400).json({ error: 'Base URL and auth type are required' });
    }
    
    if (authType === 'basic' && (!email || !apiToken)) {
      return res.status(400).json({ error: 'Email and API token are required for basic auth' });
    }
    
    // Encrypt the API token
    const encryptedToken = apiToken ? encrypt(apiToken) : null;
    
    // Check if connection already exists
    const existingQuery = `
      SELECT id FROM jira_connections WHERE org_id = $1
    `;
    const existing = await pool.query(existingQuery, [req.user.orgId]);
    
    let query, values;
    if (existing.rows.length > 0) {
      // Update existing connection
      query = `
        UPDATE jira_connections 
        SET base_url = $2, auth_type = $3, email = $4, api_token_encrypted = $5, 
            is_active = true, updated_at = NOW()
        WHERE org_id = $1
        RETURNING id
      `;
      values = [req.user.orgId, baseUrl, authType, email, encryptedToken];
    } else {
      // Create new connection
      query = `
        INSERT INTO jira_connections (org_id, base_url, auth_type, email, api_token_encrypted, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `;
      values = [req.user.orgId, baseUrl, authType, email, encryptedToken];
    }
    
    const result = await pool.query(query, values);
    
    // Test the connection
    const testResult = await testJiraConnection(pool, req.user.orgId);
    
    res.status(201).json({
      id: result.rows[0].id,
      success: testResult.success,
      message: testResult.success ? 'Connection created successfully' : 'Connection saved but test failed',
      testResult
    });
  } catch (error) {
    console.error('Error creating Jira connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete Jira connection
 */
router.delete('/connection', requireMember('admin'), async (req, res) => {
  try {
    const query = `
      DELETE FROM jira_connections WHERE org_id = $1
    `;
    await pool.query(query, [req.user.orgId]);
    
    res.json({ message: 'Jira connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting Jira connection:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Project Management ---

/**
 * Get available projects
 */
router.get('/projects', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    console.log(`🔍 [Projects] Attempting to create JIRA client for orgId: ${req.user.orgId}`);
    const client = await createJiraClient(pool, req.user.orgId);
    console.log(`✅ [Projects] JIRA client created successfully`);
    
    console.log(`🔍 [Projects] Fetching projects from JIRA API`);
    const response = await client.get('/project');
    console.log(`✅ [Projects] Got ${response.data.length} projects from JIRA`);
    
    const projects = response.data.map(project => ({
      id: project.id,
      key: project.key,
      name: project.name,
      projectTypeKey: project.projectTypeKey,
      style: project.style
    }));
    
    res.json(projects);
  } catch (error) {
    console.error('❌ [Projects] Error getting Jira projects:', error);
    console.error('❌ [Projects] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get create metadata for a project
 */
router.get('/projects/:projectKey/createmeta', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { projectKey } = req.params;
    const metadata = await getCreateMetadata(pool, req.user.orgId, projectKey);
    res.json(metadata);
  } catch (error) {
    console.error('Error getting create metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Issue Operations ---

/**
 * Create Epic
 */
router.post('/epics', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { projectKey, name, summary, description } = req.body;
    
    if (!projectKey || !name) {
      return res.status(400).json({ error: 'Project key and epic name are required' });
    }
    
    const client = await createJiraClient(pool, req.user.orgId);
    
    // Get Epic Name field ID (may be null for team-managed projects)
    const epicNameFieldId = await getEpicNameFieldId(pool, req.user.orgId).catch(() => null);
    
    const payload = {
      fields: {
        project: { key: projectKey },
        issuetype: { name: 'Epic' },
        summary: summary || name,
        ...(description ? { description: adfFromText(description) } : {}),
        ...(epicNameFieldId ? { [epicNameFieldId]: name } : {})
      }
    };
    
    const response = await withBackoff(() => client.post('/issue', payload));
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating epic:', error);
    res.status(500).json({ 
      error: error.response?.data?.errorMessages?.[0] || error.message 
    });
  }
});

/**
 * Create Issue
 */
router.post('/issues', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { projectKey, issueType, summary, description, fields = {} } = req.body;
    
    if (!projectKey || !issueType || !summary) {
      return res.status(400).json({ error: 'Project key, issue type, and summary are required' });
    }
    
    const client = await createJiraClient(pool, req.user.orgId);
    
    // Validate issue type
    const validIssueType = await validateIssueType(pool, req.user.orgId, projectKey, issueType);
    if (!validIssueType) {
      return res.status(400).json({ error: `Issue type "${issueType}" not found or not available` });
    }
    
    const payload = {
      fields: {
        project: { key: projectKey },
        issuetype: { id: validIssueType.id },
        summary,
        ...(description ? { description: typeof description === 'string' ? adfFromText(description) : description } : {}),
        ...fields
      }
    };
    
    const response = await withBackoff(() => client.post('/issue', payload));
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ 
      error: error.response?.data?.errorMessages?.[0] || error.message 
    });
  }
});

/**
 * Add issues to epic
 */
router.post('/epics/:epicKey/issues', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { epicKey } = req.params;
    const { issues } = req.body;
    
    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'Issues array is required' });
    }
    
    try {
      // Try Agile API first (for company-managed projects)
      const agileClient = await createJiraAgileClient(pool, req.user.orgId);
      await withBackoff(() => agileClient.post(`/epic/${encodeURIComponent(epicKey)}/issue`, { issues }));
      res.status(204).send();
    } catch (agileError) {
      // Fallback to parent field update (for team-managed projects)
      const client = await createJiraClient(pool, req.user.orgId);
      await Promise.all(
        issues.map(issueKey => 
          withBackoff(() => client.put(`/issue/${encodeURIComponent(issueKey)}`, {
            fields: { parent: { key: epicKey } }
          }))
        )
      );
      res.status(204).send();
    }
  } catch (error) {
    console.error('Error adding issues to epic:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available issue types for a project
 */
router.get('/projects/:projectKey/issue-types', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { projectKey } = req.params;
    const client = await createJiraClient(pool, req.user.orgId);
    
    const response = await client.get(`/project/${projectKey}`);
    const project = response.data;
    
    // Extract issue types from project
    const issueTypes = project.issueTypes.map(type => ({
      id: type.id,
      name: type.name,
      iconUrl: type.iconUrl,
      hierarchyLevel: type.hierarchyLevel || 0
    }));
    
    res.json(issueTypes);
  } catch (error) {
    console.error('Error getting issue types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export solution to Jira
 */
router.post('/export-solution', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { solutionId, projectKey, createEpic = true } = req.body;
    
    if (!solutionId || !projectKey) {
      return res.status(400).json({ error: 'Solution ID and project key are required' });
    }
    
    // Get solution details
    const solutionQuery = `
      SELECT s.*, 
        json_agg(DISTINCT jsonb_build_object(
          'id', e.id, 'name', e.name, 'description', e.description, 'priority', e.priority
        )) FILTER (WHERE e.id IS NOT NULL) as epics,
        json_agg(DISTINCT jsonb_build_object(
          'id', st.id, 'epic_id', st.epic_id, 'title', st.title, 'description', st.description, 'priority', st.priority
        )) FILTER (WHERE st.id IS NOT NULL) as stories,
        json_agg(DISTINCT jsonb_build_object(
          'id', r.id, 'title', r.title, 'description', r.description, 'priority', r.priority
        )) FILTER (WHERE r.id IS NOT NULL) as requirements,
        json_agg(DISTINCT jsonb_build_object(
          'id', a.id, 'name', a.name, 'description', a.description
        )) FILTER (WHERE a.id IS NOT NULL) as architecture
      FROM solutions s
      LEFT JOIN solution_epics e ON s.id = e.solution_id
      LEFT JOIN solution_stories st ON e.id = st.epic_id
      LEFT JOIN solution_requirements r ON s.id = r.solution_id
      LEFT JOIN solution_architecture a ON s.id = a.solution_id
      WHERE s.id = $1 AND s.org_id = $2
      GROUP BY s.id
    `;
    
    const solutionResult = await pool.query(solutionQuery, [solutionId, req.user.orgId]);
    
    if (solutionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solution not found' });
    }
    
    const solution = solutionResult.rows[0];
    const client = await createJiraClient(pool, req.user.orgId);
    const createdIssues = [];
    
    // Get available issue types for the project
    const projectResponse = await client.get(`/project/${projectKey}`);
    const availableIssueTypes = projectResponse.data.issueTypes.map(type => type.name);
    
    console.log(`📋 [JIRA Export] Available issue types for ${projectKey}:`, availableIssueTypes);
    
    // Determine the best issue type to use for epics/main containers
    let containerIssueType = 'Story'; // Default fallback
    if (availableIssueTypes.includes('Epic')) {
      containerIssueType = 'Epic';
    } else if (availableIssueTypes.includes('Task')) {
      containerIssueType = 'Task';
    } else if (availableIssueTypes.includes('Bug')) {
      containerIssueType = 'Bug';
    }
    
    console.log(`🎯 [JIRA Export] Using '${containerIssueType}' as container issue type`);
    
    let epicKey = null;
    
    // Create Epic if requested
    if (createEpic) {
      const epicPayload = {
        fields: {
          project: { key: projectKey },
          issuetype: { name: containerIssueType },
          summary: solution.name || `Solution: ${solution.brief_title}`,
          description: adfForSolution(solution)
        }
      };
      
      // Skip Epic Name field for now - it's not required for team-managed projects
      // and can cause issues with field availability
      console.log('ℹ️ [JIRA Export] Skipping Epic Name field to avoid compatibility issues');
      
      console.log('🔍 [JIRA Export] Epic payload:', JSON.stringify(epicPayload, null, 2));
      
      const epicResponse = await withBackoff(() => client.post('/issue', epicPayload));
      epicKey = epicResponse.data.key;
      createdIssues.push({
        type: 'epic',
        key: epicKey,
        summary: epicPayload.fields.summary
      });
    }
    
    // Determine the best issue type for individual stories/tasks
    let storyIssueType = 'Story'; // Default fallback
    if (availableIssueTypes.includes('Story')) {
      storyIssueType = 'Story';
    } else if (availableIssueTypes.includes('Task')) {
      storyIssueType = 'Task';
    } else if (availableIssueTypes.includes('Sub-task')) {
      storyIssueType = 'Sub-task';
    } else {
      storyIssueType = containerIssueType; // Use the same as container
    }
    
    console.log(`📝 [JIRA Export] Using '${storyIssueType}' for individual items`);

    // Create stories for each epic
    if (solution.epics && Array.isArray(solution.epics)) {
      for (const epic of solution.epics) {
        if (!epic.name) continue;
        
        const storyPayload = {
          fields: {
            project: { key: projectKey },
            issuetype: { name: storyIssueType },
            summary: epic.name,
            description: adfFromText(epic.description || '')
          }
        };
        
        const storyResponse = await withBackoff(() => client.post('/issue', storyPayload));
        const storyKey = storyResponse.data.key;
        
        createdIssues.push({
          type: 'story',
          key: storyKey,
          summary: epic.name,
          epicId: epic.id
        });
        
        // Link to epic if one was created
        if (epicKey) {
          try {
            const agileClient = await createJiraAgileClient(pool, req.user.orgId);
            await withBackoff(() => agileClient.post(`/epic/${encodeURIComponent(epicKey)}/issue`, { 
              issues: [storyKey] 
            }));
          } catch (agileError) {
            // Fallback to parent field
            await withBackoff(() => client.put(`/issue/${encodeURIComponent(storyKey)}`, {
              fields: { parent: { key: epicKey } }
            }));
          }
        }
        
        // Create tasks for stories within this epic
        if (solution.stories && Array.isArray(solution.stories)) {
          const epicStories = solution.stories.filter(story => story.epic_id === epic.id);
          
          for (const story of epicStories) {
            if (!story.title) continue;
            
            // Use Sub-task if available, otherwise use the same as story
            let taskIssueType = storyIssueType;
            if (availableIssueTypes.includes('Sub-task')) {
              taskIssueType = 'Sub-task';
            } else if (availableIssueTypes.includes('Task')) {
              taskIssueType = 'Task';
            }
            
            const taskPayload = {
              fields: {
                project: { key: projectKey },
                issuetype: { name: taskIssueType },
                summary: story.title,
                description: adfFromText(story.description || '')
              }
            };
            
            // Only add parent if it's a Sub-task (which can have parents)
            if (taskIssueType === 'Sub-task') {
              taskPayload.fields.parent = { key: storyKey };
            }
            
            const taskResponse = await withBackoff(() => client.post('/issue', taskPayload));
            createdIssues.push({
              type: 'task',
              key: taskResponse.data.key,
              summary: story.title,
              parentKey: storyKey
            });
          }
        }
      }
    }
    
    res.status(201).json({
      message: 'Solution exported successfully to Jira',
      epicKey,
      createdIssues,
      totalIssues: createdIssues.length
    });
    
  } catch (error) {
    console.error('❌ [JIRA Export] Error exporting solution to Jira:', error);
    
    // Log detailed JIRA error information
    if (error.response?.data) {
      console.error('❌ [JIRA Export] JIRA API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Extract meaningful error message
    let errorMessage = error.message;
    if (error.response?.data) {
      const jiraErrors = error.response.data;
      if (jiraErrors.errorMessages?.length > 0) {
        errorMessage = jiraErrors.errorMessages.join('; ');
      } else if (jiraErrors.errors && Object.keys(jiraErrors.errors).length > 0) {
        errorMessage = Object.entries(jiraErrors.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join('; ');
      }
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
