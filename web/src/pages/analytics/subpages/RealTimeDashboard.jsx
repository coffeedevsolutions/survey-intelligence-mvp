/**
 * Real-time & Operational Dashboard Page
 * Live activity feed, system monitoring, and operational metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Clock, 
  Activity, 
  Users, 
  AlertCircle,
  CheckCircle,
  Zap,
  TrendingUp,
  BarChart3
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for real-time analytics
const mockRealTimeData = {
  activeUsers: 47,
  activeUsersTrend: 8,
  currentSessions: 23,
  currentSessionsTrend: 3,
  systemLoad: 67,
  systemLoadTrend: -5,
  responseTime: 145,
  responseTimeTrend: -12,
  
  // Live activity feed
  liveActivity: [
    {
      user: 'john.doe@techcorp.com',
      action: 'Started new survey',
      timestamp: '2 minutes ago',
      type: 'survey'
    },
    {
      user: 'sarah.smith@innovate.com',
      action: 'Completed solution design',
      timestamp: '5 minutes ago',
      type: 'solution'
    },
    {
      user: 'mike.wilson@startup.com',
      action: 'Submitted brief for review',
      timestamp: '8 minutes ago',
      type: 'brief'
    }
  ],
  
  // System alerts
  systemAlerts: [
    {
      level: 'Warning',
      message: 'High memory usage on server-02',
      timestamp: '10 minutes ago',
      status: 'Active'
    },
    {
      level: 'Info',
      message: 'Scheduled maintenance completed',
      timestamp: '1 hour ago',
      status: 'Resolved'
    }
  ]
};

export default function RealTimeDashboard({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRealTimeData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockRealTimeData);
      } catch (err) {
        setError('Failed to load real-time data');
        console.error('Error fetching real-time data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealTimeData();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (analyticsData) {
        // Update active users randomly
        setAnalyticsData(prev => ({
          ...prev,
          activeUsers: prev.activeUsers + Math.floor(Math.random() * 3) - 1
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [timeRange, analyticsData]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading real-time dashboard: {error}</p>
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
              title="Active Users"
              value={analyticsData?.activeUsers?.toString() || '0'}
              trend={analyticsData?.activeUsersTrend || 0}
              trendLabel="vs last period"
              icon={<Users className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Current Sessions"
              value={analyticsData?.currentSessions?.toString() || '0'}
              trend={analyticsData?.currentSessionsTrend || 0}
              trendLabel="vs last period"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="System Load"
              value={`${analyticsData?.systemLoad || 0}%`}
              trend={analyticsData?.systemLoadTrend || 0}
              trendLabel="vs last period"
              icon={<Zap className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Response Time"
              value={`${analyticsData?.responseTime || 0}ms`}
              trend={analyticsData?.responseTimeTrend || 0}
              trendLabel="vs last period"
              icon={<Clock className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* Live Activity Feed & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Live Activity Feed */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.liveActivity?.map((activity, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{activity.user}</span>
                      <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{activity.action}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.systemAlerts?.map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    alert.level === 'Warning' 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge 
                        variant="outline" 
                        className={`${
                          alert.level === 'Warning' 
                            ? 'text-yellow-700 border-yellow-300' 
                            : 'text-blue-700 border-blue-300'
                        }`}
                      >
                        {alert.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                    </div>
                    <div className={`text-sm ${
                      alert.level === 'Warning' ? 'text-yellow-800' : 'text-blue-800'
                    }`}>
                      {alert.message}
                    </div>
                    <div className={`text-xs mt-1 ${
                      alert.status === 'Active' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      Status: {alert.status}
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
