import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const IntakeVolumeChart = ({ data, timeRange }) => {
  const [hiddenCampaigns, setHiddenCampaigns] = useState(new Set());

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

  const intakeVolumeData = transformIntakeVolumeData(data);

  return (
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
  );
};

export default IntakeVolumeChart;
