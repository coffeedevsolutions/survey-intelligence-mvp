import React from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';

const WorkflowFunnel = ({ data }) => {
  // Prepare data for Plotly Sankey
  const nodes = [
    { label: 'Surveys Started', color: '#ef4444' },
    { label: 'Surveys Completed', color: '#f59e0b' },
    { label: 'Incomplete Surveys', color: '#9ca3af' },
    { label: 'Awaiting Prioritization', color: '#06b6d4' },
    { label: 'Prioritized', color: '#10b981' },
    { label: 'Needs Info', color: '#fbbf24' },
    { label: 'Rejected', color: '#dc2626' },
    { label: 'Solutions Generated', color: '#3b82f6' },
    { label: 'Exported to Jira', color: '#8b5cf6' }
  ];

  const allLinks = [
    { source: 0, target: 1, value: data?.total_briefs || 0 },
    { source: 0, target: 2, value: (data?.total_sessions || 0) - (data?.total_briefs || 0) },
    { source: 1, target: 3, value: data?.awaiting_review || 0 },
    { source: 1, target: 4, value: data?.prioritized || 0 },
    { source: 1, target: 5, value: data?.needs_info || 0 },
    { source: 1, target: 6, value: data?.rejected || 0 },
    { source: 4, target: 7, value: data?.solutions_generated || 0 },
    { source: 7, target: 8, value: data?.jira_exported || 0 }
  ];

  // Filter out links with zero values
  const links = allLinks.filter(link => link.value > 0);

  const plotData = [{
    type: 'sankey',
    orientation: 'h',
    node: {
      pad: 15,
      thickness: 20,
      line: {
        color: 'transparent',
        width: 0
      },
      label: nodes.map(n => n.label),
      color: nodes.map(n => n.color),
      x: [0, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.75, 1],
      y: [0.5, 0.2, 0.8, 0.1, 0.3, 0.5, 0.7, 0.2, 0.2],
      labelposition: ['left', 'right', 'left', 'left', 'left', 'left', 'left', 'left', 'right']
    },
    link: {
      source: links.map(l => l.source),
      target: links.map(l => l.target),
      value: links.map(l => l.value),
      color: links.map(() => 'rgba(0,0,0,0.08)')
    }
  }];

  const layout = {

    font: { size: 12 },
    margin: { t: 40, b: 40, l: 20, r: 20 },
    height: 400,
    autosize: true,
    xaxis: { range: [0, 1.4] },
    yaxis: { range: [0, 1] },
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)'
  };

  const config = {
    displayModeBar: false,
    responsive: true
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Sankey Flow</CardTitle>
        <CardDescription>Track progression from surveys to Jira export</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Total Sessions: {data?.total_sessions || 0}
            </div>
          </div>
          
          {/* Plotly Sankey Diagram */}
          <div className="w-full">
            <Plot
              data={plotData}
              layout={layout}
              config={config}
              style={{ width: '100%', height: '400px' }}
            />
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* Section 1: Survey Completion */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data?.total_sessions > 0 
                  ? `${Math.round(((data?.total_briefs || 0) / data.total_sessions) * 100)}%`
                  : '0%'
                }
              </div>
              <div className="text-sm text-muted-foreground">Survey Completion</div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="text-sm text-gray-500">
                  {data?.total_sessions > 0 
                    ? `${Math.round((((data?.total_sessions || 0) - (data?.total_briefs || 0)) / data.total_sessions) * 100)}%`
                    : '0%'
                  }
                </div>
                <div className="text-xs text-muted-foreground">Incomplete</div>
              </div>
            </div>
            
            {/* Section 2: Prioritized */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data?.total_briefs > 0 
                  ? `${Math.round(((data?.prioritized || 0) / data.total_briefs) * 100)}%`
                  : '0%'
                }
              </div>
              <div className="text-sm text-muted-foreground">Prioritized</div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <div className="text-sm text-cyan-600">
                      {data?.total_briefs > 0 
                        ? `${Math.round(((data?.awaiting_review || 0) / data.total_briefs) * 100)}%`
                        : '0%'
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Awaiting</div>
                  </div>
                  <div>
                    <div className="text-sm text-yellow-600">
                      {data?.total_briefs > 0 
                        ? `${Math.round(((data?.needs_info || 0) / data.total_briefs) * 100)}%`
                        : '0%'
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Needs Info</div>
                  </div>
                  <div>
                    <div className="text-sm text-red-600">
                      {data?.total_briefs > 0 
                        ? `${Math.round(((data?.rejected || 0) / data.total_briefs) * 100)}%`
                        : '0%'
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Rejected</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Section 3: Solutions Generated */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data?.prioritized > 0 
                  ? `${Math.round(((data?.solutions_generated || 0) / data.prioritized) * 100)}%`
                  : '0%'
                }
              </div>
              <div className="text-sm text-muted-foreground">Solutions Generated</div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="text-sm text-gray-500">
                  {data?.prioritized > 0 
                    ? `${Math.round((((data?.prioritized || 0) - (data?.solutions_generated || 0)) / data.prioritized) * 100)}%`
                    : '0%'
                  }
                </div>
                <div className="text-xs text-muted-foreground">Awaiting Generation</div>
              </div>
            </div>
            
            {/* Section 4: Exported to Jira */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data?.solutions_generated > 0 
                  ? `${Math.round(((data?.jira_exported || 0) / data.solutions_generated) * 100)}%`
                  : '0%'
                }
              </div>
              <div className="text-sm text-muted-foreground">Exported to Jira</div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="text-sm text-gray-500">
                  {data?.solutions_generated > 0 
                    ? `${Math.round((((data?.solutions_generated || 0) - (data?.jira_exported || 0)) / data.solutions_generated) * 100)}%`
                    : '0%'
                  }
                </div>
                <div className="text-xs text-muted-foreground">Not Exported</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowFunnel;

