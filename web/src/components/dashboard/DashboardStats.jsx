import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { BarChart3, Calendar, Users, FileText, Settings } from '../ui/icons';

/**
 * Dashboard statistics cards component
 */
export function DashboardStats({ stats, seatInfo }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '20px', 
      marginBottom: '32px'
    }}>
      <Card style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', borderColor: '#bfdbfe' }}>
        <CardContent style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500' }}>Total Surveys</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>{stats.totalSurveys}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
              <BarChart3 style={{ width: '24px', height: '24px', color: '#2563eb' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ background: 'linear-gradient(135deg, #dcfce7, #d1fae5)', borderColor: '#bbf7d0' }}>
        <CardContent style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#16a34a', fontSize: '14px', fontWeight: '500' }}>Active Surveys</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#14532d' }}>{stats.activeSurveys}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
              <Calendar style={{ width: '24px', height: '24px', color: '#16a34a' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', borderColor: '#d8b4fe' }}>
        <CardContent style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#9333ea', fontSize: '14px', fontWeight: '500' }}>Total Responses</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#581c87' }}>{stats.totalResponses.toLocaleString()}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '8px' }}>
              <Users style={{ width: '24px', height: '24px', color: '#9333ea' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderColor: '#fcd34d' }}>
        <CardContent style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#d97706', fontSize: '14px', fontWeight: '500' }}>Generated Briefs</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>{stats.briefsGenerated}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
              <FileText style={{ width: '24px', height: '24px', color: '#d97706' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {seatInfo && (
        <Card style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', borderColor: '#a5b4fc' }}>
          <CardContent style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#4338ca', fontSize: '14px', fontWeight: '500' }}>Seats Used</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#312e81' }}>
                  {seatInfo.seats_used} / {seatInfo.seats_total}
                </p>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '8px' }}>
                <Settings style={{ width: '24px', height: '24px', color: '#4338ca' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
