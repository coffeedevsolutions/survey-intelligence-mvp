/**
 * API configuration and utilities
 */
export const API_BASE_URL = "http://localhost:8787";

/**
 * Enhanced fetch wrapper with credentials and error handling
 */
export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { 
    credentials: "include", 
    ...options 
  });
  
  if (!response.ok && options.throwOnError !== false) {
    // Try to get the actual error message from the API response
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If parsing fails, use the default message
    }
    throw new Error(errorMessage);
  }
  
  return response;
}

/**
 * API endpoints for common operations
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",
  
  // Sessions
  SESSIONS: "/api/sessions",
  SESSION_ANSWER: (id) => `/api/sessions/${id}/answer`,
  SESSION_SUBMIT: (id) => `/api/sessions/${id}/submit`,
  
  // Campaigns
  CAMPAIGNS: "/api/campaigns",
  CAMPAIGN: (id) => `/api/campaigns/${id}`,
};

/**
 * Common API operations
 */
export const api = {
  // Auth operations
  async getCurrentUser() {
    const response = await apiFetch(API_ENDPOINTS.ME, { throwOnError: false });
    return response.ok ? response.json() : null;
  },

  // Session operations
  async createSession() {
    const response = await apiFetch(API_ENDPOINTS.SESSIONS, { method: "POST" });
    return response.json();
  },

  async submitAnswer(sessionId, questionId, text) {
    const response = await apiFetch(API_ENDPOINTS.SESSION_ANSWER(sessionId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, text })
    });
    return response.json();
  },

  async submitSurvey(sessionId) {
    const response = await apiFetch(API_ENDPOINTS.SESSION_SUBMIT(sessionId), { 
      method: "POST" 
    });
    return response.json();
  },
};
