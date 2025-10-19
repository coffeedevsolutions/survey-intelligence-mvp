/**
 * Favorites Analytics Page
 * Displays user's favorite analytics pages
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Skeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Star, 
  Users, 
  Brain, 
  Target, 
  Settings, 
  BarChart3, 
  Activity, 
  Building, 
  Zap, 
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useAnalyticsFavorites } from '../../../hooks/useAnalyticsFavorites.js';

// Icon mapping for different page types
const iconMap = {
  'Users': Users,
  'Brain': Brain,
  'Target': Target,
  'Settings': Settings,
  'BarChart3': BarChart3,
  'Activity': Activity,
  'Building': Building,
  'Zap': Zap,
  'Clock': Clock,
  'default': BarChart3
};

const FavoritesAnalytics = ({ onNavigate }) => {
  const { favorites, loading, error, removeFavorite } = useAnalyticsFavorites();

  const handlePageClick = (pageName) => {
    if (onNavigate) {
      onNavigate(pageName);
    }
  };

  const handleRemoveFavorite = async (pageName, e) => {
    e.stopPropagation();
    await removeFavorite(pageName);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading favorites: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Favorite Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Your saved analytics pages for quick access</p>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <span className="text-sm text-gray-600">{favorites.length} favorites</span>
        </div>
      </div>

      {/* Favorites Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No analytics views favorited</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Start exploring analytics pages and click the star icon to add them to your favorites for quick access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite) => {
            const IconComponent = iconMap[favorite.page_icon] || iconMap.default;
            
            return (
              <Card 
                key={favorite.id}
                className="bg-white/95 backdrop-blur-sm hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => handlePageClick(favorite.page_name)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {favorite.page_title}
                        </CardTitle>
                        {favorite.page_category && (
                          <span className="inline-block px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full mt-1">
                            {favorite.page_category}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleRemoveFavorite(favorite.page_name, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-gray-400 hover:text-red-500"
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {favorite.page_description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {favorite.page_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Added {new Date(favorite.created_at).toLocaleDateString()}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FavoritesAnalytics;
