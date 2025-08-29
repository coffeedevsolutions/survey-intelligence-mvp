import { useState, useCallback } from 'react';
import { campaignsApi } from '../utils/campaignsApi.js';
import { dashboardApi } from '../utils/dashboardApi.js';

/**
 * Custom hook for managing archive operations
 */
export function useArchive(user) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Campaign archive operations
  const archiveCampaign = useCallback(async (campaignId) => {
    if (!user?.orgId) {
      console.error('useArchive: No orgId found for user:', user);
      return false;
    }
    
    try {
      console.log('useArchive: Starting campaign archive for ID:', campaignId, 'OrgId:', user.orgId);
      setLoading(true);
      setError(null);
      await campaignsApi.archiveCampaign(user.orgId, campaignId);
      console.log('useArchive: Campaign archived successfully');
      return true;
    } catch (err) {
      console.error('useArchive: Failed to archive campaign:', err);
      setError(err.message || 'Failed to archive campaign');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  const restoreCampaign = useCallback(async (campaignId) => {
    if (!user?.orgId) return false;
    
    try {
      setLoading(true);
      setError(null);
      await campaignsApi.restoreCampaign(user.orgId, campaignId);
      return true;
    } catch (err) {
      console.error('Failed to restore campaign:', err);
      setError(err.message || 'Failed to restore campaign');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  const deleteCampaignPermanently = useCallback(async (campaignId) => {
    if (!user?.orgId) return false;
    
    try {
      setLoading(true);
      setError(null);
      await campaignsApi.deleteCampaignPermanently(user.orgId, campaignId);
      return true;
    } catch (err) {
      console.error('Failed to permanently delete campaign:', err);
      setError(err.message || 'Failed to permanently delete campaign');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  // Session archive operations
  const archiveSession = useCallback(async (sessionId) => {
    try {
      console.log('useArchive: Starting session archive for ID:', sessionId);
      setLoading(true);
      setError(null);
      await dashboardApi.archiveSession(sessionId);
      console.log('useArchive: Session archived successfully');
      return true;
    } catch (err) {
      console.error('useArchive: Failed to archive session:', err);
      setError(err.message || 'Failed to archive session');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      await dashboardApi.restoreSession(sessionId);
      return true;
    } catch (err) {
      console.error('Failed to restore session:', err);
      setError(err.message || 'Failed to restore session');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSessionPermanently = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      await dashboardApi.deleteSessionPermanently(sessionId);
      return true;
    } catch (err) {
      console.error('Failed to permanently delete session:', err);
      setError(err.message || 'Failed to permanently delete session');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get archived items
  const getArchivedCampaigns = useCallback(async () => {
    if (!user?.orgId) return [];
    
    try {
      setLoading(true);
      setError(null);
      const result = await campaignsApi.getArchivedCampaigns(user.orgId);
      return result.campaigns || [];
    } catch (err) {
      console.error('Failed to fetch archived campaigns:', err);
      setError(err.message || 'Failed to fetch archived campaigns');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  const getArchivedSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardApi.fetchArchivedSessions();
      return result.sessions || [];
    } catch (err) {
      console.error('Failed to fetch archived sessions:', err);
      setError(err.message || 'Failed to fetch archived sessions');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    // Campaign operations
    archiveCampaign,
    restoreCampaign,
    deleteCampaignPermanently,
    // Session operations
    archiveSession,
    restoreSession,
    deleteSessionPermanently,
    // Fetch operations
    getArchivedCampaigns,
    getArchivedSessions
  };
}
