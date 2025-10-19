import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { CheckCircle, Eye, FileText, Palette, Settings } from '../../../components/ui/icons.jsx';
import { StyledBriefButton } from '../../../components/ui/styled-brief-viewer.jsx';
import { EnhancedDownloadButton } from '../../../components/ui/enhanced-download.jsx';
import { PriorityQuickActions, PriorityDisplay } from '../../../components/ui/priority-input.jsx';
import { PriorityModal } from '../../../components/ui/priority-modal.jsx';
import { getFramework } from '../../../utils/prioritizationFrameworks.js';
import { API_BASE_URL } from '../../../utils/api.js';

/**
 * Reviews tab component
 */
export function ReviewsTab({ briefsForReview, loading, onSubmitReview, onViewDetails, onViewDocument, user }) {
  const [orgSettings, setOrgSettings] = useState(null);
  const [priorityModal, setPriorityModal] = useState(null);

  // Fetch organization settings to get prioritization framework
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

  // Get the current prioritization framework
  const frameworkId = orgSettings?.prioritization_framework || 'simple';
  const framework = getFramework(frameworkId);

  const handlePriorityAction = (brief, priorityData) => {
    // For composite frameworks, open modal
    if (framework.type === 'composite' || framework.type === 'matrix') {
      if (priorityData?.action === 'open_modal') {
        setPriorityModal({
          brief,
          currentValue: brief.priority_data || {}
        });
        return;
      }
    }

    // For simple frameworks, submit directly
    onSubmitReview(brief.id, priorityData, frameworkId);
  };

  const handleModalSave = async (priorityValue) => {
    if (!priorityModal) return;
    
    await onSubmitReview(priorityModal.brief.id, priorityValue, frameworkId);
    setPriorityModal(null);
  };
  if (loading) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
        <CardContent style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: '#6b7280' }}>Loading briefs for review...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Brief Reviews</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Review and prioritize project briefs from survey responses
            </CardDescription>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="outline" style={{ fontSize: '12px' }}>
              {briefsForReview.filter(b => b.review_status === 'pending').length} Pending
            </Badge>
            <Badge variant="outline" style={{ fontSize: '12px' }}>
              {briefsForReview.filter(b => b.review_status === 'reviewed').length} Reviewed
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ padding: '0' }}>
        {briefsForReview.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            <CheckCircle style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No briefs available for review at this time.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f9fafb' }}>
                <TableHead style={{ fontWeight: '600' }}>Brief Details</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Campaign</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Submitted</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Review Status</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Priority</TableHead>
                <TableHead style={{ fontWeight: '600' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {briefsForReview.map((brief) => (
                <TableRow key={brief.id} style={{ transition: 'background-color 0.2s' }}>
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>
                        {brief.title || 'Untitled Brief'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        Brief #{brief.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px', color: '#374151' }}>
                      {brief.campaign_name || 'No Campaign'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {new Date(brief.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={brief.review_status === 'pending' ? 'destructive' : 'default'}
                      style={{ fontSize: '12px' }}
                    >
                      {brief.review_status === 'pending' ? 'Pending Review' : 'Reviewed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PriorityDisplay 
                      frameworkId={frameworkId}
                      value={brief.priority_data || (brief.priority ? { value: brief.priority } : null)}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {brief.review_status === 'pending' && (
                        <PriorityQuickActions
                          frameworkId={frameworkId}
                          currentValue={brief.priority_data || (brief.priority ? { value: brief.priority } : null)}
                          onChange={(priorityData) => handlePriorityAction(brief, priorityData)}
                          className="flex gap-1"
                        />
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onViewDetails(brief)}
                        style={{ fontSize: '12px' }}
                      >
                        <Eye style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                        View Details
                      </Button>
                      <StyledBriefButton 
                        brief={brief} 
                        user={user} 
                        size="sm"
                      />
                      <EnhancedDownloadButton
                        briefId={brief?.id}
                        orgId={user?.orgId}
                        briefContent={brief?.summary_md}
                        sessionId={brief?.session_id}
                        variant="outline"
                        size="sm"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onViewDocument(brief)}
                        style={{ fontSize: '12px' }}
                      >
                        <FileText style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                        Basic View
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
    
    {/* Priority Setting Modal for composite frameworks */}
    {priorityModal && (
      <PriorityModal
        isOpen={true}
        onClose={() => setPriorityModal(null)}
        onSave={handleModalSave}
        frameworkId={frameworkId}
        currentValue={priorityModal.currentValue}
        briefTitle={priorityModal.brief.title || 'Untitled Brief'}
      />
    )}
  </>
  );
}
