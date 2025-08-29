/**
 * API utilities for Public Survey operations
 */

const API_BASE = 'http://localhost:8787';

export const publicSurveyApi = {
  // Survey bootstrap and session operations
  bootstrapSurvey: async (token) => {
    const response = await fetch(`${API_BASE}/public/surveys/${token}/bootstrap`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Survey not available');
    }
    
    return response.json();
  },

  startSurvey: async (token) => {
    const response = await fetch(`${API_BASE}/public/surveys/${token}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start survey');
    }
    
    return response.json();
  },

  submitAnswer: async (sessionId, questionId, text) => {
    const response = await fetch(`${API_BASE}/public/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        text: text.trim()
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit answer');
    }
    
    return response.json();
  },

  submitSurvey: async (sessionId) => {
    const response = await fetch(`${API_BASE}/public/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit survey');
    }
    
    return response.json();
  }
};

export const publicSurveyUtils = {
  downloadBrief: (briefMarkdown, sessionId) => {
    if (!briefMarkdown) return;
    
    const blob = new Blob([briefMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-brief-${sessionId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  formatFactName: (fact) => {
    return fact.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  },

  truncateAnswer: (answer, maxLength = 100) => {
    return answer.length > maxLength 
      ? answer.substring(0, maxLength) + '...' 
      : answer;
  }
};
