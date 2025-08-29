import { useState, useEffect } from 'react';
import { campaignsApi } from '../utils/campaignsApi.js';

/**
 * Custom hook for managing campaigns data
 */
export function useCampaigns(user) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = async () => {
    if (!user?.orgId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await campaignsApi.getCampaigns(user.orgId);
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData) => {
    try {
      setError(null);
      await campaignsApi.createCampaign(user.orgId, campaignData);
      await fetchCampaigns(); // Refresh the list
      return true;
    } catch (err) {
      console.error('Failed to create campaign:', err);
      
      // Handle specific API errors
      if (err.message.includes('Campaign slug already exists')) {
        setError('Campaign name already exists. Please try a different name.');
      } else if (err.message.includes('403') || err.message.includes('Access denied')) {
        setError('You do not have permission to create campaigns.');
      } else if (err.message.includes('500') || err.message.includes('Failed to create campaign')) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.message || 'Failed to create campaign');
      }
      return false;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign
  };
}
