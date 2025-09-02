import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { LoadingSpinner } from '../../ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../ui/dropdown-menu';
// Removed SolutionCard import - using table view only
import { SolutionDetailsModal } from '../../solutioning/SolutionDetailsModal';
import { 
  Download, 
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
} from '../../ui/icons';
import { useNotifications } from '../../ui/notifications';
import { useSolutions } from '../../../hooks/useSolutions';
import { useSolutionGenerationContext } from '../../../hooks/useSolutionGenerationContext';
import { SolutionGenerationQueue } from '../../solutioning/SolutionGenerationQueue';
import { API_BASE_URL } from '../../../utils/api';

/**
 * Solutioning Tab - Manage solution breakdowns from briefs
 */
export function SolutioningTab({ user, refreshTrigger }) {
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Removed viewMode - using table view only
  const [selectedSolutions, setSelectedSolutions] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  
  const { showSuccess, showError } = useNotifications();
  const {
    solutions,
    loading,
    error,
    fetchSolutionDetails,
    exportSolutionToJira,
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
    try {
      const blob = await exportSolutionToJira(solutionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `solution-${solutionId}-jira-export.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess('Solution exported successfully!');
    } catch {
      showError('Failed to export solution');
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

  const statusCounts = getStatusCounts();

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

  const getStatusBadgeProps = (status) => {
    const statusMap = {
      draft: { variant: 'outline', className: 'text-gray-600 border-gray-300' },
      approved: { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      in_progress: { variant: 'default', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      completed: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
      cancelled: { variant: 'default', className: 'bg-red-100 text-red-800 border-red-200' }
    };
    return statusMap[status] || statusMap.draft;
  };

  const getPriorityBadgeProps = (priority) => {
    const priorityMap = {
      1: { variant: 'default', className: 'bg-red-100 text-red-800 border-red-200', label: 'Critical' },
      2: { variant: 'default', className: 'bg-orange-100 text-orange-800 border-orange-200', label: 'High' },
      3: { variant: 'default', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' },
      4: { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Low' },
      5: { variant: 'outline', className: 'text-gray-600 border-gray-300', label: 'Lowest' }
    };
    return priorityMap[priority] || priorityMap[3];
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
                <p className="text-2xl font-bold text-gray-900">{solutions.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.in_progress || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.completed || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Epics</p>
                <p className="text-2xl font-bold text-purple-600">
                  {solutions.reduce((total, s) => total + (s.epic_count || 0), 0)}
                </p>
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
                  <TableHead className="font-semibold text-gray-700 text-sm">
                    Solution Details
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm">
                    Brief
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Priority
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Progress
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm">
                    Last Updated
                  </TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolutions.map((solution) => {
                  const statusBadge = getStatusBadgeProps(solution.status);
                  const priorityBadge = getPriorityBadgeProps(solution.priority);
                  
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
                        <div>
                          <div className="font-semibold text-gray-900 text-sm mb-1">
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
                        <Badge {...priorityBadge} className="text-xs">
                          {priorityBadge.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-4 px-3 text-center">
                        <Badge {...statusBadge} className="text-xs capitalize">
                          {solution.status || 'draft'}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${solution.completion_percentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-600">
                            {solution.completion_percentage || 0}%
                          </span>
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
                        <DropdownMenu
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          }
                        >
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
                            <Download className="w-4 h-4 mr-2" />
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
    </div>
  );
}
