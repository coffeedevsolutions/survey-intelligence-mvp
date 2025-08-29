import { useState, useEffect } from 'react';
import { dashboardApi } from '../utils/dashboardApi.js';
import { useNotifications } from '../components/ui/notifications.jsx';

/**
 * Custom hook for managing briefs and reviews
 */
export function useBriefs(user) {
  const [briefsForReview, setBriefsForReview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState(null);
  const [briefResponseDetails, setBriefResponseDetails] = useState(null);
  const [showBriefDetails, setShowBriefDetails] = useState(false);
  const [loadingBriefDetails, setLoadingBriefDetails] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const fetchBriefsForReview = async () => {
    if (!user?.orgId || (user.role !== 'admin' && user.role !== 'reviewer')) return;
    
    setLoading(true);
    try {
      const data = await dashboardApi.fetchBriefsForReview(user.orgId);
      setBriefsForReview(data.briefs || []);
    } catch (error) {
      console.error('Error fetching briefs for review:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitBriefReview = async (briefId, priority) => {
    try {
      await dashboardApi.submitBriefReview(user.orgId, briefId, priority);
      await fetchBriefsForReview();
      showSuccess('Brief review submitted successfully!');
    } catch (error) {
      showError('Failed to submit review: ' + error.message);
    }
  };

  const viewBriefResponseDetails = async (brief) => {
    console.log('🔍 View Brief Details clicked for:', brief.session_id);
    
    setSelectedBrief(brief);
    setLoadingBriefDetails(true);
    setShowBriefDetails(true);
    
    try {
      const answersData = await dashboardApi.fetchBriefResponseDetails(user.orgId, brief.session_id);
      console.log('✅ Brief response details fetched:', answersData);
      setBriefResponseDetails(answersData);
    } catch (error) {
      console.error('❌ Error fetching brief response details:', error);
      setBriefResponseDetails({ answers: [], facts: {} });
    } finally {
      setLoadingBriefDetails(false);
    }
  };

  const viewBriefDocument = async (brief) => {
    try {
      const briefMarkdown = brief.summary_md;
      if (briefMarkdown) {
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
        showError('No brief content available');
      }
    } catch (error) {
      console.error('Error viewing brief:', error);
      showError('Error loading brief');
    }
  };

  const closeBriefDetails = () => {
    setShowBriefDetails(false);
    setSelectedBrief(null);
    setBriefResponseDetails(null);
    setLoadingBriefDetails(false);
  };

  useEffect(() => {
    if (user?.orgId && (user.role === 'admin' || user.role === 'reviewer')) {
      fetchBriefsForReview();
    }
  }, [user]);

  return {
    briefsForReview,
    loading,
    selectedBrief,
    briefResponseDetails,
    showBriefDetails,
    loadingBriefDetails,
    submitBriefReview,
    viewBriefResponseDetails,
    viewBriefDocument,
    closeBriefDetails,
    refetchBriefs: fetchBriefsForReview
  };
}
