import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Custom hook for managing solutions
 */
export function useSolutions(user) {
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);
  const lastOrgIdRef = useRef(null);

  // Fetch solutions for the organization
  const fetchSolutions = async () => {
    if (!user?.orgId) {
      setLoading(false);
      return;
    }
    
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/solutions`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch solutions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setSolutions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching solutions:', err);
      setError(err.message);
      setSolutions([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Fetch solution details by ID
  const fetchSolutionDetails = async (solutionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/solutions/${solutionId}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch solution details');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching solution details:', err);
      throw err;
    }
  };

  // Export solution to Jira format
  const exportSolutionToJira = async (solutionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/solutions/${solutionId}/export/jira`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export solution');
      }

      return await response.blob();
    } catch (err) {
      console.error('Error exporting solution:', err);
      throw err;
    }
  };

  // Initialize data on mount
  useEffect(() => {
    if (user?.orgId && user.orgId !== lastOrgIdRef.current) {
      lastOrgIdRef.current = user.orgId;
      fetchSolutions();
    }
  }, [user?.orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    solutions,
    loading,
    error,
    fetchSolutions,
    fetchSolutionDetails,
    exportSolutionToJira,
    refetch: fetchSolutions
  };
}
