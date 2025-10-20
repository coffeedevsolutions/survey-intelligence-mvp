import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { RotateCcw, Trash2, Calendar, ClipboardList, ChevronUp, ChevronDown, Filter, X } from '../../../components/ui/icons.jsx';
import { useArchive } from '../../../hooks/useArchive.js';
import { campaignUtils } from '../../../utils/campaignsApi.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';

/**
 * Archived Campaigns tab component
 */
export function ArchivedCampaignsTab({ user, onRefresh, showFilters, setShowFilters, getActiveFilterCount, clearAllFilters, onCountUpdate }) {
  const [archivedCampaigns, setArchivedCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('archived_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const { restoreCampaign, deleteCampaignPermanently, getArchivedCampaigns } = useArchive(user);
  const { showSuccess, showError, confirm } = useNotifications();

  const fetchArchivedCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      console.log('ArchivedCampaignsTab: Fetching archived campaigns for user:', user);
      console.log('ArchivedCampaignsTab: User orgId:', user?.orgId);
      const campaigns = await getArchivedCampaigns();
      console.log('ArchivedCampaignsTab: Campaigns from useArchive hook:', campaigns);
      console.log('ArchivedCampaignsTab: Campaigns type:', typeof campaigns);
      console.log('ArchivedCampaignsTab: Campaigns array length:', campaigns?.length);
      setArchivedCampaigns(campaigns);
      console.log('ArchivedCampaignsTab: State set to campaigns array:', campaigns);
    } catch (error) {
      console.error('ArchivedCampaignsTab: Failed to fetch archived campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getArchivedCampaigns]);

  useEffect(() => {
    if (user?.orgId) {
      fetchArchivedCampaigns();
    }
  }, [user?.orgId, fetchArchivedCampaigns]);

  // Notify parent of count changes
  useEffect(() => {
    if (onCountUpdate) {
      onCountUpdate('campaigns', archivedCampaigns.length);
    }
  }, [archivedCampaigns.length, onCountUpdate]);

  const handleRestoreCampaign = async (campaign) => {
    await confirm({
      title: `Restore campaign "${campaign.name}"?`,
      message: 'Are you sure you want to restore this campaign? This will also restore all its archived surveys.',
      confirmText: 'Restore',
      variant: 'default',
      onConfirm: async () => {
        const success = await restoreCampaign(campaign.id);
        if (success) {
          showSuccess('Campaign restored successfully!');
          fetchArchivedCampaigns(); // Refresh archived list
          if (onRefresh) onRefresh(); // Refresh main dashboard
        } else {
          showError('Failed to restore campaign. Please try again.');
        }
      }
    });
  };

  const handleDeleteCampaign = async (campaign) => {
    await confirm({
      title: `Delete campaign "${campaign.name}"?`,
      message: 'Are you sure you want to PERMANENTLY DELETE this campaign? This will delete all associated surveys and data. This action cannot be undone!',
      confirmText: 'Delete Forever',
      variant: 'destructive',
      onConfirm: async () => {
        const success = await deleteCampaignPermanently(campaign.id);
        if (success) {
          showSuccess('Campaign permanently deleted!');
          fetchArchivedCampaigns(); // Refresh archived list
        } else {
          showError('Failed to delete campaign. Please try again.');
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

  const sortedCampaigns = useMemo(() => {
    return [...archivedCampaigns].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'survey_count':
          aValue = a.survey_count || 0;
          bValue = b.survey_count || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'archived_at':
          aValue = new Date(a.archived_at || 0);
          bValue = new Date(b.archived_at || 0);
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
  }, [archivedCampaigns, sortField, sortDirection]);

  if (loading) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
        <CardContent style={{ padding: '24px', textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading archived campaigns...</p>
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
              <h2 className="text-xl font-semibold text-gray-900">Archived Campaigns</h2>
              <Badge variant="outline" className="text-xs">
                {archivedCampaigns.length} Archived Campaigns
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Campaigns that have been archived. You can restore them or permanently delete them.
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
        {archivedCampaigns.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
            <Calendar style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No archived campaigns found.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Archived campaigns will appear here when you archive them from the campaigns page.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f9fafb' }}>
                <TableHead 
                  className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none w-1/2"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Campaign Details
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold text-gray-700 text-sm text-center cursor-pointer hover:bg-gray-100 transition-colors select-none w-20"
                  onClick={() => handleSort('survey_count')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Sessions
                    {getSortIcon('survey_count')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none w-32"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Last Activity
                    {getSortIcon('created_at')}
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
              {sortedCampaigns.map((campaign) => (
                <TableRow key={campaign.id} style={{ transition: 'background-color 0.2s' }}>
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>
                        {campaign.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        {campaign.purpose || 'No description provided'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        Slug: {campaign.slug}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                        {campaign.session_count || 0}
                      </div>
                      <ClipboardList style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {campaign.last_session_at ? campaignUtils.formatDate(campaign.last_session_at) : 'No activity'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {campaignUtils.formatDate(campaign.archived_at)}
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
                        onClick={() => handleRestoreCampaign(campaign)}
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
                        onClick={() => handleDeleteCampaign(campaign)}
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
