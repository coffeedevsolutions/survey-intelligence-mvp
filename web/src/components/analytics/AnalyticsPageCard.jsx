import React from 'react';
import { Star, ArrowRight, Users, Brain, Target, Settings, BarChart3, Activity, Building, Zap, Clock, FileText } from 'lucide-react';
import { useAnalyticsFavorites } from '../../hooks/useAnalyticsFavorites.js';

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
  'FileText': FileText,
  'default': BarChart3
};

const AnalyticsPageCard = ({ 
  pageName, 
  pageTitle, 
  pageDescription, 
  pageIcon, 
  pageCategory, 
  metrics = [], 
  onClick, 
  isActive = false 
}) => {
  const { isFavorited, toggleFavorite, loading: favoritesLoading } = useAnalyticsFavorites();
  const favorited = isFavorited(pageName);

  const handleToggle = async (e) => {
    e.stopPropagation();
    await toggleFavorite({ pageName, pageTitle, pageDescription, pageIcon, pageCategory });
  };

  // Get the icon component
  const IconComponent = iconMap[pageIcon] || iconMap.default;

  return (
    <div
      className={`bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer group relative ${
        isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <IconComponent className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                {pageTitle}
              </h3>
              {isActive && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  Active
                </span>
              )}
            </div>
            {/* Favorite Button - Top Right */}
            <button
              onClick={handleToggle}
              disabled={favoritesLoading}
              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                favorited ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Star className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
            </button>
          </div>
          {pageCategory && (
            <span className="inline-block px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full mt-1">
              {pageCategory}
            </span>
          )}
        </div>
      </div>
      
      {pageDescription && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 line-clamp-2 flex-1">
            {pageDescription}
          </p>
          {/* Arrow - Bottom Right */}
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors ml-2 flex-shrink-0" />
        </div>
      )}
      
      {metrics.length > 0 && (
        <div className="space-y-2 text-sm">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between">
              <span>{metric.split(':')[0]}:</span>
              <span className="font-medium">{metric.split(':')[1]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPageCard;
