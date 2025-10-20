import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';

const SubmissionPatternsChart = ({ data }) => {
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

  const heatmapData = transformHeatmapData(data);

  return (
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
  );
};

export default SubmissionPatternsChart;
