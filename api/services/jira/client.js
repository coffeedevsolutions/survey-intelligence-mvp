/**
 * Jira HTTP client with authentication and connection management
 */

import axios from 'axios';
import { decrypt } from './encryption.js';

/**
 * Create authenticated Jira client for an organization
 */
export async function createJiraClient(pool, orgId) {
  // Get Jira connection for the organization
  const connectionQuery = `
    SELECT base_url, auth_type, email, api_token_encrypted, access_token_encrypted 
    FROM jira_connections 
    WHERE org_id = $1 AND is_active = true
  `;
  
  const result = await pool.query(connectionQuery, [orgId]);
  
  if (result.rows.length === 0) {
    throw new Error('No active Jira connection found for organization');
  }
  
  const connection = result.rows[0];
  
  // Create axios client
  const client = axios.create({
    baseURL: `${connection.base_url}/rest/api/3`,
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  // Add authentication interceptor
  client.interceptors.request.use(config => {
    const authHeaders = getAuthHeaders(connection);
    config.headers = { ...config.headers, ...authHeaders };
    return config;
  });
  
  // Add response interceptor for error handling
  client.interceptors.response.use(
    response => response,
    error => {
      console.error('Jira API Error:', {
        status: error.response?.status,
        message: error.response?.data?.errorMessages,
        url: error.config?.url
      });
      return Promise.reject(error);
    }
  );
  
  return client;
}

/**
 * Create Jira Agile (Software) client
 */
export async function createJiraAgileClient(pool, orgId) {
  const connectionQuery = `
    SELECT base_url, auth_type, email, api_token_encrypted, access_token_encrypted 
    FROM jira_connections 
    WHERE org_id = $1 AND is_active = true
  `;
  
  const result = await pool.query(connectionQuery, [orgId]);
  
  if (result.rows.length === 0) {
    throw new Error('No active Jira connection found for organization');
  }
  
  const connection = result.rows[0];
  
  const client = axios.create({
    baseURL: `${connection.base_url}/rest/agile/1.0`,
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  client.interceptors.request.use(config => {
    const authHeaders = getAuthHeaders(connection);
    config.headers = { ...config.headers, ...authHeaders };
    return config;
  });
  
  return client;
}

/**
 * Get authentication headers based on connection type
 */
function getAuthHeaders(connection) {
  if (connection.auth_type === 'basic') {
    if (!connection.email || !connection.api_token_encrypted) {
      throw new Error('Missing email or API token for basic auth');
    }
    
    const apiToken = decrypt(connection.api_token_encrypted);
    const credentials = Buffer.from(`${connection.email}:${apiToken}`).toString('base64');
    
    return {
      'Authorization': `Basic ${credentials}`
    };
  }
  
  if (connection.auth_type === 'oauth') {
    if (!connection.access_token_encrypted) {
      throw new Error('Missing access token for OAuth');
    }
    
    const accessToken = decrypt(connection.access_token_encrypted);
    
    return {
      'Authorization': `Bearer ${accessToken}`
    };
  }
  
  throw new Error(`Unsupported auth type: ${connection.auth_type}`);
}

/**
 * Test Jira connection
 */
export async function testJiraConnection(pool, orgId) {
  try {
    const client = await createJiraClient(pool, orgId);
    const response = await client.get('/myself');
    return {
      success: true,
      user: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
