/**
 * Analytics Tab - Main analytics navigation and routing
 * Routes to different analytics subpages
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { 
  Users, 
  Brain, 
  Target, 
  Settings, 
  BarChart3, 
  Activity, 
  Building, 
  Zap, 
  Clock,
  Download,
  RefreshCw,
  Calendar,
  ArrowRight,
  ChevronDown,
  Star,
  AlertCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select.jsx';
import { Skeleton } from '../../../components/ui/skeleton.jsx';

// Import analytics subpages
import UserBehaviorAnalytics from '../subpages/UserBehaviorAnalytics.jsx';
import AIConversationAnalytics from '../subpages/AIConversationAnalytics.jsx';
import CampaignAnalytics from '../subpages/CampaignAnalytics.jsx';
import SolutionEngineeringAnalytics from '../subpages/SolutionEngineeringAnalytics.jsx';
import WorkflowAnalytics from '../subpages/WorkflowAnalytics.jsx';
import IntegrationAnalytics from '../subpages/IntegrationAnalytics.jsx';
import OrganizationalAnalytics from '../subpages/OrganizationalAnalytics.jsx';
import PredictiveAnalytics from '../subpages/PredictiveAnalytics.jsx';
import RealTimeDashboard from '../subpages/RealTimeDashboard.jsx';
import ContentAnalytics from '../subpages/ContentAnalytics.jsx';
import { useAnalyticsFavorites } from '../../../hooks/useAnalyticsFavorites.js';
import FavoriteButton from '../../../components/analytics/FavoriteButton.jsx';
import AnalyticsPageCard from '../../../components/analytics/AnalyticsPageCard.jsx';

export function AnalyticsTab({ user }) {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('user-behavior');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [hideTimeout] = useState(null);

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const exportAnalytics = async (format = 'json') => {
    try {
      const response = await fetch(`/api/analytics/export?timeRange=${timeRange}&format=${format}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [hideTimeout]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.analytics-navigation')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">Comprehensive insights and user behavior analytics</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <div className="min-w-0">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="bg-white border-gray-200 shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full min-w-[140px] max-w-[200px]">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <SelectValue placeholder="Select time range" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-lg">
                {timeRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="hover:bg-gray-50 focus:bg-gray-50">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-xs lg:text-sm text-gray-600 bg-gray-50 px-2 lg:px-3 py-2 rounded-md border min-w-[100px] lg:min-w-[120px] text-center flex-shrink-0">
            {loading ? (
              <Skeleton className="h-3 lg:h-4 w-16 lg:w-20 mx-auto" />
            ) : (
              <span>{timeRangeOptions.find(opt => opt.value === timeRange)?.label || 'Last 30 days'}</span>
            )}
          </div>

          {/* Export Button */}
          {user.role === 'admin' && (
            <div className="relative group">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="absolute right-0 top-full mt-1 invisible group-hover:visible bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button
                  onClick={() => exportAnalytics('json')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => exportAnalytics('csv')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Export CSV
                </button>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={() => setLoading(!loading)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Category Navigation Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
            <div className="text-sm text-muted-foreground">
              Select a category to explore detailed analytics
            </div>
          </div>
          
          {/* Category Navigation */}
          <div className="space-y-0 analytics-navigation">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setActiveCategory('favorites');
                  setShowDropdown(!showDropdown || activeCategory !== 'favorites');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                  activeCategory === 'favorites'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Star className="h-4 w-4" />
                Favorites
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  showDropdown && activeCategory === 'favorites' ? 'rotate-180' : ''
                }`} />
              </button>
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setShowDropdown(!showDropdown || activeCategory !== 'all');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                  activeCategory === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                All Analytics
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  showDropdown && activeCategory === 'all' ? 'rotate-180' : ''
                }`} />
              </button>
              <button
                onClick={() => {
                  setActiveCategory('user');
                  setShowDropdown(!showDropdown || activeCategory !== 'user');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                  activeCategory === 'user'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                User & Behavior
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  showDropdown && activeCategory === 'user' ? 'rotate-180' : ''
                }`} />
              </button>
              <button
                onClick={() => {
                  setActiveCategory('business');
                  setShowDropdown(!showDropdown || activeCategory !== 'business');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                  activeCategory === 'business'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Business & Operations
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  showDropdown && activeCategory === 'business' ? 'rotate-180' : ''
                }`} />
              </button>
              <button
                onClick={() => {
                  setActiveCategory('technical');
                  setShowDropdown(!showDropdown || activeCategory !== 'technical');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                  activeCategory === 'technical'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Technical & System
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  showDropdown && activeCategory === 'technical' ? 'rotate-180' : ''
                }`} />
              </button>
              <button
                onClick={() => {
                  setActiveCategory('advanced');
                  setShowDropdown(!showDropdown || activeCategory !== 'advanced');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                  activeCategory === 'advanced'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Advanced Analytics
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  showDropdown && activeCategory === 'advanced' ? 'rotate-180' : ''
                }`} />
              </button>
            </div>

            {/* Dropdown Menu */}
            <div className={`w-full bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 overflow-hidden ${
              showDropdown ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-6">
                {activeCategory === 'favorites' && (
                  <FavoritesDropdownContent 
                    onNavigate={(pageName) => {
                      setActiveTab(pageName);
                      setShowDropdown(false);
                    }}
                  />
                )}
                {activeCategory === 'all' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnalyticsPageCard
                      pageName="user-behavior"
                      pageTitle="User & Behavior"
                      pageDescription="User engagement & journey analysis"
                      pageIcon="Users"
                      pageCategory="user"
                      onClick={() => {
                        setActiveTab('user-behavior');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'user-behavior'}
                    />
                    <AnalyticsPageCard
                      pageName="ai-conversation"
                      pageTitle="AI & Intelligence"
                      pageDescription="AI confidence & conversation patterns"
                      pageIcon="Brain"
                      pageCategory="ai"
                      onClick={() => {
                        setActiveTab('ai-conversation');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'ai-conversation'}
                    />
                    <AnalyticsPageCard
                      pageName="campaign"
                      pageTitle="Campaign & Marketing"
                      pageDescription="Campaign performance & conversion"
                      pageIcon="Target"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('campaign');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'campaign'}
                    />
                    <AnalyticsPageCard
                      pageName="solution-engineering"
                      pageTitle="Solution Engineering"
                      pageDescription="Solution complexity & architecture"
                      pageIcon="Settings"
                      pageCategory="technical"
                      onClick={() => {
                        setActiveTab('solution-engineering');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'solution-engineering'}
                    />
                    <AnalyticsPageCard
                      pageName="workflow"
                      pageTitle="Workflow & Process"
                      pageDescription="Process efficiency & bottlenecks"
                      pageIcon="BarChart3"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('workflow');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'workflow'}
                    />
                    <AnalyticsPageCard
                      pageName="integration"
                      pageTitle="System & Integration"
                      pageDescription="API performance & system health"
                      pageIcon="Activity"
                      pageCategory="technical"
                      onClick={() => {
                        setActiveTab('integration');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'integration'}
                    />
                    <AnalyticsPageCard
                      pageName="organizational"
                      pageTitle="Organizational"
                      pageDescription="Org growth & team metrics"
                      pageIcon="Building"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('organizational');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'organizational'}
                    />
                    <AnalyticsPageCard
                      pageName="predictive"
                      pageTitle="Predictive"
                      pageDescription="ML predictions & forecasting"
                      pageIcon="Zap"
                      pageCategory="advanced"
                      onClick={() => {
                        setActiveTab('predictive');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'predictive'}
                    />
                    <AnalyticsPageCard
                      pageName="real-time"
                      pageTitle="Real-time"
                      pageDescription="Live activity & monitoring"
                      pageIcon="Clock"
                      pageCategory="advanced"
                      onClick={() => {
                        setActiveTab('real-time');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'real-time'}
                    />
                    <AnalyticsPageCard
                      pageName="content"
                      pageTitle="Content"
                      pageDescription="Template & content performance"
                      pageIcon="BarChart3"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('content');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'content'}
                    />
                  </div>
                )}

                {activeCategory === 'user' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnalyticsPageCard
                      pageName="user-behavior"
                      pageTitle="User & Behavior"
                      pageDescription="User engagement & journey analysis"
                      pageIcon="Users"
                      pageCategory="user"
                      onClick={() => setActiveTab('user-behavior')}
                      isActive={activeTab === 'user-behavior'}
                    />
                    <AnalyticsPageCard
                      pageName="ai-conversation"
                      pageTitle="AI & Intelligence"
                      pageDescription="AI confidence & conversation patterns"
                      pageIcon="Brain"
                      pageCategory="ai"
                      onClick={() => {
                        setActiveTab('ai-conversation');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'ai-conversation'}
                    />
                  </div>
                )}

                {activeCategory === 'business' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnalyticsPageCard
                      pageName="campaign"
                      pageTitle="Campaign & Marketing"
                      pageDescription="Campaign performance & conversion"
                      pageIcon="Target"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('campaign');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'campaign'}
                    />
                    <AnalyticsPageCard
                      pageName="solution-engineering"
                      pageTitle="Solution Engineering"
                      pageDescription="Solution complexity & architecture"
                      pageIcon="Settings"
                      pageCategory="technical"
                      onClick={() => {
                        setActiveTab('solution-engineering');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'solution-engineering'}
                    />
                    <AnalyticsPageCard
                      pageName="workflow"
                      pageTitle="Workflow & Process"
                      pageDescription="Process efficiency & bottlenecks"
                      pageIcon="BarChart3"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('workflow');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'workflow'}
                    />
                    <AnalyticsPageCard
                      pageName="organizational"
                      pageTitle="Organizational"
                      pageDescription="Org growth & team metrics"
                      pageIcon="Building"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('organizational');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'organizational'}
                    />
                  </div>
                )}

                {activeCategory === 'technical' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnalyticsPageCard
                      pageName="integration"
                      pageTitle="System & Integration"
                      pageDescription="API performance & system health"
                      pageIcon="Activity"
                      pageCategory="technical"
                      onClick={() => {
                        setActiveTab('integration');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'integration'}
                    />
                    <AnalyticsPageCard
                      pageName="real-time"
                      pageTitle="Real-time"
                      pageDescription="Live activity & monitoring"
                      pageIcon="Clock"
                      pageCategory="advanced"
                      onClick={() => {
                        setActiveTab('real-time');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'real-time'}
                    />
                  </div>
                )}

                {activeCategory === 'advanced' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnalyticsPageCard
                      pageName="predictive"
                      pageTitle="Predictive"
                      pageDescription="ML predictions & forecasting"
                      pageIcon="Zap"
                      pageCategory="advanced"
                      onClick={() => {
                        setActiveTab('predictive');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'predictive'}
                    />
                    <AnalyticsPageCard
                      pageName="content"
                      pageTitle="Content"
                      pageDescription="Template & content performance"
                      pageIcon="BarChart3"
                      pageCategory="business"
                      onClick={() => {
                        setActiveTab('content');
                        setShowDropdown(false);
                      }}
                      isActive={activeTab === 'content'}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="user-behavior" className="mt-6">
          <UserBehaviorAnalytics timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="ai-conversation" className="mt-6">
          <AIConversationAnalytics timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="campaign" className="mt-6">
          <CampaignAnalytics timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="solution-engineering" className="mt-6">
          <SolutionEngineeringAnalytics timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="workflow" className="mt-6">
          <WorkflowAnalytics timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="integration" className="mt-6">
          <IntegrationAnalytics timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="organizational" className="mt-6">
          <OrganizationalAnalytics timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="predictive" className="mt-6">
          <PredictiveAnalytics timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="real-time" className="mt-6">
          <RealTimeDashboard timeRange={timeRange} user={user} />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <ContentAnalytics timeRange={timeRange} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Favorites Dropdown Content Component
function FavoritesDropdownContent({ onNavigate }) {
  const { favorites, loading, error } = useAnalyticsFavorites();

  const handlePageClick = (pageName) => {
    onNavigate(pageName);
  };



  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">Error loading favorites: {error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8">
        <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No analytics views favorited</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Start exploring analytics pages and click the star icon to add them to your favorites for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map((favorite) => (
        <AnalyticsPageCard
          key={favorite.id}
          pageName={favorite.page_name}
          pageTitle={favorite.page_title}
          pageDescription={favorite.page_description}
          pageIcon={favorite.page_icon}
          pageCategory={favorite.page_category}
          onClick={() => handlePageClick(favorite.page_name)}
          isActive={false}
        />
      ))}
    </div>
  );
}


export default AnalyticsTab;
