import React from 'react';
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

// Mock data - these will be replaced with actual data from the database
const intakeVolumeData = [
  { month: "Apr", Construction: 12, Utilities: 8, Healthcare: 15 },
  { month: "May", Construction: 18, Utilities: 12, Healthcare: 22 },
  { month: "Jun", Construction: 15, Utilities: 10, Healthcare: 18 },
  { month: "Jul", Construction: 25, Utilities: 15, Healthcare: 28 },
  { month: "Aug", Construction: 22, Utilities: 18, Healthcare: 25 },
  { month: "Sep", Construction: 28, Utilities: 22, Healthcare: 32 },
  { month: "Oct", Construction: 32, Utilities: 25, Healthcare: 35 },
];

const categoryData = [
  { category: "Construction", count: 152 },
  { category: "Utilities", count: 110 },
  { category: "Healthcare", count: 175 },
  { category: "Manufacturing", count: 89 },
  { category: "Finance", count: 67 },
];

const statusData = [
  { name: "New", value: 45, color: "#00D1FF" },
  { name: "In Review", value: 38, color: "#6E00FF" },
  { name: "Needs Info", value: 12, color: "#f59e0b" },
  { name: "Approved", value: 82, color: "#10b981" },
  { name: "Rejected", value: 8, color: "#ef4444" },
];

const heatmapData = [
  { day: "Mon", "9AM": 5, "10AM": 12, "11AM": 18, "12PM": 8, "1PM": 6, "2PM": 15, "3PM": 22, "4PM": 18, "5PM": 8 },
  { day: "Tue", "9AM": 8, "10AM": 15, "11AM": 22, "12PM": 10, "1PM": 8, "2PM": 18, "3PM": 25, "4PM": 20, "5PM": 10 },
  { day: "Wed", "9AM": 6, "10AM": 18, "11AM": 25, "12PM": 12, "1PM": 10, "2PM": 22, "3PM": 28, "4PM": 22, "5PM": 12 },
  { day: "Thu", "9AM": 10, "10AM": 20, "11AM": 28, "12PM": 15, "1PM": 12, "2PM": 25, "3PM": 30, "4PM": 25, "5PM": 15 },
  { day: "Fri", "9AM": 8, "10AM": 16, "11AM": 20, "12PM": 10, "1PM": 8, "2PM": 18, "3PM": 22, "4PM": 18, "5PM": 8 },
];

const campaignsData = [
  { name: "Q4 Infrastructure Push", owner: "Sarah Chen", requests: 45, conversion: "87%", status: "Active" },
  { name: "Healthcare IT Modernization", owner: "Mike Rodriguez", requests: 38, conversion: "92%", status: "Active" },
  { name: "Utilities Upgrade 2024", owner: "Emma Thompson", requests: 32, conversion: "78%", status: "Active" },
  { name: "Manufacturing Efficiency", owner: "James Wilson", requests: 28, conversion: "85%", status: "Paused" },
];

const recentDocsData = [
  { title: "New Facility WiFi Network Upgrade", surveyRun: "SR-2024-1042", lastEdit: "2 hours ago", status: "Ready to Send" },
  { title: "EHR Integration Project Brief", surveyRun: "SR-2024-1041", lastEdit: "5 hours ago", status: "In Review" },
  { title: "SCADA Dashboard Enhancement", surveyRun: "SR-2024-1038", lastEdit: "1 day ago", status: "Sent to Jira" },
  { title: "Financial Reporting Portal", surveyRun: "SR-2024-1035", lastEdit: "2 days ago", status: "Sent to Jira" },
];

export default function Dashboard({ stats }) {
  // Calculate KPIs from actual data when available
  const newRequests = stats?.totalSurveys || 45;
  const inReview = stats?.activeSurveys || 38;
  const approved = stats?.briefsGenerated || 82;
  const avgTimeToBrief = "3.2d"; // This would need to be calculated from actual data
  const briefToJiraConversion = "94%"; // This would need to be calculated from actual data
  const predictedImpact = "High"; // This would need to be calculated from actual data

        return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intake & Delivery Overview</h1>
          <p className="text-muted-foreground">Monitor your project intake pipeline and delivery metrics</p>
        </div>
        <Select defaultValue="30days">
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="New Requests"
          value={newRequests.toString()}
          trend={12}
          trendLabel="vs last month"
          icon={<FileInput className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="In Review"
          value={inReview.toString()}
          trend={-5}
          trendLabel="vs last month"
          icon={<FileCheck className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="Approved"
          value={approved.toString()}
          trend={18}
          trendLabel="vs last month"
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
        />
        <KpiCard
          title="Avg Time to Brief"
          value={avgTimeToBrief}
          trend={-15}
          trendLabel="improvement"
          icon={<Clock className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="Brief→Jira"
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
            <CardTitle>Intake Volume Over Time</CardTitle>
            <CardDescription>Requests by department (last 7 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={intakeVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Construction" stroke="#6E00FF" strokeWidth={2} />
                <Line type="monotone" dataKey="Utilities" stroke="#00D1FF" strokeWidth={2} />
                <Line type="monotone" dataKey="Healthcare" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requests by Category</CardTitle>
            <CardDescription>Distribution across business segments</CardDescription>
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
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
            <div className="space-y-2">
              {heatmapData.map((row) => (
                <div key={row.day} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-muted-foreground">{row.day}</span>
                  <div className="flex-1 flex gap-1">
                    {Object.entries(row).filter(([key]) => key !== "day").map(([hour, value]) => {
                      const intensity = value / 30;
                      return (
                        <div
                          key={hour}
                          className="flex-1 h-8 rounded"
                          style={{
                            backgroundColor: `rgba(110, 0, 255, ${intensity})`,
                          }}
                          title={`${hour}: ${value} submissions`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <span>9AM</span>
                <span>1PM</span>
                <span>5PM</span>
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
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsData.map((campaign) => (
                  <TableRow key={campaign.name}>
                    <TableCell>{campaign.name}</TableCell>
                    <TableCell className="text-muted-foreground">{campaign.owner}</TableCell>
                    <TableCell className="text-right">{campaign.requests}</TableCell>
                    <TableCell className="text-right">{campaign.conversion}</TableCell>
                    <TableCell>
                      <Badge variant={campaign.status === "Active" ? "default" : "secondary"}>
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
                  <TableHead>Survey Run</TableHead>
                  <TableHead>Last Edit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDocsData.map((doc) => (
                  <TableRow key={doc.surveyRun}>
                    <TableCell className="max-w-[200px] truncate">{doc.title}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.surveyRun}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.lastEdit}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          doc.status === "Sent to Jira"
                            ? "default"
                            : doc.status === "Ready to Send"
                            ? "secondary"
                            : "outline"
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