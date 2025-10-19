/**
 * Integration & Technical Analytics Page
 * API usage, system health, and technical performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Activity, 
  Zap, 
  Server, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for integration analytics
const mockIntegrationData = {
  apiCalls: 45678,
  apiCallsTrend: 12,
  avgResponseTime: 245,
  avgResponseTimeTrend: -15,
  uptime: 99.8,
  uptimeTrend: 0.1,
  errorRate: 0.2,
  errorRateTrend: -0.1,
  
  // API endpoints
  apiEndpoints: [
    { endpoint: '/api/analytics', calls: 12500, avgTime: 180, errors: 5 },
    { endpoint: '/api/surveys', calls: 8900, avgTime: 220, errors: 12 },
    { endpoint: '/api/solutions', calls: 6700, avgTime: 320, errors: 8 },
    { endpoint: '/api/users', calls: 4500, avgTime: 150, errors: 3 }
  ],
  
  // System health
  systemHealth: [
    { component: 'Database', status: 'Healthy', uptime: 99.9, responseTime: 45 },
    { component: 'API Gateway', status: 'Healthy', uptime: 99.8, responseTime: 120 },
    { component: 'Cache Layer', status: 'Warning', uptime: 98.5, responseTime: 25 },
    { component: 'File Storage', status: 'Healthy', uptime: 99.7, responseTime: 180 }
  ]
};

export default function IntegrationAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIntegrationData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockIntegrationData);
      } catch (err) {
        setError('Failed to load integration data');
        console.error('Error fetching integration data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrationData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading integration analytics: {error}</p>
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
              title="API Calls"
              value={analyticsData?.apiCalls?.toLocaleString() || '0'}
              trend={analyticsData?.apiCallsTrend || 0}
              trendLabel="vs last period"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Response Time"
              value={`${analyticsData?.avgResponseTime || 0}ms`}
              trend={analyticsData?.avgResponseTimeTrend || 0}
              trendLabel="vs last period"
              icon={<Clock className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="System Uptime"
              value={`${analyticsData?.uptime || 0}%`}
              trend={analyticsData?.uptimeTrend || 0}
              trendLabel="vs last period"
              icon={<Server className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Error Rate"
              value={`${analyticsData?.errorRate || 0}%`}
              trend={analyticsData?.errorRateTrend || 0}
              trendLabel="vs last period"
              icon={<AlertCircle className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* API Endpoints & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* API Endpoints */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              API Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.apiEndpoints?.map((endpoint) => (
                  <div key={endpoint.endpoint} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{endpoint.endpoint}</span>
                      <Badge variant="outline">{endpoint.calls.toLocaleString()} calls</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Avg Time: {endpoint.avgTime}ms</div>
                      <div>Errors: {endpoint.errors}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.systemHealth?.map((component) => (
                  <div key={component.component} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{component.component}</span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${
                            component.status === 'Healthy' 
                              ? 'text-green-700 border-green-300' 
                              : 'text-yellow-700 border-yellow-300'
                          }`}
                        >
                          {component.status}
                        </Badge>
                        <span className="text-muted-foreground">{component.uptime}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          component.status === 'Healthy' ? 'bg-green-600' : 'bg-yellow-600'
                        }`}
                        style={{ width: `${component.uptime}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Response time: {component.responseTime}ms
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
