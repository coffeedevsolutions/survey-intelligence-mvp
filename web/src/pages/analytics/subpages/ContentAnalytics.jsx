/**
 * Content & Template Analytics Page
 * Template usage, content performance, and content optimization
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Activity,
  Target,
  Eye
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for content analytics
const mockContentData = {
  totalTemplates: 24,
  totalTemplatesTrend: 8,
  templateUsage: 1247,
  templateUsageTrend: 15,
  avgCompletionRate: 78.5,
  avgCompletionRateTrend: 2.1,
  contentEngagement: 67.3,
  contentEngagementTrend: 1.8,
  
  // Template performance
  templatePerformance: [
    {
      name: 'Product Requirements',
      usage: 456,
      completionRate: 89,
      avgTime: 12,
      rating: 4.8
    },
    {
      name: 'Technical Architecture',
      usage: 234,
      completionRate: 76,
      avgTime: 18,
      rating: 4.2
    },
    {
      name: 'User Stories',
      usage: 189,
      completionRate: 82,
      avgTime: 8,
      rating: 4.5
    },
    {
      name: 'Project Planning',
      usage: 156,
      completionRate: 71,
      avgTime: 15,
      rating: 4.1
    }
  ],
  
  // Content categories
  contentCategories: [
    { category: 'Technical', usage: 45, percentage: 35 },
    { category: 'Business', usage: 38, percentage: 30 },
    { category: 'Design', usage: 25, percentage: 20 },
    { category: 'Process', usage: 20, percentage: 15 }
  ]
};

export default function ContentAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContentData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockContentData);
      } catch (err) {
        setError('Failed to load content data');
        console.error('Error fetching content data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContentData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading content analytics: {error}</p>
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
              title="Total Templates"
              value={analyticsData?.totalTemplates?.toString() || '0'}
              trend={analyticsData?.totalTemplatesTrend || 0}
              trendLabel="vs last period"
              icon={<FileText className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Template Usage"
              value={analyticsData?.templateUsage?.toLocaleString() || '0'}
              trend={analyticsData?.templateUsageTrend || 0}
              trendLabel="vs last period"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Completion Rate"
              value={`${analyticsData?.avgCompletionRate || 0}%`}
              trend={analyticsData?.avgCompletionRateTrend || 0}
              trendLabel="vs last period"
              icon={<Target className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Content Engagement"
              value={`${analyticsData?.contentEngagement || 0}%`}
              trend={analyticsData?.contentEngagementTrend || 0}
              trendLabel="vs last period"
              icon={<Eye className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* Template Performance & Content Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Template Performance */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Template Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.templatePerformance?.map((template) => (
                  <div key={template.name} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{template.name}</span>
                      <Badge variant="outline">{template.usage} uses</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Completion: {template.completionRate}%</div>
                      <div>Avg Time: {template.avgTime}min</div>
                      <div>Rating: {template.rating}/5</div>
                      <div>Uses: {template.usage}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Categories */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.contentCategories?.map((category) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category.category}</span>
                      <span className="text-muted-foreground">{category.percentage}% ({category.usage})</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
