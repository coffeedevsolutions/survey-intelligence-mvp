/**
 * Solution Engineering Analytics Page
 * Solution complexity, architecture patterns, and engineering metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Settings, 
  Code, 
  Layers, 
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for solution engineering analytics
const mockSolutionData = {
  totalSolutions: 156,
  totalSolutionsTrend: 12,
  avgComplexity: 7.2,
  avgComplexityTrend: -0.5,
  avgEpicsPerSolution: 3.8,
  avgEpicsPerSolutionTrend: 0.3,
  avgStoriesPerEpic: 5.2,
  avgStoriesPerEpicTrend: 0.1,
  
  // Solution complexity distribution
  complexityDistribution: [
    { range: 'Low (1-3)', count: 45, percentage: 29 },
    { range: 'Medium (4-6)', count: 67, percentage: 43 },
    { range: 'High (7-9)', count: 32, percentage: 21 },
    { range: 'Very High (10+)', count: 12, percentage: 7 }
  ],
  
  // Architecture patterns
  architecturePatterns: [
    { pattern: 'Microservices', count: 45, percentage: 29 },
    { pattern: 'Monolithic', count: 38, percentage: 24 },
    { pattern: 'Serverless', count: 32, percentage: 21 },
    { pattern: 'Hybrid', count: 25, percentage: 16 },
    { pattern: 'Event-Driven', count: 16, percentage: 10 }
  ],
  
  // Solution status breakdown
  solutionStatus: [
    { status: 'Draft', count: 23, percentage: 15 },
    { status: 'In Review', count: 34, percentage: 22 },
    { status: 'Approved', count: 45, percentage: 29 },
    { status: 'In Progress', count: 28, percentage: 18 },
    { status: 'Completed', count: 26, percentage: 16 }
  ],
  
  // Top performing solutions
  topSolutions: [
    {
      name: 'E-commerce Platform',
      complexity: 8,
      epics: 5,
      stories: 23,
      status: 'Completed',
      duration: '12 weeks'
    },
    {
      name: 'User Management System',
      complexity: 6,
      epics: 3,
      stories: 15,
      status: 'In Progress',
      duration: '8 weeks'
    },
    {
      name: 'Analytics Dashboard',
      complexity: 7,
      epics: 4,
      stories: 18,
      status: 'Approved',
      duration: '10 weeks'
    }
  ]
};

export default function SolutionEngineeringAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSolutionData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockSolutionData);
      } catch (err) {
        setError('Failed to load solution engineering data');
        console.error('Error fetching solution data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSolutionData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading solution analytics: {error}</p>
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
              title="Total Solutions"
              value={analyticsData?.totalSolutions?.toString() || '0'}
              trend={analyticsData?.totalSolutionsTrend || 0}
              trendLabel="vs last period"
              icon={<Settings className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Complexity"
              value={`${analyticsData?.avgComplexity || 0}/10`}
              trend={analyticsData?.avgComplexityTrend || 0}
              trendLabel="vs last period"
              icon={<Code className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Epics/Solution"
              value={`${analyticsData?.avgEpicsPerSolution || 0}`}
              trend={analyticsData?.avgEpicsPerSolutionTrend || 0}
              trendLabel="vs last period"
              icon={<Layers className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Stories/Epic"
              value={`${analyticsData?.avgStoriesPerEpic || 0}`}
              trend={analyticsData?.avgStoriesPerEpicTrend || 0}
              trendLabel="vs last period"
              icon={<BarChart3 className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* Solution Complexity & Architecture Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Solution Complexity Distribution */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Solution Complexity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.complexityDistribution?.map((item) => (
                  <div key={item.range} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.range}</span>
                      <span className="text-muted-foreground">{item.percentage}% ({item.count})</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Architecture Patterns */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Architecture Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.architecturePatterns?.map((pattern) => (
                  <div key={pattern.pattern} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{pattern.pattern}</span>
                      <span className="text-muted-foreground">{pattern.percentage}% ({pattern.count})</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pattern.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Solution Status & Top Solutions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Solution Status */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Solution Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.solutionStatus?.map((status) => (
                  <div key={status.status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{status.status}</span>
                      <span className="text-muted-foreground">{status.percentage}% ({status.count})</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          status.status === 'Completed' ? 'bg-green-600' :
                          status.status === 'In Progress' ? 'bg-blue-600' :
                          status.status === 'Approved' ? 'bg-purple-600' :
                          status.status === 'In Review' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }`}
                        style={{ width: `${status.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Solutions */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Solutions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.topSolutions?.map((solution) => (
                  <div key={solution.name} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{solution.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`${
                          solution.status === 'Completed' 
                            ? 'text-green-700 border-green-300' 
                            : solution.status === 'In Progress'
                            ? 'text-blue-700 border-blue-300'
                            : 'text-purple-700 border-purple-300'
                        }`}
                      >
                        {solution.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Complexity: {solution.complexity}/10</div>
                      <div>Epics: {solution.epics}</div>
                      <div>Stories: {solution.stories}</div>
                      <div>Duration: {solution.duration}</div>
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
