import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { CheckCircle, Eye, FileText } from '../../ui/icons';

/**
 * Reviews tab component
 */
export function ReviewsTab({ briefsForReview, loading, onSubmitReview, onViewDetails, onViewDocument }) {
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
                    {brief.priority ? (
                      <Badge variant="outline" style={{ fontSize: '12px' }}>
                        Priority {brief.priority}
                      </Badge>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '14px' }}>Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {brief.review_status === 'pending' && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map((priority) => (
                            <Button
                              key={priority}
                              size="sm"
                              variant="outline"
                              onClick={() => onSubmitReview(brief.id, priority)}
                              style={{ 
                                minWidth: '32px', 
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: priority <= 2 ? '#fef2f2' : priority <= 4 ? '#fffbeb' : '#fef2f2',
                                borderColor: priority <= 2 ? '#fca5a5' : priority <= 4 ? '#fbbf24' : '#f87171',
                                color: priority <= 2 ? '#dc2626' : priority <= 4 ? '#d97706' : '#dc2626'
                              }}
                            >
                              {priority}
                            </Button>
                          ))}
                        </div>
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onViewDocument(brief)}
                        style={{ fontSize: '12px' }}
                      >
                        <FileText style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                        View Brief
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
