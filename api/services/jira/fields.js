/**
 * Jira field utilities for resolving custom field IDs
 */

import { createJiraClient } from './client.js';

let fieldCache = new Map(); // Cache fields per org

/**
 * Get all fields for an organization
 */
export async function getFields(pool, orgId) {
  const cacheKey = `org_${orgId}`;
  
  if (fieldCache.has(cacheKey)) {
    return fieldCache.get(cacheKey);
  }
  
  const client = await createJiraClient(pool, orgId);
  const response = await client.get('/field');
  const fields = response.data;
  
  // Cache for 30 minutes
  fieldCache.set(cacheKey, fields);
  setTimeout(() => fieldCache.delete(cacheKey), 30 * 60 * 1000);
  
  return fields;
}

/**
 * Get Epic Name field ID (required for company-managed projects)
 */
export async function getEpicNameFieldId(pool, orgId) {
  try {
    const fields = await getFields(pool, orgId);
    const epicNameField = fields.find(field => 
      field.name === 'Epic Name' || 
      field.name === 'Epic Name (client-managed)' ||
      field.key === 'customfield_10011'
    );
    
    if (!epicNameField) {
      console.log('ℹ️ [JIRA Fields] Epic Name field not found. This might be a team-managed project.');
      return null;
    }
    
    console.log(`✅ [JIRA Fields] Found Epic Name field: ${epicNameField.id} (${epicNameField.name})`);
    return epicNameField.id;
  } catch (error) {
    console.warn('⚠️ [JIRA Fields] Error getting Epic Name field:', error.message);
    return null;
  }
}

/**
 * Get Story Points field ID
 */
export async function getStoryPointsFieldId(pool, orgId) {
  const fields = await getFields(pool, orgId);
  const storyPointsField = fields.find(field => 
    field.name === 'Story Points' || field.name === 'Story point estimate'
  );
  
  return storyPointsField?.id || null;
}

/**
 * Get create metadata for a project to understand required fields
 */
export async function getCreateMetadata(pool, orgId, projectKey) {
  const client = await createJiraClient(pool, orgId);
  const response = await client.get('/issue/createmeta', {
    params: {
      projectKeys: projectKey,
      expand: 'projects.issuetypes.fields'
    }
  });
  
  return response.data;
}

/**
 * Get available issue types for a project
 */
export async function getIssueTypes(pool, orgId, projectKey) {
  const metadata = await getCreateMetadata(pool, orgId, projectKey);
  const project = metadata.projects?.[0];
  
  if (!project) {
    throw new Error(`Project ${projectKey} not found or not accessible`);
  }
  
  return project.issuetypes || [];
}

/**
 * Validate if an issue type exists and is available for creation
 */
export async function validateIssueType(pool, orgId, projectKey, issueTypeName) {
  const issueTypes = await getIssueTypes(pool, orgId, projectKey);
  const issueType = issueTypes.find(type => 
    type.name.toLowerCase() === issueTypeName.toLowerCase()
  );
  
  return issueType || null;
}
