import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.js';

export function useDashboardAnalytics(timeRange = '30d', customDateRange = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/analytics/dashboard?timeRange=${timeRange}`;
      
      // Add custom date range parameters if provided
      if (timeRange === 'custom' && customDateRange?.from && customDateRange?.to) {
        const startDate = customDateRange.from.toISOString().split('T')[0];
        const endDate = customDateRange.to.toISOString().split('T')[0];
        url += `&startDate=${startDate}&endDate=${endDate}`;
        console.log('Custom date range request:', { startDate, endDate, url });
      }
      
      console.log('Fetching analytics with URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Dashboard Analytics Response:', result);
      setData(result);
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, timeRange, customDateRange?.from, customDateRange?.to]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchDashboardData
  };
}
