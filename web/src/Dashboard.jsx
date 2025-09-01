import React, { useState } from 'react';
import { SystemModal } from './components/ui/SystemModal';
import { CapabilityModal } from './components/ui/CapabilityModal';
import { PolicyModal } from './components/ui/PolicyModal';

// Hooks
import { useDashboard } from './hooks/useDashboard.js';
import { useUsers } from './hooks/useUsers.js';
import { useBriefs } from './hooks/useBriefs.js';
import { useStack } from './hooks/useStack.js';

// Layout Components
import { Sidebar } from './components/layout/Sidebar.jsx';
import { DashboardStats } from './components/dashboard/DashboardStats.jsx';

// Navigation Context
import { NavigationProvider } from './contexts/NavigationContext.jsx';
import { useNavigation } from './hooks/useNavigation.js';

// Tab Components
import { SurveysTab } from './components/dashboard/tabs/SurveysTab.jsx';
import { BriefsTab } from './components/dashboard/tabs/BriefsTab.jsx';
import { ReviewsTab } from './components/dashboard/tabs/ReviewsTab.jsx';
import { EnhancedReviewsTab } from './components/dashboard/tabs/EnhancedReviewsTab.jsx';
import { StackTab } from './components/dashboard/tabs/StackTab.jsx';
import { UsersTab } from './components/dashboard/tabs/UsersTab.jsx';
import { InvitesTab } from './components/dashboard/tabs/InvitesTab.jsx';
import { SharesTab } from './components/dashboard/tabs/SharesTab.jsx';
import { ArchivedSurveysTab } from './components/dashboard/tabs/ArchivedSurveysTab.jsx';
import { ArchivedCampaignsTab } from './components/dashboard/tabs/ArchivedCampaignsTab.jsx';
import { OrganizationSettingsTab } from './components/dashboard/tabs/OrganizationSettingsTab.jsx';
import { AISettingsTab } from './components/dashboard/tabs/AISettingsTab.jsx';
import { AISurveyTemplatesTab } from './components/dashboard/tabs/AISurveyTemplatesTab.jsx';

// Section Components
import { CampaignsSection } from './components/dashboard/sections/CampaignsSection.jsx';

// Modal Components
import { BriefDetailsModal } from './components/dashboard/modals/BriefDetailsModal.jsx';

// Utilities
import { dashboardApi } from './utils/dashboardApi.js';

/**
 * Dashboard Content Component (inside NavigationProvider)
 */
function DashboardContent() {
  const { activeSection } = useNavigation();
  
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
    if (activeSection === 'review' && me?.orgId && (me.role === 'admin' || me.role === 'reviewer')) {
      briefsData.refetchBriefs();
    }
    if (activeSection === 'stack' && me?.orgId && me.role === 'admin') {
      stackData.refetchStackData();
    }
  }, [activeSection, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const { navigate } = useNavigation();

  // Loading and error states
  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <DashboardStats stats={stats} seatInfo={usersData.seatInfo} />
          </div>
        );
      
      case 'surveys':
        return (
          <SurveysTab 
            sessions={sessions} 
            onFetchBrief={fetchSessionBrief} 
            user={me} 
            onRefresh={refetchSessions} 
          />
        );
      
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
        if (me?.role === 'admin' || me?.role === 'reviewer') {
          return (
            <EnhancedReviewsTab
              briefsForReview={briefsData.briefsForReview}
              loading={briefsData.loading}
              onSubmitReview={briefsData.submitBriefReview}
              onViewDetails={briefsData.viewBriefResponseDetails}
              onViewDocument={briefsData.viewBriefDocument}
              user={me}
              onRefreshBriefs={briefsData.refreshBriefs}
            />
          );
        }
        return <div>Access denied</div>;
      
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
      
      case 'ai-settings':
        if (me?.role === 'admin') {
          return <AISettingsTab user={me} />;
        }
        return <div>Access denied</div>;
      
      case 'ai-survey-templates':
        if (me?.role === 'admin') {
          return <AISurveyTemplatesTab user={me} />;
        }
        return <div>Access denied</div>;
      
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={navigate} 
        user={me} 
      />
      
      <div style={{ 
        flex: 1, 
        marginLeft: '280px', 
        backgroundColor: '#fafafa',
        minHeight: '100vh'
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          padding: 'clamp(24px, 4vw, 48px) clamp(24px, 4vw, 32px)' 
        }}>
          {renderContent()}
        </div>
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
    </div>
  );
}

/**
 * Main Dashboard component with NavigationProvider
 */
export default function Dashboard() {
  return (
    <NavigationProvider>
      <DashboardContent />
    </NavigationProvider>
  );
}
