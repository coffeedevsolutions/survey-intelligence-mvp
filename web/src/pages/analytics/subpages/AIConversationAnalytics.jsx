/**
 * AI & Conversation Intelligence Analytics Page
 * AI confidence, conversation patterns, and intelligence metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Brain, 
  Zap, 
  MessageSquare, 
  TrendingUp, 
  Target,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';
import FavoriteButton from '../../../components/analytics/FavoriteButton.jsx';

// Mock data for AI conversation analytics
const mockAIConversationData = {
  avgConfidence: 87.3,
  avgConfidenceTrend: 2.1,
  totalConversations: 1247,
  totalConversationsTrend: 15,
  avgTurnsPerSession: 4.2,
  avgTurnsPerSessionTrend: -0.8,
  aiInsightsGenerated: 3421,
  aiInsightsGeneratedTrend: 23,
  
  // AI confidence distribution
  confidenceDistribution: [
    { range: '90-100%', percentage: 45, count: 561 },
    { range: '80-89%', percentage: 35, count: 436 },
    { range: '70-79%', percentage: 15, count: 187 },
    { range: '60-69%', percentage: 5, count: 63 }
  ],
  
  // Conversation patterns
  conversationPatterns: [
    { pattern: 'Question-Answer', frequency: 65, avgTurns: 2.1 },
    { pattern: 'Clarification Loop', frequency: 20, avgTurns: 5.3 },
    { pattern: 'Deep Dive', frequency: 10, avgTurns: 8.7 },
    { pattern: 'Quick Resolution', frequency: 5, avgTurns: 1.2 }
  ],
  
  // AI performance metrics
  aiPerformance: [
    {
      metric: 'Solution Accuracy',
      value: 92,
      trend: 1.2,
      description: 'Percentage of solutions that meet requirements'
    },
    {
      metric: 'Response Relevance',
      value: 89,
      trend: 0.8,
      description: 'How well AI responses address user questions'
    },
    {
      metric: 'Context Retention',
      value: 85,
      trend: 2.1,
      description: 'Ability to maintain context across conversation'
    },
    {
      metric: 'Suggestion Quality',
      value: 88,
      trend: 1.5,
      description: 'Quality of AI-generated recommendations'
    }
  ],
  
  // Top AI insights
  topInsights: [
    {
      insight: 'Users prefer shorter, more direct questions',
      impact: 'High',
      confidence: 94,
      category: 'UX Optimization'
    },
    {
      insight: 'Technical questions have higher drop-off rates',
      impact: 'Medium',
      confidence: 87,
      category: 'Content Strategy'
    },
    {
      insight: 'Follow-up questions increase completion by 23%',
      impact: 'High',
      confidence: 91,
      category: 'Engagement'
    }
  ]
};

export default function AIConversationAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAIConversationData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockAIConversationData);
      } catch (err) {
        setError('Failed to load AI conversation data');
        console.error('Error fetching AI conversation data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAIConversationData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading AI conversation analytics: {error}</p>
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
          <h2 className="text-2xl font-bold text-gray-900">AI & Conversation Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">AI confidence, conversation patterns, and intelligence metrics</p>
        </div>
        <FavoriteButton
          pageName="ai-conversation"
          pageTitle="AI & Conversation Analytics"
          pageDescription="AI confidence, conversation patterns, and intelligence metrics"
          pageIcon="Brain"
          pageCategory="ai"
          className="p-2 hover:bg-gray-100 rounded-lg"
        />
      </div>

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
              title="Avg AI Confidence"
              value={`${analyticsData?.avgConfidence || 0}%`}
              trend={analyticsData?.avgConfidenceTrend || 0}
              trendLabel="vs last period"
              icon={<Brain className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Total Conversations"
              value={analyticsData?.totalConversations?.toLocaleString() || '0'}
              trend={analyticsData?.totalConversationsTrend || 0}
              trendLabel="vs last period"
              icon={<MessageSquare className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Turns/Session"
              value={`${analyticsData?.avgTurnsPerSession || 0}`}
              trend={analyticsData?.avgTurnsPerSessionTrend || 0}
              trendLabel="vs last period"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="AI Insights Generated"
              value={analyticsData?.aiInsightsGenerated?.toLocaleString() || '0'}
              trend={analyticsData?.aiInsightsGeneratedTrend || 0}
              trendLabel="vs last period"
              icon={<Zap className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* AI Confidence Distribution */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Confidence Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div className="space-y-4">
              {analyticsData?.confidenceDistribution?.map((item) => (
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

      {/* Conversation Patterns & AI Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Conversation Patterns */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.conversationPatterns?.map((pattern) => (
                  <div key={pattern.pattern} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{pattern.pattern}</span>
                      <Badge variant="outline">{pattern.frequency}%</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg {pattern.avgTurns} turns per session
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Performance Metrics */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.aiPerformance?.map((metric) => (
                  <div key={metric.metric} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{metric.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">{metric.value}%</span>
                        <span className="text-xs text-green-600">+{metric.trend}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{metric.description}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top AI Insights */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Top AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="space-y-4">
              {analyticsData?.topInsights?.map((insight, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-blue-900">"{insight.insight}"</h4>
                        <Badge 
                          variant="outline" 
                          className={`${
                            insight.impact === 'High' 
                              ? 'text-red-700 border-red-300 bg-red-50' 
                              : 'text-yellow-700 border-yellow-300 bg-yellow-50'
                          }`}
                        >
                          {insight.impact} Impact
                        </Badge>
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-blue-800">
                        <strong>Category:</strong> {insight.category}
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
