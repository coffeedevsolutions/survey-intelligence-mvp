import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { ScrollArea } from "./components/ui/scroll-area";
import { Separator } from "./components/ui/separator";
import { 
  FileText, Eye, ArrowUp, ArrowDown, Clock, CheckCircle, BarChart3, 
  Users, Calendar, Sparkles, TrendingUp, Share2, UserPlus, Settings,
  Copy, ExternalLink, Shield, Trash2, Plus
} from './components/ui/icons';
import { SystemModal } from './components/ui/SystemModal';
import { CapabilityModal } from './components/ui/CapabilityModal';
import { PolicyModal } from './components/ui/PolicyModal';

const API = "http://localhost:8787";

export default function Dashboard({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [_selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("surveys");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [seatInfo, setSeatInfo] = useState(null);
  const [invites, setInvites] = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [briefsForReview, setBriefsForReview] = useState([]);
  const [loadingBriefs, setLoadingBriefs] = useState(false);
  
  // Brief review modal states
  const [showBriefDetails, setShowBriefDetails] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState(null);
  const [briefResponseDetails, setBriefResponseDetails] = useState(null);
  const [loadingBriefDetails, setLoadingBriefDetails] = useState(false);
  
  // Tech stack state
  const [stackData, setStackData] = useState({ systems: [], capabilities: [], policies: [] });
  const [loadingStack, setLoadingStack] = useState(false);
  
  // Tech stack modal states
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);
  const [editingCapability, setEditingCapability] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [selectedSystemForCapability, setSelectedSystemForCapability] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'requestor' });
  const [shareForm, setShareForm] = useState({ 
    artifactType: 'brief', 
    artifactId: '', 
    scope: 'view',
    expiresAt: '',
    maxUses: ''
  });

  useEffect(() => {
    fetchSessions();
    fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBriefsForReview = async () => {
    if (!me?.orgId || (me.role !== 'admin' && me.role !== 'reviewer')) return;
    
    setLoadingBriefs(true);
    try {
      const response = await fetch(`${API}/api/orgs/${me.orgId}/briefs/review`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBriefsForReview(data.briefs || []);
      } else {
        console.error('Failed to fetch briefs for review');
      }
    } catch (error) {
      console.error('Error fetching briefs for review:', error);
    } finally {
      setLoadingBriefs(false);
    }
  };

  const submitBriefReview = async (briefId, priority) => {
    try {
      const response = await fetch(`${API}/api/orgs/${me.orgId}/briefs/${briefId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priority })
      });
      
      if (response.ok) {
        // Refresh the briefs list
        fetchBriefsForReview();
        alert('Brief review submitted successfully!');
      } else {
        const error = await response.json();
        alert('Failed to submit review: ' + error.error);
      }
    } catch (error) {
      console.error('Error submitting brief review:', error);
      alert('Failed to submit review');
    }
  };

  const viewBriefResponseDetails = async (brief) => {
    console.log('🔍 View Brief Details clicked for:', brief.session_id);
    
    setSelectedBrief(brief);
    setLoadingBriefDetails(true);
    setShowBriefDetails(true);
    
    try {
      // Fetch detailed response data including answers and facts
      const answersResponse = await fetch(
        `${API}/api/orgs/${me.orgId}/sessions/${brief.session_id}/answers`,
        { credentials: 'include' }
      );
      
      if (answersResponse.ok) {
        const answersData = await answersResponse.json();
        console.log('✅ Brief response details fetched:', answersData);
        setBriefResponseDetails(answersData);
      } else {
        console.error('❌ Failed to fetch brief response details:', answersResponse.status);
        setBriefResponseDetails({ answers: [], facts: {} });
      }
    } catch (error) {
      console.error('❌ Error fetching brief response details:', error);
      setBriefResponseDetails({ answers: [], facts: {} });
    } finally {
      setLoadingBriefDetails(false);
    }
  };

  const viewBriefDocument = async (brief) => {
    try {
      // Open the brief markdown in a new window
      const briefMarkdown = brief.summary_md;
      if (briefMarkdown) {
        // Create a new window with the markdown content
        const newWindow = window.open('', '_blank');
        newWindow.document.write(`
          <html>
            <head>
              <title>Brief: ${brief.title || 'Untitled'}</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                  max-width: 800px; 
                  margin: 40px auto; 
                  padding: 20px; 
                  line-height: 1.6; 
                }
                h1, h2, h3 { color: #333; }
                h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
                pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
                code { background: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
              </style>
            </head>
            <body>
              <div style="margin-bottom: 20px; padding: 10px; background: #f0f8ff; border-radius: 4px;">
                <small><strong>Brief ID:</strong> ${brief.id} | <strong>Campaign:</strong> ${brief.campaign_name || 'Unknown'}</small>
              </div>
              <pre style="white-space: pre-wrap; font-family: inherit; background: white; border: 1px solid #ddd;">${briefMarkdown}</pre>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        alert('No brief content available');
      }
    } catch (error) {
      console.error('Error viewing brief:', error);
      alert('Error loading brief');
    }
  };

  // Fetch briefs when tab changes to reviews or user data loads
  useEffect(() => {
    if (activeTab === 'review' && me?.orgId && (me.role === 'admin' || me.role === 'reviewer')) {
      fetchBriefsForReview();
    }
    if (activeTab === 'stack' && me?.orgId && me.role === 'admin') {
      fetchStackData();
    }
  }, [activeTab, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStackData = async () => {
    if (!me?.orgId || me.role !== 'admin') return;
    
    setLoadingStack(true);
    try {
      const response = await fetch(`${API}/api/orgs/${me.orgId}/stack`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStackData(data);
      } else {
        console.error('Failed to fetch stack data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching stack data:', error);
    } finally {
      setLoadingStack(false);
    }
  };

  // System management functions
  const handleSaveSystem = async () => {
    // Refresh stack data to show the new/updated system
    await fetchStackData();
  };

  const handleDeleteSystem = async (systemId) => {
    if (!confirm('Are you sure you want to delete this system? This will also delete all associated capabilities.')) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/orgs/${me.orgId}/systems/${systemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchStackData();
        alert('System deleted successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error deleting system:', err);
      alert('Error deleting system');
    }
  };

  // Capability management functions
  const handleSaveCapability = async () => {
    // Refresh stack data to show the new/updated capability
    await fetchStackData();
  };

  const handleDeleteCapability = async (capabilityId) => {
    if (!confirm('Are you sure you want to delete this capability?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/orgs/${me.orgId}/capabilities/${capabilityId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchStackData();
        alert('Capability deleted successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error deleting capability:', err);
      alert('Error deleting capability');
    }
  };

  // Policy management functions
  const handleSavePolicy = async () => {
    // Refresh stack data to show the new/updated policy
    await fetchStackData();
  };

  const handleDeletePolicy = async (policyId) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/orgs/${me.orgId}/policies/${policyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchStackData();
        alert('Policy deleted successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error deleting policy:', err);
      alert('Error deleting policy');
    }
  };

  const fetchMe = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setMe(data.user);
        if (data.user.role === 'admin') {
          fetchUsers();
          fetchSeatInfo();
          fetchInvites();
          fetchShareLinks();
        }
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API}/api/users`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchSeatInfo = async () => {
    try {
      const response = await fetch(`${API}/api/org/seats`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSeatInfo(data);
      }
    } catch (err) {
      console.error('Error fetching seat info:', err);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await fetch(`${API}/api/org/invites`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites);
      }
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  const fetchShareLinks = async () => {
    try {
      const response = await fetch(`${API}/api/org/shares`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setShareLinks(data.shareLinks);
      }
    } catch (err) {
      console.error('Error fetching share links:', err);
    }
  };

  const updateUserRole = async (email, newRole) => {
    try {
      const response = await fetch(`${API}/api/users/${encodeURIComponent(email)}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        fetchUsers();
        fetchSeatInfo(); // Refresh seat info since role changes affect seats
        alert(`Successfully updated ${email} to ${newRole}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Error updating role');
    }
  };

  const createInvite = async () => {
    try {
      const response = await fetch(`${API}/api/org/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(inviteForm)
      });
      
      if (response.ok) {
        await response.json(); // Response processed successfully
        setShowInviteDialog(false);
        setInviteForm({ email: '', role: 'requestor' });
        fetchInvites();
        fetchSeatInfo(); // Refresh seat info
        alert(`Invitation sent to ${inviteForm.email}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error creating invite:', err);
      alert('Error creating invitation');
    }
  };

  const createShareLink = async () => {
    try {
      const payload = {
        artifactType: shareForm.artifactType,
        artifactId: shareForm.artifactId,
        scope: shareForm.scope
      };
      
      if (shareForm.expiresAt) {
        payload.expiresAt = new Date(shareForm.expiresAt).toISOString();
      }
      
      if (shareForm.maxUses) {
        payload.maxUses = parseInt(shareForm.maxUses);
      }

      const response = await fetch(`${API}/api/org/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        setShowShareDialog(false);
        setShareForm({ 
          artifactType: 'brief', 
          artifactId: '', 
          scope: 'view',
          expiresAt: '',
          maxUses: ''
        });
        fetchShareLinks();
        
        // Copy link to clipboard
        navigator.clipboard.writeText(data.shareLink.url);
        alert(`Share link created and copied to clipboard!`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      alert('Error creating share link');
    }
  };

  const revokeShareLink = async (linkId) => {
    if (!confirm('Are you sure you want to revoke this share link?')) return;
    
    try {
      const response = await fetch(`${API}/api/org/shares/${linkId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchShareLinks();
        alert('Share link revoked successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error revoking share link:', err);
      alert('Error revoking share link');
    }
  };

  const copyShareLink = (token) => {
    const url = `${window.location.origin}/review/${token}`;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API}/api/sessions`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        setError('Failed to fetch sessions');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      const response = await fetch(`${API}/api/sessions/${sessionId}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data);
      }
    } catch (err) {
      console.error('Failed to fetch session details:', err);
    }
  };

  const fetchSessionBrief = async (sessionId) => {
    try {
      const response = await fetch(`${API}/api/sessions/${sessionId}/brief`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch session brief:', err);
    }
    return null;
  };

  const getStatusColor = (completed) => {
    return completed ? 'default' : 'secondary';
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const getSentimentColor = (questionId) => {
    // Simple sentiment based on question type
    const colors = [
      'bg-green-50 border-green-200',
      'bg-blue-50 border-blue-200', 
      'bg-amber-50 border-amber-200',
      'bg-purple-50 border-purple-200'
    ];
    return colors[questionId % colors.length];
  };

  // Calculate stats from real data
  const totalSurveys = sessions.length;
  const activeSurveys = sessions.filter(s => !s.completed).length;
  const totalResponses = sessions.reduce(
    (sum, session) => sum + (+session.answer_count || 0),
    0
  );  
  const briefsGenerated = sessions.filter(s => s.has_brief).length;

  if (loading) return <div style={{padding: 20}}>Loading dashboard...</div>;
  if (error) return <div style={{padding: 20, color: 'red'}}>Error: {error}</div>;

  return (
    <>
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                {onBack && (
                  <Button 
                    onClick={onBack}
                    variant="outline"
                    style={{ 
                      padding: '8px 16px',
                      fontSize: '14px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ← Back to Survey
                  </Button>
                )}
                <div style={{ flex: '1', minWidth: '250px' }}>
                  <h1 style={{ 
                    fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', 
                    fontWeight: '600', 
                    color: '#111827',
                    lineHeight: '1.2',
                    marginBottom: '4px'
                  }}>
                    Survey Intelligence Dashboard
                  </h1>
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    lineHeight: '1.4'
                  }}>
                    Transform survey responses into actionable insights with AI-powered brief generation
                  </p>
                </div>
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              flexShrink: 0
            }}>
              <Button 
                style={{ 
                  background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                  color: 'white',
                  padding: '12px 20px',
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Sparkles style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Create Survey
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: 'clamp(16px, 4vw, 32px) clamp(16px, 4vw, 24px)' 
      }}>
        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px', 
          marginBottom: '32px'
        }}>
          <Card style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', borderColor: '#bfdbfe' }}>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500' }}>Total Surveys</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>{totalSurveys}</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                  <BarChart3 style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: 'linear-gradient(135deg, #dcfce7, #d1fae5)', borderColor: '#bbf7d0' }}>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#16a34a', fontSize: '14px', fontWeight: '500' }}>Active Surveys</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#14532d' }}>{activeSurveys}</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                  <Calendar style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', borderColor: '#d8b4fe' }}>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#9333ea', fontSize: '14px', fontWeight: '500' }}>Total Responses</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#581c87' }}>{totalResponses.toLocaleString()}</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '8px' }}>
                  <Users style={{ width: '24px', height: '24px', color: '#9333ea' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderColor: '#fcd34d' }}>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#d97706', fontSize: '14px', fontWeight: '500' }}>Generated Briefs</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>{briefsGenerated}</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                  <FileText style={{ width: '24px', height: '24px', color: '#d97706' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {me?.role === 'admin' && seatInfo && (
            <Card style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', borderColor: '#a5b4fc' }}>
              <CardContent style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#4338ca', fontSize: '14px', fontWeight: '500' }}>Seats Used</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#312e81' }}>
                      {seatInfo.seats_used} / {seatInfo.seats_total}
                    </p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '8px' }}>
                    <Settings style={{ width: '24px', height: '24px', color: '#4338ca' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <TabsList style={{ 
            backgroundColor: 'white', 
            padding: '0px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexWrap: 'nowrap',
            gap: '4px',
            width: '100%',
            justifyContent: 'flex-start',
          }}>
            <TabsTrigger 
              value="surveys"
              style={{ 
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                whiteSpace: 'nowrap',
                flex: '1 1 auto',
                minWidth: '120px'
              }}
            >
              Survey Management
            </TabsTrigger>
            <TabsTrigger 
              value="briefs"
              style={{ 
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                whiteSpace: 'nowrap',
                flex: '1 1 auto',
                minWidth: '120px'
              }}
            >
              AI-Generated Briefs
            </TabsTrigger>
            {(me?.role === 'admin' || me?.role === 'reviewer') && (
              <TabsTrigger 
                value="review"
                style={{ 
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                  whiteSpace: 'nowrap',
                  flex: '1 1 auto',
                  minWidth: '120px'
                }}
              >
                Brief Reviews
              </TabsTrigger>
            )}
            {me?.role === 'admin' && (
              <TabsTrigger 
                value="stack"
                style={{ 
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                  whiteSpace: 'nowrap',
                  flex: '1 1 auto',
                  minWidth: '120px'
                }}
              >
                Stack & Solutions
              </TabsTrigger>
            )}
            {me?.role === 'admin' && (
              <>
                <TabsTrigger 
                  value="users"
                  style={{ 
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    whiteSpace: 'nowrap',
                    flex: '1 1 auto',
                    minWidth: '120px'
                  }}
                >
                  Members & Seats
                </TabsTrigger>
                <TabsTrigger 
                  value="invites"
                  style={{ 
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    whiteSpace: 'nowrap',
                    flex: '1 1 auto',
                    minWidth: '120px'
                  }}
                >
                  Invitations
                </TabsTrigger>
                <TabsTrigger 
                  value="shares"
                  style={{ 
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    whiteSpace: 'nowrap',
                    flex: '1 1 auto',
                    minWidth: '120px'
                  }}
                >
                  Share Links
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="surveys" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
              <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Survey Collection</CardTitle>
                    <CardDescription style={{ color: '#6b7280' }}>
                      Each survey generates its own unique AI-powered brief and insights
                    </CardDescription>
                  </div>
                  <Badge variant="outline" style={{ fontSize: '12px' }}>
                    {sessions.length} Unique Surveys
                  </Badge>
                </div>
              </CardHeader>
              <CardContent style={{ padding: '0' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#f9fafb' }}>
                      <TableHead style={{ fontWeight: '600' }}>Survey Details</TableHead>
                      <TableHead style={{ fontWeight: '600' }}>Responses</TableHead>
                      <TableHead style={{ fontWeight: '600' }}>Status</TableHead>
                      <TableHead style={{ fontWeight: '600' }}>Brief Status</TableHead>
                      <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.session_id} style={{ transition: 'background-color 0.2s' }}>
                        <TableCell>
                          <div>
                            <div style={{ fontWeight: '600', color: '#111827' }}>
                              Survey Session {session.session_id}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                              Interactive AI-powered survey session
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                              Last activity: {formatDate(session.last_answer_at)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                              {session.answer_count || 0}
                            </div>
                            <Users style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(session.completed)}>
                            {session.completed ? 'Completed' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.has_brief ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Badge 
                                variant="default" 
                                style={{ backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}
                              >
                                <CheckCircle style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                Generated
                              </Badge>
                            </div>
                          ) : (
                            <Badge 
                              variant="outline" 
                              style={{ backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}
                            >
                              <Clock style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  style={{ fontSize: '12px' }}
                                  onClick={() => fetchSessionDetails(session.session_id)}
                                >
                                  <Eye style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                  View Survey
                                </Button>
                              </DialogTrigger>
                              <DialogContent style={{ maxWidth: '800px', maxHeight: '85vh' }}>
                                <DialogHeader>
                                  <DialogTitle style={{ fontSize: '20px' }}>
                                    Survey Session Details
                                  </DialogTitle>
                                  <DialogDescription>
                                    Session ID: {session.session_id}
                                  </DialogDescription>
                                </DialogHeader>
                                <ScrollArea style={{ height: '400px', paddingRight: '16px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {sessionDetails ? (
                                      <>
                                        <div>
                                          <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Session Status</h4>
                                          <p>Completed: {sessionDetails.completed ? 'Yes' : 'No'}</p>
                                          <p>Total Answers: {sessionDetails.answers?.length || 0}</p>
                                        </div>
                                        
                                        <div>
                                          <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Responses</h4>
                                          {sessionDetails.answers?.map((answer, idx) => (
                                            <div 
                                              key={idx} 
                                              style={{ 
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                marginBottom: '8px',
                                                backgroundColor: getSentimentColor(idx)
                                              }}
                                            >
                                              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                                                Q: {answer.questionId}
                                              </div>
                                              <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                                                A: {answer.text}
                                              </div>
                                            </div>
                                          )) || <p>No responses yet</p>}
                                        </div>

                                        <div>
                                          <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Extracted Facts</h4>
                                          {sessionDetails.facts && Object.keys(sessionDetails.facts).length > 0 ? (
                                            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                                              {Object.entries(sessionDetails.facts).map(([key, value]) => (
                                                <div key={key} style={{ marginBottom: '4px' }}>
                                                  <strong>{key}:</strong> {value}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p>No facts extracted yet</p>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <div>Loading session details...</div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                            
                            {session.has_brief && (
                              <Button 
                                variant="outline" 
                                style={{ fontSize: '12px' }}
                                onClick={() => setSelectedSession(session)}
                              >
                                <FileText style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                View Brief
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="briefs" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
              <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <CardTitle style={{ fontSize: '20px', color: '#111827' }}>AI-Generated Brief Intelligence</CardTitle>
                    <CardDescription style={{ color: '#6b7280' }}>
                      Prioritize and act on insights from individual survey responses
                    </CardDescription>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="outline" style={{ fontSize: '12px' }}>
                      {briefsGenerated} Active Briefs
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {sessions
                    .filter(session => session.has_brief)
                    .map((session) => (
                      <BriefCard 
                        key={session.session_id} 
                        session={session} 
                        onFetchBrief={fetchSessionBrief}
                      />
                    ))}
                  
                  {briefsGenerated === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
                      <FileText style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                      <p>No briefs generated yet. Complete some surveys to see AI-generated insights here.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(me?.role === 'admin' || me?.role === 'reviewer') && (
            <TabsContent value="review" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
                <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Brief Reviews</CardTitle>
                      <CardDescription style={{ color: '#6b7280' }}>
                        Review and prioritize project briefs from survey responses
                      </CardDescription>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant="outline" style={{ fontSize: '12px' }}>
                        {briefsForReview.filter(b => b.review_status === 'pending').length} Pending
                      </Badge>
                      <Badge variant="outline" style={{ fontSize: '12px' }}>
                        {briefsForReview.filter(b => b.review_status === 'reviewed').length} Reviewed
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent style={{ padding: '0' }}>
                  {loadingBriefs ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                      <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                      <p style={{ color: '#6b7280' }}>Loading briefs for review...</p>
                    </div>
                  ) : briefsForReview.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
                      <CheckCircle style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                      <p>No briefs available for review at this time.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow style={{ backgroundColor: '#f9fafb' }}>
                          <TableHead style={{ fontWeight: '600' }}>Brief Details</TableHead>
                          <TableHead style={{ fontWeight: '600' }}>Campaign</TableHead>
                          <TableHead style={{ fontWeight: '600' }}>Submitted</TableHead>
                          <TableHead style={{ fontWeight: '600' }}>Review Status</TableHead>
                          <TableHead style={{ fontWeight: '600' }}>Priority</TableHead>
                          <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {briefsForReview.map((brief) => (
                          <TableRow key={brief.id} style={{ transition: 'background-color 0.2s' }}>
                            <TableCell>
                              <div>
                                <div style={{ fontWeight: '600', color: '#111827' }}>
                                  {brief.title || 'Untitled Brief'}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                  Brief #{brief.id}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div style={{ fontSize: '14px', color: '#374151' }}>
                                {brief.campaign_name || 'No Campaign'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                {new Date(brief.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={brief.review_status === 'pending' ? 'destructive' : 'default'}
                                style={{ fontSize: '12px' }}
                              >
                                {brief.review_status === 'pending' ? 'Pending Review' : 'Reviewed'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {brief.priority ? (
                                <Badge variant="outline" style={{ fontSize: '12px' }}>
                                  Priority {brief.priority}
                                </Badge>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Not set</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {brief.review_status === 'pending' && (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {[1, 2, 3, 4, 5].map((priority) => (
                                      <Button
                                        key={priority}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => submitBriefReview(brief.id, priority)}
                                        style={{ 
                                          minWidth: '32px', 
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          backgroundColor: priority <= 2 ? '#fef2f2' : priority <= 4 ? '#fffbeb' : '#fef2f2',
                                          borderColor: priority <= 2 ? '#fca5a5' : priority <= 4 ? '#fbbf24' : '#f87171',
                                          color: priority <= 2 ? '#dc2626' : priority <= 4 ? '#d97706' : '#dc2626'
                                        }}
                                      >
                                        {priority}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => viewBriefResponseDetails(brief)}
                                  style={{ fontSize: '12px' }}
                                >
                                  <Eye style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                  View Details
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => viewBriefDocument(brief)}
                                  style={{ fontSize: '12px' }}
                                >
                                  <FileText style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                  View Brief
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Stack & Solutions Tab */}
          {me?.role === 'admin' && (
            <TabsContent value="stack" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
                <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Tech Stack & Solutions</CardTitle>
                      <CardDescription style={{ color: '#6b7280' }}>
                        Manage your organization's tech stack for AI-powered solution recommendations
                      </CardDescription>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant="outline" style={{ fontSize: '12px' }}>
                        {stackData.systems.length} Systems
                      </Badge>
                      <Badge variant="outline" style={{ fontSize: '12px' }}>
                        {stackData.capabilities.length} Capabilities
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent style={{ padding: '0' }}>
                  {loadingStack ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          border: '2px solid #e5e7eb', 
                          borderTop: '2px solid #3b82f6', 
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <span>Loading tech stack...</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '24px' }}>
                      <Tabs defaultValue="systems" style={{ width: '100%' }}>
                        <TabsList style={{ marginBottom: '24px' }}>
                          <TabsTrigger value="systems">Systems</TabsTrigger>
                          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                          <TabsTrigger value="policies">Policies</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="systems">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Systems & Platforms</h3>
                            <Button 
                              onClick={() => {
                                console.log('🔧 Add System button clicked');
                                console.log('🏢 Current user org:', me?.orgId);
                                console.log('👤 Current user role:', me?.role);
                                setEditingSystem(null);
                                setShowSystemModal(true);
                                console.log('📱 System modal should be opening...');
                              }}
                              style={{ fontSize: '14px' }}
                            >
                              <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                              Add System
                            </Button>
                          </div>
                          
                          {stackData.systems.length === 0 ? (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              padding: '48px',
                              textAlign: 'center',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              border: '2px dashed #d1d5db'
                            }}>
                              <Settings style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
                              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>No systems configured</h4>
                              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                Add your organization's tech stack to enable AI-powered solution recommendations
                              </p>
                              <Button onClick={() => {
                                setEditingSystem(null);
                                setShowSystemModal(true);
                              }}>
                                <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                                Add Your First System
                              </Button>
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                              {stackData.systems.map((system) => (
                                <Card key={system.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                  <CardContent style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                      <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                                          {system.name}
                                        </h4>
                                        {system.vendor && (
                                          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                                            by {system.vendor}
                                          </p>
                                        )}
                                        {system.category && (
                                          <Badge variant="outline" style={{ fontSize: '12px' }}>
                                            {system.category}
                                          </Badge>
                                        )}
                                      </div>
                                      <Badge 
                                        variant={system.status === 'active' ? 'default' : system.status === 'trial' ? 'secondary' : 'destructive'}
                                        style={{ fontSize: '11px' }}
                                      >
                                        {system.status}
                                      </Badge>
                                    </div>
                                    {system.notes && (
                                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px', lineHeight: '1.4' }}>
                                        {system.notes}
                                      </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          setEditingSystem(system);
                                          setShowSystemModal(true);
                                        }}
                                        style={{ fontSize: '12px' }}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedSystemForCapability(system);
                                          setEditingCapability(null);
                                          setShowCapabilityModal(true);
                                        }}
                                        style={{ fontSize: '12px' }}
                                      >
                                        Add Capability
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDeleteSystem(system.id)}
                                        style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                                      >
                                        <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                        Delete
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="capabilities">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>System Capabilities</h3>
                            <Button 
                              onClick={() => {
                                setEditingCapability(null);
                                setSelectedSystemForCapability(null);
                                setShowCapabilityModal(true);
                              }}
                              disabled={stackData.systems.length === 0}
                              style={{ fontSize: '14px' }}
                            >
                              <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                              Add Capability
                            </Button>
                          </div>
                          
                          {stackData.capabilities.length === 0 ? (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              padding: '48px',
                              textAlign: 'center',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              border: '2px dashed #d1d5db'
                            }}>
                              <BarChart3 style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
                              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>No capabilities defined</h4>
                              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                {stackData.systems.length === 0 
                                  ? 'Add systems first, then define their capabilities'
                                  : 'Define what your systems can do to enable intelligent recommendations'
                                }
                              </p>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {stackData.capabilities.map((capability) => (
                                <Card key={capability.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                  <CardContent style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                            {capability.name}
                                          </h4>
                                          <Badge variant="outline" style={{ fontSize: '11px' }}>
                                            {capability.system_name}
                                          </Badge>
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: '1.4' }}>
                                          {capability.description}
                                        </p>
                                        {capability.domain_tags && capability.domain_tags.length > 0 && (
                                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {capability.domain_tags.map((tag, index) => (
                                              <Badge key={index} variant="secondary" style={{ fontSize: '11px' }}>
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setEditingCapability(capability);
                                            setSelectedSystemForCapability(null);
                                            setShowCapabilityModal(true);
                                          }}
                                          style={{ fontSize: '12px' }}
                                        >
                                          Edit
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleDeleteCapability(capability.id)}
                                          style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                                        >
                                          <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="policies">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Stack Policies</h3>
                            <Button 
                              onClick={() => {
                                setEditingPolicy(null);
                                setShowPolicyModal(true);
                              }}
                              style={{ fontSize: '14px' }}
                            >
                              <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                              Add Policy
                            </Button>
                          </div>
                          
                          {stackData.policies.length === 0 ? (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              padding: '48px',
                              textAlign: 'center',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              border: '2px dashed #d1d5db'
                            }}>
                              <Shield style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
                              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>No policies configured</h4>
                              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                Define policies to guide AI recommendations and solution preferences
                              </p>
                              <Button onClick={() => {
                                setEditingPolicy(null);
                                setShowPolicyModal(true);
                              }}>
                                <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                                Add Your First Policy
                              </Button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {stackData.policies.map((policy) => (
                                <Card key={policy.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                  <CardContent style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                            {policy.rule_name}
                                          </h4>
                                          <Badge variant="outline" style={{ fontSize: '11px' }}>
                                            Priority {policy.priority}
                                          </Badge>
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: '1.4' }}>
                                          {policy.guidance}
                                        </p>
                                        {policy.applies_to_tags && policy.applies_to_tags.length > 0 && (
                                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '4px' }}>Applies to:</span>
                                            {policy.applies_to_tags.map((tag, index) => (
                                              <Badge key={index} variant="secondary" style={{ fontSize: '11px' }}>
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setEditingPolicy(policy);
                                            setShowPolicyModal(true);
                                          }}
                                          style={{ fontSize: '12px' }}
                                        >
                                          Edit
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleDeletePolicy(policy.id)}
                                          style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                                        >
                                          <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {me?.role === 'admin' && (
            <>
              <TabsContent value="users" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
                  <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <CardTitle style={{ fontSize: '20px', color: '#111827', marginBottom: '4px' }}>User Management</CardTitle>
                        <CardDescription style={{ color: '#6b7280' }}>
                          Manage user roles and permissions in your organization
                        </CardDescription>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Badge variant="outline" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {users.length} Users
                        </Badge>
                        {seatInfo && (
                          <Badge variant="outline" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {seatInfo.seats_used}/{seatInfo.seats_total} Seats
                          </Badge>
                        )}
                        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" style={{ fontSize: '12px', padding: '6px 12px' }}>
                              <UserPlus style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                              Invite User
                            </Button>
                          </DialogTrigger>
                          <DialogContent style={{ maxWidth: '400px' }}>
                            <DialogHeader>
                              <DialogTitle>Invite New User</DialogTitle>
                              <DialogDescription>
                                Send an invitation to join your organization
                              </DialogDescription>
                            </DialogHeader>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                  Email Address
                                </label>
                                <input
                                  type="email"
                                  value={inviteForm.email}
                                  onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                                  placeholder="user@company.com"
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                  Role
                                </label>
                                <select
                                  value={inviteForm.role}
                                  onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                >
                                  <option value="requestor">Requestor</option>
                                  <option value="reviewer">Reviewer</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowInviteDialog(false)}
                                  style={{ fontSize: '14px' }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={createInvite}
                                  style={{ fontSize: '14px' }}
                                  disabled={!inviteForm.email}
                                >
                                  Send Invite
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent style={{ padding: '0' }}>
                    {/* Mobile-friendly table with horizontal scroll */}
                    <div style={{ overflowX: 'auto', minWidth: '100%' }}>
                      <Table style={{ minWidth: '640px' }}>
                        <TableHeader>
                          <TableRow style={{ backgroundColor: '#f9fafb' }}>
                            <TableHead style={{ fontWeight: '600', padding: '12px 16px' }}>Email</TableHead>
                            <TableHead style={{ fontWeight: '600', padding: '12px 16px' }}>Role</TableHead>
                            <TableHead style={{ fontWeight: '600', padding: '12px 16px', textAlign: 'center' }}>Verified</TableHead>
                            <TableHead style={{ fontWeight: '600', padding: '12px 16px' }}>Joined</TableHead>
                            <TableHead style={{ fontWeight: '600', padding: '12px 16px', minWidth: '200px' }}>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.email} style={{ transition: 'background-color 0.2s' }}>
                              <TableCell style={{ 
                                fontWeight: 500, 
                                padding: '12px 16px',
                                wordBreak: 'break-word',
                                maxWidth: '200px'
                              }}>
                                <div style={{ 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {user.email}
                                </div>
                              </TableCell>
                              <TableCell style={{ padding: '12px 16px' }}>
                                <Badge 
                                  variant={user.role === 'admin' ? 'default' : user.role === 'reviewer' ? 'secondary' : 'outline'}
                                  style={{ 
                                    textTransform: 'capitalize',
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell style={{ padding: '12px 16px', textAlign: 'center' }}>
                                {user.email_verified ? (
                                  <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
                                ) : (
                                  <Clock style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                                )}
                              </TableCell>
                              <TableCell style={{ 
                                color: '#6b7280', 
                                fontSize: '14px', 
                                padding: '12px 16px',
                                whiteSpace: 'nowrap'
                              }}>
                                {new Date(user.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell style={{ padding: '12px 16px' }}>
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '6px', 
                                  flexWrap: 'wrap',
                                  alignItems: 'center'
                                }}>
                                  {user.role !== 'admin' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(user.email, 'admin')}
                                      style={{ 
                                        fontSize: '11px', 
                                        padding: '4px 8px',
                                        minWidth: 'auto',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <ArrowUp style={{ width: '12px', height: '12px' }} />
                                      <span className="hidden sm:inline">Make </span>Admin
                                    </Button>
                                  )}
                                  {user.role !== 'reviewer' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(user.email, 'reviewer')}
                                      style={{ 
                                        fontSize: '11px', 
                                        padding: '4px 8px',
                                        minWidth: 'auto',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <span className="hidden sm:inline">Make </span>Reviewer
                                    </Button>
                                  )}
                                  {user.role !== 'requestor' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(user.email, 'requestor')}
                                      style={{ 
                                        fontSize: '11px', 
                                        padding: '4px 8px',
                                        minWidth: 'auto',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <ArrowDown style={{ width: '12px', height: '12px' }} />
                                      <span className="hidden sm:inline">Make </span>Requestor
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {users.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '48px 24px', 
                        color: '#6b7280' 
                      }}>
                        <Users style={{ 
                          width: '48px', 
                          height: '48px', 
                          margin: '0 auto 16px', 
                          opacity: 0.5 
                        }} />
                        <p style={{ fontSize: '16px', fontWeight: '500' }}>No users found in your organization.</p>
                        <p style={{ fontSize: '14px', marginTop: '8px', color: '#9ca3af' }}>
                          Users will appear here after they sign up with Auth0.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invites" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
                  <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Pending Invitations</CardTitle>
                        <CardDescription style={{ color: '#6b7280' }}>
                          Manage pending invitations to join your organization
                        </CardDescription>
                      </div>
                      <Badge variant="outline" style={{ fontSize: '12px' }}>
                        {invites.filter(i => !i.accepted).length} Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent style={{ padding: '0' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <Table>
                        <TableHeader>
                          <TableRow style={{ backgroundColor: '#f9fafb' }}>
                            <TableHead style={{ fontWeight: '600' }}>Email</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Role</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Status</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Expires</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invites.map((invite) => (
                            <TableRow key={invite.id}>
                              <TableCell style={{ fontWeight: '500' }}>{invite.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" style={{ textTransform: 'capitalize' }}>
                                  {invite.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={invite.accepted ? 'default' : 'secondary'}>
                                  {invite.accepted ? 'Accepted' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell style={{ color: '#6b7280', fontSize: '14px' }}>
                                {formatDate(invite.expires_at)}
                              </TableCell>
                              <TableCell>
                                {!invite.accepted && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      style={{ fontSize: '12px' }}
                                      onClick={() => {
                                        const inviteUrl = `${window.location.origin}/signup?invite=${invite.token}`;
                                        navigator.clipboard.writeText(inviteUrl);
                                        alert('Invite link copied to clipboard!');
                                      }}
                                    >
                                      <Copy style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                      Copy Link
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {invites.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
                        <UserPlus style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No invitations sent yet. Use the "Invite User" button to get started.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shares" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
                  <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Share Links</CardTitle>
                        <CardDescription style={{ color: '#6b7280' }}>
                          Create and manage shareable links for external reviewers
                        </CardDescription>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Badge variant="outline" style={{ fontSize: '12px' }}>
                          {shareLinks.filter(s => !s.revoked).length} Active
                        </Badge>
                        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" style={{ fontSize: '12px' }}>
                              <Share2 style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                              Create Link
                            </Button>
                          </DialogTrigger>
                          <DialogContent style={{ maxWidth: '500px' }}>
                            <DialogHeader>
                              <DialogTitle>Create Share Link</DialogTitle>
                              <DialogDescription>
                                Generate a secure link for external access
                              </DialogDescription>
                            </DialogHeader>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                  Content Type
                                </label>
                                <select
                                  value={shareForm.artifactType}
                                  onChange={(e) => setShareForm({...shareForm, artifactType: e.target.value})}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                >
                                  <option value="brief">Project Brief</option>
                                  <option value="session">Survey Session</option>
                                  <option value="dashboard">Dashboard View</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                  Content ID
                                </label>
                                <input
                                  type="text"
                                  value={shareForm.artifactId}
                                  onChange={(e) => setShareForm({...shareForm, artifactId: e.target.value})}
                                  placeholder="e.g., brief ID or session ID"
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                  Access Level
                                </label>
                                <select
                                  value={shareForm.scope}
                                  onChange={(e) => setShareForm({...shareForm, scope: e.target.value})}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                >
                                  <option value="view">View Only</option>
                                  <option value="comment">View & Comment</option>
                                </select>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                    Expires At (Optional)
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={shareForm.expiresAt}
                                    onChange={(e) => setShareForm({...shareForm, expiresAt: e.target.value})}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                    Max Uses (Optional)
                                  </label>
                                  <input
                                    type="number"
                                    value={shareForm.maxUses}
                                    onChange={(e) => setShareForm({...shareForm, maxUses: e.target.value})}
                                    placeholder="Unlimited"
                                    min="1"
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowShareDialog(false)}
                                  style={{ fontSize: '14px' }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={createShareLink}
                                  style={{ fontSize: '14px' }}
                                  disabled={!shareForm.artifactId}
                                >
                                  Create Link
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent style={{ padding: '0' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <Table>
                        <TableHeader>
                          <TableRow style={{ backgroundColor: '#f9fafb' }}>
                            <TableHead style={{ fontWeight: '600' }}>Content</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Access</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Usage</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Expires</TableHead>
                            <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shareLinks.map((link) => (
                            <TableRow key={link.id}>
                              <TableCell>
                                <div>
                                  <div style={{ fontWeight: '500' }}>
                                    {link.artifact_type} - {link.artifact_id}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Created {formatDate(link.created_at)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={link.scope === 'comment' ? 'default' : 'secondary'}>
                                  {link.scope === 'comment' ? 'View & Comment' : 'View Only'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div style={{ fontSize: '14px' }}>
                                  {link.uses} {link.max_uses ? `/ ${link.max_uses}` : ''}
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>uses</div>
                                </div>
                              </TableCell>
                              <TableCell style={{ color: '#6b7280', fontSize: '14px' }}>
                                {link.expires_at ? formatDate(link.expires_at) : 'Never'}
                              </TableCell>
                              <TableCell>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    style={{ fontSize: '12px' }}
                                    onClick={() => copyShareLink(link.token)}
                                  >
                                    <Copy style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                    Copy
                                  </Button>
                                  {!link.revoked && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                                      onClick={() => revokeShareLink(link.id)}
                                    >
                                      <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                      Revoke
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {shareLinks.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
                        <Share2 style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No share links created yet. Create links to share content with external reviewers.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>

    {/* Brief Response Details Modal */}
    {showBriefDetails && selectedBrief && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Brief Response Details</h2>
              <p className="text-sm text-muted-foreground text-gray-900 dark:text-white">
                {selectedBrief.title || 'Untitled Brief'} - Brief #{selectedBrief.id}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowBriefDetails(false);
                setSelectedBrief(null);
                setBriefResponseDetails(null);
                setLoadingBriefDetails(false);
              }}
              className="rounded-xl text-gray-900 dark:text-white"
            >
              ✕
            </Button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loadingBriefDetails ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading response details...</p>
              </div>
            ) : briefResponseDetails ? (
              <div className="space-y-6">
                {/* Response Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="surface card-pad">
                    <h4 className="font-medium text-foreground mb-1">Campaign</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedBrief.campaign_name || 'Unknown Campaign'}
                    </p>
                  </div>
                  <div className="surface card-pad">
                    <h4 className="font-medium text-foreground mb-1">Answers</h4>
                    <p className="text-sm text-muted-foreground">
                      {briefResponseDetails.answers?.length || 0} responses
                    </p>
                  </div>
                  <div className="surface card-pad">
                    <h4 className="font-medium text-foreground mb-1">Review Status</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedBrief.review_status === 'pending' ? '🟡 Pending Review' : '✅ Reviewed'}
                    </p>
                  </div>
                </div>

                {/* Answers */}
                <div className="surface card-pad">
                  <h4 className="font-medium text-foreground mb-4">Survey Answers</h4>
                  <div className="space-y-4">
                    {briefResponseDetails.answers?.map((answer, index) => (
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
                {briefResponseDetails.facts && Object.keys(briefResponseDetails.facts).length > 0 && (
                  <div className="surface card-pad">
                    <h4 className="font-medium text-foreground mb-4">Extracted Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(briefResponseDetails.facts).map(([key, value]) => (
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

    {/* Stack Management Modals */}
    <SystemModal
      isOpen={showSystemModal}
      onClose={() => {
        setShowSystemModal(false);
        setEditingSystem(null);
      }}
      onSave={handleSaveSystem}
      editingSystem={editingSystem}
      orgId={me?.orgId}
    />

    <CapabilityModal
      isOpen={showCapabilityModal}
      onClose={() => {
        setShowCapabilityModal(false);
        setEditingCapability(null);
        setSelectedSystemForCapability(null);
      }}
      onSave={handleSaveCapability}
      editingCapability={editingCapability}
      selectedSystem={selectedSystemForCapability}
      systems={stackData.systems}
      orgId={me?.orgId}
    />

    <PolicyModal
      isOpen={showPolicyModal}
      onClose={() => {
        setShowPolicyModal(false);
        setEditingPolicy(null);
      }}
      onSave={handleSavePolicy}
      editingPolicy={editingPolicy}
      orgId={me?.orgId}
    />
    </>
  );
}

// Brief Card Component
function BriefCard({ session, onFetchBrief }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadBrief = async () => {
    if (brief) return; // Already loaded
    
    setLoading(true);
    const briefData = await onFetchBrief(session.session_id);
    if (briefData) {
      setBrief(briefData);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBrief();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card style={{ borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent style={{ padding: '24px' }}>
          <div>Loading brief...</div>
        </CardContent>
      </Card>
    );
  }

  if (!brief) {
    return (
      <Card style={{ borderLeft: '4px solid #6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent style={{ padding: '24px' }}>
          <div>Brief not available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <CardHeader style={{ paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <CardTitle style={{ fontSize: '18px', color: '#111827' }}>
                Project Brief - Session {session.session_id}
              </CardTitle>
              <Badge variant="outline" style={{ fontSize: '12px' }}>
                Survey Brief
              </Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users style={{ width: '12px', height: '12px' }} />
                {session.answer_count || 0} responses
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar style={{ width: '12px', height: '12px' }} />
                Generated {new Date(brief.created_at).toLocaleDateString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp style={{ width: '12px', height: '12px' }} />
                Impact Score: High
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
            {brief.summary_md || 'Brief content not available'}
          </div>
        </div>
        
        <Separator />

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', flexWrap: 'wrap' }}>
          <Button 
            variant="outline" 
            style={{ backgroundColor: 'white' }}
            onClick={() => {
              const blob = new Blob([brief.summary_md || ''], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `brief-${session.session_id}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <FileText style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Download Brief
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              // Quick share link creation for this brief
              const sharePayload = {
                artifactType: 'brief',
                artifactId: brief.id.toString(),
                scope: 'view'
              };
              
              fetch(`${API}/api/org/shares`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(sharePayload)
              })
              .then(response => response.json())
              .then(data => {
                if (data.shareLink) {
                  navigator.clipboard.writeText(data.shareLink.url);
                  alert('Share link created and copied to clipboard!');
                } else {
                  alert('Error creating share link');
                }
              })
              .catch(() => alert('Error creating share link'));
            }}
          >
            <Share2 style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Share Brief
          </Button>
          <Button 
            style={{ 
              background: 'linear-gradient(to right, #16a34a, #059669)',
              color: 'white'
            }}
          >
            <CheckCircle style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Mark as Reviewed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
