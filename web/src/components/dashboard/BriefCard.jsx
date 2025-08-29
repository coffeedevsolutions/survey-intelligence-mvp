import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { FileText, Share2, CheckCircle, Users, Calendar, TrendingUp } from '../ui/icons';
import { dashboardUtils } from '../../utils/dashboardApi.js';

/**
 * Brief Card Component for displaying individual survey briefs
 */
export function BriefCard({ session, onFetchBrief }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadBrief = async () => {
    if (brief) return; // Already loaded
    
    setLoading(true);
    const briefData = await onFetchBrief(session.session_id);
    if (briefData) {
      setBrief(briefData);
    }
    setLoading(false);
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
                Project Brief - Session {session.session_id}
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
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
            {brief.summary_md || 'Brief content not available'}
          </div>
        </div>
        
        <Separator />

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', flexWrap: 'wrap' }}>
          <Button 
            variant="outline" 
            style={{ backgroundColor: 'white' }}
            onClick={() => dashboardUtils.downloadBrief(brief.summary_md, session.session_id)}
          >
            <FileText style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Download Brief
          </Button>
          <Button 
            variant="outline"
            onClick={() => dashboardUtils.createQuickShareLink(brief.id)}
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
