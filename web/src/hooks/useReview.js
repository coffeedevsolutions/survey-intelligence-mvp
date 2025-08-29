import { useEffect, useState } from 'react';
import { reviewApi } from '../utils/reviewApi.js';

/**
 * Custom hook for managing review state and operations
 */
export function useReview() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await reviewApi.fetchSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = () => {
    fetchSessions();
  };

  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    refreshSessions
  };
}
