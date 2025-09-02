import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { FileText, Share2, CheckCircle, Users, Calendar, TrendingUp } from '../ui/icons';
import { EnhancedDownloadButton } from '../ui/enhanced-download';
import { InlineStyledBrief, StyledBriefButton } from '../ui/styled-brief-viewer';
import { dashboardUtils } from '../../utils/dashboardApi.js';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../ui/notifications';

/**
 * Brief Card Component for displaying individual survey briefs
 */
export function BriefCard({ session, onFetchBrief }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();

  const loadBrief = async () => {
    if (brief) return; // Already loaded
    
    setLoading(true);
    try {
      const briefData = await onFetchBrief(session.session_id);
      if (briefData) {
        console.log('Brief loaded:', { 
          briefId: briefData.id, 
          orgId: session.org_id, 
          sessionId: session.session_id,
          hasSummary: !!briefData.summary_md 
        });
        setBrief(briefData);
      }
    } catch (error) {
      console.error('Error loading brief:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrief();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card style={{ borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent style={{ padding: '24px' }}>
          <div>Loading brief...</div>
        </CardContent>
      </Card>
    );
  }

  if (!brief) {
    return (
      <Card style={{ borderLeft: '4px solid #6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent style={{ padding: '24px' }}>
          <div>Brief not available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <CardHeader style={{ paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <CardTitle style={{ fontSize: '18px', color: '#111827' }}>
                {brief?.title || `Project Brief - Session ${session.session_id}`}
              </CardTitle>
              <Badge variant="outline" style={{ fontSize: '12px' }}>
                Survey Brief
              </Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users style={{ width: '12px', height: '12px' }} />
                {session.answer_count || 0} responses
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar style={{ width: '12px', height: '12px' }} />
                Generated {new Date(brief.created_at).toLocaleDateString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp style={{ width: '12px', height: '12px' }} />
                Impact Score: High
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <InlineStyledBrief brief={brief} user={user} maxHeight="200px" />
        
        <Separator />

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', flexWrap: 'wrap' }}>
          <StyledBriefButton brief={brief} user={user} />
          <EnhancedDownloadButton
            briefId={brief.id}
            orgId={session.org_id}
            briefContent={brief.summary_md}
            sessionId={session.session_id}
            variant="outline"
            className="bg-white"
          />
          <Button 
            variant="outline"
            onClick={async () => {
              try {
                console.log('Share button clicked for brief:', brief.id);
                const result = await dashboardUtils.createQuickShareLink(brief.id);
                if (result?.success) {
                  showSuccess('Share link copied to clipboard!');
                } else {
                  showError(`Failed to create share link: ${result?.error || 'Unknown error'}`);
                }
              } catch (error) {
                console.error('Error in share button click:', error);
                showError(`Failed to create share link: ${error.message}`);
              }
            }}
          >
            <Share2 style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Share Brief
          </Button>
          <Button 
            style={{ 
              background: 'linear-gradient(to right, #16a34a, #059669)',
              color: 'white'
            }}
          >
            <CheckCircle style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Mark as Reviewed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
