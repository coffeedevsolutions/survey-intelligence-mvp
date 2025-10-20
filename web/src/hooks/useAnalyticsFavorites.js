/**
 * Hook for managing analytics page favorites
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.js';

export const useAnalyticsFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    if (!user?.id || !user?.orgId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics/favorites?userId=${user.id}&orgId=${user.orgId}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.orgId]);

  // Add a favorite
  const addFavorite = useCallback(async (pageData) => {
    if (!user?.id || !user?.orgId) return false;

    try {
      const response = await fetch('/api/analytics/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          orgId: user.orgId,
          ...pageData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add favorite');
      }

      const data = await response.json();
      
      // Update local state
      setFavorites(prev => {
        const exists = prev.find(fav => fav.page_name === pageData.pageName);
        if (exists) {
          return prev.map(fav => 
            fav.page_name === pageData.pageName ? data.favorite : fav
          );
        }
        return [data.favorite, ...prev];
      });

      return true;
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError(err.message);
      return false;
    }
  }, [user?.id, user?.orgId]);

  // Remove a favorite
  const removeFavorite = useCallback(async (pageName) => {
    if (!user?.id || !user?.orgId) return false;

    try {
      const response = await fetch(
        `/api/analytics/favorites/${pageName}?userId=${user.id}&orgId=${user.orgId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove favorite');
      }

      // Update local state
      setFavorites(prev => prev.filter(fav => fav.page_name !== pageName));

      return true;
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError(err.message);
      return false;
    }
  }, [user?.id, user?.orgId]);

  // Check if a page is favorited
  const isFavorited = useCallback((pageName) => {
    return favorites.some(fav => fav.page_name === pageName);
  }, [favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (pageData) => {
    const isCurrentlyFavorited = isFavorited(pageData.pageName);
    
    if (isCurrentlyFavorited) {
      return await removeFavorite(pageData.pageName);
    } else {
      return await addFavorite(pageData);
    }
  }, [isFavorited, addFavorite, removeFavorite]);

  // Load favorites on mount
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorited,
    refetch: fetchFavorites
  };
};
