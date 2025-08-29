import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useCampaigns } from './hooks/useCampaigns.js';
import { useCampaignDetails } from './hooks/useCampaignDetails.js';
import { useResponseDetails } from './hooks/useResponseDetails.js';
import { useArchive } from './hooks/useArchive.js';
import { LoadingSkeleton } from './components/ui/loading-skeleton';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { CampaignHeader } from './components/campaigns/CampaignHeader.jsx';
import { CampaignsList } from './components/campaigns/CampaignsList.jsx';
import { CampaignDetailView } from './components/campaigns/CampaignDetailView.jsx';
import { CreateCampaignModal } from './components/ui/create-campaign-modal';
import { ResponseDetailsModal } from './components/campaigns/modals/ResponseDetailsModal.jsx';
import { AccessDeniedView } from './components/campaigns/AccessDeniedView.jsx';
import { campaignDefaults, campaignUtils } from './utils/campaignsApi.js';
import { useNotifications } from './components/ui/notifications.jsx';

/**
 * Main Campaigns component
 */
export default function Campaigns() {
  const { user, loading: userLoading } = useAuth();
  const { campaigns, loading: campaignsLoading, createCampaign } = useCampaigns(user);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const { showSuccess, showError, confirmArchive } = useNotifications();

  // Campaign details management
  const campaignDetails = useCampaignDetails(user, selectedCampaign);
  const responseDetails = useResponseDetails(user);
  
  // Archive functionality
  const { archiveCampaign } = useArchive(user);

  // Handle campaign creation
  const handleCreateCampaign = async (formData) => {
    setIsCreatingCampaign(true);
    try {
      const campaignData = {
        ...formData,
        slug: formData.slug || campaignUtils.generateSlug(formData.name),
        template_md: formData.template_md || campaignDefaults.getDefaultTemplate()
      };
      
      const success = await createCampaign(campaignData);
      if (success) {
        setShowCreateCampaign(false);
        showSuccess('Campaign created successfully!');
      } else {
        showError('Failed to create campaign');
      }
    } catch (error) {
      showError('Failed to create campaign: ' + error.message);
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Handle survey link creation
  const handleCreateSurveyLink = async (flowId) => {
    const result = await campaignDetails.createSurveyLink(flowId);
    if (result.success) {
      showSuccess('Survey link created and copied to clipboard!');
    } else {
      showError('Failed to create survey link: ' + result.error);
    }
  };

  // Handle campaign archiving
  const handleArchiveCampaign = async (campaign) => {
    await confirmArchive(`campaign "${campaign.name}"`, async () => {
      const success = await archiveCampaign(campaign.id);
      if (success) {
        showSuccess('Campaign archived successfully!');
        // The list will automatically refresh since the campaign will no longer be returned by the API
      } else {
        showError('Failed to archive campaign. Please try again.');
      }
    });
  };

  // Handle navigation
  const handleBackToCampaigns = () => {
    setSelectedCampaign(null);
    responseDetails.closeModal();
  };

  // Loading states
  if (userLoading || campaignsLoading) {
    return <LoadingSkeleton />;
  }

  // Access control
  if (!user) {
    return (
      <div className="page-gradient flex items-center justify-center">
        <LoadingSpinner>Loading user information...</LoadingSpinner>
      </div>
    );
  }

  if (!user.orgId || user.role === 'requestor') {
    return <AccessDeniedView user={user} />;
  }

  return (
    <div className="page-gradient">
      <CampaignHeader
        user={user}
        selectedCampaign={selectedCampaign}
        onBack={handleBackToCampaigns}
        onCreateCampaign={() => setShowCreateCampaign(true)}
      />

      {selectedCampaign ? (
        <CampaignDetailView
          selectedCampaign={selectedCampaign}
          flows={campaignDetails.flows}
          surveyLinks={campaignDetails.surveyLinks}
          responses={campaignDetails.responses}
          user={user}
          onCreateFlow={campaignDetails.createFlow}
          onCreateSurveyLink={handleCreateSurveyLink}
          onViewResponseDetails={responseDetails.viewResponseDetails}
          onViewBrief={responseDetails.viewBrief}
        />
      ) : (
        <div className="app-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
          <CampaignsList
            campaigns={campaigns}
            user={user}
            onSelectCampaign={setSelectedCampaign}
            onCreateCampaign={() => setShowCreateCampaign(true)}
            onArchiveCampaign={handleArchiveCampaign}
          />
        </div>
      )}

      {/* Modals */}
      <CreateCampaignModal
        isOpen={showCreateCampaign}
        onClose={() => setShowCreateCampaign(false)}
        onSubmit={handleCreateCampaign}
        isSubmitting={isCreatingCampaign}
      />

      <ResponseDetailsModal
        isOpen={responseDetails.showModal}
        selectedResponse={responseDetails.selectedResponse}
        responseDetails={responseDetails.responseDetails}
        loading={responseDetails.loading}
        onClose={responseDetails.closeModal}
      />
    </div>
  );
}
