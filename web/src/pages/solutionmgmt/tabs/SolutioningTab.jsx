import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.jsx';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu.jsx';
// Removed SolutionCard import - using table view only
import { SolutionDetailsModal } from '../components/SolutionDetailsModal.jsx';
import { JiraProjectSelector } from '../components/JiraProjectSelector.jsx';
import { 
  Download, 
  ExternalLink,
  Search,
  Target,
  TrendingUp,
  FileText,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  Eye,
  MoreHorizontal,
  Archive,
  Trash2
} from '../../../components/ui/icons.jsx';
import { useNotifications } from '../../../components/ui/notifications.jsx';
import { useSolutions } from '../../../hooks/useSolutions.js';
import { useSolutionGenerationContext } from '../../../hooks/useSolutionGenerationContext.js';
import { SolutionGenerationQueue } from '../components/SolutionGenerationQueue.jsx';
import { API_BASE_URL } from '../../../utils/api.js';

/**
 * Solutioning Tab - Manage solution breakdowns from briefs
 */
export function SolutioningTab({ user, refreshTrigger }) {
  const navigate = useNavigate();
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Removed viewMode - using table view only
  const [selectedSolutions, setSelectedSolutions] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showJiraProjectSelector, setShowJiraProjectSelector] = useState(false);
  const [solutionToExport, setSolutionToExport] = useState(null);
  const [exportingStates, setExportingStates] = useState(new Map()); // Map of solutionId -> export progress
  const [notifiedItems, setNotifiedItems] = useState(new Map()); // Track which items have been notified
  
  const { showSuccess, showError } = useNotifications();
  const {
    solutions,
    loading,
    error,
    fetchSolutionDetails,
    exportSolutionToJira: _exportSolutionToJira,
    refetch: refetchSolutions
  } = useSolutions(user);

  const {
    generatingItems,
    addGeneratingItem: _addGeneratingItem,
    removeGeneratingItem,
    clearGeneratingItems: _clearGeneratingItems,
    isGenerating: _isGenerating
  } = useSolutionGenerationContext();

  // Store refetch function in a ref to avoid dependency issues
  const refetchRef = useRef(refetchSolutions);
  refetchRef.current = refetchSolutions;

  // Refresh solutions when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchRef.current();
    }
  }, [refreshTrigger]);

  const handleViewDetails = async (solution) => {
    try {
      const fullSolution = await fetchSolutionDetails(solution.id);
      setSelectedSolution(fullSolution);
      setShowDetailsModal(true);
    } catch {
      showError('Failed to load solution details');
    }
  };

  const handleExportJira = async (solutionId) => {
    // Find the solution to get its name
    const solution = solutions.find(s => s.id === solutionId);
    if (!solution) {
      showError('Solution not found');
      return;
    }
    
    // Open project selector modal
    setSolutionToExport(solution);
    setShowJiraProjectSelector(true);
  };

  const handleProjectSelected = async ({ projectKey, createEpic }) => {
    const solutionId = solutionToExport.id;
    
    try {
      // Start the export process
      setExportingStates(prev => new Map(prev.set(solutionId, { progress: 0, currentItem: 'Starting export...' })));
      
      // Start polling for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`${API_BASE_URL}/api/jira/export-progress/${solutionId}`, {
            credentials: 'include'
          });
          
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            
            // Update export state
            setExportingStates(prev => new Map(prev.set(solutionId, {
              progress: progressData.progress,
              currentItem: progressData.currentItem
            })));
            
            // Show notifications for created items (avoid duplicates)
            if (progressData.createdItem) {
              const item = progressData.createdItem;
              const itemKey = `${solutionId}-${item.type}-${item.key || 'completion'}-${progressData.timestamp}`;
              
              const solutionNotified = notifiedItems.get(solutionId) || new Set();
              if (!solutionNotified.has(itemKey)) {
                solutionNotified.add(itemKey);
                setNotifiedItems(prev => new Map(prev.set(solutionId, solutionNotified)));
                
                if (item.type === 'epic') {
                  showSuccess(`✅ Created Epic: ${item.key} - ${item.summary}`);
                } else if (item.type === 'story') {
                  showSuccess(`📝 Created Story: ${item.key} - ${item.summary}`);
                } else if (item.type === 'completion') {
                  showSuccess(`🎉 Export completed! Created ${item.totalIssues} issues` + 
                    (item.epicKey ? ` under Epic ${item.epicKey}` : ''));
                }
              }
            }
            
            // Stop polling when complete or failed
            if (progressData.status === 'completed' || progressData.status === 'failed') {
              clearInterval(pollInterval);
              setExportingStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(solutionId);
                return newMap;
              });
              
              // Clean up notification tracking
              setTimeout(() => {
                setNotifiedItems(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(solutionId);
                  return newMap;
                });
              }, 5000); // Keep for 5 seconds to avoid race conditions
              
              if (progressData.status === 'completed') {
                await refetchSolutions(); // Refresh the list
              } else {
                showError(`Export failed: ${progressData.currentItem}`);
              }
            }
          }
        } catch (pollError) {
          console.error('Error polling progress:', pollError);
        }
      }, 1000); // Poll every second
      
      // Initiate the export
      const response = await fetch(`${API_BASE_URL}/api/jira/export-solution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          solutionId: solutionId,
          projectKey: projectKey.toUpperCase(),
          createEpic
        })
      });
      
      if (!response.ok) {
        clearInterval(pollInterval);
        setExportingStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(solutionId);
          return newMap;
        });
        setNotifiedItems(prev => {
          const newMap = new Map(prev);
          newMap.delete(solutionId);
          return newMap;
        });
        
        const error = await response.json();
        showError(`Export failed: ${error.error}`);
      }
      
    } catch (error) {
      console.error('Error exporting to Jira:', error);
      setExportingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(solutionId);
        return newMap;
      });
      setNotifiedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(solutionId);
        return newMap;
      });
      showError('Failed to export solution to Jira');
    }
  };

  const handleUpdateStatus = async (solutionId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/solutions/${solutionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      showSuccess(`Solution status updated to ${status}`);
      await refetchSolutions(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Failed to update solution status');
    }
  };

  // Filter solutions based on search and status
  const filteredSolutions = solutions.filter(solution => {
    const matchesSearch = searchTerm === '' || 
      solution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution.brief_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || solution.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    const counts = solutions.reduce((acc, solution) => {
      acc[solution.status] = (acc[solution.status] || 0) + 1;
      return acc;
    }, {});
    counts.all = solutions.length;
    return counts;
  };

  const getExportStats = () => {
    const totalSolutions = solutions.length;
    const totalExported = solutions.filter(s => s.jira_exported_at).length;
    const percentExported = totalSolutions > 0 ? Math.round((totalExported / totalSolutions) * 100) : 0;
    
    // Debug epic count calculation
    const epicCounts = solutions.map(s => ({ 
      id: s.id, 
      name: s.name, 
      epic_count: s.epic_count, 
      parsed: parseInt(s.epic_count) || 0 
    }));
    console.log('Epic counts debug:', epicCounts);
    
    const totalEpics = solutions.reduce((total, s) => {
      const count = parseInt(s.epic_count) || 0;
      console.log(`Solution ${s.id} (${s.name}): epic_count="${s.epic_count}" -> parsed=${count}`);
      return total + count;
    }, 0);
    
    console.log('Total epics calculated:', totalEpics);
    
    return {
      totalSolutions,
      totalExported,
      percentExported,
      totalEpics
    };
  };

  const statusCounts = getStatusCounts();
  const exportStats = getExportStats();

  // Selection handlers for table view
  const handleSelectSolution = (solutionId) => {
    const newSelected = new Set(selectedSolutions);
    if (newSelected.has(solutionId)) {
      newSelected.delete(solutionId);
    } else {
      newSelected.add(solutionId);
    }
    setSelectedSolutions(newSelected);
    setIsAllSelected(newSelected.size === filteredSolutions.length && filteredSolutions.length > 0);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSolutions(new Set());
      setIsAllSelected(false);
    } else {
      const allIds = new Set(filteredSolutions.map(s => s.id));
      setSelectedSolutions(allIds);
      setIsAllSelected(true);
    }
  };

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };



  const getExportStatusBadgeProps = (solution) => {
    const exportState = exportingStates.get(solution.id);
    
    if (exportState) {
      return {
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Exporting...',
        icon: LoadingSpinner,
        showProgress: true,
        progress: exportState.progress || 0,
        currentItem: exportState.currentItem
      };
    } else if (solution.jira_exported_at) {
      return {
        variant: 'default',
        className: 'bg-green-100 !text-green-900 border-green-200 hover:bg-green-800 hover:!text-white transition-colors',
        label: 'Exported',
        icon: CheckCircle,
        showProgress: false
      };
    } else {
      return {
        variant: 'outline',
        className: 'text-gray-600 border-gray-300',
        label: 'Not Exported',
        showProgress: false
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="ml-3">Loading solutions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load solutions</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refetchSolutions}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solution Engineering</h1>
          <p className="text-sm text-gray-600 mt-1">
            Transform briefs into structured work breakdowns ready for implementation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bulk Actions */}
          {selectedSolutions.size > 0 && (
            <Button 
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedSolutions.size} Selected
            </Button>
          )}
          
          <Badge variant="outline" className="text-sm px-4 py-2">
            {solutions.length} Solutions
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Solutions</p>
                <p className="text-2xl font-bold text-gray-900">{exportStats.totalSolutions}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Exported</p>
                <p className="text-2xl font-bold text-green-600">{exportStats.totalExported}</p>
                <p className="text-xs text-gray-500 mt-1">to Jira</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">% Exported</p>
                <p className="text-2xl font-bold text-blue-600">{exportStats.percentExported}%</p>
                <p className="text-xs text-gray-500 mt-1">completion rate</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Epics</p>
                <p className="text-2xl font-bold text-purple-600">{exportStats.totalEpics}</p>
                <p className="text-xs text-gray-500 mt-1">across all solutions</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search solutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status ({statusCounts.all})</option>
            <option value="draft">Draft ({statusCounts.draft || 0})</option>
            <option value="approved">Approved ({statusCounts.approved || 0})</option>
            <option value="in_progress">In Progress ({statusCounts.in_progress || 0})</option>
            <option value="completed">Completed ({statusCounts.completed || 0})</option>
            <option value="cancelled">Cancelled ({statusCounts.cancelled || 0})</option>
          </select>
        </div>
      </div>

      {/* Solution Generation Queue */}
      <SolutionGenerationQueue
        generatingItems={generatingItems}
        onViewSolutions={() => {}} // Already on solutions tab
        onRemoveItem={removeGeneratingItem}
      />

      {/* Solutions Table */}
      {filteredSolutions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching solutions' : 'No solutions yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Generate your first solution from a reviewed brief to get started'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => window.location.hash = '#review'} variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Review Briefs
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="w-12 pl-4">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm w-1/4">
                    Solution Details
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm">
                    Brief
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center w-32">
                    Export Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm w-40">
                    Last Updated
                  </TableHead>
                  <TableHead className="w-32 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolutions.map((solution) => {
                  const exportStatusBadge = getExportStatusBadgeProps(solution);
                  
                  return (
                    <TableRow
              key={solution.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        selectedSolutions.has(solution.id) ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <TableCell className="pl-4">
                        <input
                          type="checkbox"
                          checked={selectedSolutions.has(solution.id)}
                          onChange={() => handleSelectSolution(solution.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </TableCell>
                      
                      <TableCell className="py-4 px-3">
                        <div 
                          className="cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded transition-colors"
                          onClick={() => navigate(`/solution/${solution.slug}`)}
                        >
                          <div className="font-semibold text-gray-900 text-sm mb-1 hover:text-blue-600">
                            {solution.name || `Solution #${solution.id}`}
                          </div>
                          <div className="flex items-center mt-2 space-x-3 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Target className="w-3 h-3 mr-1" />
                              {solution.epic_count || 0} epics
                            </span>
                            <span className="flex items-center">
                              <FileText className="w-3 h-3 mr-1" />
                              {solution.story_count || 0} stories
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-3">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {solution.brief_title || 'Unknown Brief'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Brief #{solution.brief_id}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Badge variant={exportStatusBadge.variant} className={`text-xs flex items-center gap-1 ${exportStatusBadge.className}`}>
                            {!exportStatusBadge.showProgress && exportStatusBadge.icon && (
                              exportStatusBadge.icon === LoadingSpinner ? (
                                <LoadingSpinner className="w-3 h-3" />
                              ) : (
                                React.createElement(exportStatusBadge.icon, { className: "w-3 h-3" })
                              )
                            )}
                            {exportStatusBadge.label}
                          </Badge>
                          
                          {exportStatusBadge.showProgress && (
                            <div className="w-full mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${exportStatusBadge.progress}%` }}
                                ></div>
                              </div>
                              {exportStatusBadge.currentItem && (
                                <div className="text-xs text-gray-500 mt-1 truncate max-w-32">
                                  {exportStatusBadge.currentItem}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {solution.jira_exported_at && !exportStatusBadge.showProgress && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(solution.jira_exported_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-3">
                        <div className="text-sm text-gray-900">
                          {formatDate(solution.updated_at)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {solution.updated_at && (
                            <span className="flex items-center mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(solution.updated_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportJira(solution.id)}
                            className="h-8 px-3 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                            disabled={exportingStates.get(solution.id)?.isExporting}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Export
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          <DropdownMenuItem 
                            onClick={() => handleViewDetails(solution)}
                            className="text-sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleExportJira(solution.id)}
                            className="text-sm"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Export to Jira
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(solution.id, 'in_progress')}
                            className="text-sm"
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Mark In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(solution.id, 'completed')}
                            className="text-sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Complete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-sm text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Solution
                          </DropdownMenuItem>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Solution Details Modal */}
      <SolutionDetailsModal
        solution={selectedSolution}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSolution(null);
        }}
        onExportJira={handleExportJira}
      />

      {/* JIRA Project Selector Modal */}
      <JiraProjectSelector
        isOpen={showJiraProjectSelector}
        onClose={() => {
          setShowJiraProjectSelector(false);
          setSolutionToExport(null);
          // Refresh solutions in case an export was completed
          refetchSolutions();
        }}
        onSelectProject={handleProjectSelected}
        solutionName={solutionToExport?.name || ''}
      />
    </div>
  );
}
