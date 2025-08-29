import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { ArrowUp, ArrowDown, CheckCircle, Clock, Users, UserPlus } from '../../ui/icons';

/**
 * Users tab component
 */
export function UsersTab({ users, seatInfo, onUpdateUserRole, onCreateInvite }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'requestor' });

  const handleCreateInvite = async () => {
    const success = await onCreateInvite(inviteForm);
    if (success) {
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'requestor' });
    }
  };

  return (
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <CardTitle style={{ fontSize: '20px', color: '#111827', marginBottom: '4px' }}>User Management</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Manage user roles and permissions in your organization
            </CardDescription>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Badge variant="outline" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
              {users.length} Users
            </Badge>
            {seatInfo && (
              <Badge variant="outline" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                {seatInfo.seats_used}/{seatInfo.seats_total} Seats
              </Badge>
            )}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ fontSize: '12px', padding: '6px 12px' }}>
                  <UserPlus style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent style={{ maxWidth: '400px' }}>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      placeholder="user@company.com"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Role
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="requestor">Requestor</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowInviteDialog(false)}
                      style={{ fontSize: '14px' }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateInvite}
                      style={{ fontSize: '14px' }}
                      disabled={!inviteForm.email}
                    >
                      Send Invite
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto', minWidth: '100%' }}>
          <Table style={{ minWidth: '640px' }}>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f9fafb' }}>
                <TableHead style={{ fontWeight: '600', padding: '12px 16px' }}>Email</TableHead>
                <TableHead style={{ fontWeight: '600', padding: '12px 16px' }}>Role</TableHead>
                <TableHead style={{ fontWeight: '600', padding: '12px 16px', textAlign: 'center' }}>Verified</TableHead>
                <TableHead style={{ fontWeight: '600', padding: '12px 16px' }}>Joined</TableHead>
                <TableHead style={{ fontWeight: '600', padding: '12px 16px', minWidth: '200px' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.email} style={{ transition: 'background-color 0.2s' }}>
                  <TableCell style={{ 
                    fontWeight: 500, 
                    padding: '12px 16px',
                    wordBreak: 'break-word',
                    maxWidth: '200px'
                  }}>
                    <div style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell style={{ padding: '12px 16px' }}>
                    <Badge 
                      variant={user.role === 'admin' ? 'default' : user.role === 'reviewer' ? 'secondary' : 'outline'}
                      style={{ 
                        textTransform: 'capitalize',
                        fontSize: '12px',
                        padding: '4px 8px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {user.email_verified ? (
                      <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
                    ) : (
                      <Clock style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                    )}
                  </TableCell>
                  <TableCell style={{ 
                    color: '#6b7280', 
                    fontSize: '14px', 
                    padding: '12px 16px',
                    whiteSpace: 'nowrap'
                  }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell style={{ padding: '12px 16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '6px', 
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      {user.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateUserRole(user.email, 'admin')}
                          style={{ 
                            fontSize: '11px', 
                            padding: '4px 8px',
                            minWidth: 'auto',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ArrowUp style={{ width: '12px', height: '12px' }} />
                          <span className="hidden sm:inline">Make </span>Admin
                        </Button>
                      )}
                      {user.role !== 'reviewer' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateUserRole(user.email, 'reviewer')}
                          style={{ 
                            fontSize: '11px', 
                            padding: '4px 8px',
                            minWidth: 'auto',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span className="hidden sm:inline">Make </span>Reviewer
                        </Button>
                      )}
                      {user.role !== 'requestor' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateUserRole(user.email, 'requestor')}
                          style={{ 
                            fontSize: '11px', 
                            padding: '4px 8px',
                            minWidth: 'auto',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ArrowDown style={{ width: '12px', height: '12px' }} />
                          <span className="hidden sm:inline">Make </span>Requestor
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {users.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '48px 24px', 
            color: '#6b7280' 
          }}>
            <Users style={{ 
              width: '48px', 
              height: '48px', 
              margin: '0 auto 16px', 
              opacity: 0.5 
            }} />
            <p style={{ fontSize: '16px', fontWeight: '500' }}>No users found in your organization.</p>
            <p style={{ fontSize: '14px', marginTop: '8px', color: '#9ca3af' }}>
              Users will appear here after they sign up with Auth0.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
