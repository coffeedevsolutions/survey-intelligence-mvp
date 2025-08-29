import { Button } from '../ui/button';
import { Sparkles } from '../ui/icons';

/**
 * Dashboard header component
 */
export function DashboardHeader({ onBack }) {
  return (
    <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              {onBack && (
                <Button 
                  onClick={onBack}
                  variant="outline"
                  style={{ 
                    padding: '8px 16px',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ← Back to Survey
                </Button>
              )}
              <div style={{ flex: '1', minWidth: '250px' }}>
                <h1 style={{ 
                  fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', 
                  fontWeight: '600', 
                  color: '#111827',
                  lineHeight: '1.2',
                  marginBottom: '4px'
                }}>
                  Survey Intelligence Dashboard
                </h1>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  lineHeight: '1.4'
                }}>
                  Transform survey responses into actionable insights with AI-powered brief generation
                </p>
              </div>
            </div>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flexShrink: 0
          }}>
            <Button 
              style={{ 
                background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                color: 'white',
                padding: '12px 20px',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              <Sparkles style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Create Survey
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
