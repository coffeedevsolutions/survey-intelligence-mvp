import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const StatusDistributionChart = ({ data }) => {
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

  const statusData = transformStatusData(data);

  return (
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
  );
};

export default StatusDistributionChart;
