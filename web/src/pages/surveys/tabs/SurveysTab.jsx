import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineStyledBrief, StyledBriefButton } from '../../../components/ui/styled-brief-viewer.jsx';
import { EnhancedDownloadButton } from '../../../components/ui/enhanced-download.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.jsx';
import { 
  Eye, 
  FileText, 
  Users, 
  CheckCircle, 
  Clock, 
  Archive, 
  Calendar,
  Target,
  Link2,
  Activity,
  ChevronRight,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  Share2,
  ChevronUp,
  ChevronDown,
  Filter,
  X,
  Search
} from '../../../components/ui/icons.jsx';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu.jsx';
import { dashboardApi, dashboardUtils } from '../../../utils/dashboardApi.js';
import { useArchive } from '../../../hooks/useArchive.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';

/**
 * Surveys tab component
 */
export function SurveysTab({ sessions, onFetchBrief, user, onRefresh }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Brief modal states
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefData, setBriefData] = useState(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  // Bulk selection states
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState('last_answer_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    campaigns: [],
    surveyStatus: [],
    interactions: { min: '', max: '' },
    briefStatus: [],
    priority: [],
    dateRange: { start: '', end: '' }
  });

  // Archive functionality
  const { archiveSession } = useArchive(user);
  
  // Notifications
  const { showSuccess, showError, confirmArchive } = useNotifications();
  
  // Navigation
  const navigate = useNavigate();

  // Priority helper functions
  const getPriorityDisplay = (session) => {
    if (!session.has_brief) {
      return { type: 'no-brief', label: 'No Brief', color: 'gray' };
    }
    
    if (session.brief_priority && session.brief_priority >= 1 && session.brief_priority <= 5) {
      const priorityLabels = {
        1: 'Critical',
        2: 'High', 
        3: 'Medium',
        4: 'Low',
        5: 'Backlog'
      };
      const priorityColors = {
        1: 'red',
        2: 'orange', 
        3: 'yellow',
        4: 'blue',
        5: 'gray'
      };
      return { 
        type: 'prioritized', 
        label: priorityLabels[session.brief_priority],
        color: priorityColors[session.brief_priority],
        priority: session.brief_priority
      };
    }
    
    return { type: 'needs-review', label: 'Needs Review', color: 'amber' };
  };

  const handleNavigateToReview = () => {
    navigate('/review');
  };

  const fetchSessionDetails = async (session) => {
    console.log('🔍 fetchSessionDetails called for session:', session.session_id);
    setSelectedSession(session);
    setSessionDetails(null);
    setLoadingDetails(true);
    setShowSessionModal(true);
    console.log('📱 Modal state set to true');
    
    try {
      console.log('🌐 Calling API for session details...');
      const data = await dashboardApi.fetchSessionDetails(session.session_id);
      console.log('✅ Session details received:', data);
      setSessionDetails(data);
    } catch (err) {
      console.error('❌ Failed to fetch session details:', err);
      setSessionDetails({ error: 'Failed to load session details' });
    } finally {
      setLoadingDetails(false);
      console.log('🏁 Loading finished');
    }
  };

  const fetchBriefDetails = async (session) => {
    setSelectedSession(session);
    setBriefData(null);
    setLoadingBrief(true);
    setShowBriefModal(true);
    
    try {
      const data = await onFetchBrief(session.session_id);
      setBriefData(data);
    } catch (err) {
      console.error('Failed to fetch brief:', err);
      setBriefData({ error: 'Failed to load brief' });
    } finally {
      setLoadingBrief(false);
    }
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setSelectedSession(null);
    setSessionDetails(null);
    setLoadingDetails(false);
  };

  const closeBriefModal = () => {
    setShowBriefModal(false);
    setSelectedSession(null);
    setBriefData(null);
    setLoadingBrief(false);
  };

  const handleShareBrief = async (session) => {
    try {
      // First get the brief data to get the brief ID
      const briefData = await onFetchBrief(session.session_id);
      if (briefData?.id) {
        const result = await dashboardUtils.createQuickShareLink(briefData.id);
        if (result?.success) {
          showSuccess('Share link created and copied to clipboard!');
        } else {
          showError(`Failed to create share link: ${result?.error || 'Unknown error'}`);
        }
      } else {
        showError('Brief not found');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      showError(`Failed to create share link: ${error.message}`);
    }
  };

  const handleArchiveSession = async (session) => {
    await confirmArchive(
      `survey session ${session.session_id}`,
      async () => {
        const success = await archiveSession(session.session_id);
        if (success) {
          showSuccess('Survey archived successfully!');
          if (onRefresh) onRefresh();
        } else {
          showError('Failed to archive survey. Please try again.');
        }
      }
    );
  };

  // Bulk selection handlers
  const handleSelectSession = (sessionId) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
    setIsAllSelected(newSelected.size === finalSortedSessions.length);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSessions(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedSessions(new Set(finalSortedSessions.map(s => s.session_id)));
      setIsAllSelected(true);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedSessions.size === 0) {
      showError('Please select surveys to archive.');
      return;
    }

    const selectedCount = selectedSessions.size;
    await confirmArchive(
      `${selectedCount} selected survey${selectedCount > 1 ? 's' : ''}`,
      async () => {
        setIsBulkArchiving(true);
        let successCount = 0;
        let failureCount = 0;

        for (const sessionId of selectedSessions) {
          try {
            const success = await archiveSession(sessionId);
            if (success) {
              successCount++;
            } else {
              failureCount++;
            }
          } catch {
            failureCount++;
          }
        }

        setIsBulkArchiving(false);
        setSelectedSessions(new Set());
        setIsAllSelected(false);

        if (successCount > 0) {
          const message = `Successfully archived ${successCount} survey${successCount > 1 ? 's' : ''}${failureCount > 0 ? `. ${failureCount} failed to archive.` : '.'}`;
          showSuccess(message);
          if (onRefresh) onRefresh();
        } else {
          showError('Failed to archive any surveys. Please try again.');
        }
      }
    );
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
    return [...sessions].sort((a, b) => {
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
        case 'brief_priority':
          aValue = a.brief_priority || 999;
          bValue = b.brief_priority || 999;
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
  }, [sessions, sortField, sortDirection]);

  // Filter logic
  const getUniqueCampaigns = () => {
    const campaigns = sessions
      .map(s => s.campaign_name)
      .filter(name => name && name.trim() !== '')
      .filter((name, index, arr) => arr.indexOf(name) === index);
    return campaigns.sort();
  };

  const getPriorityOptions = () => {
    return [
      { value: 1, label: 'P1 - Critical' },
      { value: 2, label: 'P2 - High' },
      { value: 3, label: 'P3 - Medium' },
      { value: 4, label: 'P4 - Low' },
      { value: 5, label: 'P5 - Backlog' },
      { value: 'needs-review', label: 'Needs Review' },
      { value: 'no-brief', label: 'No Brief' }
    ];
  };

  const applyFilters = (sessions) => {
    return sessions.filter(session => {
      // Campaign filter
      if (filters.campaigns.length > 0) {
        const campaignName = session.campaign_name || '';
        if (!filters.campaigns.includes(campaignName)) {
          return false;
        }
      }

      // Survey status filter
      if (filters.surveyStatus.length > 0) {
        const status = session.completed ? 'completed' : 'active';
        if (!filters.surveyStatus.includes(status)) {
          return false;
        }
      }

      // Interactions filter
      const answerCount = session.answer_count || 0;
      if (filters.interactions.min !== '' && answerCount < parseInt(filters.interactions.min)) {
        return false;
      }
      if (filters.interactions.max !== '' && answerCount > parseInt(filters.interactions.max)) {
        return false;
      }

      // Brief status filter
      if (filters.briefStatus.length > 0) {
        const briefStatus = session.has_brief ? 'has-brief' : 'no-brief';
        if (!filters.briefStatus.includes(briefStatus)) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority.length > 0) {
        const priorityDisplay = getPriorityDisplay(session);
        let priorityValue;
        
        if (priorityDisplay.type === 'no-brief') {
          priorityValue = 'no-brief';
        } else if (priorityDisplay.type === 'needs-review') {
          priorityValue = 'needs-review';
        } else if (priorityDisplay.type === 'prioritized') {
          priorityValue = priorityDisplay.priority;
        }
        
        if (!filters.priority.includes(priorityValue)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const sessionDate = new Date(session.last_answer_at || session.created_at);
        
        // Skip if session date is invalid
        if (isNaN(sessionDate.getTime())) {
          return false;
        }
        
        if (filters.dateRange.start && filters.dateRange.start.trim() !== '') {
          const startDate = new Date(filters.dateRange.start);
          if (!isNaN(startDate.getTime())) {
            startDate.setHours(0, 0, 0, 0); // Start of day
            if (sessionDate < startDate) {
              return false;
            }
          }
        }
        if (filters.dateRange.end && filters.dateRange.end.trim() !== '') {
          const endDate = new Date(filters.dateRange.end);
          if (!isNaN(endDate.getTime())) {
            endDate.setHours(23, 59, 59, 999); // End of day
            if (sessionDate > endDate) {
              return false;
            }
          }
        }
      }

      return true;
    });
  };

  const filteredSessions = useMemo(() => {
    return applyFilters(sessions);
  }, [sessions, filters]);

  const finalSortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
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
        case 'brief_priority':
          aValue = a.brief_priority || 999;
          bValue = b.brief_priority || 999;
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
  }, [filteredSessions, sortField, sortDirection]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      campaigns: [],
      surveyStatus: [],
      interactions: { min: '', max: '' },
      briefStatus: [],
      priority: [],
      dateRange: { start: '', end: '' }
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.campaigns.length > 0) count++;
    if (filters.surveyStatus.length > 0) count++;
    if (filters.interactions.min !== '' || filters.interactions.max !== '') count++;
    if (filters.briefStatus.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.dateRange.start !== '' || filters.dateRange.end !== '') count++;
    return count;
  };

    return (
    <div className="flex flex-col space-y-6">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Survey Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor survey sessions and track question interactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
          {selectedSessions.size > 0 && user?.role === 'admin' && (
            <Button 
              onClick={handleBulkArchive}
              disabled={isBulkArchiving}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              {isBulkArchiving ? (
                <>Archiving...</>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive {selectedSessions.size} Selected
                </>
              )}
            </Button>
          )}
          <Badge variant="outline" className="text-sm px-4 py-2">
            {finalSortedSessions.length} Active Surveys
          </Badge>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Surveys</h3>
            <div className="flex items-center gap-2">
              <Button
                onClick={clearAllFilters}
                variant="outline"
                size="sm"
                className="text-gray-600"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setShowFilters(false)}
                variant="ghost"
                size="sm"
                className="text-gray-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Campaign Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {getUniqueCampaigns().map(campaign => (
                  <label key={campaign} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.campaigns.includes(campaign)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('campaigns', [...filters.campaigns, campaign]);
                        } else {
                          handleFilterChange('campaigns', filters.campaigns.filter(c => c !== campaign));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{campaign}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Survey Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Status
              </label>
              <div className="space-y-2">
                {[
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' }
                ].map(status => (
                  <label key={status.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.surveyStatus.includes(status.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('surveyStatus', [...filters.surveyStatus, status.value]);
                        } else {
                          handleFilterChange('surveyStatus', filters.surveyStatus.filter(s => s !== status.value));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Interactions Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interactions (Count)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.interactions.min}
                  onChange={(e) => handleFilterChange('interactions', { ...filters.interactions, min: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.interactions.max}
                  onChange={(e) => handleFilterChange('interactions', { ...filters.interactions, max: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Brief Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brief Status
              </label>
              <div className="space-y-2">
                {[
                  { value: 'has-brief', label: 'Has Brief' },
                  { value: 'no-brief', label: 'No Brief' }
                ].map(status => (
                  <label key={status.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.briefStatus.includes(status.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('briefStatus', [...filters.briefStatus, status.value]);
                        } else {
                          handleFilterChange('briefStatus', filters.briefStatus.filter(s => s !== status.value));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {getPriorityOptions().map(priority => (
                  <label key={priority.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('priority', [...filters.priority, priority.value]);
                        } else {
                          handleFilterChange('priority', filters.priority.filter(p => p !== priority.value));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{priority.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Activity Date
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Table Container */}
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
              <TableHead 
                className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('session_id')}
              >
                <div className="flex items-center gap-1">
                  Survey Details
                  {getSortIcon('session_id')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('campaign_name')}
              >
                <div className="flex items-center gap-1">
                  Campaign
                  {getSortIcon('campaign_name')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-gray-700 text-sm text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('answer_count')}
              >
                <div className="flex items-center justify-center gap-1">
                  Interactions
                  {getSortIcon('answer_count')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-gray-700 text-sm text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('completed')}
              >
                <div className="flex items-center justify-center gap-1">
                  Status
                  {getSortIcon('completed')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-gray-700 text-sm text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('has_brief')}
              >
                <div className="flex items-center justify-center gap-1">
                  Brief
                  {getSortIcon('has_brief')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-gray-700 text-sm text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('brief_priority')}
              >
                <div className="flex items-center justify-center gap-1">
                  Priority
                  {getSortIcon('brief_priority')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('last_answer_at')}
              >
                <div className="flex items-center gap-1">
                  Last Activity
                  {getSortIcon('last_answer_at')}
                </div>
              </TableHead>
              <TableHead className="w-20 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finalSortedSessions.map((session) => (
              <TableRow 
                key={session.session_id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedSessions.has(session.session_id) ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <TableCell className="pl-4">
                  <input
                    type="checkbox"
                    checked={selectedSessions.has(session.session_id)}
                    onChange={() => handleSelectSession(session.session_id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </TableCell>
                
                <TableCell className="py-4 px-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      Survey Session {session.session_id}
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {session.flow_title ? `${session.flow_title} v${session.flow_version}` : 'Interactive AI survey'}
                    </div>
                    {session.survey_token && (
                      <div className="text-xs text-gray-400 font-mono mt-1">
                        Token: {session.survey_token.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-4 px-3">
                  {session.campaign_name ? (
                    <div>
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 mb-1"
                      >
                        <Target className="w-2.5 h-2.5 mr-1" />
                        {session.campaign_name}
                      </Badge>
                      {session.campaign_purpose && (
                        <div className="text-xs text-gray-600 leading-tight mt-1">
                          {session.campaign_purpose.length > 40 
                            ? `${session.campaign_purpose.slice(0, 40)}...` 
                            : session.campaign_purpose
                          }
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      No campaign
                    </span>
                  )}
                </TableCell>

                <TableCell className="py-4 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5" title={`${session.answer_count || 0} individual question responses`}>
                    <div className="text-lg font-bold text-gray-900">
                      {session.answer_count || 0}
                    </div>
                    <Activity className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </TableCell>

                <TableCell className="py-4 px-3 text-center">
                  <Badge 
                    variant={session.completed ? "default" : "secondary"}
                    className={`text-xs ${
                      session.completed 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}
                  >
                    {session.completed ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {session.completed ? 'Complete' : 'Active'}
                  </Badge>
                </TableCell>

                <TableCell className="py-4 px-3 text-center">
                  {session.has_brief ? (
                    <Badge 
                      variant="default" 
                      className="text-xs bg-purple-100 text-purple-800 border border-purple-200"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Generated
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className="text-xs text-gray-600 border-gray-300"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="py-4 px-3 text-center">
                  {(() => {
                    const priority = getPriorityDisplay(session);
                    
                    if (priority.type === 'no-brief') {
                      return (
                        <span className="text-xs text-gray-400 italic">
                          No Brief
                        </span>
                      );
                    }
                    
                    if (priority.type === 'needs-review') {
                      return (
                        <div className="flex items-center justify-center">
                          {(user?.role === 'admin' || user?.role === 'reviewer') ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-3 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 transition-all duration-200 font-medium"
                              onClick={handleNavigateToReview}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1.5" />
                              Set Priority
                            </Button>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-amber-50 text-amber-600 border border-amber-200 font-medium"
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Pending Review
                            </Badge>
                          )}
                        </div>
                      );
                    }
                    
                    // Prioritized case
                    const colorClasses = {
                      red: 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200 shadow-sm',
                      orange: 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border-orange-200 shadow-sm',
                      yellow: 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200 shadow-sm',
                      blue: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200 shadow-sm',
                      gray: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200 shadow-sm'
                    };
                    
                    return (
                      <Badge 
                        variant="default" 
                        className={`text-xs border font-semibold px-2.5 py-1 ${colorClasses[priority.color]}`}
                      >
                        P{priority.priority} • {priority.label}
                      </Badge>
                    );
                  })()}
                </TableCell>

                <TableCell className="py-4 px-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {dashboardUtils.formatDate(session.last_answer_at)}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="py-4 px-3 text-center relative">
                  <div className="relative z-10">
                    <DropdownMenu align="right">
                      <DropdownMenuItem onClick={() => fetchSessionDetails(session)}>
                        <Eye className="w-3.5 h-3.5" />
                        View Survey
                      </DropdownMenuItem>
                      {session.has_brief && (
                        <>
                          <DropdownMenuItem onClick={() => fetchBriefDetails(session)}>
                            <FileText className="w-3.5 h-3.5" />
                            View Brief
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareBrief(session)}>
                            <Share2 className="w-3.5 h-3.5" />
                            Share Brief
                          </DropdownMenuItem>
                        </>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchiveSession(session)} variant="destructive">
                            <Archive className="w-3.5 h-3.5" />
                            Archive Survey
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {sessions.length === 0 && (
          <div className="p-12 text-center border-t border-gray-100">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No surveys found
            </h3>
            <p className="text-gray-600">
              Survey sessions will appear here when respondents start taking surveys
            </p>
          </div>
        )}

        {sessions.length > 0 && finalSortedSessions.length === 0 && (
          <div className="p-12 text-center border-t border-gray-100">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No surveys match your current filter
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filter criteria to see more results
            </p>
            <Button
              onClick={clearAllFilters}
              variant="outline"
              size="sm"
              className="text-gray-600"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Session Details Modal - Rendered outside the Card */}
      {showSessionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '85vh',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                  Survey Session Details
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Session ID: {selectedSession?.session_id}
                </p>
              </div>
              <button
                onClick={closeSessionModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ height: '400px', overflowY: 'auto', paddingRight: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading session details...</p>
                  </div>
                ) : sessionDetails?.error ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#dc2626' }}>
                    <p>{sessionDetails.error}</p>
                  </div>
                ) : sessionDetails ? (
                  <>
                    <div>
                      <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Session Status</h4>
                      <p>Completed: {sessionDetails.completed ? 'Yes' : 'No'}</p>
                      <p>Total Answers: {sessionDetails.answers?.length || 0}</p>
                    </div>
                    
                    <div>
                      <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Responses</h4>
                      {sessionDetails.answers && sessionDetails.answers.length > 0 ? (
                        sessionDetails.answers.map((answer, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '16px',
                              marginBottom: '8px',
                              backgroundColor: dashboardUtils.getSentimentColor(idx)
                            }}
                          >
                            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                              Q: {answer.questionId || answer.question_id}
                            </div>
                            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                              A: {answer.text || answer.answer_text}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No responses yet</p>
                      )}
                    </div>

                    <div>
                      <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Extracted Facts</h4>
                      {sessionDetails.facts && Object.keys(sessionDetails.facts).length > 0 ? (
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                          {Object.entries(sessionDetails.facts).map(([key, value]) => (
                            <div key={key} style={{ marginBottom: '4px' }}>
                              <strong>{key}:</strong> {value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No facts extracted yet</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>No session data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brief Modal */}
      {showBriefModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '900px',
            maxHeight: '85vh',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                  {briefData?.title || `Project Brief - Session ${selectedSession?.session_id}`}
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  AI-Generated Brief Intelligence
                </p>
              </div>
              <button
                onClick={closeBriefModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ height: '500px', overflowY: 'auto', paddingRight: '16px' }}>
              {loadingBrief ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading brief...</p>
                </div>
              ) : briefData?.error ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#dc2626' }}>
                  <p>{briefData.error}</p>
                </div>
              ) : briefData ? (
                <div>
                  <InlineStyledBrief brief={briefData} user={user} maxHeight="400px" />
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <StyledBriefButton brief={briefData} user={user} variant="default" />
                    <EnhancedDownloadButton
                      briefId={briefData?.id}
                      orgId={user?.orgId}
                      briefContent={briefData?.summary_md}
                      sessionId={briefData?.session_id}
                      variant="outline"
                      size="default"
                    />
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          const result = await dashboardUtils.createQuickShareLink(briefData.id);
                          if (result?.success) {
                            showSuccess('Share link created and copied to clipboard!');
                          } else {
                            showError(`Failed to create share link: ${result?.error || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('Error creating share link:', error);
                          showError(`Failed to create share link: ${error.message}`);
                        }
                      }}
                    >
                      <Share2 style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                      Share Brief
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>No brief data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
