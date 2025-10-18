import React, { useState } from 'react';
import { KpiCard } from './components/KpiCard';
import {
  FileInput,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useDashboardAnalytics } from '../../hooks/useDashboardAnalytics';

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [hiddenCampaigns, setHiddenCampaigns] = useState(new Set());
  const { data: analyticsData, loading, error } = useDashboardAnalytics(timeRange);

  // Transform data for charts
  const transformIntakeVolumeData = (data) => {
    if (!data?.intakeVolumeOverTime) return [];
    
    // Group by date and create campaign series
    const grouped = {};
    const campaignNames = new Set();
    
    data.intakeVolumeOverTime.forEach(item => {
      const date = new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const campaignName = item.campaign_name || 'No Campaign';
      campaignNames.add(campaignName);
      
      if (!grouped[date]) {
        grouped[date] = { date, totalIntake: 0 };
      }
      grouped[date][campaignName] = parseInt(item.requests);
      grouped[date].totalIntake += parseInt(item.requests);
    });
    
    // Ensure all campaigns have values for all dates (fill with 0 if missing)
    const dates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    const result = dates.map(date => {
      const row = { date, totalIntake: grouped[date].totalIntake };
      campaignNames.forEach(campaign => {
        row[campaign] = grouped[date][campaign] || 0;
      });
      return row;
    });
    
    return result;
  };

  // Handle campaign visibility toggle
  const toggleCampaignVisibility = (campaignName) => {
    setHiddenCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignName)) {
        newSet.delete(campaignName);
      } else {
        newSet.add(campaignName);
      }
      return newSet;
    });
  };


  const transformCategoryData = (data) => {
    if (!data?.requestsByCategory) return [];
    return data.requestsByCategory.map(item => ({
      category: item.campaign_name || 'Other',
      count: item.count
    }));
  };

  const transformStatusData = (data) => {
    if (!data?.statusDistribution) return [];
    
    const colors = {
      'Incomplete survey': '#00D1FF',
      'Awaiting Review': '#6E00FF', 
      'Needs Info': '#FF6B35',
      'Prioritized': '#10B981',
      'Rejected': '#EF4444'
    };
    
    // Define the desired order
    const statusOrder = ['Incomplete survey', 'Awaiting Review', 'Needs Info', 'Prioritized', 'Rejected'];
    
    // Transform and sort the data
    const transformedData = data.statusDistribution.map(item => ({
      name: item.status,
      value: parseInt(item.count) || 0,
      color: colors[item.status] || '#6b7280'
    }));
    
    // Sort by the defined order
    return transformedData.sort((a, b) => {
      const indexA = statusOrder.indexOf(a.name);
      const indexB = statusOrder.indexOf(b.name);
      return indexA - indexB;
    });
  };

  const transformHeatmapData = (data) => {
    if (!data?.submissionPatterns) return [];
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = [
      '12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
      '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
    ];
    
    const heatmap = {};
    days.forEach((day) => {
      heatmap[day] = { day };
      hours.forEach((hour) => {
        heatmap[day][hour] = 0;
      });
    });
    
    // Fill in actual data
    data.submissionPatterns.forEach(item => {
      const dayName = days[item.day_of_week];
      const hourName = hours[item.hour_of_day] || `${item.hour_of_day}AM`;
      if (heatmap[dayName] && heatmap[dayName][hourName] !== undefined) {
        heatmap[dayName][hourName] = item.submissions;
      }
    });
    
    return Object.values(heatmap);
  };

  // Calculate KPIs from real data
  const newRequests = analyticsData?.new_requests || 0;
  const awaitingReview = analyticsData?.awaiting_review || 0;
  const prioritized = analyticsData?.prioritized || 0;
  const avgTimeToBrief = analyticsData?.avg_time_to_backlog_days 
    ? `${analyticsData.avg_time_to_backlog_days.toFixed(1)}d` 
    : "N/A";
  const briefToJiraConversion = analyticsData?.brief_to_backlog_conversion 
    ? `${analyticsData.brief_to_backlog_conversion}%` 
    : "0%";
  const predictedImpact = prioritized > 10 ? "High" : prioritized > 5 ? "Medium" : "Low";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading dashboard: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const intakeVolumeData = transformIntakeVolumeData(analyticsData);
  const categoryData = transformCategoryData(analyticsData);
  const statusData = transformStatusData(analyticsData);
  const heatmapData = transformHeatmapData(analyticsData);
  const campaignsData = analyticsData?.topActiveCampaigns || [];
  const recentDocsData = analyticsData?.recentlyGeneratedDocuments || [];

        return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intake & Delivery Overview</h1>
          <p className="text-muted-foreground">Monitor your project intake pipeline and delivery metrics</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="New Requests"
          value={newRequests.toString()}
          trend={12}
          trendLabel="vs last period"
          icon={<FileInput className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="Awaiting Review"
          value={awaitingReview.toString()}
          trend={-5}
          trendLabel="vs last period"
          icon={<FileCheck className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="Prioritized"
          value={prioritized.toString()}
          trend={18}
          trendLabel="vs last period"
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
        />
        <KpiCard
          title="Avg Time to Backlog"
          value={avgTimeToBrief}
          trend={-15}
          trendLabel="improvement"
          icon={<Clock className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="Brief→Backlog"
          value={briefToJiraConversion}
          trend={8}
          trendLabel="conversion"
          icon={<ArrowRightLeft className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="Predicted Impact"
          value={predictedImpact}
          variant="gradient"
          icon={<TrendingUp className="w-5 h-5 text-white" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
            <CardTitle>Intake Volume Over Time</CardTitle>
                <CardDescription>Survey responses by campaign ({timeRange})</CardDescription>
              </div>
              {hiddenCampaigns.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setHiddenCampaigns(new Set())}
                  className="text-xs"
                >
                  Activate All ({hiddenCampaigns.size} inactive)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={intakeVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  tickFormatter={(value) => {
                    // Format date based on time range
                    const date = new Date(value);
                    if (timeRange === '7d') {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } else if (timeRange === '30d') {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } else if (timeRange === '90d') {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }
                  }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#64748b" 
                  label={{ value: 'Campaign Responses', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#64748b"
                  label={{ value: 'Total Intake', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    });
                  }}
                  wrapperStyle={{ zIndex: 1000 }}
                  contentStyle={{ zIndex: 1000 }}
                />
                <Legend 
                  onClick={(e) => {
                    const campaignName = e.value;
                    if (campaignName !== 'Total Intake') {
                      toggleCampaignVisibility(campaignName);
                    }
                  }}
                  wrapperStyle={{ cursor: 'pointer' }}
                />
                
                {/* Background bar for total intake */}
                <Bar 
                  yAxisId="right"
                  dataKey="totalIntake" 
                  fill="rgba(110, 0, 255, 0.1)" 
                  stroke="rgba(110, 0, 255, 0.2)"
                  strokeWidth={1}
                  name="Total Intake"
                />
                
                {/* Campaign lines */}
                {intakeVolumeData.length > 0 && Object.keys(intakeVolumeData[0]).filter(key => key !== 'date' && key !== 'totalIntake').map((campaign, index) => {
                   const colors = [
                     // Primary brand colors
                     '#6E00FF', '#00D1FF',
                     // High contrast distinct colors
                     '#FF6B35', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
                     // Red spectrum
                     '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
                     // Green spectrum  
                     '#059669', '#047857', '#065F46', '#064E3B',
                     // Purple spectrum
                     '#7C3AED', '#9333EA', '#6D28D9', '#5B21B6', '#4C1D95', '#581C87',
                     // Orange spectrum
                     '#EA580C', '#9A3412', '#7C2D12', '#5C1A0A',
                     // Blue spectrum
                     '#0891B2', '#0E7490', '#155E75', '#164E63', '#0F4F4F', '#1E40AF',
                     // Yellow/Gold spectrum
                     '#CA8A04', '#A16207', '#854D0E', '#713F12', '#B45309', '#D97706',
                     // Pink/Magenta spectrum
                     '#BE185D', '#9D174D', '#831843', '#701A75',
                     // Teal spectrum
                     '#0D9488', '#0F766E', '#115E59',
                     // Additional distinct colors
                     '#7E22CE', '#6B21A8', '#374151', '#C2410C', '#9A3412'
                   ];
                  const isHidden = hiddenCampaigns.has(campaign);
                  
                  return (
                    <Line 
                      key={campaign}
                      yAxisId="left"
                      type="monotone" 
                      dataKey={campaign} 
                      stroke={isHidden ? '#9ca3af' : colors[index % colors.length]} 
                      strokeWidth={isHidden ? 1 : 2}
                      dot={{ r: isHidden ? 2 : 4, fill: isHidden ? '#9ca3af' : colors[index % colors.length] }}
                      activeDot={{ r: isHidden ? 3 : 6 }}
                      strokeOpacity={isHidden ? 0.4 : 1}
                      connectNulls={false}
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requests by Campaign</CardTitle>
            <CardDescription>Distribution across campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6E00FF" />
                    <stop offset="100%" stopColor="#00D1FF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Current state of all requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Patterns</CardTitle>
            <CardDescription>Activity heatmap by weekday and hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {heatmapData.map((row) => (
                <div key={row.day} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-muted-foreground">{row.day}</span>
                  <div className="flex-1 flex gap-0.5">
                    {Object.entries(row).filter(([key]) => key !== "day").map(([hour, value]) => {
                      const intensity = Math.min(value / 10, 1); // Adjust intensity scaling
                      return (
                        <div
                          key={hour}
                          className="flex-1 h-6 rounded-sm relative group cursor-pointer"
                          style={{
                            backgroundColor: `rgba(110, 0, 255, ${intensity})`,
                          }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            <div className="text-center">
                              <div className="font-medium">{row.day}</div>
                              <div>{hour}</div>
                              <div className="text-blue-300">{value} submissions</div>
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 ml-14">
                <span>12AM</span>
                <span>6AM</span>
                <span>12PM</span>
                <span>6PM</span>
                <span>11PM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Active Campaigns</CardTitle>
            <CardDescription>Highest performing intake campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsData.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>{campaign.name}</TableCell>
                    <TableCell className="text-muted-foreground">{campaign.purpose || 'N/A'}</TableCell>
                    <TableCell className="text-right">{campaign.requests}</TableCell>
                    <TableCell className="text-right">{campaign.conversion_rate}%</TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          campaign.status === "Active"
                            ? "bg-green-100 !text-green-900 border-green-200"
                            : "bg-gray-100 !text-gray-800 border-gray-200"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Generated Documents</CardTitle>
            <CardDescription>Latest project briefs from surveys</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDocsData.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-[200px] truncate">{doc.title || 'Untitled Brief'}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.campaign_name || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          doc.status === "Ready for solutioning"
                            ? "bg-green-100 !text-green-900 border-green-200"
                            : doc.status === "Awaiting Review"
                            ? "bg-yellow-100 !text-yellow-800 border-yellow-200"
                            : doc.status === "Sent to Jira"
                            ? "bg-blue-100 !text-blue-800 border-blue-200"
                            : "bg-gray-100 !text-gray-800 border-gray-200"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}