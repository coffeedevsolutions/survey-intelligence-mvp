import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { RotateCcw, Trash2, Calendar, Users } from '../../../components/ui/icons.jsx';
import { useArchive } from '../../../hooks/useArchive.js';
import { campaignUtils } from '../../../utils/campaignsApi.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';

/**
 * Archived Campaigns tab component
 */
export function ArchivedCampaignsTab({ user, onRefresh }) {
  const [archivedCampaigns, setArchivedCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { restoreCampaign, deleteCampaignPermanently, getArchivedCampaigns } = useArchive(user);
  const { showSuccess, showError, confirm } = useNotifications();

  const fetchArchivedCampaigns = async () => {
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
  };

  useEffect(() => {
    if (user?.orgId) {
      fetchArchivedCampaigns();
    }
  }, [user?.orgId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Archived Campaigns</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Campaigns that have been archived. You can restore them or permanently delete them.
            </CardDescription>
          </div>
          <Badge variant="outline" style={{ fontSize: '12px' }}>
            {archivedCampaigns.length} Archived Campaigns
          </Badge>
        </div>
      </CardHeader>
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
                <TableHead style={{ fontWeight: '600' }}>Campaign Details</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Sessions</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Last Activity</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Archived Date</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedCampaigns.map((campaign) => (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                        {campaign.session_count || 0}
                      </div>
                      <Users style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
  );
}
