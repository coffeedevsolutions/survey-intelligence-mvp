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
 * Get solution hierarchy with Jira keys
 */
router.get('/solutions/:solutionId/hierarchy', requireMember('reviewer', 'admin'), async (req, res) => {
  try {
    const { solutionId } = req.params;
    
    // Get solution with all related Jira keys
    const hierarchyQuery = `
      SELECT 
        s.id as solution_id,
        s.name as solution_name,
        s.jira_export_epic_key,
        json_agg(
          json_build_object(
            'epic_id', e.id,
            'epic_name', e.name,
            'epic_jira_key', e.jira_epic_key,
            'stories', (
              SELECT json_agg(
                json_build_object(
                  'story_id', st.id,
                  'story_title', st.title,
                  'story_jira_key', st.jira_issue_key,
                  'story_type', st.story_type,
                  'tasks', (
                    SELECT json_agg(
                      json_build_object(
                        'task_id', t.id,
                        'task_title', t.title,
                        'task_jira_key', t.jira_issue_key,
                        'task_type', t.task_type,
                        'estimated_hours', t.estimated_hours
                      )
                    )
                    FROM solution_tasks t 
                    WHERE t.story_id = st.id
                  )
                )
              )
              FROM solution_stories st 
              WHERE st.epic_id = e.id
            )
          )
        ) as epics
      FROM solutions s
      LEFT JOIN solution_epics e ON s.id = e.solution_id
      WHERE s.id = $1 AND s.org_id = $2
      GROUP BY s.id, s.name, s.jira_export_epic_key
    `;
    
    const result = await pool.query(hierarchyQuery, [solutionId, req.user.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solution not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting solution hierarchy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export solution to Jira with progress streaming
 */
router.post('/export-solution', requireMember('reviewer', 'admin'), async (req, res) => {
  const { solutionId, projectKey, createEpic = true } = req.body;
  
  try {
    
    if (!solutionId || !projectKey) {
      return res.status(400).json({ error: 'Solution ID and project key are required' });
    }
    
    // Get solution details with separate queries to avoid DISTINCT conflicts
    const solutionQuery = `SELECT * FROM solutions WHERE id = $1 AND org_id = $2`;
    const epicsQuery = `
      SELECT json_agg(jsonb_build_object(
        'id', e.id, 'name', e.name, 'description', e.description, 'priority', e.priority
      )) as epics
      FROM solution_epics e WHERE e.solution_id = $1
    `;
    const storiesQuery = `
      SELECT json_agg(jsonb_build_object(
        'id', st.id, 'epic_id', st.epic_id, 'title', st.title, 'description', st.description, 'priority', st.priority
      )) as stories
      FROM solution_stories st 
      JOIN solution_epics e ON st.epic_id = e.id 
      WHERE e.solution_id = $1
    `;
    const tasksQuery = `
      SELECT json_agg(jsonb_build_object(
        'id', t.id, 'story_id', t.story_id, 'title', t.title, 'description', t.description, 
        'task_type', t.task_type, 'estimated_hours', t.estimated_hours, 'sort_order', t.sort_order
      )) as tasks
      FROM solution_tasks t 
      JOIN solution_stories st ON t.story_id = st.id 
      JOIN solution_epics e ON st.epic_id = e.id 
      WHERE e.solution_id = $1
    `;
    const requirementsQuery = `
      SELECT json_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'description', r.description, 'priority', r.priority
      )) as requirements
      FROM solution_requirements r WHERE r.solution_id = $1
    `;
    const architectureQuery = `
      SELECT json_agg(jsonb_build_object(
        'id', a.id, 'name', a.name, 'description', a.description
      )) as architecture
      FROM solution_architecture a WHERE a.solution_id = $1
    `;
    
    const solutionResult = await pool.query(solutionQuery, [solutionId, req.user.orgId]);
    
    if (solutionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solution not found' });
    }
    
    // Execute all queries in parallel
    const [epicsResult, storiesResult, tasksResult, requirementsResult, architectureResult] = await Promise.all([
      pool.query(epicsQuery, [solutionId]),
      pool.query(storiesQuery, [solutionId]),
      pool.query(tasksQuery, [solutionId]),
      pool.query(requirementsQuery, [solutionId]),
      pool.query(architectureQuery, [solutionId])
    ]);
    
    const solution = {
      ...solutionResult.rows[0],
      epics: epicsResult.rows[0]?.epics || [],
      stories: storiesResult.rows[0]?.stories || [],
      tasks: tasksResult.rows[0]?.tasks || [],
      requirements: requirementsResult.rows[0]?.requirements || [],
      architecture: architectureResult.rows[0]?.architecture || []
    };
    
    // Debug logging
    console.log(`🐛 [JIRA Export Debug] Solution ID: ${solutionId}`);
    console.log(`🐛 [JIRA Export Debug] Epics found: ${solution.epics?.length || 0}`);
    console.log(`🐛 [JIRA Export Debug] Stories found: ${solution.stories?.length || 0}`);
    console.log(`🐛 [JIRA Export Debug] Tasks found: ${solution.tasks?.length || 0}`);
    if (solution.tasks?.length > 0) {
      console.log(`🐛 [JIRA Export Debug] Sample task:`, solution.tasks[0]);
    }
    const client = await createJiraClient(pool, req.user.orgId);
    const createdIssues = [];
    
    // Initialize progress tracking
    updateExportProgress(solutionId, 'starting', 0, 'Initializing export...');
    
    // Get available issue types for the project
    updateExportProgress(solutionId, 'in_progress', 10, 'Getting project information...');
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
      updateExportProgress(solutionId, 'in_progress', 20, 'Creating Epic...');
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
      
      // Update the solution epics in database with Jira key
      if (solution.epics && solution.epics.length > 0) {
        await pool.query(`
          UPDATE solution_epics 
          SET jira_epic_key = $1 
          WHERE solution_id = $2
        `, [epicKey, solutionId]);
      }
      
      updateExportProgress(solutionId, 'in_progress', 30, `Created Epic: ${epicKey}`, {
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

    // Create stories and tasks
    if (solution.stories && Array.isArray(solution.stories)) {
      const totalStories = solution.stories.filter(story => story.title).length;
      let currentStoryIndex = 0;
      
      for (const story of solution.stories) {
        if (!story.title) continue;
        
        currentStoryIndex++;
        const progressPercent = 30 + Math.floor((currentStoryIndex / totalStories) * 60);
        updateExportProgress(solutionId, 'in_progress', progressPercent, `Creating story: ${story.title}`);
        
        // Validate the story issue type
        const validStoryIssueType = await validateIssueType(pool, req.user.orgId, projectKey, storyIssueType);
        if (!validStoryIssueType) {
          console.warn(`⚠️ [JIRA Export] Issue type "${storyIssueType}" not found, skipping story: ${story.title}`);
          continue;
        }
        
        const storyPayload = {
          fields: {
            project: { key: projectKey },
            issuetype: { id: validStoryIssueType.id },
            summary: story.title,
            description: adfFromText(story.description || '')
          }
        };
        
        const storyResponse = await withBackoff(() => client.post('/issue', storyPayload));
        const storyKey = storyResponse.data.key;
        
        createdIssues.push({
          type: 'story',
          key: storyKey,
          summary: story.title,
          storyType: story.story_type,
          epicId: story.epic_id,
          priority: story.priority
        });
        
        // Update the story in database with Jira key
        await pool.query(`
          UPDATE solution_stories 
          SET jira_issue_key = $1 
          WHERE id = $2
        `, [storyKey, story.id]);
        
        updateExportProgress(solutionId, 'in_progress', progressPercent, `Created story: ${storyKey}`, {
          type: 'story',
          key: storyKey,
          summary: story.title
        });
        
        // Link to epic if one was created
        if (epicKey) {
          try {
            const agileClient = await createJiraAgileClient(pool, req.user.orgId);
            await withBackoff(() => agileClient.post(`/epic/${encodeURIComponent(epicKey)}/issue`, { 
              issues: [storyKey] 
            }));
            console.log(`🔗 [JIRA Export] Linked story ${storyKey} to epic ${epicKey}`);
          } catch (agileError) {
            console.warn(`⚠️ [JIRA Export] Could not link story to epic using Agile API: ${agileError.message}`);
            // Fallback to parent field for hierarchical issue types
            try {
              await withBackoff(() => client.put(`/issue/${encodeURIComponent(storyKey)}`, {
                fields: { parent: { key: epicKey } }
              }));
              console.log(`🔗 [JIRA Export] Linked story ${storyKey} to epic ${epicKey} using parent field`);
            } catch (parentError) {
              console.warn(`⚠️ [JIRA Export] Could not link story to epic using parent field: ${parentError.message}`);
            }
          }
        }
        
        // Create tasks for this story
        if (solution.tasks && Array.isArray(solution.tasks)) {
          const storyTasks = solution.tasks.filter(task => task.story_id === story.id);
          
          for (const task of storyTasks) {
            if (!task.title) continue;
            
            // Determine the best issue type for tasks
            let taskIssueTypeName = 'Task';
            if (availableIssueTypes.includes('Sub-task')) {
              taskIssueTypeName = 'Sub-task';
            } else if (availableIssueTypes.includes('Task')) {
              taskIssueTypeName = 'Task';
            }
            
            // Validate the issue type and get its ID
            const validTaskIssueType = await validateIssueType(pool, req.user.orgId, projectKey, taskIssueTypeName);
            if (!validTaskIssueType) {
              console.warn(`⚠️ [JIRA Export] Issue type "${taskIssueTypeName}" not found, skipping task: ${task.title}`);
              continue;
            }
            
            const taskPayload = {
              fields: {
                project: { key: projectKey },
                issuetype: { id: validTaskIssueType.id },
                summary: task.title,
                description: adfFromText(task.description || '')
              }
            };
            
            // Set parent relationship based on issue type capabilities
            if (taskIssueTypeName === 'Sub-task') {
              taskPayload.fields.parent = { key: storyKey };
            }
            
            console.log(`📝 [JIRA Export] Creating task: ${task.title} (${taskIssueTypeName}) under story ${storyKey}`);
            
            const taskResponse = await withBackoff(() => client.post('/issue', taskPayload));
            const taskKey = taskResponse.data.key;
            
            // Link task to story (for non-Sub-task types)
            if (taskIssueTypeName !== 'Sub-task') {
              try {
                console.log(`🔗 [JIRA Export] Linking task ${taskKey} to story ${storyKey}`);
                await withBackoff(() => client.post('/issueLink', {
                  type: { name: 'Relates' }, // Use a generic link type
                  inwardIssue: { key: taskKey },
                  outwardIssue: { key: storyKey },
                  comment: {
                    body: `Task ${taskKey} is part of story ${storyKey}`
                  }
                }));
                console.log(`✅ [JIRA Export] Linked task ${taskKey} to story ${storyKey}`);
              } catch (linkError) {
                console.warn(`⚠️ [JIRA Export] Could not link task ${taskKey} to story ${storyKey}: ${linkError.message}`);
                // Continue without failing the export
              }
            }
            
            // Also link task to epic (for all task types)
            if (epicKey) {
              try {
                console.log(`🔗 [JIRA Export] Linking task ${taskKey} to epic ${epicKey}`);
                
                // Try using the Agile API to add task to epic
                try {
                  const agileClient = await createJiraAgileClient(pool, req.user.orgId);
                  await withBackoff(() => agileClient.post(`/epic/${encodeURIComponent(epicKey)}/issue`, { 
                    issues: [taskKey] 
                  }));
                  console.log(`✅ [JIRA Export] Added task ${taskKey} to epic ${epicKey} using Agile API`);
                } catch (agileError) {
                  console.warn(`⚠️ [JIRA Export] Could not add task to epic using Agile API: ${agileError.message}`);
                  
                  // Fallback: create an issue link between task and epic
                  try {
                    await withBackoff(() => client.post('/issueLink', {
                      type: { name: 'Relates' },
                      inwardIssue: { key: taskKey },
                      outwardIssue: { key: epicKey },
                      comment: {
                        body: `Task ${taskKey} belongs to epic ${epicKey}`
                      }
                    }));
                    console.log(`✅ [JIRA Export] Linked task ${taskKey} to epic ${epicKey} using issue link`);
                  } catch (linkError) {
                    console.warn(`⚠️ [JIRA Export] Could not link task ${taskKey} to epic ${epicKey}: ${linkError.message}`);
                    // Continue without failing the export
                  }
                }
              } catch (epicLinkError) {
                console.warn(`⚠️ [JIRA Export] Error linking task ${taskKey} to epic ${epicKey}: ${epicLinkError.message}`);
              }
            }
            
            createdIssues.push({
              type: 'task',
              key: taskKey,
              summary: task.title,
              parentKey: taskIssueTypeName === 'Sub-task' ? storyKey : null,
              linkedStoryKey: taskIssueTypeName !== 'Sub-task' ? storyKey : null,
              epicKey: epicKey, // Track which epic this task belongs to
              taskType: task.task_type,
              estimatedHours: task.estimated_hours
            });
            
            // Update the task in database with Jira key
            await pool.query(`
              UPDATE solution_tasks 
              SET jira_issue_key = $1 
              WHERE id = $2
            `, [taskKey, task.id]);
            
            console.log(`✅ [JIRA Export] Created task: ${taskKey} - ${task.title}`);
          }
        }
      }
    }
    
    // Update solution with export tracking information
    await pool.query(`
      UPDATE solutions 
      SET 
        jira_exported_at = NOW(),
        jira_export_project_key = $1,
        jira_export_epic_key = $2,
        jira_export_issue_count = $3
      WHERE id = $4 AND org_id = $5
    `, [projectKey, epicKey, createdIssues.length, solutionId, req.user.orgId]);
    
    // Mark export as completed
    updateExportProgress(solutionId, 'completed', 100, `Export completed! Created ${createdIssues.length} issues`, {
      type: 'completion',
      totalIssues: createdIssues.length,
      epicKey
    });
    
    res.status(201).json({
      message: 'Solution exported successfully to Jira',
      epicKey,
      createdIssues,
      totalIssues: createdIssues.length
    });
    
  } catch (error) {
    console.error('❌ [JIRA Export] Error exporting solution to Jira:', error);
    
    // Mark export as failed
    updateExportProgress(solutionId, 'failed', 0, `Export failed: ${error.message}`);
    
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

/**
 * Progress tracking for exports
 */
const exportProgress = new Map(); // solutionId -> progress data

/**
 * Get export progress for a solution
 */
router.get('/export-progress/:solutionId', requireMember('reviewer', 'admin'), async (req, res) => {
  const { solutionId } = req.params;
  const progress = exportProgress.get(solutionId) || { status: 'not_started', progress: 0 };
  res.json(progress);
});

/**
 * Update export progress (internal helper)
 */
function updateExportProgress(solutionId, status, progress = 0, currentItem = null, createdItem = null) {
  const progressData = {
    status,
    progress,
    currentItem,
    createdItem,
    timestamp: new Date().toISOString()
  };
  exportProgress.set(solutionId, progressData);
  
  // Clean up completed exports after 30 seconds
  if (status === 'completed' || status === 'failed') {
    setTimeout(() => {
      exportProgress.delete(solutionId);
    }, 30000);
  }
}

export { updateExportProgress };
export default router;
