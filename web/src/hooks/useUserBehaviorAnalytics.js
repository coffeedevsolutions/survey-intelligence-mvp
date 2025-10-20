/**
 * Custom hook for fetching user behavior analytics
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.js';

export function useUserBehaviorAnalytics(timeRange = '30d', customDateRange = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchUserBehaviorData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/analytics/user-behavior?timeRange=${timeRange}`;
      
      if (timeRange === 'custom' && customDateRange?.from && customDateRange?.to) {
        const startDate = customDateRange.from.toISOString().split('T')[0];
        const endDate = customDateRange.to.toISOString().split('T')[0];
        url += `&startDate=${startDate}&endDate=${endDate}`;
        console.log('Custom date range request:', { startDate, endDate, url });
      }
      
      console.log('Fetching user behavior analytics with URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('User behavior analytics result:', result);
      
      if (result.error) {
        throw new Error(result.message || 'Failed to fetch user behavior analytics');
      }
      
      setData(result);
    } catch (err) {
      console.error('Error fetching user behavior analytics:', err);
      setError(err.message || 'Failed to fetch user behavior analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBehaviorData();
  }, [user, timeRange, customDateRange?.from, customDateRange?.to]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchUserBehaviorData 
  };
}
