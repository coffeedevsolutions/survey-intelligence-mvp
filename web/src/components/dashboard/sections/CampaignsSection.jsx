import React, { useState } from 'react';
import { useCampaigns } from '../../../hooks/useCampaigns.js';
import { useCampaignDetails } from '../../../hooks/useCampaignDetails.js';
import { useResponseDetails } from '../../../hooks/useResponseDetails.js';
import { useArchive } from '../../../hooks/useArchive.js';
import { LoadingSkeleton } from '../../ui/loading-skeleton';
import { CampaignsList } from '../../campaigns/CampaignsList.jsx';
import { CampaignDetailView } from '../../campaigns/CampaignDetailView.jsx';
import { CreateCampaignModal } from '../../ui/create-campaign-modal';
import { ResponseDetailsModal } from '../../campaigns/modals/ResponseDetailsModal.jsx';
import { AccessDeniedView } from '../../campaigns/AccessDeniedView.jsx';
import { campaignDefaults, campaignUtils } from '../../../utils/campaignsApi.js';
import { Button } from '../../ui/button';
import { Plus } from '../../ui/icons';
import { useNotifications } from '../../ui/notifications.jsx';

/**
 * Campaigns Section for Dashboard Sidebar
 */
export function CampaignsSection({ user }) {
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
  if (campaignsLoading) {
    return <LoadingSkeleton />;
  }

  // Access control
  if (!user) {
    return <div>Loading user information...</div>;
  }

  if (!user.orgId || user.role === 'requestor') {
    return <AccessDeniedView user={user} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>
            {selectedCampaign ? selectedCampaign.name : 'Campaigns'}
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: '4px 0 0 0' }}>
            {selectedCampaign 
              ? 'Manage flows, survey links, and responses' 
              : 'Create and manage your survey campaigns'
            }
          </p>
        </div>
        
        {selectedCampaign ? (
          <Button onClick={handleBackToCampaigns} variant="outline">
            ← Back to Campaigns
          </Button>
        ) : (
          <Button onClick={() => setShowCreateCampaign(true)}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Campaign
          </Button>
        )}
      </div>

      {/* Content */}
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
        <CampaignsList
          campaigns={campaigns}
          user={user}
          onSelectCampaign={setSelectedCampaign}
          onCreateCampaign={() => setShowCreateCampaign(true)}
          onArchiveCampaign={handleArchiveCampaign}
        />
      )}

      {/* Modals */}
      <CreateCampaignModal
        isOpen={showCreateCampaign}
        onClose={() => setShowCreateCampaign(false)}
        onSubmit={handleCreateCampaign}
        isSubmitting={isCreatingCampaign}
        user={user}
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
