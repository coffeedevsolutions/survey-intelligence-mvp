/**
 * Predictive & Advanced Analytics Page
 * ML predictions, forecasting, and advanced insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/skeleton.jsx';
import { 
  Zap, 
  TrendingUp, 
  Brain, 
  AlertCircle,
  CheckCircle,
  Activity,
  Target,
  BarChart3
} from 'lucide-react';

// Import dashboard components for consistency
import { KpiCard } from '../../dashboard/components/KpiCard.jsx';

// Mock data for predictive analytics
const mockPredictiveData = {
  predictionAccuracy: 87.3,
  predictionAccuracyTrend: 2.1,
  totalPredictions: 1247,
  totalPredictionsTrend: 15,
  avgConfidence: 89.2,
  avgConfidenceTrend: 1.8,
  modelPerformance: 92.1,
  modelPerformanceTrend: 0.8,
  
  // Predictions by category
  predictionsByCategory: [
    { category: 'User Behavior', accuracy: 91, confidence: 89, predictions: 456 },
    { category: 'Solution Success', accuracy: 85, confidence: 87, predictions: 234 },
    { category: 'Resource Needs', accuracy: 88, confidence: 92, predictions: 189 },
    { category: 'Timeline Estimates', accuracy: 84, confidence: 85, predictions: 156 }
  ],
  
  // Future forecasts
  forecasts: [
    {
      metric: 'User Growth',
      current: 1247,
      predicted: 1456,
      confidence: 89,
      timeframe: 'Next 30 days'
    },
    {
      metric: 'Solution Completion',
      current: 78,
      predicted: 82,
      confidence: 87,
      timeframe: 'Next 30 days'
    }
  ]
};

export default function PredictiveAnalytics({ timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPredictiveData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockPredictiveData);
      } catch (err) {
        setError('Failed to load predictive data');
        console.error('Error fetching predictive data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictiveData();
  }, [timeRange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error loading predictive analytics: {error}</p>
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
              title="Prediction Accuracy"
              value={`${analyticsData?.predictionAccuracy || 0}%`}
              trend={analyticsData?.predictionAccuracyTrend || 0}
              trendLabel="vs last period"
              icon={<Zap className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Total Predictions"
              value={analyticsData?.totalPredictions?.toLocaleString() || '0'}
              trend={analyticsData?.totalPredictionsTrend || 0}
              trendLabel="vs last period"
              icon={<Brain className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Avg Confidence"
              value={`${analyticsData?.avgConfidence || 0}%`}
              trend={analyticsData?.avgConfidenceTrend || 0}
              trendLabel="vs last period"
              icon={<Target className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Model Performance"
              value={`${analyticsData?.modelPerformance || 0}%`}
              trend={analyticsData?.modelPerformanceTrend || 0}
              trendLabel="vs last period"
              icon={<TrendingUp className="w-5 h-5 text-success" />}
            />
          </>
        )}
      </div>

      {/* Predictions by Category & Forecasts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Predictions by Category */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Predictions by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.predictionsByCategory?.map((category) => (
                  <div key={category.category} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{category.category}</span>
                      <Badge variant="outline">{category.predictions} predictions</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Accuracy: {category.accuracy}%</div>
                      <div>Confidence: {category.confidence}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Forecasts */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Future Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-4">
                {analyticsData?.forecasts?.map((forecast) => (
                  <div key={forecast.metric} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-900">{forecast.metric}</span>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {forecast.confidence}% confidence
                      </Badge>
                    </div>
                    <div className="text-sm text-blue-800 mb-1">
                      Current: {forecast.current} → Predicted: {forecast.predicted}
                    </div>
                    <div className="text-xs text-blue-700">
                      {forecast.timeframe}
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
