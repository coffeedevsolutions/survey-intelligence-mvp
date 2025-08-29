/**
 * API utilities for Review operations
 */

const API = "http://localhost:8787";

export const reviewApi = {
  // Session operations
  fetchSessions: async () => {
    const response = await fetch(`${API}/api/sessions`, {
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    
    return response.json();
  }
};

export const reviewUtils = {
  formatDate: (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  },

  generateSessionUrl: (sessionId) => {
    return `${API}/api/sessions/${sessionId}`;
  },

  generateBriefUrl: (sessionId) => {
    return `${API}/api/sessions/${sessionId}/brief`;
  },

  calculateStats: (sessions) => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(r => r.completed).length;
    const sessionsWithBriefs = sessions.filter(r => r.has_brief).length;
    const averageAnswers = totalSessions > 0 
      ? Math.round(sessions.reduce((sum, r) => sum + (r.answer_count || 0), 0) / totalSessions) 
      : 0;

    return {
      totalSessions,
      completedSessions,
      sessionsWithBriefs,
      averageAnswers
    };
  }
};
