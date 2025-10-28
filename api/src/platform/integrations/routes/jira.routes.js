/**
 * Jira Integration Routes
 * Handles Jira connection management and issue operations
 */

import { Router } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import { requireMember } from '../../auth/services/auth-enhanced.js';
import { pool } from '../../../database/connection.js';
import { createJiraClient, createJiraAgileClient, testJiraConnection } from '../jira/client.js';
import { adfFromText, adfForSolution } from '../jira/adf.js';
import { withBackoff } from '../jira/retry.js';
import { getEpicNameFieldId, getCreateMetadata, validateIssueType } from '../jira/fields.js';
import { encrypt, decrypt } from '../jira/encryption.js';

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
      SELECT id, base_url, auth_type, email, api_token_encrypted, is_active, created_at, updated_at
      FROM jira_connections 
      WHERE org_id = $1
    `;
    const result = await pool.query(query, [req.user.orgId]);
    
    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }
    
    const connection = result.rows[0];
    
    // Check if token exists
    const hasToken = connection.api_token_encrypted !== null && connection.api_token_encrypted !== undefined;
    
    res.json({
      connected: true,
      connection: {
        id: connection.id,
        baseUrl: connection.base_url,
        authType: connection.auth_type,
        email: connection.email,
        isActive: connection.is_active,
        createdAt: connection.created_at,
        updatedAt: connection.updated_at,
        tokenValid: hasToken ? true : null, // Set to true if token exists
        tokenError: hasToken ? null : 'No API token found'
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
    const encryptedToken = apiToken ? await encrypt(apiToken, req.user.orgId.toString()) : null;
    
    // Store encrypted token securely (no logging of sensitive data)
    const encryptedTokenString = encryptedToken ? JSON.stringify(encryptedToken) : null;
    
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
      values = [req.user.orgId, baseUrl, authType, email, encryptedTokenString];
    } else {
      // Create new connection
      query = `
        INSERT INTO jira_connections (org_id, base_url, auth_type, email, api_token_encrypted, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `;
      values = [req.user.orgId, baseUrl, authType, email, encryptedTokenString];
    }
    
    const result = await pool.query(query, values);
    
    // Test the connection (with error handling to prevent crashes)
    let testResult;
    try {
      testResult = await testJiraConnection(pool, req.user.orgId);
    } catch (testError) {
      console.error('Connection test failed:', testError.message);
      testResult = {
        success: false,
        error: testError.message
      };
    }
    
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
    let client;
    try {
      client = await createJiraClient(pool, req.user.orgId);
      console.log(`✅ [Projects] JIRA client created successfully`);
    } catch (clientError) {
      console.error('❌ [Projects] Failed to create JIRA client:', clientError.message);
      if (clientError.message.includes('Failed to decrypt Jira token')) {
        return res.status(400).json({ 
          error: 'Failed to decrypt Jira token. The stored token may be corrupted. Please reconfigure your Jira connection in Settings.',
          code: 'DECRYPTION_FAILED'
        });
      }
      throw clientError;
    }
    
    console.log(`🔍 [Projects] Fetching projects from JIRA API`);
    let response;
    try {
      response = await client.get('/project');
    } catch (apiError) {
      console.error('❌ [Projects] JIRA API call failed:', apiError.message);
      if (apiError.message.includes('Failed to decrypt Jira token')) {
        return res.status(400).json({ 
          error: 'Failed to decrypt Jira token. The stored token may be corrupted. Please reconfigure your Jira connection in Settings.',
          code: 'DECRYPTION_FAILED'
        });
      }
      throw apiError;
    }
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
    
    console.log('🚀 [JIRA Export] Creating Epic:', payload.fields.summary);
    const response = await withBackoff(() => client.post('/issue', payload));
    console.log('✅ [JIRA Export] Epic created successfully:', response.data.key);
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

  // Make these available to the catch block
  let epicKey = null;
  const createdIssues = [];

  try {
    if (!solutionId || !projectKey) {
      return res.status(400).json({ error: 'Solution ID and project key are required' });
    }

    // Use the same data structure as the UI (nested epics/stories/tasks)
    const { SolutioningService } = await import('../../../core/solutioning/services/solutioningService.js');
    const solutioningService = new SolutioningService();
    const solution = await solutioningService.getSolutionById(solutionId, req.user.orgId);

    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    // Debug logging
    console.log(`🐛 [JIRA Export Debug] Solution ID: ${solutionId}`);
    console.log(`🐛 [JIRA Export Debug] Epics found: ${solution.epics?.length || 0}`);

    // Count stories and tasks from nested structure
    const debugStories = solution.epics?.reduce((total, epic) => total + (epic.stories?.length || 0), 0) || 0;
    const debugTasks = solution.epics?.reduce((total, epic) =>
      total + (epic.stories?.reduce((storyTotal, story) => storyTotal + (story.tasks?.length || 0), 0) || 0), 0
    ) || 0;

    console.log(`🐛 [JIRA Export Debug] Stories found: ${debugStories}`);
    console.log(`🐛 [JIRA Export Debug] Tasks found: ${debugTasks}`);

    if (debugTasks > 0) {
      const firstTask = solution.epics?.find(epic =>
        epic.stories?.find(story => story.tasks?.length > 0)
      )?.stories?.find(story => story.tasks?.length > 0)?.tasks?.[0];
      console.log(`🐛 [JIRA Export Debug] Sample task:`, firstTask);
    }

    const client = await createJiraClient(pool, req.user.orgId);

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

      console.log('ℹ️ [JIRA Export] Skipping Epic Name field to avoid compatibility issues');
      console.log('🔍 [JIRA Export] Epic payload:', JSON.stringify(epicPayload, null, 2));
      console.log('🚀 [JIRA Export] Creating Epic:', epicPayload.fields.summary);

      try {
        const epicResponse = await withBackoff(() => client.post('/issue', epicPayload));
        epicKey = epicResponse.data.key;
        console.log('✅ [JIRA Export] Epic created successfully:', epicKey);
      } catch (epicError) {
        console.error('❌ [JIRA Export] Failed to create Epic:', epicError.message);
        console.error('❌ [JIRA Export] Epic error details:', epicError.response?.data);
        throw epicError; // Bubble up to outer catch
      }

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
      storyIssueType = containerIssueType;
    }
    console.log(`📝 [JIRA Export] Using '${storyIssueType}' for individual items`);

    // Debug solution structure
    console.log('🔍 [JIRA Export] Solution structure debug:');
    console.log('  - solution.pm_template_id:', solution.pm_template_id);
    console.log('  - solution.name:', solution.name);
    console.log('  - solution.brief_title:', solution.brief_title);

    // Create stories and tasks from nested structure
    if (solution.epics && Array.isArray(solution.epics)) {
      // Flatten all stories from all epics
      const allStories = solution.epics.flatMap(epic =>
        (epic.stories || []).map(story => ({ ...story, epic_id: epic.id }))
      );

      const totalStories = allStories.filter(story => story.title).length;
      console.log(`📊 [JIRA Export] Found ${totalStories} stories to create`);
      let currentStoryIndex = 0;

      for (const story of allStories) {
        if (!story.title) continue;

        currentStoryIndex++;
        const progressPercent = 30 + Math.floor((currentStoryIndex / Math.max(totalStories, 1)) * 60);
        updateExportProgress(solutionId, 'in_progress', progressPercent, `Creating story: ${story.title}`);

        let storyKey = null;
        try {
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

          console.log('🚀 [JIRA Export] Creating Story:', story.title);
          const storyResponse = await withBackoff(() => client.post('/issue', storyPayload));
          storyKey = storyResponse.data.key;
          console.log('✅ [JIRA Export] Story created successfully:', storyKey);
        } catch (storyError) {
          console.error('❌ [JIRA Export] Failed to create Story:', story.title);
          console.error('❌ [JIRA Export] Story error details:', storyError.message);
          console.error('❌ [JIRA Export] Story error response:', storyError.response?.data);
          continue; // Skip this story and continue
        }

        if (!storyKey) {
          console.warn(`⚠️ [JIRA Export] No storyKey for story: ${story.title}, skipping`);
          continue;
        }

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
          console.log(`🔗 [JIRA Export] Attempting to link story ${storyKey} to epic ${epicKey}`);
          try {
            const agileClient = await createJiraAgileClient(pool, req.user.orgId);
            console.log(`🔗 [JIRA Export] Using Agile API to link story ${storyKey} to epic ${epicKey}`);
            await withBackoff(() => agileClient.post(`/epic/${encodeURIComponent(epicKey)}/issue`, {
              issues: [storyKey]
            }));
            console.log(`✅ [JIRA Export] Successfully linked story ${storyKey} to epic ${epicKey} using Agile API`);
          } catch (agileError) {
            console.warn(`⚠️ [JIRA Export] Agile API failed for story ${storyKey}: ${agileError.message}`);
            console.warn(`⚠️ [JIRA Export] Agile API error details:`, agileError.response?.data);
            try {
              console.log(`🔗 [JIRA Export] Trying parent field fallback for story ${storyKey}`);
              await withBackoff(() => client.put(`/issue/${encodeURIComponent(storyKey)}`, {
                fields: { parent: { key: epicKey } }
              }));
              console.log(`✅ [JIRA Export] Successfully linked story ${storyKey} to epic ${epicKey} using parent field`);
            } catch (parentError) {
              console.warn(`❌ [JIRA Export] Parent field also failed for story ${storyKey}: ${parentError.message}`);
              console.warn(`❌ [JIRA Export] Parent field error details:`, parentError.response?.data);
            }
          }
        } else {
          console.warn(`⚠️ [JIRA Export] No epicKey available to link story ${storyKey}`);
        }

        // Create tasks for this story (from nested structure)
        const storyTasks = story.tasks || [];
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

          let taskKey = null;
          try {
            const taskResponse = await withBackoff(() => client.post('/issue', taskPayload));
            taskKey = taskResponse.data.key;
            console.log(`✅ [JIRA Export] Task created successfully: ${taskKey}`);
          } catch (taskError) {
            console.error(`❌ [JIRA Export] Failed to create task: ${task.title}`);
            console.error(`❌ [JIRA Export] Task error details:`, taskError.message);
            console.error(`❌ [JIRA Export] Task error response:`, taskError.response?.data);
            continue;
          }

          if (!taskKey) {
            console.warn(`⚠️ [JIRA Export] No taskKey for task: ${task.title}, skipping`);
            continue;
          }

          // Link task to story (for non-Sub-task types)
          if (taskIssueTypeName !== 'Sub-task') {
            try {
              console.log(`🔗 [JIRA Export] Linking task ${taskKey} to story ${storyKey}`);
              await withBackoff(() => client.post('/issueLink', {
                type: { name: 'Relates' },
                inwardIssue: { key: taskKey },
                outwardIssue: { key: storyKey },
                comment: { body: `Task ${taskKey} is part of story ${storyKey}` }
              }));
              console.log(`✅ [JIRA Export] Linked task ${taskKey} to story ${storyKey}`);
            } catch (linkError) {
              console.warn(`⚠️ [JIRA Export] Could not link task ${taskKey} to story ${storyKey}: ${linkError.message}`);
            }
          }

          // Also link task to epic (for all task types)
          if (epicKey) {
            console.log(`🔗 [JIRA Export] Attempting to link task ${taskKey} to epic ${epicKey}`);
            try {
              const agileClient = await createJiraAgileClient(pool, req.user.orgId);
              console.log(`🔗 [JIRA Export] Using Agile API to link task ${taskKey} to epic ${epicKey}`);
              await withBackoff(() => agileClient.post(`/epic/${encodeURIComponent(epicKey)}/issue`, {
                issues: [taskKey]
              }));
              console.log(`✅ [JIRA Export] Successfully linked task ${taskKey} to epic ${epicKey} using Agile API`);
            } catch (agileError) {
              console.warn(`⚠️ [JIRA Export] Agile API failed for task ${taskKey}: ${agileError.message}`);
              console.warn(`⚠️ [JIRA Export] Agile API error details:`, agileError.response?.data);
              try {
                await withBackoff(() => client.post('/issueLink', {
                  type: { name: 'Relates' },
                  inwardIssue: { key: taskKey },
                  outwardIssue: { key: epicKey },
                  comment: { body: `Task ${taskKey} belongs to epic ${epicKey}` }
                }));
                console.log(`✅ [JIRA Export] Linked task ${taskKey} to epic ${epicKey} using issue link`);
              } catch (linkError) {
                console.warn(`⚠️ [JIRA Export] Could not link task ${taskKey} to epic ${epicKey}: ${linkError.message}`);
              }
            }
          }

          createdIssues.push({
            type: 'task',
            key: taskKey,
            summary: task.title,
            parentKey: taskIssueTypeName === 'Sub-task' ? storyKey : null,
            linkedStoryKey: taskIssueTypeName !== 'Sub-task' ? storyKey : null,
            epicKey: epicKey,
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
    } else {
      console.log('⚠️ [JIRA Export] No epics found in solution or epics is not an array');
      console.log('🔍 [JIRA Export] Solution epics:', solution.epics);
      console.log('🔍 [JIRA Export] Full solution object keys:', Object.keys(solution));
      console.log('🔍 [JIRA Export] Solution ID:', solution.id);
      console.log('🔍 [JIRA Export] Solution name:', solution.name);
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
      key: 'export-complete',
      summary: 'Export completed successfully'
    });

    // Return success response
    return res.json({
      success: true,
      message: 'Solution exported successfully to Jira',
      epicKey,
      createdIssues,
      totalIssues: createdIssues.length
    });

  } catch (error) {
    console.error('❌ [JIRA Export] Error exporting solution to Jira:', error);

    // Mark export as failed
    updateExportProgress(solutionId, 'failed', 0, `Export failed: ${error.message}`);

    // Extract meaningful error message
    let errorMessage = error.message;
    if (error.response?.data) {
      const jiraErrors = error.response.data;
      if (jiraErrors.errorMessages?.length > 0) {
        errorMessage = jiraErrors.errorMessages.join('; ');
      } else if (jiraErrors.errors && Object.keys(jiraErrors.errors).length > 0) {
        errorMessage = Object.entries(jiraErrors.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join('; ');
      }
    }

    return res.status(500).json({ error: errorMessage, epicKey, totalCreated: createdIssues.length });
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
