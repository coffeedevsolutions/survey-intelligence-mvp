import { useState, useEffect } from 'react';
import { campaignsApi, campaignUtils } from '../utils/campaignsApi.js';

/**
 * Custom hook for managing campaign details (flows, responses, links)
 */
export function useCampaignDetails(user, selectedCampaign) {
  const [flows, setFlows] = useState([]);
  const [responses, setResponses] = useState([]);
  const [surveyLinks, setSurveyLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCampaignDetails = async (campaignId) => {
    if (!user?.orgId || !campaignId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [flowsData, responsesData, linksData] = await Promise.all([
        campaignsApi.getFlows(user.orgId, campaignId),
        campaignsApi.getResponses(user.orgId, campaignId),
        campaignsApi.getSurveyLinks(user.orgId)
      ]);

      setFlows(flowsData.flows || []);
      setResponses(responsesData.responses || []);
      
      // Filter links for this campaign
      const campaignLinks = (linksData.links || []).filter(link => link.campaign_id === campaignId);
      setSurveyLinks(campaignLinks);
      
    } catch (err) {
      console.error('Failed to fetch campaign details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createFlow = async (flowData) => {
    try {
      setError(null);
      await campaignsApi.createFlow(user.orgId, selectedCampaign.id, flowData);
      await fetchCampaignDetails(selectedCampaign.id); // Refresh
      return true;
    } catch (err) {
      console.error('Failed to create flow:', err);
      setError(err.message);
      return false;
    }
  };

  const createSurveyLink = async (flowId, linkData = {}) => {
    try {
      setError(null);
      const data = await campaignsApi.createSurveyLink(
        user.orgId, 
        selectedCampaign.id, 
        flowId, 
        linkData
      );
      
      await fetchCampaignDetails(selectedCampaign.id); // Refresh
      
      // Copy to clipboard
      const url = campaignUtils.copyLinkToClipboard(data.token);
      return { success: true, url };
    } catch (err) {
      console.error('Failed to create survey link:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Fetch details when campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignDetails(selectedCampaign.id);
    }
  }, [selectedCampaign]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    flows,
    responses,
    surveyLinks,
    loading,
    error,
    fetchCampaignDetails,
    createFlow,
    createSurveyLink
  };
}
