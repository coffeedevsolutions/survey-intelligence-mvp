/**
 * User Behavior & Engagement Analytics Page
 * Comprehensive user behavior analysis and engagement metrics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Clock, 
  Users, 
  RotateCcw, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';
import { useUserBehaviorAnalytics } from '../../../hooks/useUserBehaviorAnalytics.js';
import UserJourneySankey from '../components/UserJourneySankey.jsx';
import SessionDurationChart from '../components/SessionDurationChart.jsx';
import ResponseLengthChart from '../components/ResponseLengthChart.jsx';
import FavoriteButton from '../../../components/analytics/FavoriteButton.jsx';

export default function UserBehaviorAnalytics({ timeRange, customDateRange }) {
  const { data: analyticsData, loading, error } = useUserBehaviorAnalytics(timeRange, customDateRange);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading user behavior analytics: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Behavior Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Comprehensive user behavior analysis and engagement metrics</p>
        </div>
        <FavoriteButton
          pageName="user-behavior"
          pageTitle="User Behavior Analytics"
          pageDescription="Comprehensive user behavior analysis and engagement metrics"
          pageIcon="Users"
          pageCategory="user"
          className="p-2 hover:bg-gray-100 rounded-lg"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        {loading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Avg Session Duration"
              value={`${Math.round(analyticsData?.avgSessionDurationMinutes || 0)} min`}
              trend={0}
              trendLabel={`median: ${(analyticsData?.medianSessionDurationMinutes || 0).toFixed(1)} min`}
              icon={<Clock className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Return Users"
              value={`${analyticsData?.uniqueUsers || 0}`}
              trend={0}
              trendLabel={`${analyticsData?.totalUserEmails || 0} total users`}
              icon={<RotateCcw className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Response Length"
              value={`${Math.round(analyticsData?.avgResponseLength || 0)} chars`}
              trend={0}
              trendLabel={`median: ${Math.round(analyticsData?.medianResponseLength || 0)} chars`}
              icon={<FileText className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Completion Rate"
              value={`${analyticsData?.userJourneyFlow?.totalSessions > 0 
                ? Math.round((analyticsData?.userJourneyFlow?.completedSessions / analyticsData?.userJourneyFlow?.totalSessions) * 100) 
                : 0}%`}
              trend={0}
              trendLabel={`${analyticsData?.userJourneyFlow?.completedSessions || 0}/${analyticsData?.userJourneyFlow?.totalSessions || 0} completed`}
              icon={<Target className="w-5 h-5 text-success" />}
            />
            <KpiCard
              title="Avg Questions Asked"
              value={`${(analyticsData?.avgQuestionsAsked || 0).toFixed(2)}`}
              trend={0}
              trendLabel={`Completed: ${analyticsData?.userJourneyFlow?.completedSessions || 0}, Incomplete: ${analyticsData?.userJourneyFlow?.incompleteSessions || 0}`}
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
          </>
        )}
      </div>

      {/* User Journey Flow - Sankey Diagram */}
      <UserJourneySankey data={analyticsData} />

      {/* Session Duration & Response Length Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <SessionDurationChart data={analyticsData} loading={loading} />
        <ResponseLengthChart data={analyticsData} loading={loading} />
      </div>

      {/* Drop-off Analysis Table */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Drop-off Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Session ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Duration</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Questions Answered</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Abandoned After</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Question Text</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Time Spent</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Answer Length</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData?.dropoffAnalysis?.map((session, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono text-gray-600">
                        {session.sessionId?.substring(0, 12)}...
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {session.duration}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {session.questionsAnswered}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Q{session.abandonedAtQuestion}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 max-w-xs">
                        <div className="truncate" title={session.questionText}>
                          {session.questionText}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {session.timeSpent}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {session.lastAnswerLength} chars
                      </td>
                    </tr>
                  ))}
                  {(!analyticsData?.dropoffAnalysis || analyticsData.dropoffAnalysis.length === 0) && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-muted-foreground">
                        No abandoned sessions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
