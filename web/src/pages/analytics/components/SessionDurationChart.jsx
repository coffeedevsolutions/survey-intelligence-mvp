/**
 * Session Duration Distribution Chart using Recharts
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Clock } from 'lucide-react';

const SessionDurationChart = ({ data, loading }) => {
  // Transform data for Recharts
  const chartData = data?.durationDistribution?.map(item => ({
    range: item.range,
    count: item.count,
    percentage: item.percentage,
    fill: '#3b82f6' // Blue color
  })) || [];

  // Color scheme for different ranges
  const getBarColor = (range) => {
    switch (range) {
      case '0-5 min': return '#10b981'; // Green
      case '5-10 min': return '#3b82f6'; // Blue
      case '10-15 min': return '#f59e0b'; // Amber
      case '15-30 min': return '#f97316'; // Orange
      case '30+ min': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Sessions: <span className="font-semibold">{data.count}</span>
          </p>
          <p className="text-gray-600">
            Percentage: <span className="font-semibold">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Duration Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Duration Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No session duration data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Session Duration Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Sessions', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.range)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-700">
              {chartData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <div className="text-blue-600">Total Sessions</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-semibold text-green-700">
              {chartData.find(item => item.range === '0-5 min')?.percentage || 0}%
            </div>
            <div className="text-green-600">Quick Sessions (0-5 min)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionDurationChart;
