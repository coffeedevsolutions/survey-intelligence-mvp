import { apiFetch, API_BASE_URL } from './api.js';

/**
 * Campaigns API utilities
 */
export const campaignsApi = {
  // Campaign operations
  async getCampaigns(orgId) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns`);
    return response.json();
  },

  async createCampaign(orgId, campaignData) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData)
    });
    return response.json();
  },

  // Flow operations
  async getFlows(orgId, campaignId) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns/${campaignId}/flows`);
    return response.json();
  },

  async createFlow(orgId, campaignId, flowData) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns/${campaignId}/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flowData)
    });
    return response.json();
  },

  // Response operations
  async getResponses(orgId, campaignId) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns/${campaignId}/responses`);
    return response.json();
  },

  async getResponseDetails(orgId, sessionId) {
    const response = await apiFetch(`/api/orgs/${orgId}/sessions/${sessionId}/answers`);
    return response.json();
  },

  async getBrief(orgId, sessionId) {
    const response = await apiFetch(`/api/orgs/${orgId}/sessions/${sessionId}/brief`);
    return response.json();
  },

  // Survey link operations
  async getSurveyLinks(orgId) {
    const response = await apiFetch(`/api/orgs/${orgId}/links`);
    return response.json();
  },

  async createSurveyLink(orgId, campaignId, flowId, linkData = {}) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns/${campaignId}/flows/${flowId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkData)
    });
    return response.json();
  },

  // Archive operations
  async archiveCampaign(orgId, campaignId) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns/${campaignId}/archive`, {
      method: 'POST'
    });
    return response.json();
  },

  async restoreCampaign(orgId, campaignId) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns/${campaignId}/restore`, {
      method: 'POST'
    });
    return response.json();
  },

  async deleteCampaignPermanently(orgId, campaignId) {
    const response = await apiFetch(`/api/orgs/${orgId}/campaigns/${campaignId}/permanent`, {
      method: 'DELETE'
    });
    return response.json();
  },

  async archiveSession(orgId, sessionId) {
    const response = await apiFetch(`/api/orgs/${orgId}/sessions/${sessionId}/archive`, {
      method: 'POST'
    });
    return response.json();
  },

  async restoreSession(orgId, sessionId) {
    const response = await apiFetch(`/api/orgs/${orgId}/sessions/${sessionId}/restore`, {
      method: 'POST'
    });
    return response.json();
  },

  async deleteSessionPermanently(orgId, sessionId) {
    const response = await apiFetch(`/api/orgs/${orgId}/sessions/${sessionId}/permanent`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Get archived items
  async getArchivedCampaigns(orgId) {
    console.log('campaignsApi: getArchivedCampaigns called with orgId:', orgId);
    const url = `/api/orgs/${orgId}/campaigns/archived`;
    console.log('campaignsApi: Making request to URL:', url);
    const response = await apiFetch(url);
    console.log('campaignsApi: Response received:', response);
    const result = await response.json();
    console.log('campaignsApi: JSON result:', result);
    return result;
  },

  async getArchivedSessions(orgId) {
    const response = await apiFetch(`/api/orgs/${orgId}/sessions/archived`);
    return response.json();
  }
};

/**
 * Default templates and configurations
 */
export const campaignDefaults = {
  getDefaultTemplate: () => `# Project Brief

**Problem Statement**  
{{problem_statement}}

**Who is affected**  
{{affected_users}}

**Impact**  
{{impact_metric}}

**Data sources/systems**  
{{data_sources}}

**Current workaround**  
{{current_workaround}}

**Deadline/dependencies**  
{{deadline}}

**Acceptance criteria**  
- Captures the problem and impacted users
- Lists data sources and desired outputs
- Defines success in measurable terms`,

  getDefaultFlowSpec: () => ({
    questions: [
      { id: "intro", text: "Briefly describe the problem.", type: "text", factKeys: ["problem_statement"] },
      { id: "impact", text: "Who is affected and what is the impact?", type: "text", factKeys: ["affected_users", "impact_metric"] },
      { id: "data", text: "What data/systems are involved?", type: "text", factKeys: ["data_sources"] },
      { id: "workaround", text: "Current workaround?", type: "text", factKeys: ["current_workaround"] },
      { id: "deadline", text: "Any deadline or constraints?", type: "text", factKeys: ["deadline"] }
    ],
    edges: [
      { from: "intro", to: "impact" },
      { from: "impact", to: "data" },
      { from: "data", to: "workaround" },
      { from: "workaround", to: "deadline" }
    ],
    completion: { requiredFacts: ["problem_statement", "affected_users", "impact_metric", "data_sources", "deadline"] }
  })
};

/**
 * Utility functions
 */
export const campaignUtils = {
  generateSlug: (name) => {
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    return `${baseSlug}-${timestamp}`;
  },
  
  copyLinkToClipboard: (token) => {
    const url = `${window.location.origin}/reply/${token}`;
    navigator.clipboard.writeText(url);
    return url;
  },

  downloadBrief: (briefContent, sessionId) => {
    const blob = new Blob([briefContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brief-${sessionId.slice(-8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  formatDate: (dateString) => new Date(dateString).toLocaleDateString(),
  
  getStatusInfo: (isActive) => ({
    text: isActive ? 'Active' : 'Inactive',
    color: isActive ? 'bg-green-500' : 'bg-muted-foreground/60',
    icon: isActive ? 'CheckCircle2' : 'XCircle'
  })
};
