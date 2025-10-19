/**
 * Favorite Button Component
 * Star icon that toggles favorite status for analytics pages
 */

import React from 'react';
import { Star } from 'lucide-react';
import { useAnalyticsFavorites } from '../../hooks/useAnalyticsFavorites.js';

const FavoriteButton = ({ 
  pageName, 
  pageTitle, 
  pageDescription, 
  pageIcon, 
  pageCategory,
  className = "",
  size = "w-5 h-5"
}) => {
  const { isFavorited, toggleFavorite, loading } = useAnalyticsFavorites();

  const handleToggle = async () => {
    await toggleFavorite({
      pageName,
      pageTitle,
      pageDescription,
      pageIcon,
      pageCategory
    });
  };

  const favorited = isFavorited(pageName);

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`transition-colors duration-200 hover:scale-110 disabled:opacity-50 ${className}`}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star 
        className={`${size} ${
          favorited 
            ? 'text-yellow-500 fill-yellow-500' 
            : 'text-gray-400 hover:text-yellow-500'
        }`} 
      />
    </button>
  );
};

export default FavoriteButton;
