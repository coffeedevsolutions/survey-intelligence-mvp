import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  FileText, 
  Target, 
  Calendar, 
  TrendingUp, 
  Download, 
  Eye, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Users
} from '../ui/icons';

/**
 * Solution Card Component for displaying solution summaries
 */
export function SolutionCard({ solution, onViewDetails, onExportJira, onUpdateStatus }) {
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-700 border-gray-200',
      'approved': 'bg-blue-100 text-blue-700 border-blue-200', 
      'in_progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'cancelled': 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      'draft': FileText,
      'approved': CheckCircle,
      'in_progress': Clock,
      'completed': CheckCircle,
      'cancelled': AlertTriangle
    };
    const Icon = icons[status] || FileText;
    return <Icon className="w-3 h-3" />;
  };

  const getComplexityLabel = (score) => {
    if (score <= 3) return { label: 'Low', color: 'text-green-600' };
    if (score <= 6) return { label: 'Medium', color: 'text-yellow-600' };
    if (score <= 8) return { label: 'High', color: 'text-orange-600' };
    return { label: 'Critical', color: 'text-red-600' };
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExportJira(solution.id);
    } finally {
      setLoading(false);
    }
  };

  const complexity = getComplexityLabel(solution.complexity_score);

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {solution.name}
            </CardTitle>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {solution.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <Badge className={`text-xs border font-medium ${getStatusColor(solution.status)}`}>
              {getStatusIcon(solution.status)}
              <span className="ml-1 capitalize">{solution.status.replace('_', ' ')}</span>
            </Badge>
            <div className={`text-xs font-medium ${complexity.color}`}>
              {complexity.label} Complexity
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{solution.epic_count || 0}</div>
            <div className="text-xs text-gray-500">Epics</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{solution.story_count || 0}</div>
            <div className="text-xs text-gray-500">Stories</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {solution.estimated_duration_weeks || 0}
            </div>
            <div className="text-xs text-gray-500">Weeks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {solution.estimated_effort_points || 0}
            </div>
            <div className="text-xs text-gray-500">Points</div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(solution.created_at).toLocaleDateString()}
          </div>
          {solution.brief_title && (
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-32">{solution.brief_title}</span>
            </div>
          )}
          {solution.created_by_email && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="truncate max-w-24">{solution.created_by_email}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button
            onClick={() => onViewDetails(solution)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          
          <Button
            onClick={handleExport}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Exporting...' : 'Export Jira'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}