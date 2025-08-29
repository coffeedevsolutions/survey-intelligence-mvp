import { useState } from 'react';
import { campaignsApi, campaignUtils } from '../utils/campaignsApi.js';

/**
 * Custom hook for managing response details modal
 */
export function useResponseDetails(user) {
  const [showModal, setShowModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responseDetails, setResponseDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const viewResponseDetails = async (response) => {
    console.log('🔍 View Details clicked for response:', response.id);
    
    setSelectedResponse(response);
    setLoading(true);
    setShowModal(true);
    setError(null);
    
    try {
      const data = await campaignsApi.getResponseDetails(user.orgId, response.id);
      console.log('✅ Response details fetched:', data);
      setResponseDetails(data);
    } catch (err) {
      console.error('❌ Error fetching response details:', err);
      setError(err.message);
      setResponseDetails({ answers: [], facts: {} });
    } finally {
      setLoading(false);
    }
  };

  const viewBrief = async (response) => {
    try {
      const briefData = await campaignsApi.getBrief(user.orgId, response.id);
      const briefContent = briefData.summary_md || briefData.briefMarkdown;
      campaignUtils.downloadBrief(briefContent, response.id);
    } catch (err) {
      console.error('Error fetching brief:', err);
      throw new Error('Failed to fetch brief');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedResponse(null);
    setResponseDetails(null);
    setLoading(false);
    setError(null);
  };

  return {
    showModal,
    selectedResponse,
    responseDetails,
    loading,
    error,
    viewResponseDetails,
    viewBrief,
    closeModal
  };
}
