import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { RotateCcw, Trash2, ClipboardList, FileText, ChevronUp, ChevronDown, Filter, X } from '../../../components/ui/icons.jsx';
import { dashboardUtils } from '../../../utils/dashboardApi.js';
import { useArchive } from '../../../hooks/useArchive.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';

/**
 * Archived Surveys tab component
 */
export function ArchivedSurveysTab({ user, onRefresh, showFilters, setShowFilters, getActiveFilterCount, clearAllFilters, onCountUpdate, initialData }) {
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('archived_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const { restoreSession, deleteSessionPermanently, getArchivedSessions } = useArchive(user);
  const { showSuccess, showError, confirm } = useNotifications();

  const fetchArchivedSessions = useCallback(async () => {
    setLoading(true);
    try {
      console.log('ArchivedSurveysTab: Fetching archived sessions for user:', user);
      console.log('ArchivedSurveysTab: User orgId:', user?.orgId);
      const sessions = await getArchivedSessions();
      console.log('ArchivedSurveysTab: Sessions from useArchive hook:', sessions);
      console.log('ArchivedSurveysTab: Sessions type:', typeof sessions);
      console.log('ArchivedSurveysTab: Sessions array length:', sessions?.length);
      setArchivedSessions(sessions);
      console.log('ArchivedSurveysTab: State set to sessions array:', sessions);
    } catch (error) {
      console.error('ArchivedSurveysTab: Failed to fetch archived sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getArchivedSessions]);

  useEffect(() => {
    if (user?.orgId) {
      fetchArchivedSessions();
    }
  }, [user?.orgId, fetchArchivedSessions]);

  // Notify parent of count changes
  useEffect(() => {
    if (onCountUpdate) {
      const totalResponses = archivedSessions.reduce((sum, session) => sum + (session.answer_count || 0), 0);
      onCountUpdate('surveys', archivedSessions.length, { totalResponses });
    }
  }, [archivedSessions, onCountUpdate]);

  const handleRestoreSession = async (session) => {
    await confirm({
      title: `Restore survey session ${session.session_id}?`,
      message: 'Are you sure you want to restore this survey? This will move it back to the active surveys.',
      confirmText: 'Restore',
      variant: 'default',
      onConfirm: async () => {
        const success = await restoreSession(session.session_id);
        if (success) {
          showSuccess('Survey restored successfully!');
          fetchArchivedSessions(); // Refresh archived list
          if (onRefresh) onRefresh(); // Refresh main dashboard
        } else {
          showError('Failed to restore survey. Please try again.');
        }
      }
    });
  };

  const handleDeleteSession = async (session) => {
    await confirm({
      title: `Delete survey session ${session.session_id}?`,
      message: 'Are you sure you want to PERMANENTLY DELETE this survey? This action cannot be undone!',
      confirmText: 'Delete Forever',
      variant: 'destructive',
      onConfirm: async () => {
        const success = await deleteSessionPermanently(session.session_id);
        if (success) {
          showSuccess('Survey permanently deleted!');
          fetchArchivedSessions(); // Refresh archived list
        } else {
          showError('Failed to delete survey. Please try again.');
        }
      }
    });
  };

  // Sorting logic
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-300" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const sortedSessions = useMemo(() => {
    return [...archivedSessions].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'session_id':
          aValue = a.session_id;
          bValue = b.session_id;
          break;
        case 'campaign_name':
          aValue = a.campaign_name || '';
          bValue = b.campaign_name || '';
          break;
        case 'answer_count':
          aValue = a.answer_count || 0;
          bValue = b.answer_count || 0;
          break;
        case 'completed':
          aValue = a.completed ? 1 : 0;
          bValue = b.completed ? 1 : 0;
          break;
        case 'has_brief':
          aValue = a.has_brief ? 1 : 0;
          bValue = b.has_brief ? 1 : 0;
          break;
        case 'archived_at':
          aValue = new Date(a.archived_at || 0);
          bValue = new Date(b.archived_at || 0);
          break;
        case 'last_answer_at':
          aValue = new Date(a.last_answer_at || 0);
          bValue = new Date(b.last_answer_at || 0);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [archivedSessions, sortField, sortDirection]);

  if (loading) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
        <CardContent style={{ padding: '24px', textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading archived surveys...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Header Section - Outside Card */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">Archived Surveys</h2>
              <Badge variant="outline" className="text-xs">
                {archivedSessions.length} Archived Surveys
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Surveys that have been archived. You can restore them or permanently delete them.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {getActiveFilterCount && getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
            {getActiveFilterCount && getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Campaign Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaigns
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={true}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">All Campaigns</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={false}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Q1 2024</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={false}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Product Feedback</span>
                  </label>
                </div>
              </div>

              {/* Survey Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surveys
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={true}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">All Surveys</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={false}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">User Experience</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={false}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Feature Requests</span>
                  </label>
                </div>
              </div>

              {/* Item Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Types
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={true}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Campaigns</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={true}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Surveys</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={false}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Documents</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={false}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Solutions</span>
                  </label>
                </div>
              </div>

              {/* Archived Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archived Date
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    placeholder="Start Date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    placeholder="End Date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Card */}
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
        <CardContent style={{ padding: '0' }}>
        {archivedSessions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
            <FileText style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No archived surveys found.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Archived surveys will appear here when you archive them from the main surveys tab.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f9fafb' }}>
                <TableHead 
                  className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none w-1/2"
                  onClick={() => handleSort('session_id')}
                >
                  <div className="flex items-center gap-1">
                    Survey Details
                    {getSortIcon('session_id')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold text-gray-700 text-sm text-center cursor-pointer hover:bg-gray-100 transition-colors select-none w-20"
                  onClick={() => handleSort('answer_count')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Responses
                    {getSortIcon('answer_count')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none w-32"
                  onClick={() => handleSort('archived_at')}
                >
                  <div className="flex items-center gap-1">
                    Archived Date
                    {getSortIcon('archived_at')}
                  </div>
                </TableHead>
                <TableHead className="w-48 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSessions.map((session) => (
                <TableRow key={session.session_id} style={{ transition: 'background-color 0.2s' }}>
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>
                        Survey Session {session.session_id}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        {session.completed ? 'Completed' : 'Incomplete'} • {session.has_brief ? 'Has Brief' : 'No Brief'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        Campaign: {session.campaign_name || 'No Campaign'} • Created: {dashboardUtils.formatDate(session.created_at)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                        {session.answer_count || 0}
                      </div>
                      <ClipboardList style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {dashboardUtils.formatDate(session.archived_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button 
                        variant="outline" 
                        style={{ 
                          fontSize: '12px',
                          color: '#059669',
                          borderColor: '#059669'
                        }}
                        onClick={() => handleRestoreSession(session)}
                      >
                        <RotateCcw style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                        Restore
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        style={{ 
                          fontSize: '12px',
                          color: '#dc2626',
                          borderColor: '#dc2626'
                        }}
                        onClick={() => handleDeleteSession(session)}
                      >
                        <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                        Delete Forever
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

