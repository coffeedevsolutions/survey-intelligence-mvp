/**
 * Workflow & Process Analytics Page
 * Process efficiency, bottlenecks, and workflow optimization
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Activity,
  Target,
  Zap
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for workflow analytics
const mockWorkflowData = {
  avgProcessTime: 4.2,
  avgProcessTimeTrend: -0.8,
  totalProcesses: 1247,
  totalProcessesTrend: 15,
  bottleneckCount: 3,
  bottleneckCountTrend: -1,
  efficiencyScore: 87.3,
  efficiencyScoreTrend: 2.1,
  
  // Process stages
  processStages: [
    { stage: 'Intake', avgTime: 0.5, efficiency: 95, bottlenecks: 0 },
    { stage: 'Analysis', avgTime: 1.2, efficiency: 88, bottlenecks: 1 },
    { stage: 'Solution Design', avgTime: 1.8, efficiency: 82, bottlenecks: 2 },
    { stage: 'Review', avgTime: 0.7, efficiency: 90, bottlenecks: 0 }
  ],
  
  // Bottleneck analysis
  bottlenecks: [
    {
      stage: 'Solution Design',
      impact: 'High',
      avgDelay: 2.3,
      frequency: 23,
      suggestion: 'Add more design templates'
    },
    {
      stage: 'Analysis',
      impact: 'Medium',
      avgDelay: 1.1,
      frequency: 15,
      suggestion: 'Automate initial analysis'
    }
  ]
};

export default function WorkflowAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkflowData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockWorkflowData);
      } catch (err) {
        setError('Failed to load workflow data');
        console.error('Error fetching workflow data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading workflow analytics: {error}</p>
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
              title="Avg Process Time"
              value={`${analyticsData?.avgProcessTime || 0} days`}
              trend={analyticsData?.avgProcessTimeTrend || 0}
              trendLabel="vs last period"
              icon={<Clock className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Total Processes"
              value={analyticsData?.totalProcesses?.toLocaleString() || '0'}
              trend={analyticsData?.totalProcessesTrend || 0}
              trendLabel="vs last period"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Bottlenecks"
              value={analyticsData?.bottleneckCount?.toString() || '0'}
              trend={analyticsData?.bottleneckCountTrend || 0}
              trendLabel="vs last period"
              icon={<AlertCircle className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Efficiency Score"
              value={`${analyticsData?.efficiencyScore || 0}%`}
              trend={analyticsData?.efficiencyScoreTrend || 0}
              trendLabel="vs last period"
              icon={<TrendingUp className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* Process Stages & Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Process Stages */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Process Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.processStages?.map((stage) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{stage.avgTime}d</span>
                        <Badge variant="outline">{stage.efficiency}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stage.efficiency}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottleneck Analysis */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Bottleneck Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.bottlenecks?.map((bottleneck) => (
                  <div key={bottleneck.stage} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-yellow-900">{bottleneck.stage}</span>
                      <Badge 
                        variant="outline" 
                        className={`${
                          bottleneck.impact === 'High' 
                            ? 'text-red-700 border-red-300' 
                            : 'text-yellow-700 border-yellow-300'
                        }`}
                      >
                        {bottleneck.impact} Impact
                      </Badge>
                    </div>
                    <div className="text-sm text-yellow-800 mb-2">
                      Avg delay: {bottleneck.avgDelay} days ({bottleneck.frequency} occurrences)
                    </div>
                    <div className="text-sm text-yellow-800">
                      <strong>Suggestion:</strong> {bottleneck.suggestion}
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
