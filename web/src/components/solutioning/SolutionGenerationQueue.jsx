import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Clock, 
  Zap, 
  FileText, 
  CheckCircle,
  X,
  Eye
} from '../ui/icons';

/**
 * Solution Generation Queue Component
 * Shows progress of solutions currently being generated
 */
export function SolutionGenerationQueue({ 
  generatingItems = [], 
  onViewSolutions,
  onRemoveItem 
}) {
  if (generatingItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-blue-600 mr-2 animate-pulse" />
            <h3 className="text-sm font-semibold text-blue-900">
              Generating Solutions ({generatingItems.length})
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewSolutions}
            className="text-blue-700 hover:text-blue-900 h-8"
          >
            <Eye className="w-4 h-4 mr-1" />
            View All Solutions
          </Button>
        </div>
        
        <div className="space-y-3">
          {generatingItems.map((item) => (
            <SolutionGenerationItem 
              key={item.id}
              item={item}
              onRemove={() => onRemoveItem(item.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual solution generation item with progress bar
 */
function SolutionGenerationItem({ item, onRemove }) {
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Simulate progress over ~18 seconds, leaving room for actual completion
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      
      // Progress curve: quick start, then slower, stopping at 85% to wait for actual completion
      setProgress(prev => {
        if (prev >= 85) return prev; // Stop at 85% to wait for real completion
        
        const elapsed = timeElapsed;
        if (elapsed < 5) return elapsed * 15; // Quick progress to 75% in first 5 seconds
        if (elapsed < 10) return 75 + (elapsed - 5) * 2; // Slow to 85% over next 5 seconds
        return 85; // Cap at 85%
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeElapsed]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-white rounded-lg border border-blue-200 p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <FileText className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" />
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {item.briefTitle || `Brief #${item.briefId}`}
            </h4>
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {item.briefDescription || 'Generating comprehensive solution breakdown...'}
          </p>
        </div>
        
        <div className="flex items-center ml-3 space-x-2">
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            {formatTime(timeElapsed)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">
            {progress < 85 ? 'Analyzing brief and generating solution...' : 'Finalizing solution breakdown...'}
          </span>
          <span className="text-xs font-medium text-blue-600">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          >
            {progress > 20 && (
              <div className="h-full w-full bg-gradient-to-r from-transparent to-white opacity-30 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Started {formatTime(timeElapsed)} ago</span>
          <span>Est. 15-20 seconds</span>
        </div>
      </div>
    </div>
  );
}
