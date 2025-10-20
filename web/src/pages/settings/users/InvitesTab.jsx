import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Copy, UserPlus } from '../../../components/ui/icons.jsx';
import { dashboardUtils } from '../../../utils/dashboardApi.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';

/**
 * Invites tab component
 */
export function InvitesTab({ invites }) {
  const { showSuccess } = useNotifications();
  
  const copyInviteLink = (token) => {
    const inviteUrl = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    showSuccess('Invite link copied to clipboard!');
  };

  return (
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Pending Invitations</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Manage pending invitations to join your organization
            </CardDescription>
          </div>
          <Badge variant="outline" style={{ fontSize: '12px' }}>
            {invites.filter(i => !i.accepted).length} Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f9fafb' }}>
                <TableHead style={{ fontWeight: '600' }}>Email</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Role</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Status</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Expires</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell style={{ fontWeight: '500' }}>{invite.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" style={{ textTransform: 'capitalize' }}>
                      {invite.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={invite.accepted ? 'default' : 'secondary'}>
                      {invite.accepted ? 'Accepted' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ color: '#6b7280', fontSize: '14px' }}>
                    {dashboardUtils.formatDate(invite.expires_at)}
                  </TableCell>
                  <TableCell>
                    {!invite.accepted && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          style={{ fontSize: '12px' }}
                          onClick={() => copyInviteLink(invite.token)}
                        >
                          <Copy style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                          Copy Link
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {invites.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            <UserPlus style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No invitations sent yet. Use the "Invite User" button to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
