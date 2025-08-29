import { useState, useEffect } from 'react';
import { dashboardApi } from '../utils/dashboardApi.js';

/**
 * Custom hook for managing dashboard state and operations
 */
export function useDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null);

  const fetchSessions = async () => {
    try {
      const data = await dashboardApi.fetchSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const data = await dashboardApi.fetchMe();
      setMe(data.user);
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchMe();
  }, []);

  // Calculate stats from sessions data
  const stats = {
    totalSurveys: sessions.length,
    activeSurveys: sessions.filter(s => !s.completed).length,
    totalResponses: sessions.reduce((sum, session) => sum + (+session.answer_count || 0), 0),
    briefsGenerated: sessions.filter(s => s.has_brief).length
  };

  return {
    sessions,
    loading,
    error,
    me,
    stats,
    refetchSessions: fetchSessions,
    refetchMe: fetchMe
  };
}
