/**
 * Organizational & Enterprise Analytics Page
 * Organization growth, team performance, and enterprise metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Building, 
  Users, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Activity,
  Target,
  BarChart3
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for organizational analytics
const mockOrganizationalData = {
  totalOrganizations: 24,
  totalOrganizationsTrend: 8,
  totalUsers: 1247,
  totalUsersTrend: 15,
  avgUsersPerOrg: 52,
  avgUsersPerOrgTrend: 2.1,
  activeOrganizations: 18,
  activeOrganizationsTrend: 3,
  
  // Organization size distribution
  orgSizeDistribution: [
    { range: '1-10 users', count: 8, percentage: 33 },
    { range: '11-50 users', count: 10, percentage: 42 },
    { range: '51-100 users', count: 4, percentage: 17 },
    { range: '100+ users', count: 2, percentage: 8 }
  ],
  
  // Top performing organizations
  topOrganizations: [
    {
      name: 'TechCorp Inc.',
      users: 156,
      solutions: 23,
      completionRate: 89,
      growth: 'High'
    },
    {
      name: 'Innovation Labs',
      users: 98,
      solutions: 18,
      completionRate: 92,
      growth: 'High'
    },
    {
      name: 'StartupXYZ',
      users: 45,
      solutions: 12,
      completionRate: 85,
      growth: 'Medium'
    }
  ]
};

export default function OrganizationalAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizationalData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockOrganizationalData);
      } catch (err) {
        setError('Failed to load organizational data');
        console.error('Error fetching organizational data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationalData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading organizational analytics: {error}</p>
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
              title="Total Organizations"
              value={analyticsData?.totalOrganizations?.toString() || '0'}
              trend={analyticsData?.totalOrganizationsTrend || 0}
              trendLabel="vs last period"
              icon={<Building className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Total Users"
              value={analyticsData?.totalUsers?.toLocaleString() || '0'}
              trend={analyticsData?.totalUsersTrend || 0}
              trendLabel="vs last period"
              icon={<Users className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Users/Org"
              value={`${analyticsData?.avgUsersPerOrg || 0}`}
              trend={analyticsData?.avgUsersPerOrgTrend || 0}
              trendLabel="vs last period"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Active Organizations"
              value={analyticsData?.activeOrganizations?.toString() || '0'}
              trend={analyticsData?.activeOrganizationsTrend || 0}
              trendLabel="vs last period"
              icon={<TrendingUp className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* Organization Size Distribution & Top Organizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Organization Size Distribution */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Organization Size Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.orgSizeDistribution?.map((item) => (
                  <div key={item.range} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.range}</span>
                      <span className="text-muted-foreground">{item.percentage}% ({item.count})</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Organizations */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.topOrganizations?.map((org) => (
                  <div key={org.name} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{org.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`${
                          org.growth === 'High' 
                            ? 'text-green-700 border-green-300' 
                            : 'text-yellow-700 border-yellow-300'
                        }`}
                      >
                        {org.growth} Growth
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Users: {org.users}</div>
                      <div>Solutions: {org.solutions}</div>
                      <div>Completion: {org.completionRate}%</div>
                      <div>Growth: {org.growth}</div>
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
