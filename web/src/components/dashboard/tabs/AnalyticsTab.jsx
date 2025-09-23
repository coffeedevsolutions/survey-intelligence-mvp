/**
 * Analytics Dashboard Tab
 * Comprehensive analytics and metrics visualization
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity, 
  Target, 
  Zap, 
  Download,
  RefreshCw,
  Calendar,
  Info,
  CheckCircle,
  Clock,
  AlertCircle
} from '../../ui/icons';

export function AnalyticsTab({ user }) {
  const [analytics, setAnalytics] = useState(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState(null);

  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, detailedRes] = await Promise.all([
        fetch(`/api/analytics/overview?timeRange=${timeRange}`, {
          credentials: 'include'
        }),
        fetch(`/api/analytics/detailed?timeRange=${timeRange}`, {
          credentials: 'include'
        })
      ]);

      if (overviewRes.ok && detailedRes.ok) {
        const overviewData = await overviewRes.json();
        const detailedData = await detailedRes.json();
        
        setAnalytics(overviewData);
        setDetailedAnalytics(detailedData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load analytics data</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const { 
    organizational = {}, 
    users = {}, 
    surveys = {}, 
    solutions = {}, 
    jira = {}, 
    performance = {} 
  } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights and metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={users?.total_users || 0}
              change={users?.new_users || 0}
              changeLabel="new this period"
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Solutions Created"
              value={solutions?.total_solutions || 0}
              change={`${solutions?.completed_solutions || 0} completed`}
              icon={Target}
              color="green"
            />
            <MetricCard
              title="Survey Completion"
              value={`${surveys?.completion_rate || 0}%`}
              change={`${surveys?.completed_sessions || 0}/${surveys?.total_sessions || 0} sessions`}
              icon={CheckCircle}
              color="purple"
            />
            <MetricCard
              title="Avg Complexity"
              value={solutions?.avg_complexity ? solutions.avg_complexity.toFixed(1) : '0'}
              change={`${solutions?.avg_duration_weeks || 0} weeks avg`}
              icon={Activity}
              color="orange"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Story Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Story Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detailedAnalytics?.storyTypeDistribution?.map((item, index) => (
                    <div key={item.story_type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getColorForIndex(index) }}
                        />
                        <span className="text-sm font-medium capitalize">
                          {item.story_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.count}</div>
                        <div className="text-xs text-gray-500">
                          {item.avg_story_points} pts avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Task Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Task Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detailedAnalytics?.taskTypeDistribution?.map((item, index) => (
                    <div key={item.task_type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getColorForIndex(index) }}
                        />
                        <span className="text-sm font-medium capitalize">
                          {item.task_type}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.count}</div>
                        <div className="text-xs text-gray-500">
                          {item.total_hours}h total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {performance?.brief_conversion_rate ? (performance.brief_conversion_rate * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Brief Conversion</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {performance?.solution_conversion_rate ? (performance.solution_conversion_rate * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Solution Conversion</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {performance?.avg_brief_generation_time ? Math.round(performance.avg_brief_generation_time / 60) : 0}m
                  </div>
                  <div className="text-sm text-gray-600">Avg Brief Time</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {solutions?.total_estimated_hours || 0}h
                  </div>
                  <div className="text-sm text-gray-600">Total Est. Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Users"
              value={users?.total_users || 0}
              change={`${((users?.verified_users || 0) / (users?.total_users || 1) * 100).toFixed(1)}% verified`}
              icon={Users}
            />
            <MetricCard
              title="New Users"
              value={users?.new_users || 0}
              change="this period"
              icon={TrendingUp}
            />
            <MetricCard
              title="MFA Enabled"
              value={`${((users?.mfa_users || 0) / (users?.total_users || 1) * 100).toFixed(1)}%`}
              change={`${users?.mfa_users || 0} users`}
              icon={CheckCircle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Admins</span>
                  <Badge variant="outline">{users?.admin_users || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Reviewers</span>
                  <Badge variant="outline">{users?.reviewer_users || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Members</span>
                  <Badge variant="outline">{users?.member_users || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Solutions"
              value={solutions?.total_solutions || 0}
              icon={Target}
            />
            <MetricCard
              title="Avg Epics"
              value={solutions?.avg_epics_per_solution || 0}
              icon={Activity}
            />
            <MetricCard
              title="Avg Stories"
              value={solutions?.avg_stories_per_epic || 0}
              icon={BarChart3}
            />
            <MetricCard
              title="Avg Tasks"
              value={solutions?.avg_tasks_per_story || 0}
              icon={Clock}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Solution Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <StatusBar label="Draft" value={solutions?.draft_solutions || 0} total={solutions?.total_solutions || 1} color="gray" />
                  <StatusBar label="Approved" value={solutions?.approved_solutions || 0} total={solutions?.total_solutions || 1} color="blue" />
                  <StatusBar label="In Progress" value={solutions?.in_progress_solutions || 0} total={solutions?.total_solutions || 1} color="yellow" />
                  <StatusBar label="Completed" value={solutions?.completed_solutions || 0} total={solutions?.total_solutions || 1} color="green" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Architecture Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {detailedAnalytics?.architectureDistribution?.map((item, index) => (
                    <div key={item.component_type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{item.component_type}</span>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Completion Rate"
              value={`${surveys?.completion_rate || 0}%`}
              icon={CheckCircle}
            />
            <MetricCard
              title="Avg AI Confidence"
              value={`${surveys?.avg_ai_confidence ? (surveys.avg_ai_confidence * 100).toFixed(1) : 0}%`}
              icon={Zap}
            />
            <MetricCard
              title="Avg Turns"
              value={surveys?.avg_conversation_turns || 0}
              icon={Activity}
            />
            <MetricCard
              title="Total Insights"
              value={surveys?.total_ai_insights || 0}
              icon={Info}
            />
          </div>

          {detailedAnalytics?.timeSeriesData && (
            <Card>
              <CardHeader>
                <CardTitle>Solution Creation Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end space-x-2">
                  {detailedAnalytics.timeSeriesData.slice(-14).map((point, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ 
                          height: `${Math.max(4, (point.solutions_created / Math.max(...detailedAnalytics.timeSeriesData.map(p => p.solutions_created))) * 200)}px` 
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {new Date(point.date).getDate()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Jira Connections"
              value={jira?.active_connections || 0}
              change={`${jira?.total_connections || 0} total`}
              icon={Activity}
            />
            <MetricCard
              title="Exported Issues"
              value={`${(jira?.exported_epics || 0) + (jira?.exported_stories || 0) + (jira?.exported_tasks || 0)}`}
              change="total issues"
              icon={Target}
            />
            <MetricCard
              title="Project Links"
              value={jira?.total_project_links || 0}
              icon={BarChart3}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Jira Export Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Epics</span>
                  <Badge variant="outline">{jira?.exported_epics || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Stories</span>
                  <Badge variant="outline">{jira?.exported_stories || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tasks</span>
                  <Badge variant="outline">{jira?.exported_tasks || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Solutions with Exports</span>
                  <Badge variant="outline">{jira?.solutions_with_jira_export || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, change, changeLabel, icon: Icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    gray: 'text-gray-600'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className="text-xs text-gray-500">
                {change} {changeLabel}
              </p>
            )}
          </div>
          {Icon && (
            <Icon className={`h-8 w-8 ${colorClasses[color]}`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBar({ label, value, total, color }) {
  const percentage = (value / total) * 100;
  const colorClasses = {
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div 
          className={`h-2 rounded-full ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function getColorForIndex(index) {
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
  return colors[index % colors.length];
}

export default AnalyticsTab;
