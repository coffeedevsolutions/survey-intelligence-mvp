import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSubmenu } from '../../../components/ui/dropdown-menu';
import { CheckCircle, Eye, FileText, Calendar, User, Target, Clock, Code, Globe, MoreHorizontal, Download, ChevronRight, File, MessageSquare, Mail, Share2, Filter, X, ChevronUp, ChevronDown } from '../../../components/ui/icons';
import { PriorityDisplay } from '../../../components/ui/priority-input';
import { EnhancedPriorityModal } from '../../../components/ui/enhanced-priority-modal';
import { BriefCommentsModal } from '../modals/BriefCommentsModal';
import { ReviewModal } from '../modals/ReviewModal';
import { getFramework } from '../../../utils/prioritizationFrameworks';
import { API_BASE_URL } from '../../../utils/api';
import { dashboardUtils } from '../../../utils/dashboardApi';
import { useNotifications } from '../../../components/ui/notifications';
import { useSolutionGenerationContext } from '../../../hooks/useSolutionGenerationContext';
import { SolutionGenerationQueue } from '../../solutionmgmt/components/SolutionGenerationQueue';
import { PMTemplateSelector } from '../../solutionmgmt/components/PMTemplateSelector';

/**
 * Enhanced Reviews Tab Component with improved UX
 */
export function EnhancedReviewsTab({ briefsForReview, loading, onSubmitReview, onViewDetails, onViewDocument, user, onRefreshBriefs }) {
  const { showSuccess, showError } = useNotifications();
  const { addGeneratingItem, generatingItems, removeGeneratingItem } = useSolutionGenerationContext();
  const navigate = useNavigate();
  
  const [orgSettings, setOrgSettings] = useState(null);
  const [priorityModal, setPriorityModal] = useState(null);
  const [selectedBriefs, setSelectedBriefs] = useState(new Set());
  const [commentsModal, setCommentsModal] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [briefForSolution, setBriefForSolution] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  // Sorting states
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    campaigns: [],
    priority: [],
    frameworks: [],
    dateRange: { start: '', end: '' }
  });

  // Clear selected briefs when switching tabs
  useEffect(() => {
    setSelectedBriefs(new Set());
  }, [activeTab]);

  // Fetch organization settings
  useEffect(() => {
    const fetchOrgSettings = async () => {
      if (!user?.orgId) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/settings/branding`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrgSettings(data.settings || {});
        }
      } catch (error) {
        console.error('Error fetching org settings:', error);
      }
    };

    fetchOrgSettings();
  }, [user?.orgId]);

  // Get enabled frameworks and default
  const enabledFrameworks = orgSettings?.enabled_prioritization_frameworks || ['simple', 'ice', 'moscow'];
  const defaultFramework = orgSettings?.prioritization_framework || 'simple';

  const handleModalSave = async (priorityValue, frameworkId) => {
    if (!priorityModal) return;
    
    await onSubmitReview(priorityModal.brief.id, priorityValue, frameworkId);
    setPriorityModal(null);
  };

  const handleShowComments = (brief) => {
    setCommentsModal(brief);
  };

  const handleCommentAdded = () => {
    // Refresh briefs list to update comment counts
    if (onRefreshBriefs) {
      onRefreshBriefs();
    }
  };

  const handleResubmitSent = () => {
    // Refresh briefs list to update resubmit counts
    if (onRefreshBriefs) {
      onRefreshBriefs();
    }
  };

  const handleOpenReview = (brief) => {
    setReviewModal(brief);
  };

  const handleShareBrief = async (brief) => {
    try {
      const result = await dashboardUtils.createQuickShareLink(brief.id);
      if (result?.success) {
        showSuccess('Share link created and copied to clipboard!');
      } else {
        showError(`Failed to create share link: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      showError(`Failed to create share link: ${error.message}`);
    }
  };

  const handleGenerateSolution = async (brief) => {
    setBriefForSolution(brief);
    setShowTemplateSelector(true);
  };

  // Handle template selection and solution generation
  const handleGenerateWithTemplate = async (templateId) => {
    try {
      const brief = briefForSolution;
      
      // Add to generation queue immediately
      addGeneratingItem(
        brief.id, 
        brief.title || `Brief #${brief.id}`,
        brief.description || brief.content?.substring(0, 100) + '...'
      );

      // Show enhanced success toast with navigation link
      const toastContent = (
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="font-medium">Generating solution breakdown...</p>
            <p className="text-sm text-gray-600">This may take 15-20 seconds</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/solution-management')}
            className="ml-3 text-xs"
          >
            View Progress
          </Button>
        </div>
      );
      
      showSuccess(toastContent);
      
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/solutions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          briefId: brief.id,
          templateId: templateId 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate solution');
      }

      await response.json(); // Response received successfully
      showSuccess('Solution generated successfully! Check the Solutions tab to view details.');
      
      // Refresh briefs to update the status
      if (onRefreshBriefs) {
        onRefreshBriefs();
      }
    } catch (error) {
      console.error('Error generating solution:', error);
      showError(`Failed to generate solution: ${error.message}`);
    }
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedBriefs.size === sortedBriefs.length) {
      setSelectedBriefs(new Set());
    } else {
      setSelectedBriefs(new Set(sortedBriefs.map(b => b.id)));
    }
  };

  const handleSelectBrief = (briefId) => {
    const newSelected = new Set(selectedBriefs);
    if (newSelected.has(briefId)) {
      newSelected.delete(briefId);
    } else {
      newSelected.add(briefId);
    }
    setSelectedBriefs(newSelected);
  };

  // Download handler function
  const handleDownloadBrief = async (brief, format) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename, content, mimeType;
    
    const briefContent = brief.summary_md || 'No content available';
    const briefHeader = `# ${brief.title || 'Untitled Brief'}

**Brief ID:** ${brief.id}
**Campaign:** ${brief.campaign_name || 'N/A'}
**Created:** ${new Date(brief.created_at).toLocaleDateString()}
${brief.reviewed_at ? `**Reviewed:** ${new Date(brief.reviewed_at).toLocaleDateString()}` : ''}

---

`;

    switch (format) {
      case 'html':
        filename = `brief-${brief.id}-${timestamp}.html`;
        content = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Brief - ${brief.title || 'Untitled'}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem; 
      line-height: 1.6;
      color: #1f2937;
    }
    h1 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 2rem; }
    pre { white-space: pre-wrap; font-family: inherit; background: #f9fafb; padding: 1rem; border-radius: 0.375rem; }
    .brief-header { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="brief-header">
    <h1>${brief.title || 'Untitled Brief'}</h1>
    <p><strong>Brief ID:</strong> ${brief.id}</p>
    <p><strong>Campaign:</strong> ${brief.campaign_name || 'N/A'}</p>
    <p><strong>Created:</strong> ${new Date(brief.created_at).toLocaleDateString()}</p>
    ${brief.reviewed_at ? `<p><strong>Reviewed:</strong> ${new Date(brief.reviewed_at).toLocaleDateString()}</p>` : ''}
  </div>
  <pre>${briefContent}</pre>
</body>
</html>`;
        mimeType = 'text/html';
        break;
        
      case 'pdf':
        try {


          const apiUrl = API_BASE_URL || 'http://localhost:8787';
          const exportUrl = `${apiUrl}/api/orgs/${user?.orgId}/briefs/${brief.id}/export/pdf`;
          
          const response = await fetch(exportUrl, { 
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf'
            }
          });
          
          if (!response.ok) throw new Error('PDF export failed');
          
          const blob = await response.blob();
          filename = `brief-${brief.id}-${timestamp}.pdf`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        } catch (error) {
          console.error('PDF export failed:', error);
          alert('PDF export failed. Please try again.');
          return;
        }
        
      case 'docx':
        try {
          const apiUrl = API_BASE_URL || 'http://localhost:8787';
          const exportUrl = `${apiUrl}/api/orgs/${user?.orgId}/briefs/${brief.id}/export/docx`;
          
          const response = await fetch(exportUrl, { 
            credentials: 'include',
            headers: {
              'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
          });
          
          if (!response.ok) throw new Error('DOCX export failed');
          
          const blob = await response.blob();
          filename = `brief-${brief.id}-${timestamp}.docx`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        } catch (error) {
          console.error('DOCX export failed:', error);
          alert('DOCX export failed. Please try again.');
          return;
        }
        
      default: // markdown
        filename = `brief-${brief.id}-${timestamp}.md`;
        content = briefHeader + briefContent;
        mimeType = 'text/markdown';
        break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logic
  const getUniqueCampaigns = () => {
    const campaigns = briefsForReview
      .map(b => b.campaign_name)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
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

  const getFrameworkOptions = () => {
    return enabledFrameworks.map(frameworkId => {
      const framework = getFramework(frameworkId);
      return {
        value: frameworkId,
        label: framework.name
      };
    });
  };

  const applyFilters = (briefs) => {
    return briefs.filter(brief => {
      // Campaign filter
      if (filters.campaigns.length > 0) {
        const campaignName = brief.campaign_name || '';
        if (!filters.campaigns.includes(campaignName)) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority.length > 0) {
        const priorityValue = brief.priority_data?.value || brief.priority;
        if (!filters.priority.includes(priorityValue)) {
          return false;
        }
      }

      // Framework filter
      if (filters.frameworks.length > 0) {
        const frameworkId = brief.priority_data?.framework_id || 'simple';
        if (!filters.frameworks.includes(frameworkId)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const briefDate = new Date(brief.created_at);
        
        if (isNaN(briefDate.getTime())) {
          return false;
        }
        
        if (filters.dateRange.start && filters.dateRange.start.trim() !== '') {
          const startDate = new Date(filters.dateRange.start);
          if (!isNaN(startDate.getTime())) {
            startDate.setHours(0, 0, 0, 0);
            if (briefDate < startDate) {
              return false;
            }
          }
        }
        if (filters.dateRange.end && filters.dateRange.end.trim() !== '') {
          const endDate = new Date(filters.dateRange.end);
          if (!isNaN(endDate.getTime())) {
            endDate.setHours(23, 59, 59, 999);
            if (briefDate > endDate) {
              return false;
            }
          }
        }
      }

      return true;
    });
  };

  // Filter briefs by review status and apply filters
  const filteredBriefs = useMemo(() => {
    const statusFiltered = briefsForReview.filter(brief => {
      if (activeTab === 'pending') {
        return brief.review_status === 'pending';
      } else {
        return brief.review_status === 'reviewed' || brief.review_status === 'solutioned';
      }
    });
    return applyFilters(statusFiltered);
  }, [briefsForReview, activeTab, filters]);

  // Sort briefs
  const sortedBriefs = useMemo(() => {
    return [...filteredBriefs].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'campaign_name':
          aValue = a.campaign_name || '';
          bValue = b.campaign_name || '';
          break;
        case 'priority':
          aValue = a.priority_data?.value || a.priority || 999;
          bValue = b.priority_data?.value || b.priority || 999;
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'reviewed_at':
          aValue = new Date(a.reviewed_at || 0);
          bValue = new Date(b.reviewed_at || 0);
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
  }, [filteredBriefs, sortField, sortDirection]);

  // Get counts for tabs
  const pendingCount = briefsForReview.filter(brief => brief.review_status === 'pending').length;
  const reviewedCount = briefsForReview.filter(brief => brief.review_status === 'reviewed' || brief.review_status === 'solutioned').length;

  // Filter and sort handlers
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      campaigns: [],
      priority: [],
      frameworks: [],
      dateRange: { start: '', end: '' }
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.campaigns.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.frameworks.length > 0) count++;
    if (filters.dateRange.start !== '' || filters.dateRange.end !== '') count++;
    return count;
  };

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
      return <ChevronUp className="w-4 h-4 opacity-30" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  // Debug logging (remove later)
  console.log('📊 Brief Review Status Debug:', {
    totalBriefs: briefsForReview.length,
    pendingCount,
    reviewedCount,
    activeTab,
    filteredCount: filteredBriefs.length,
    sampleStatuses: briefsForReview.slice(0, 3).map(b => ({ id: b.id, status: b.review_status }))
  });

  if (loading) {
    return (
      <Card className="shadow-sm border">
        <CardContent className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading briefs for review...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Solution Generation Queue */}
      <SolutionGenerationQueue 
        generatingItems={generatingItems}
        onViewSolutions={() => navigate('/solution-management')}
        onRemoveItem={removeGeneratingItem}
      />

      <div className="flex flex-col space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Reviews
              {pendingCount > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviewed')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reviewed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reviewed
              {reviewedCount > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {reviewedCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Header with bulk actions - Survey Manager Style */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'pending' ? 'Pending Reviews' : 'Reviewed Briefs'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {activeTab === 'pending' 
                ? 'Review and prioritize project briefs from survey responses'
                : 'View previously reviewed and prioritized briefs'
              }
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
            {selectedBriefs.size > 0 && activeTab === 'pending' && (
              <Button 
                onClick={() => {/* TODO: Implement bulk review */}}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <Target className="w-4 h-4 mr-2" />
                Review {selectedBriefs.size} Selected
              </Button>
            )}
            <Badge variant="outline" className="text-sm px-4 py-2">
              {sortedBriefs.length} {activeTab === 'pending' ? 'Pending' : 'Reviewed'} Briefs
            </Badge>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filter Briefs</h3>
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

              {/* Framework Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Framework
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getFrameworkOptions().map(framework => (
                    <label key={framework.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.frameworks.includes(framework.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleFilterChange('frameworks', [...filters.frameworks, framework.value]);
                          } else {
                            handleFilterChange('frameworks', filters.frameworks.filter(f => f !== framework.value));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{framework.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created Date
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

        {/* Modern Table Container - Survey Manager Style */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="w-12 pl-4">
                    <input
                      type="checkbox"
                      checked={selectedBriefs.size === sortedBriefs.length && sortedBriefs.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      Brief Title
                      {getSortIcon('title')}
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
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Priority
                      {getSortIcon('priority')}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Framework
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Last Activity
                      {getSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBriefs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        {briefsForReview.length > 0 ? (
                          <>
                            <Filter className="w-12 h-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No briefs match your current filter
                            </h3>
                            <p className="text-gray-500 mb-4">
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
                          </>
                        ) : (
                          <>
                            <Target className="w-12 h-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {activeTab === 'pending' ? 'No pending reviews' : 'No reviewed briefs'}
                            </h3>
                            <p className="text-gray-500">
                              {activeTab === 'pending' 
                                ? 'All briefs have been reviewed and prioritized.'
                                : 'No briefs have been reviewed yet.'
                              }
                            </p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBriefs.map((brief) => (
                    <BriefTableRow
                      key={brief.id}
                      brief={brief}
                      selected={selectedBriefs.has(brief.id)}
                      onSelect={() => handleSelectBrief(brief.id)}
                      onViewDetails={onViewDetails}
                      onViewDocument={onViewDocument}
                      onDownloadBrief={handleDownloadBrief}
                      onShowComments={handleShowComments}
                      onOpenReview={handleOpenReview}
                      onShareBrief={handleShareBrief}
                      onGenerateSolution={handleGenerateSolution}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Enhanced Priority Modal */}
      {priorityModal && (
        <EnhancedPriorityModal
          isOpen={true}
          onClose={() => setPriorityModal(null)}
          onSave={handleModalSave}
          enabledFrameworks={enabledFrameworks}
          defaultFramework={defaultFramework}
          currentValue={priorityModal.currentValue}
          currentFramework={priorityModal.currentFramework}
          briefTitle={priorityModal.brief.title || 'Untitled Brief'}
        />
      )}

      {/* Comments Modal */}
      {commentsModal && (
        <BriefCommentsModal
          isOpen={true}
          onClose={() => setCommentsModal(null)}
          brief={commentsModal}
          user={user}
          onCommentAdded={handleCommentAdded}
          onResubmitSent={handleResubmitSent}
        />
      )}

      {/* Review Modal */}
      {reviewModal && (
        <ReviewModal
          brief={reviewModal}
          user={user}
          orgSettings={orgSettings}
          isOpen={!!reviewModal}
          onClose={() => setReviewModal(null)}
          onSave={onSubmitReview}
          onRefreshBriefs={onRefreshBriefs}
        />
      )}

      {/* PM Template Selector */}
      <PMTemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => {
          setShowTemplateSelector(false);
          setBriefForSolution(null);
        }}
        onConfirm={handleGenerateWithTemplate}
        briefTitle={briefForSolution?.title || 'Project Brief'}
      />
    </>
  );
}





/**
 * Survey Manager Style Table Row Component
 */
function BriefTableRow({ brief, selected, onSelect, onViewDetails, onViewDocument, onDownloadBrief, onShowComments, onOpenReview, onShareBrief, onGenerateSolution }) {
  const isPending = brief.review_status === 'pending';

  return (
    <TableRow 
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        selected ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      <TableCell className="pl-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </TableCell>
      
      <TableCell className="py-4 px-3">
        <div>
          <div className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
            {brief.title || 'Untitled Brief'}
            {brief.comment_count > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border border-blue-200">
                <MessageSquare className="w-2.5 h-2.5 mr-1" />
                {brief.comment_count}
              </Badge>
            )}
            {brief.resubmit_count > 0 && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border border-orange-200">
                <Mail className="w-2.5 h-2.5 mr-1" />
                {brief.resubmit_count}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-600 leading-relaxed">
            Brief #{brief.id}
            {brief.user_email && (
              <span className="ml-2 text-green-600">• Email Available</span>
            )}
          </div>
          {brief.session_id && (
            <div className="text-xs text-gray-400 font-mono mt-1">
              Session: {brief.session_id.slice(0, 8)}...
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="py-4 px-3">
        {brief.campaign_name ? (
          <div>
            <Badge 
              variant="secondary" 
              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 mb-1"
            >
              <Target className="w-2.5 h-2.5 mr-1" />
              {brief.campaign_name}
            </Badge>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">
            No campaign
          </span>
        )}
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        <PriorityDisplay 
          frameworkId={brief.framework_id || 'simple'}
          value={brief.priority_data || (brief.priority ? { value: brief.priority } : null)}
          size="sm"
          showScore={true}
        />
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        <Badge 
          variant={
            brief.review_status === 'pending' ? "secondary" : 
            brief.review_status === 'solutioned' ? "default" : 
            "default"
          }
          className={`text-xs ${
            brief.review_status === 'pending' 
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
              : brief.review_status === 'solutioned'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          {brief.review_status === 'pending' ? (
            <Clock className="w-3 h-3 mr-1" />
          ) : brief.review_status === 'solutioned' ? (
            <CheckCircle className="w-3 h-3 mr-1" />
          ) : (
            <CheckCircle className="w-3 h-3 mr-1" />
          )}
          {brief.review_status === 'pending' ? 'Pending' : 
           brief.review_status === 'solutioned' ? 'Solutioned' : 
           'Reviewed'}
        </Badge>
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        {brief.framework_id && brief.framework_id !== 'simple' ? (
          <Badge 
            variant="outline" 
            className="text-xs bg-purple-100 text-purple-800 border border-purple-200"
          >
            {getFramework(brief.framework_id).name}
          </Badge>
        ) : (
          <span className="text-xs text-gray-400 italic">
            Simple
          </span>
        )}
      </TableCell>

      <TableCell className="py-4 px-3">
        <div className="text-xs text-gray-600">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" />
            Created {new Date(brief.created_at).toLocaleDateString()}
          </div>
          {brief.reviewed_at && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Reviewed {new Date(brief.reviewed_at).toLocaleDateString()}
            </div>
          )}
          {brief.reviewed_by_email && (
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3" />
              {brief.reviewed_by_email}
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {isPending && (
            <Button
              size="sm"
              onClick={() => onOpenReview(brief)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs px-2 py-1"
            >
              <Target className="w-3 h-3 mr-1" />
              Review
            </Button>
          )}
          
          <DropdownMenu align="right">
            <DropdownMenuItem onClick={() => onViewDetails(brief)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewDocument(brief)}>
              <FileText className="w-4 h-4 mr-2" />
              Styled View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onShareBrief(brief)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Brief
            </DropdownMenuItem>
            {brief.review_status === 'solutioned' ? (
              <DropdownMenuItem onClick={() => navigate('/solution-management')}>
                <Eye className="w-4 h-4 mr-2" />
                View Solution
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onGenerateSolution(brief)}>
                <Target className="w-4 h-4 mr-2" />
                Generate Solution
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onShowComments(brief)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Comments {brief.comment_count > 0 && `(${brief.comment_count})`}
            </DropdownMenuItem>
            {brief.can_resubmit ? (
              <DropdownMenuItem onClick={() => onShowComments(brief)}>
                <Mail className="w-4 h-4 mr-2" />
                Request Resubmit {brief.resubmit_count > 0 && `(${brief.resubmit_count})`}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <Mail className="w-4 h-4 mr-2 opacity-50" />
                Resubmit Unavailable
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSubmenu 
              trigger={
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </>
              }
            >
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'html');
              }}>
                <Globe className="w-4 h-4 mr-2" />
                Styled HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'markdown');
              }}>
                <Code className="w-4 h-4 mr-2" />
                Plain Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'pdf');
              }}>
                <File className="w-4 h-4 mr-2" />
                PDF Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'docx');
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Word Document
              </DropdownMenuItem>
            </DropdownMenuSubmenu>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
