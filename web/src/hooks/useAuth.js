import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';

/**
 * Custom hook for managing authentication state
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      console.log('🔍 Fetching user info...');
      const userData = await api.getCurrentUser();
      
      if (userData?.user) {
        // console.log('✅ User data received:', userData);
        setUser(userData.user);
        setError(null);
      } else {
        console.log('❌ No user data found');
        setUser(null);
      }
    } catch (err) {
      console.error('❌ Failed to fetch user data:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    // Redirect to logout endpoint
    window.location.href = '/auth/logout';
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isReviewer: user?.role === 'reviewer' || user?.role === 'admin',
    logout,
    refetch: loadUser
  };
}
