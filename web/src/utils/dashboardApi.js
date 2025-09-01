/**
 * API utilities for Dashboard operations
 */

const API = "http://localhost:8787";

export const dashboardApi = {
  // Session operations
  fetchSessions: async () => {
    const response = await fetch(`${API}/api/sessions`, {
      credentials: "include"
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  fetchSessionDetails: async (sessionId) => {
    const response = await fetch(`${API}/api/sessions/${sessionId}`, {
      credentials: "include"
    });
    if (!response.ok) throw new Error('Failed to fetch session details');
    return response.json();
  },

  fetchSessionBrief: async (sessionId) => {
    const response = await fetch(`${API}/api/sessions/${sessionId}/brief`, {
      credentials: "include"
    });
    if (!response.ok) return null;
    return response.json();
  },

  // User operations
  fetchMe: async () => {
    const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch user info');
    return response.json();
  },

  fetchUsers: async () => {
    const response = await fetch(`${API}/api/users`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  updateUserRole: async (email, newRole) => {
    const response = await fetch(`${API}/api/users/${encodeURIComponent(email)}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: newRole })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  deleteUser: async (email) => {
    const response = await fetch(`${API}/api/users/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  // Brief operations
  fetchBriefsForReview: async (orgId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/briefs/review`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch briefs for review');
    return response.json();
  },

  submitBriefReview: async (orgId, briefId, priority) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/briefs/${briefId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ priority })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  submitBriefReviewWithData: async (orgId, briefId, priorityData, frameworkId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/briefs/${briefId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        priorityData: priorityData,
        frameworkId: frameworkId
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  fetchBriefResponseDetails: async (orgId, sessionId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/sessions/${sessionId}/answers`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch brief response details');
    return response.json();
  },

  // Brief comments operations
  fetchBriefComments: async (orgId, briefId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/briefs/${briefId}/comments`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch brief comments');
    return response.json();
  },

  addBriefComment: async (orgId, briefId, commentText) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/briefs/${briefId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ commentText })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  // Resubmit operations
  fetchResubmitRequests: async (orgId, briefId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/briefs/${briefId}/resubmit-requests`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch resubmit requests');
    return response.json();
  },

  createResubmitRequest: async (orgId, briefId, commentText) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/briefs/${briefId}/resubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ commentText })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  // Tech stack operations
  fetchStackData: async (orgId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/stack`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch stack data');
    return response.json();
  },

  deleteSystem: async (orgId, systemId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/systems/${systemId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  deleteCapability: async (orgId, capabilityId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/capabilities/${capabilityId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  deletePolicy: async (orgId, policyId) => {
    const response = await fetch(`${API}/api/orgs/${orgId}/policies/${policyId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  // Organization operations
  fetchSeatInfo: async () => {
    const response = await fetch(`${API}/api/org/seats`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch seat info');
    return response.json();
  },

  fetchInvites: async () => {
    const response = await fetch(`${API}/api/org/invites`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch invites');
    return response.json();
  },

  createInvite: async (inviteData) => {
    const response = await fetch(`${API}/api/org/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(inviteData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  fetchShareLinks: async () => {
    const response = await fetch(`${API}/api/org/shares`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch share links');
    return response.json();
  },

  createShareLink: async (shareData) => {
    const response = await fetch(`${API}/api/org/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(shareData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  revokeShareLink: async (linkId) => {
    const response = await fetch(`${API}/api/org/shares/${linkId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  // Archive operations for surveys/sessions
  async archiveSession(sessionId) {
    // First get the user's orgId
    console.log('dashboardApi: Starting archiveSession for:', sessionId);
    const user = await this.fetchMe();
    console.log('dashboardApi: User orgId:', user.user.orgId);
    
    const url = `${API}/api/orgs/${user.user.orgId}/sessions/${sessionId}/archive`;
    console.log('dashboardApi: Making request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include'
    });
    
    console.log('dashboardApi: Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.log('dashboardApi: Error response:', error);
      throw new Error(error.error);
    }
    
    const result = await response.json();
    console.log('dashboardApi: Success response:', result);
    return result;
  },

  async restoreSession(sessionId) {
    const user = await this.fetchMe();
    const response = await fetch(`${API}/api/orgs/${user.user.orgId}/sessions/${sessionId}/restore`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  async deleteSessionPermanently(sessionId) {
    const user = await this.fetchMe();
    const response = await fetch(`${API}/api/orgs/${user.user.orgId}/sessions/${sessionId}/permanent`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },

  async fetchArchivedSessions() {
    const user = await this.fetchMe();
    const response = await fetch(`${API}/api/orgs/${user.user.orgId}/sessions/archived`, {
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }
};

export const dashboardUtils = {
  formatDate: (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  },

  getStatusColor: (completed) => {
    return completed ? 'default' : 'secondary';
  },

  getSentimentColor: (questionId) => {
    const colors = [
      'bg-green-50 border-green-200',
      'bg-blue-50 border-blue-200', 
      'bg-amber-50 border-amber-200',
      'bg-purple-50 border-purple-200'
    ];
    return colors[questionId % colors.length];
  },

  copyShareLink: (token, showSuccess) => {
    const url = `${window.location.origin}/review/${token}`;
    navigator.clipboard.writeText(url);
    if (showSuccess) {
      showSuccess('Share link copied to clipboard!');
    }
  },

  downloadBrief: (briefContent, sessionId) => {
    const blob = new Blob([briefContent || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brief-${sessionId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  },

  createQuickShareLink: async (briefId) => {
    if (!briefId) {
      console.error('Cannot create share link: briefId is missing');
      return;
    }

    const sharePayload = {
      artifactType: 'brief',
      artifactId: briefId.toString(),
      scope: 'view'
    };
    
    try {
      console.log('Creating share link for brief:', briefId);
      const response = await fetch(`${API}/api/org/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(sharePayload)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.shareLink) {
          await navigator.clipboard.writeText(data.shareLink.url);
          console.log('Share link created and copied to clipboard!');
          // Return success for notification handling
          return { success: true, url: data.shareLink.url };
        } else {
          console.error('Error creating share link: No shareLink in response');
          return { success: false, error: 'No shareLink in response' };
        }
      } else {
        const errorText = await response.text();
        console.error('Error creating share link:', response.status, errorText);
        return { success: false, error: `${response.status}: ${errorText}` };
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      return { success: false, error: err.message };
    }
  }
};
