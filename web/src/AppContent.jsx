import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SystemModal } from './components/ui/SystemModal';
import { CapabilityModal } from './components/ui/CapabilityModal';
import { PolicyModal } from './components/ui/PolicyModal';

// Hooks
import { useDashboard } from './hooks/useDashboard.js';
import { useUsers } from './hooks/useUsers.js';
import { useBriefs } from './hooks/useBriefs.js';
import { useStack } from './hooks/useStack.js';

// Main Components
import Dashboard from './pages/dashboard/Dashboard.jsx';
import Surveys from './pages/surveys/Surveys.jsx';
import Analytics from './pages/analytics/Analytics.jsx';
import Campaigns from './pages/campaigns/Campaigns.jsx';
import Review from './pages/documentation/Review.jsx';

// Tab Components
import { BriefsTab } from './pages/documentation/tabs/BriefsTab.jsx';
import { EnhancedReviewsTab } from './pages/documentation/tabs/EnhancedReviewsTab.jsx';
import { StackTab } from './pages/settings/admin/StackTab.jsx';
import { UsersTab } from './pages/settings/users/UsersTab.jsx';
import { InvitesTab } from './pages/settings/users/InvitesTab.jsx';
import { SharesTab } from './pages/settings/users/SharesTab.jsx';
import { ArchivedSurveysTab } from './pages/settings/admin/ArchivedSurveysTab.jsx';
import { ArchivedCampaignsTab } from './pages/settings/admin/ArchivedCampaignsTab.jsx';
import { OrganizationSettingsTab } from './pages/settings/OrganizationSettingsTab.jsx';
import { UnifiedTemplatesTab } from './pages/settings/UnifiedTemplatesTab.jsx';

// Section Components
import { CampaignsSection } from './pages/dashboard/sections/CampaignsSection.jsx';

// Modal Components
import { BriefDetailsModal } from './pages/documentation/modals/BriefDetailsModal.jsx';

// Solution Generation Provider
import { SolutionGenerationProvider } from './pages/solutionmgmt/providers/SolutionGenerationProvider.jsx';

// Utilities
import { dashboardApi } from './utils/dashboardApi.js';

/**
 * AppContent - Main router component that handles all content display
 */
export default function AppContent() {
  const [searchParams] = useSearchParams();
  const activeSection = searchParams.get('tab') || 'dashboard';
  
  // Hook state management
  const { sessions, loading, error, me, stats, refetchSessions } = useDashboard();
  const usersData = useUsers(me);
  const briefsData = useBriefs(me);
  const stackData = useStack(me);

  // Stack modal states
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Session brief fetching
  const fetchSessionBrief = async (sessionId) => {
    try {
      return await dashboardApi.fetchSessionBrief(sessionId);
    } catch (err) {
      console.error('Failed to fetch session brief:', err);
      return null;
    }
  };

  // Stack management handlers
  const handleAddSystem = () => {
    stackData.setEditingSystem(null);
    setShowSystemModal(true);
  };

  const handleEditSystem = (system) => {
    stackData.setEditingSystem(system);
    setShowSystemModal(true);
  };

  const handleAddCapability = (system) => {
    stackData.setEditingCapability(null);
    stackData.setSelectedSystemForCapability(system);
    setShowCapabilityModal(true);
  };

  const handleEditCapability = (capability) => {
    stackData.setEditingCapability(capability);
    stackData.setSelectedSystemForCapability(null);
    setShowCapabilityModal(true);
  };

  const handleAddPolicy = () => {
    stackData.setEditingPolicy(null);
    setShowPolicyModal(true);
  };

  const handleEditPolicy = (policy) => {
    stackData.setEditingPolicy(policy);
    setShowPolicyModal(true);
  };

  // Load data when section changes
  React.useEffect(() => {
    if (activeSection === 'stack' && me?.orgId && me.role === 'admin') {
      stackData.refetchStackData();
    }
  }, [activeSection, me]); // eslint-disable-line react-hooks/exhaustive-deps


  // Loading and error states
  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard stats={stats} />;
      
      case 'campaigns':
        return <CampaignsSection user={me} />;
      
      case 'briefs':
        return (
          <BriefsTab 
            sessions={sessions}
            briefsGenerated={stats.briefsGenerated}
            onFetchBrief={fetchSessionBrief}
          />
        );
      
      case 'review':
        return <Review />;
      
      case 'users':
        if (me?.role === 'admin') {
          return (
            <UsersTab
              users={usersData.users}
              seatInfo={usersData.seatInfo}
              onUpdateUserRole={usersData.updateUserRole}
              onDeleteUser={usersData.deleteUser}
              onCreateInvite={usersData.createInvite}
              currentUser={me}
            />
          );
        }
        return <div>Access denied</div>;
      
      case 'invites':
        if (me?.role === 'admin') {
          return <InvitesTab invites={usersData.invites} />;
        }
        return <div>Access denied</div>;
      
      case 'shares':
        if (me?.role === 'admin') {
          return (
            <SharesTab
              shareLinks={usersData.shareLinks}
              onCreateShareLink={usersData.createShareLink}
              onRevokeShareLink={usersData.revokeShareLink}
              user={me}
            />
          );
        }
        return <div>Access denied</div>;
      
      case 'archived-campaigns':
        if (me?.role === 'admin') {
          return <ArchivedCampaignsTab user={me} onRefresh={refetchSessions} />;
        }
        return <div>Access denied</div>;
      
      case 'archived-surveys':
        if (me?.role === 'admin') {
          return <ArchivedSurveysTab user={me} onRefresh={refetchSessions} />;
        }
        return <div>Access denied</div>;
      
      case 'stack':
        if (me?.role === 'admin') {
          return (
            <StackTab
              stackData={stackData.stackData}
              loading={stackData.loading}
              onAddSystem={handleAddSystem}
              onEditSystem={handleEditSystem}
              onDeleteSystem={stackData.handleDeleteSystem}
              onAddCapability={handleAddCapability}
              onEditCapability={handleEditCapability}
              onDeleteCapability={stackData.handleDeleteCapability}
              onAddPolicy={handleAddPolicy}
              onEditPolicy={handleEditPolicy}
              onDeletePolicy={stackData.handleDeletePolicy}
            />
          );
        }
        return <div>Access denied</div>;
      
      case 'solutions':
        return <div>Solutions content coming soon...</div>;
      
      case 'organization-settings':
        if (me?.role === 'admin') {
          return <OrganizationSettingsTab user={me} />;
        }
        return <div>Access denied</div>;
      
      case 'unified-templates':
        if (me?.role === 'admin') {
          return <UnifiedTemplatesTab user={me} />;
        }
        return <div>Access denied</div>;
      
      case 'archive':
        if (me?.role === 'admin') {
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Administrative Archive</h1>
                  <p className="text-muted-foreground">Manage archived surveys and campaigns</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ArchivedSurveysTab user={me} onRefresh={refetchSessions} />
                <ArchivedCampaignsTab user={me} onRefresh={refetchSessions} />
              </div>
            </div>
          );
        }
        return <div>Access denied</div>;
      
      case 'enterprise':
        if (me?.role === 'admin') {
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Enterprise Settings</h1>
                  <p className="text-muted-foreground">Manage enterprise-level configurations</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrganizationSettingsTab user={me} />
                <UnifiedTemplatesTab user={me} />
              </div>
            </div>
          );
        }
        return <div>Access denied</div>;
      
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <SolutionGenerationProvider user={me}>
      <div className="h-full w-full min-w-0 p-6 content-full-width">
        {renderContent()}
      </div>

      {/* Brief Response Details Modal */}
      <BriefDetailsModal
        isOpen={briefsData.showBriefDetails}
        selectedBrief={briefsData.selectedBrief}
        briefResponseDetails={briefsData.briefResponseDetails}
        loading={briefsData.loadingBriefDetails}
        onClose={briefsData.closeBriefDetails}
      />

      {/* Stack Management Modals */}
      <SystemModal
        isOpen={showSystemModal}
        onClose={() => {
          setShowSystemModal(false);
          stackData.setEditingSystem(null);
        }}
        onSave={stackData.handleSaveSystem}
        editingSystem={stackData.editingSystem}
        orgId={me?.orgId}
      />

      <CapabilityModal
        isOpen={showCapabilityModal}
        onClose={() => {
          setShowCapabilityModal(false);
          stackData.setEditingCapability(null);
          stackData.setSelectedSystemForCapability(null);
        }}
        onSave={stackData.handleSaveCapability}
        editingCapability={stackData.editingCapability}
        selectedSystem={stackData.selectedSystemForCapability}
        systems={stackData.stackData.systems}
        orgId={me?.orgId}
      />

      <PolicyModal
        isOpen={showPolicyModal}
        onClose={() => {
          setShowPolicyModal(false);
          stackData.setEditingPolicy(null);
        }}
        onSave={stackData.handleSavePolicy}
        editingPolicy={stackData.editingPolicy}
        orgId={me?.orgId}
      />
    </SolutionGenerationProvider>
  );
}
