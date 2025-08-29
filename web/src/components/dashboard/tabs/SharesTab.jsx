import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Copy, Share2, Trash2 } from '../../ui/icons';
import { dashboardUtils } from '../../../utils/dashboardApi.js';

/**
 * Shares tab component
 */
export function SharesTab({ shareLinks, onCreateShareLink, onRevokeShareLink }) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareForm, setShareForm] = useState({ 
    artifactType: 'brief', 
    artifactId: '', 
    scope: 'view',
    expiresAt: '',
    maxUses: ''
  });

  const handleCreateShareLink = async () => {
    const success = await onCreateShareLink(shareForm);
    if (success) {
      setShowShareDialog(false);
      setShareForm({ 
        artifactType: 'brief', 
        artifactId: '', 
        scope: 'view',
        expiresAt: '',
        maxUses: ''
      });
    }
  };

  return (
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Share Links</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Create and manage shareable links for external reviewers
            </CardDescription>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Badge variant="outline" style={{ fontSize: '12px' }}>
              {shareLinks.filter(s => !s.revoked).length} Active
            </Badge>
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ fontSize: '12px' }}>
                  <Share2 style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                  Create Link
                </Button>
              </DialogTrigger>
              <DialogContent style={{ maxWidth: '500px' }}>
                <DialogHeader>
                  <DialogTitle>Create Share Link</DialogTitle>
                  <DialogDescription>
                    Generate a secure link for external access
                  </DialogDescription>
                </DialogHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Content Type
                    </label>
                    <select
                      value={shareForm.artifactType}
                      onChange={(e) => setShareForm({...shareForm, artifactType: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="brief">Project Brief</option>
                      <option value="session">Survey Session</option>
                      <option value="dashboard">Dashboard View</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Content ID
                    </label>
                    <input
                      type="text"
                      value={shareForm.artifactId}
                      onChange={(e) => setShareForm({...shareForm, artifactId: e.target.value})}
                      placeholder="e.g., brief ID or session ID"
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
                      Access Level
                    </label>
                    <select
                      value={shareForm.scope}
                      onChange={(e) => setShareForm({...shareForm, scope: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="view">View Only</option>
                      <option value="comment">View & Comment</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                        Expires At (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={shareForm.expiresAt}
                        onChange={(e) => setShareForm({...shareForm, expiresAt: e.target.value})}
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
                        Max Uses (Optional)
                      </label>
                      <input
                        type="number"
                        value={shareForm.maxUses}
                        onChange={(e) => setShareForm({...shareForm, maxUses: e.target.value})}
                        placeholder="Unlimited"
                        min="1"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowShareDialog(false)}
                      style={{ fontSize: '14px' }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateShareLink}
                      style={{ fontSize: '14px' }}
                      disabled={!shareForm.artifactId}
                    >
                      Create Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f9fafb' }}>
                <TableHead style={{ fontWeight: '600' }}>Content</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Access</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Usage</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Expires</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: '500' }}>
                        {link.artifact_type} - {link.artifact_id}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Created {dashboardUtils.formatDate(link.created_at)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.scope === 'comment' ? 'default' : 'secondary'}>
                      {link.scope === 'comment' ? 'View & Comment' : 'View Only'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px' }}>
                      {link.uses} {link.max_uses ? `/ ${link.max_uses}` : ''}
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>uses</div>
                    </div>
                  </TableCell>
                  <TableCell style={{ color: '#6b7280', fontSize: '14px' }}>
                    {link.expires_at ? dashboardUtils.formatDate(link.expires_at) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        style={{ fontSize: '12px' }}
                        onClick={() => dashboardUtils.copyShareLink(link.token)}
                      >
                        <Copy style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                        Copy
                      </Button>
                      {!link.revoked && (
                        <Button
                          size="sm"
                          variant="outline"
                          style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                          onClick={() => onRevokeShareLink(link.id)}
                        >
                          <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {shareLinks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            <Share2 style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No share links created yet. Create links to share content with external reviewers.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
