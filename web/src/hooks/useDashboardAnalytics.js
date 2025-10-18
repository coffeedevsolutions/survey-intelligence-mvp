import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function useDashboardAnalytics(timeRange = '30d') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`, {
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

    fetchDashboardData();
  }, [user, timeRange]);

  return { data, loading, error, refetch: () => {
    setLoading(true);
    setError(null);
    // Trigger useEffect by updating a dependency
    setData(null);
  }};
}
