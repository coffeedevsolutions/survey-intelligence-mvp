import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { FileText } from '../../../components/ui/icons.jsx';
import { BriefCard } from '../../dashboard/components/BriefCard.jsx';

/**
 * Briefs tab component
 */
export function BriefsTab({ sessions, briefsGenerated, onFetchBrief }) {
  return (
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle style={{ fontSize: '20px', color: '#111827' }}>AI-Generated Brief Intelligence</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Prioritize and act on insights from individual survey responses
            </CardDescription>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="outline" style={{ fontSize: '12px' }}>
              {briefsGenerated} Active Briefs
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sessions
            .filter(session => session.has_brief)
            .map((session) => (
              <BriefCard 
                key={session.session_id} 
                session={session} 
                onFetchBrief={onFetchBrief}
              />
            ))}
          
          {briefsGenerated === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              <FileText style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
              <p>No briefs generated yet. Complete some surveys to see AI-generated insights here.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
