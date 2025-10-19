import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  ExternalLink, 
  CheckCircle,
  X,
  Clock,
  AlertCircle
} from '../../../components/ui/icons';

/**
 * Jira Export Progress Component
 * Shows progress of Jira export with real-time updates
 */
export function JiraExportProgress({ 
  isVisible,
  progress = 0,
  currentItem = 'Starting export...',
  status = 'exporting', // 'exporting', 'completed', 'failed'
  solutionName = '',
  onClose
}) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Track time elapsed
  useEffect(() => {
    if (!isVisible) {
      setTimeElapsed(0);
      return;
    }
    
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <ExternalLink className="w-5 h-5 text-blue-600 animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'failed':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Export completed successfully!';
      case 'failed':
        return 'Export failed';
      default:
        return 'Exporting to Jira...';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className={`border-2 ${getStatusColor()} fixed top-4 right-4 z-50 w-96 shadow-lg`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {getStatusIcon()}
            <h3 className="text-sm font-semibold ml-2 text-gray-900">
              {getStatusText()}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {/* Solution Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <ExternalLink className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" />
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {solutionName}
                  </h4>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Exporting solution breakdown to Jira...
                </p>
              </div>
              
              <div className="flex items-center ml-3 space-x-2">
                <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(timeElapsed)}
                </Badge>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">
                  {currentItem}
                </span>
                <span className="text-xs font-medium text-blue-600">
                  {Math.round(progress)}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${getProgressColor()} h-2 rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${progress}%` }}
                >
                  {progress > 20 && status === 'exporting' && (
                    <div className="h-full w-full bg-gradient-to-r from-transparent to-white opacity-30 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Started {formatTime(timeElapsed)} ago</span>
                <span>Est. 30-60 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
