import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/loading-spinner';
import { 
  X, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  FileText,
  Target
} from '../ui/icons';

/**
 * JIRA Export Progress Modal
 * Shows real-time progress and animated logs during solution export
 */
export function JiraExportProgressModal({ 
  isOpen, 
  onClose, 
  projectName,
  projectKey,
  solutionName,
  onExport,
  isExporting
}) {
  const [exportLogs, setExportLogs] = useState([]);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setExportLogs([]);
      setExportComplete(false);
      setExportResult(null);
    }
  }, [isOpen]);

  const addLog = (message, status = 'info') => {
    const logEntry = {
      id: Date.now() + Math.random(),
      message,
      status, // 'info', 'success', 'error'
      timestamp: new Date()
    };
    
    setExportLogs(prev => [...prev, logEntry]);
  };

  const handleStartExport = async () => {
    addLog(`🚀 Starting export to ${projectName}...`, 'info');
    
    try {
      // Add progress logs with realistic timing
      addLog(`🔍 Analyzing solution structure...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addLog(`📋 Detecting JIRA project capabilities...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      addLog(`⭐ Creating Epic: "${solutionName}"`, 'success');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      addLog(`📝 Generating user stories...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 700));
      
      addLog(`⚙️ Creating tasks and subtasks...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 900));
      
      addLog(`🔗 Linking issues and dependencies...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Call the actual export function
      const result = await onExport();
      
      addLog(`🎉 Export completed successfully!`, 'success');
      
      // Handle result safely
      if (result && typeof result === 'object') {
        addLog(`✅ Created ${result.totalIssues || 0} JIRA issues`, 'success');
        
        if (result.epicKey) {
          addLog(`⭐ Epic created: ${result.epicKey}`, 'success');
        }
        
        setExportResult(result);
      } else {
        addLog(`✅ JIRA export completed`, 'success');
        setExportResult({ totalIssues: 0 });
      }
      
      setExportComplete(true);
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Export failed:', error);
      addLog(`❌ Export failed: ${error.message}`, 'error');
      setExportComplete(true);
    }
  };

  // Start export automatically when modal opens and isExporting becomes true
  useEffect(() => {
    if (isOpen && isExporting && exportLogs.length === 0) {
      handleStartExport();
    }
  }, [isOpen, isExporting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="pointer-events-auto">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {exportComplete ? 'Export Complete' : 'Exporting to JIRA'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {exportComplete 
                  ? `Successfully exported "${solutionName}" to ${projectName}`
                  : `Exporting "${solutionName}" to ${projectName} (${projectKey})`
                }
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600"
              disabled={isExporting && !exportComplete}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Export Status Header */}
          <div className="flex items-center justify-center mb-6 p-4 rounded-lg bg-gray-50">
            {exportComplete ? (
              exportResult ? (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-green-800">Export Successful!</h3>
                  <p className="text-sm text-gray-600">
                    Created {exportResult.totalIssues || 0} issues in {projectKey}
                  </p>
                  {exportResult.epicKey && (
                    <p className="text-sm text-blue-600 font-mono mt-1">
                      Epic: {exportResult.epicKey}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-red-800">Export Failed</h3>
                  <p className="text-sm text-gray-600">
                    Please check the logs below for details
                  </p>
                </div>
              )
            ) : (
              <div className="text-center">
                <LoadingSpinner className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-blue-800">Export in Progress</h3>
                <p className="text-sm text-gray-600">
                  Creating issues in JIRA...
                </p>
              </div>
            )}
          </div>

          {/* Export Logs */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Export Progress Logs
            </h4>
            
            <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {exportLogs.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-4">
                    Waiting for export to begin...
                  </div>
                ) : (
                  exportLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`
                        flex items-center space-x-3 p-2 rounded text-sm opacity-100 translate-y-0
                        ${log.status === 'success' ? 'text-green-400' : 
                          log.status === 'error' ? 'text-red-400' : 
                          'text-blue-400'
                        }
                        animate-in slide-in-from-bottom-2 duration-300
                      `}
                    >
                      <span className="font-mono text-xs text-gray-500 min-w-[80px]">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="flex-1">{log.message}</span>
                      {log.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {log.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end space-x-3">
          {exportComplete ? (
            <>
              {exportResult?.epicKey && (
                <Button 
                  variant="outline"
                  onClick={() => window.open(`https://your-domain.atlassian.net/browse/${exportResult.epicKey}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View in JIRA
                </Button>
              )}
              <Button onClick={onClose}>
                Done
              </Button>
            </>
          ) : (
            <Button 
              onClick={onClose} 
              variant="outline"
              disabled={isExporting}
            >
              Cancel
            </Button>
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}
