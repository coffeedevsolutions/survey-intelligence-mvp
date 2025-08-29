import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { RotateCcw, Trash2, Users, FileText } from '../../ui/icons';
import { dashboardUtils } from '../../../utils/dashboardApi.js';
import { useArchive } from '../../../hooks/useArchive.js';
import { useNotifications } from '../../ui/notifications.jsx';

/**
 * Archived Surveys tab component
 */
export function ArchivedSurveysTab({ user, onRefresh }) {
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { restoreSession, deleteSessionPermanently, getArchivedSessions } = useArchive(user);
  const { showSuccess, showError, confirm } = useNotifications();

  const fetchArchivedSessions = async () => {
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
  };

  useEffect(() => {
    if (user?.orgId) {
      fetchArchivedSessions();
    }
  }, [user?.orgId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Archived Surveys</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Surveys that have been archived. You can restore them or permanently delete them.
            </CardDescription>
          </div>
          <Badge variant="outline" style={{ fontSize: '12px' }}>
            {archivedSessions.length} Archived Surveys
          </Badge>
        </div>
      </CardHeader>
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
                <TableHead style={{ fontWeight: '600' }}>Survey Details</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Campaign</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Responses</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Archived Date</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedSessions.map((session) => (
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
                        Created: {dashboardUtils.formatDate(session.created_at)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px' }}>
                      {session.campaign_name || 'No Campaign'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                        {session.answer_count || 0}
                      </div>
                      <Users style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {dashboardUtils.formatDate(session.archived_at)}
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
  );
}
