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
    
    // Prevent concurrent fetches for the same orgId
    if (fetchingRef.current) {
      console.log('🎯 [useSolutions] Skipping fetch - already in progress');
      return;
    }
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log('🎯 [useSolutions] Fetching solutions for orgId:', user.orgId);
      
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/solutions`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch solutions: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🎯 [useSolutions] Received solutions:', data.length || 0, 'items');
      setSolutions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('🎯 [useSolutions] Error fetching solutions:', err);
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

  // Initialize data on mount and when orgId changes
  useEffect(() => {
    // Only fetch if we have a valid user with orgId and it's different from the last one
    if (user?.orgId && user.orgId !== lastOrgIdRef.current && !fetchingRef.current) {
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
