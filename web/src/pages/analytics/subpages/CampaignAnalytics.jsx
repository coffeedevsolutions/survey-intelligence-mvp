/**
 * Campaign & Marketing Analytics Page
 * Campaign performance, conversion rates, and marketing metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  MousePointer
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for campaign analytics
const mockCampaignData = {
  totalCampaigns: 24,
  totalCampaignsTrend: 8,
  activeCampaigns: 12,
  activeCampaignsTrend: 2,
  totalImpressions: 45678,
  totalImpressionsTrend: 15,
  conversionRate: 12.4,
  conversionRateTrend: 1.8,
  
  // Campaign performance
  campaignPerformance: [
    {
      name: 'Q4 Product Launch',
      impressions: 12500,
      clicks: 1875,
      conversions: 234,
      conversionRate: 12.5,
      status: 'Active',
      budget: 5000,
      spent: 3200
    },
    {
      name: 'Holiday Special',
      impressions: 8900,
      clicks: 1335,
      conversions: 178,
      conversionRate: 13.3,
      status: 'Completed',
      budget: 3000,
      spent: 3000
    },
    {
      name: 'New User Onboarding',
      impressions: 15200,
      clicks: 2280,
      conversions: 285,
      conversionRate: 12.5,
      status: 'Active',
      budget: 4000,
      spent: 2100
    },
    {
      name: 'Feature Announcement',
      impressions: 6800,
      clicks: 1020,
      conversions: 89,
      conversionRate: 8.7,
      status: 'Paused',
      budget: 2000,
      spent: 1200
    }
  ],
  
  // Conversion funnel
  conversionFunnel: [
    { stage: 'Impressions', count: 45678, percentage: 100 },
    { stage: 'Clicks', count: 6841, percentage: 15.0 },
    { stage: 'Sign-ups', count: 1368, percentage: 20.0 },
    { stage: 'Trials', count: 410, percentage: 30.0 },
    { stage: 'Conversions', count: 123, percentage: 30.0 }
  ],
  
  // Channel performance
  channelPerformance: [
    { channel: 'Email', impressions: 18500, conversions: 89, cost: 1200, roi: 340 },
    { channel: 'Social Media', impressions: 15200, conversions: 67, cost: 800, roi: 280 },
    { channel: 'Search Ads', impressions: 8900, conversions: 45, cost: 1500, roi: 180 },
    { channel: 'Display Ads', impressions: 3078, conversions: 12, cost: 600, roi: 80 }
  ],
  
  // Top performing campaigns
  topCampaigns: [
    {
      name: 'Q4 Product Launch',
      metric: 'Highest Conversion Rate',
      value: '12.5%',
      trend: '+2.1%',
      color: 'green'
    },
    {
      name: 'Holiday Special',
      metric: 'Best ROI',
      value: '340%',
      trend: '+15%',
      color: 'blue'
    },
    {
      name: 'New User Onboarding',
      metric: 'Most Impressions',
      value: '15.2K',
      trend: '+8%',
      color: 'purple'
    }
  ]
};

export default function CampaignAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaignData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockCampaignData);
      } catch (err) {
        setError('Failed to load campaign data');
        console.error('Error fetching campaign data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading campaign analytics: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {loading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Total Campaigns"
              value={analyticsData?.totalCampaigns?.toString() || '0'}
              trend={analyticsData?.totalCampaignsTrend || 0}
              trendLabel="vs last period"
              icon={<Target className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Active Campaigns"
              value={analyticsData?.activeCampaigns?.toString() || '0'}
              trend={analyticsData?.activeCampaignsTrend || 0}
              trendLabel="vs last period"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Total Impressions"
              value={analyticsData?.totalImpressions?.toLocaleString() || '0'}
              trend={analyticsData?.totalImpressionsTrend || 0}
              trendLabel="vs last period"
              icon={<Eye className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Conversion Rate"
              value={`${analyticsData?.conversionRate || 0}%`}
              trend={analyticsData?.conversionRateTrend || 0}
              trendLabel="vs last period"
              icon={<TrendingUp className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* Conversion Funnel */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div className="space-y-4">
              {analyticsData?.conversionFunnel?.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{stage.count.toLocaleString()}</span>
                      {index > 0 && (
                        <span className="text-xs text-blue-600">{stage.percentage}%</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Performance & Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Campaign Performance */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.campaignPerformance?.map((campaign) => (
                  <div key={campaign.name} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{campaign.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`${
                          campaign.status === 'Active' 
                            ? 'text-green-700 border-green-300' 
                            : campaign.status === 'Completed'
                            ? 'text-blue-700 border-blue-300'
                            : 'text-yellow-700 border-yellow-300'
                        }`}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Impressions: {campaign.impressions.toLocaleString()}</div>
                      <div>Conversions: {campaign.conversions}</div>
                      <div>Rate: {campaign.conversionRate}%</div>
                      <div>Spent: ${campaign.spent.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Performance */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.channelPerformance?.map((channel) => (
                  <div key={channel.channel} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{channel.channel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-bold">{channel.roi}% ROI</span>
                        <span className="text-muted-foreground">${channel.cost}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (channel.conversions / 100) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {channel.conversions} conversions from {channel.impressions.toLocaleString()} impressions
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Campaigns */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsData?.topCampaigns?.map((campaign, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  campaign.color === 'green' 
                    ? 'bg-green-50 border-green-200' 
                    : campaign.color === 'blue'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-purple-50 border-purple-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-2 ${
                        campaign.color === 'green' 
                          ? 'text-green-900' 
                          : campaign.color === 'blue'
                          ? 'text-blue-900'
                          : 'text-purple-900'
                      }`}>
                        {campaign.name}
                      </h4>
                      <div className={`text-sm mb-1 ${
                        campaign.color === 'green' 
                          ? 'text-green-700' 
                          : campaign.color === 'blue'
                          ? 'text-blue-700'
                          : 'text-purple-700'
                      }`}>
                        {campaign.metric}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          campaign.color === 'green' 
                            ? 'text-green-600' 
                            : campaign.color === 'blue'
                            ? 'text-blue-600'
                            : 'text-purple-600'
                        }`}>
                          {campaign.value}
                        </span>
                        <span className={`text-xs ${
                          campaign.color === 'green' 
                            ? 'text-green-600' 
                            : campaign.color === 'blue'
                            ? 'text-blue-600'
                            : 'text-purple-600'
                        }`}>
                          {campaign.trend}
                        </span>
                      </div>
                    </div>
                    <CheckCircle className={`h-5 w-5 flex-shrink-0 ${
                      campaign.color === 'green' 
                        ? 'text-green-600' 
                        : campaign.color === 'blue'
                        ? 'text-blue-600'
                        : 'text-purple-600'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
