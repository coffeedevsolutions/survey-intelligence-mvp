import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { LoadingSpinner } from '../../ui/loading-spinner';
import { SolutionCard } from '../../solutioning/SolutionCard';
import { SolutionDetailsModal } from '../../solutioning/SolutionDetailsModal';
import { 
  Plus, 
  Download, 
  Filter, 
  Search,
  Target,
  TrendingUp,
  FileText,
  AlertCircle
} from '../../ui/icons';
import { useNotifications } from '../../ui/notifications';
import { useSolutions } from '../../../hooks/useSolutions';
import { API_BASE_URL } from '../../../utils/api';

/**
 * Solutioning Tab - Manage solution breakdowns from briefs
 */
export function SolutioningTab({ user }) {
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { showSuccess, showError } = useNotifications();
  const {
    solutions,
    loading,
    error,
    fetchSolutionDetails,
    exportSolutionToJira,
    refetch: refetchSolutions
  } = useSolutions(user);



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

      {/* Solutions Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSolutions.map((solution) => (
            <SolutionCard
              key={solution.id}
              solution={solution}
              onViewDetails={handleViewDetails}
              onExportJira={handleExportJira}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
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
