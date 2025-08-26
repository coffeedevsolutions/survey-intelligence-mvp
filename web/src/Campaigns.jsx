import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8787';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { ScrollArea } from './components/ui/scroll-area';
import { CampaignCard } from './components/ui/campaign-card';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { LoadingSkeleton } from './components/ui/loading-skeleton';
import { PageHeader } from './components/ui/page-header';
import { EmptyState } from './components/ui/empty-state';
import { CreateCampaignModal } from './components/ui/create-campaign-modal';
import { Plus, Settings, Share2, Users, BarChart3, FileText, Copy, ExternalLink, Eye, Calendar, Clock, TrendingUp, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Shield } from './components/ui/icons';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [flows, setFlows] = useState([]);
  const [surveyLinks, setSurveyLinks] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  
  // Dialog states
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [showResponseDetails, setShowResponseDetails] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responseDetails, setResponseDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [flowForm, setFlowForm] = useState({
    title: '',
    spec_json: null,
    use_ai: true
  });
  
  const [linkForm, setLinkForm] = useState({
    expiresAt: '',
    maxUses: ''
  });

  // Fetch user info
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('User data received:', data);
        setMe(data.user || data);
      })
      .catch(err => {
        console.error('Failed to fetch user:', err);
        // Redirect to login if not authenticated
        window.location.href = `${API_BASE}/auth/login`;
      });
  }, []);

  // Fetch campaigns
  useEffect(() => {
    if (!me?.orgId) return;
    
    fetchCampaigns();
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch campaign details when a campaign is selected
  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignDetails(selectedCampaign.id);
    }
  }, [selectedCampaign]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/orgs/${me.orgId}/campaigns`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }
      
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      alert('Failed to load campaigns: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignDetails = async (campaignId) => {
    if (!me?.orgId) return;
    
    try {
      // Fetch flows
      const flowsResponse = await fetch(`${API_BASE}/api/orgs/${me.orgId}/campaigns/${campaignId}/flows`, {
        credentials: 'include'
      });
      const flowsData = await flowsResponse.json();
      console.log('Fetched flows:', flowsData.flows);
      setFlows(flowsData.flows || []);

      // Fetch responses
      const responsesResponse = await fetch(`${API_BASE}/api/orgs/${me.orgId}/campaigns/${campaignId}/responses`, {
        credentials: 'include'
      });
      const responsesData = await responsesResponse.json();
      setResponses(responsesData.responses || []);

      // Fetch survey links for this campaign
      const linksResponse = await fetch(`${API_BASE}/api/orgs/${me.orgId}/links`, {
        credentials: 'include'
      });
      const linksData = await linksResponse.json();
      const campaignLinks = (linksData.links || []).filter(link => link.campaign_id === campaignId);
      setSurveyLinks(campaignLinks);
      
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
    }
  };

  const createCampaign = async (formData) => {
    setIsCreatingCampaign(true);
    try {
      // Auto-generate slug from name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const response = await fetch(`${API_BASE}/api/orgs/${me.orgId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          slug,
          template_md: formData.template_md || getDefaultTemplate()
        })
      });

      if (response.ok) {
        setShowCreateCampaign(false);
        fetchCampaigns();
      } else {
        const error = await response.json();
        alert('Failed to create campaign: ' + error.error);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const createFlow = async () => {
    try {
      const specJson = flowForm.spec_json || getDefaultFlowSpec();
      
      const response = await fetch(`${API_BASE}/api/orgs/${me.orgId}/campaigns/${selectedCampaign.id}/flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: flowForm.title,
          spec_json: specJson,
          use_ai: flowForm.use_ai
        })
      });

      if (response.ok) {
        setShowCreateFlow(false);
        setFlowForm({ title: '', spec_json: null, use_ai: true });
        fetchCampaignDetails(selectedCampaign.id);
      } else {
        const error = await response.json();
        alert('Failed to create flow: ' + error.error);
      }
    } catch (error) {
      console.error('Error creating flow:', error);
      alert('Failed to create flow');
    }
  };

  const createSurveyLink = async (flowId) => {
    try {
      // Ensure all IDs are numbers for the API
      const numericFlowId = parseInt(flowId, 10);
      const numericCampaignId = parseInt(selectedCampaign.id, 10);
      const numericOrgId = parseInt(me.orgId, 10);
      
      console.log('Creating link for:', { orgId: numericOrgId, campaignId: numericCampaignId, flowId: numericFlowId });
      
      const body = {};
      if (linkForm.expiresAt) body.expiresAt = new Date(linkForm.expiresAt).toISOString();
      if (linkForm.maxUses) body.maxUses = parseInt(linkForm.maxUses, 10);
      
      const url = `${API_BASE}/api/orgs/${numericOrgId}/campaigns/${numericCampaignId}/flows/${numericFlowId}/links`;
      console.log('POST URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Link created successfully:', data);
        setLinkForm({ expiresAt: '', maxUses: '' });
        fetchCampaignDetails(selectedCampaign.id);
        navigator.clipboard.writeText(data.url);
        alert('Survey link created and copied to clipboard!');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create link:', response.status, errorText);
        alert('Failed to create survey link: ' + errorText);
      }
    } catch (error) {
      console.error('Error creating survey link:', error);
      alert('Failed to create survey link');
    }
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/reply/${token}`;
    navigator.clipboard.writeText(url);
    alert('Survey link copied to clipboard!');
  };

  const viewResponseDetails = async (response) => {
    console.log('🔍 View Details clicked for response:', response.id);
    console.log('🔍 Setting modal state...');
    
    setSelectedResponse(response);
    setLoadingDetails(true);
    setShowResponseDetails(true);
    
    console.log('🔍 Modal state set, should be visible now');
    console.log('🔍 State check:', { 
      showResponseDetails: true, 
      selectedResponse: response.id, 
      selectedCampaign: selectedCampaign?.id 
    });
    
    try {
      // Fetch detailed response data including answers and facts
      console.log('🔍 Fetching response details from API...');
      const answersResponse = await fetch(
        `${API_BASE}/api/orgs/${me.orgId}/sessions/${response.id}/answers`,
        { credentials: 'include' }
      );
      
      if (answersResponse.ok) {
        const answersData = await answersResponse.json();
        console.log('✅ Response details fetched:', answersData);
        setResponseDetails(answersData);
      } else {
        console.error('❌ Failed to fetch response details:', answersResponse.status);
        setResponseDetails({ answers: [], facts: {} });
      }
    } catch (error) {
      console.error('❌ Error fetching response details:', error);
      setResponseDetails({ answers: [], facts: {} });
    } finally {
      setLoadingDetails(false);
    }
  };

  const viewBrief = async (response) => {
    try {
      // Fetch the generated brief
      const briefResponse = await fetch(
        `${API_BASE}/api/orgs/${me.orgId}/sessions/${response.id}/brief`,
        { credentials: 'include' }
      );
      
      if (briefResponse.ok) {
        const briefData = await briefResponse.json();
        
        // Open brief in a new window/tab or download it
        const blob = new Blob([briefData.summary_md || briefData.briefMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brief-${response.id.slice(-8)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to fetch brief');
      }
    } catch (error) {
      console.error('Error fetching brief:', error);
      alert('Error loading brief');
    }
  };

  const getDefaultTemplate = () => `# Project Brief

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
- Defines success in measurable terms`;

  const getDefaultFlowSpec = () => ({
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
  });

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!me) {
    return (
      <div className="page-gradient flex items-center justify-center">
        <LoadingSpinner>Loading user information...</LoadingSpinner>
      </div>
    );
  }

  if (!me.orgId) {
    return (
      <div className="page-gradient flex items-center justify-center">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="empty-state-icon">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">No Organization</h2>
            <p className="text-muted-foreground">
              You need to be a member of an organization to manage campaigns.
            </p>
          </div>
          <div className="info-card">
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to be added to an organization.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (me.role === 'requestor') {
    return (
      <div className="page-gradient flex items-center justify-center">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="access-restricted-icon">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Access Restricted</h2>
            <p className="text-muted-foreground">
              Campaign management requires reviewer or admin role.
            </p>
          </div>
          <div className="info-card">
            <p className="text-sm text-muted-foreground">
              Current role: <span className="font-medium text-foreground">{me.role}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCampaign) {
    return (
      <div className="page-gradient">
        {/* Enhanced Header with Backdrop Blur */}
        <div className="page-header">
          <div className="page-header-inner">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
                <p className="text-sm text-muted-foreground">Create and manage survey campaigns</p>
              </div>
            </div>

            {me.role === 'admin' && (
              <Button 
                size="lg" 
                onClick={() => setShowCreateCampaign(true)}
                className="rounded-xl"
              >
                <Plus className="w-5 h-5 mr-2" /> New Campaign
            </Button>
          )}
          </div>
        </div>
        
        {/* Create Campaign Modal */}
        <CreateCampaignModal
          isOpen={showCreateCampaign}
          onClose={() => setShowCreateCampaign(false)}
          onSubmit={createCampaign}
          isSubmitting={isCreatingCampaign}
        />

        {/* Main Content */}
        <div className="app-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
          {campaigns.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="empty-title">No campaigns yet</h3>
              <p className="empty-sub mb-8">
                Create your first survey campaign to get started collecting responses and generating briefs
              </p>
              {me.role === 'admin' && (
                <Button 
                  onClick={() => setShowCreateCampaign(true)}
                  className="rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Campaign
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="surface card-pad">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium mb-1">Total Campaigns</p>
                      <p className="text-2xl font-bold text-foreground">{campaigns.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
                
                <div className="surface card-pad">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium mb-1">Active Campaigns</p>
                      <p className="text-2xl font-bold text-foreground">{campaigns.filter(c => c.is_active).length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="surface card-pad">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium mb-1">Total Responses</p>
                      <p className="text-2xl font-bold text-foreground">--</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {campaigns.map((campaign) => (
                  <div
                  key={campaign.id}
                  onClick={() => setSelectedCampaign(campaign)}
                    className="campaign-tile group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="campaign-title group-hover:text-blue-700 transition-colors">
                            {campaign.name}
                          </h3>
                          <p className="campaign-sub">{campaign.slug}</p>
                        </div>
                      </div>
                      <div className="chip">
                        <span className={`status-dot ${campaign.is_active ? 'bg-green-500' : 'bg-muted-foreground/60'}`} />
                        {campaign.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
                      {campaign.purpose}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {new Date(campaign.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowLeft className="w-3 h-3 rotate-180 group-hover:translate-x-1 transition-transform" />
                        <span>View Details</span>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient">
      {/* Enhanced Campaign Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => {
              setSelectedCampaign(null);
              setShowResponseDetails(false);
              setSelectedResponse(null);
              setResponseDetails(null);
            }} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
              <FileText className="w-5 h-5" />
          </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{selectedCampaign.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedCampaign.purpose}</p>
            </div>
          </div>

          <div className="toolbar">
            <span className={`status-dot ${selectedCampaign.is_active ? 'bg-green-500' : 'bg-muted-foreground/60'}`} />
            <span className="chip">
              {selectedCampaign.is_active ? <><CheckCircle2 className="w-4 h-4" /> Active</> : <><XCircle className="w-4 h-4" /> Inactive</>}
            </span>
          </div>
        </div>
      </div>

      <div className="app-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <Tabs defaultValue="flows" className="space-y-8">
          {/* Modern Tab Navigation */}
          <div className="tabs-shell">
            <TabsList className="w-full bg-transparent gap-2">
              <TabsTrigger 
                value="flows" 
                className="tabs-trigger"
              >
              <Settings className="w-4 h-4 mr-2" />
              Survey Flows
            </TabsTrigger>
              <TabsTrigger 
                value="links" 
                className="tabs-trigger"
              >
              <Share2 className="w-4 h-4 mr-2" />
              Share Links
            </TabsTrigger>
              <TabsTrigger 
                value="responses" 
                className="tabs-trigger"
              >
              <BarChart3 className="w-4 h-4 mr-2" />
              Responses
            </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="tabs-trigger"
              >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
          </div>

        <TabsContent value="flows" className="space-y-6">
          <div className="surface card-pad">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1">Survey Flows</h3>
                <p className="text-muted-foreground text-sm">Manage question flows and survey logic</p>
              </div>
            {me.role === 'admin' && (
                <Button 
                  onClick={() => setShowCreateFlow(true)}
                  className="rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Flow
                </Button>
              )}
            </div>
            
            {/* Create Flow Dialog */}
            {showCreateFlow && (
              <div className="surface card-pad mb-6">
                <h4 className="text-lg font-semibold mb-4">Create Survey Flow</h4>
                <div className="space-y-4">
                  <div>
                    <label className="form-label-enhanced">Flow Title</label>
                      <input
                      className="form-input-enhanced"
                        value={flowForm.title}
                        onChange={(e) => setFlowForm({...flowForm, title: e.target.value})}
                        placeholder="Default v1"
                      />
                    </div>
                  <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="use_ai"
                        checked={flowForm.use_ai}
                        onChange={(e) => setFlowForm({...flowForm, use_ai: e.target.checked})}
                        className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-ring"
                      />
                    <label htmlFor="use_ai" className="text-sm">Enable AI-enhanced questioning</label>
                    </div>
                  <div>
                    <label className="form-label-enhanced">Flow Specification (JSON)</label>
                      <textarea
                      className="form-textarea-enhanced"
                      rows={10}
                        value={flowForm.spec_json ? JSON.stringify(flowForm.spec_json, null, 2) : ''}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFlowForm({...flowForm, spec_json: parsed});
                          } catch {
                          // Invalid JSON, ignore
                          }
                        }}
                        placeholder={JSON.stringify(getDefaultFlowSpec(), null, 2)}
                      style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }}
                      />
                    </div>
                  <div className="flex gap-3">
                    <Button onClick={createFlow} className="rounded-xl">Create Flow</Button>
                    <Button variant="outline" onClick={() => setShowCreateFlow(false)} className="rounded-xl">Cancel</Button>
                    </div>
                  </div>
          </div>
            )}
            
            {flows.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Settings className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="empty-title">No survey flows yet</h4>
                <p className="empty-sub mb-6">Create your first flow to start collecting responses</p>
              </div>
            ) : (
              <div className="space-y-4">
            {flows.map((flow) => (
                  <div key={flow.id} className="surface card-pad">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                          <Settings className="w-5 h-5 text-white" />
                        </div>
                    <div>
                          <h4 className="text-lg font-semibold">{flow.title} <span className="text-muted-foreground text-sm font-normal">(v{flow.version})</span></h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-muted-foreground text-sm">
                              {flow.spec_json.questions?.length || 0} questions
                            </span>
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${flow.use_ai ? 'bg-blue-500' : 'bg-muted-foreground'}`}></div>
                              <span className="text-muted-foreground text-sm">
                        AI {flow.use_ai ? 'enabled' : 'disabled'}
                              </span>
                    </div>
                            </div>
                            </div>
                            </div>
                      <Button 
                        size="sm" 
                        onClick={() => createSurveyLink(flow.id)}
                        className="rounded-xl"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Create Link
                      </Button>
                          </div>
                    
                    {/* Flow JSON Preview */}
                    <div className="mt-4 p-4 bg-muted/20 rounded-xl border border-dashed border-border/30">
                      <h5 className="text-sm font-medium text-muted-foreground mb-2">Flow Configuration</h5>
                      <div className="max-h-32 overflow-y-auto">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {JSON.stringify(flow.spec_json, null, 2)}
                    </pre>
                      </div>
                    </div>
                  </div>
            ))}
          </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <div className="surface card-pad">
            <h3 className="text-lg font-medium mb-6">Survey Links</h3>
            {surveyLinks.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Share2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="empty-title">No survey links created yet</h4>
                <p className="empty-sub">Create a survey flow first, then generate shareable links</p>
              </div>
            ) : (
              <div className="space-y-4">
                {surveyLinks.map((link) => {
                  const flowName = flows.find(f => f.id === link.flow_id)?.title || `Flow ${link.flow_id}`;
                  const surveyUrl = `${window.location.origin}/reply/${link.token}`;
                  
                  return (
                    <div key={link.id} className="surface card-pad">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Share2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold">{flowName}</h4>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-muted-foreground text-sm">
                                Created {new Date(link.created_at).toLocaleDateString()}
                              </span>
                              {link.max_uses && (
                                <span className="text-muted-foreground text-sm">
                                  {link.used_count || 0}/{link.max_uses} uses
                                </span>
                              )}
                              {link.expires_at && (
                                <span className="text-muted-foreground text-sm">
                                  Expires {new Date(link.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyLink(link.token)}
                            className="rounded-xl"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                      </Button>
                          <Button 
                            size="sm" 
                            onClick={() => window.open(surveyUrl, '_blank')}
                            className="rounded-xl"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open
                      </Button>
                        </div>
                      </div>
                      
                      {/* Link URL Display */}
                      <div className="mt-4 p-3 bg-muted/20 rounded-xl border border-dashed border-border/30">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Survey URL</h5>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm text-foreground bg-background px-3 py-2 rounded-lg border text-ellipsis overflow-hidden">
                            {surveyUrl}
                          </code>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyLink(link.token)}
                            className="flex-shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                        </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <div className="surface card-pad">
            <div className="flex justify-between items-center mb-6">
              <div>
          <h3 className="text-lg font-medium">Survey Responses</h3>
                <p className="text-sm text-muted-foreground">
                  {responses.length} response{responses.length !== 1 ? 's' : ''} collected
                </p>
              </div>
            </div>
            
            {responses.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="empty-title">No responses yet</h4>
                <p className="empty-sub">Responses will appear here once people complete your survey</p>
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => {
                  const flowName = flows.find(f => f.id === response.flow_id)?.title || `Flow ${response.flow_id}`;
                  
                  return (
                    <div key={response.id} className="surface card-pad">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold">Response #{response.id.slice(-8)}</h4>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-muted-foreground text-sm">
                                {flowName}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                {response.answer_count} answers
                              </span>
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${response.completed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                <span className="text-muted-foreground text-sm">
                                  {response.completed ? 'Completed' : 'In Progress'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {response.has_brief && (
                            <Badge variant="secondary" className="text-xs">
                              Brief Generated
                      </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {new Date(response.created_at).toLocaleDateString()}
                      </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Started {new Date(response.created_at).toLocaleDateString()}</span>
                          </div>
                          {response.last_answer_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Last activity {new Date(response.last_answer_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="rounded-xl"
                            onClick={() => viewResponseDetails(response)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                      {response.has_brief && (
                            <Button 
                              size="sm" 
                              className="rounded-xl"
                              onClick={() => viewBrief(response)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              View Brief
                        </Button>
                      )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="surface card-pad">
          <h3 className="text-lg font-medium">Campaign Settings</h3>
            <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                  className="form-input-enhanced"
                    value={selectedCampaign.name}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <input
                    type="text"
                  className="form-input-enhanced"
                    value={selectedCampaign.slug}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purpose</label>
                  <textarea
                  className="form-textarea-enhanced"
                    value={selectedCampaign.purpose}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Brief Template</label>
                  <textarea
                  className="form-textarea-enhanced"
                    value={selectedCampaign.template_md}
                    readOnly
                  rows={14}
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* Response Details Modal - rendered at root level */}
      {console.log('🔍 Modal render check:', { showResponseDetails, selectedResponse: !!selectedResponse, selectedCampaign: !!selectedCampaign })}
      {showResponseDetails && selectedResponse && selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Response Details</h2>
                <p className="text-sm text-muted-foreground text-gray-900 dark:text-white">
                  Response #{selectedResponse?.id.slice(-8)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowResponseDetails(false);
                  setSelectedResponse(null);
                  setResponseDetails(null);
                  setLoadingDetails(false);
                }}
                className="rounded-xl text-gray-900 dark:text-white"
              >
                ✕
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingDetails ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading response details...</p>
                </div>
              ) : responseDetails ? (
                <div className="space-y-6">
                  {/* Response Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="surface card-pad">
                      <h4 className="font-medium text-foreground mb-1">Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedResponse?.completed ? '✅ Completed' : '🟡 In Progress'}
                      </p>
                    </div>
                    <div className="surface card-pad">
                      <h4 className="font-medium text-foreground mb-1">Answers</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedResponse?.answer_count} responses
                      </p>
                    </div>
                    <div className="surface card-pad">
                      <h4 className="font-medium text-foreground mb-1">Brief</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedResponse?.has_brief ? '✅ Generated' : '❌ Not generated'}
                      </p>
                    </div>
                  </div>

                  {/* Answers */}
                  <div className="surface card-pad">
                    <h4 className="font-medium text-foreground mb-4">Survey Answers</h4>
                    <div className="space-y-4">
                      {responseDetails.answers?.map((answer, index) => (
                        <div key={index} className="border-l-2 border-primary/20 pl-4">
                          <h5 className="font-medium text-sm text-foreground mb-2">
                            Question {index + 1}: {answer.question_text || `Question ${answer.question_id}`}
                          </h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {answer.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extracted Facts */}
                  {responseDetails.facts && Object.keys(responseDetails.facts).length > 0 && (
                    <div className="surface card-pad">
                      <h4 className="font-medium text-foreground mb-4">Extracted Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(responseDetails.facts).map(([key, value]) => (
                          <div key={key} className="bg-muted/20 p-3 rounded-lg">
                            <h5 className="font-medium text-xs text-muted-foreground uppercase mb-1">
                              {key.replace(/_/g, ' ')}
                            </h5>
                            <p className="text-sm text-foreground">
                              {value || 'Not provided'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Failed to load response details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}