import { TabsList, TabsTrigger } from '../ui/tabs';

/**
 * Dashboard tabs navigation component
 */
export function DashboardTabs({ user }) {
  const tabStyle = {
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
    whiteSpace: 'nowrap',
    flex: '1 1 auto',
    minWidth: '120px'
  };

  return (
    <TabsList style={{ 
      backgroundColor: 'white', 
      padding: '0px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexWrap: 'nowrap',
      gap: '4px',
      width: '100%',
      justifyContent: 'flex-start',
    }}>
      <TabsTrigger value="surveys" style={tabStyle}>
        Survey Management
      </TabsTrigger>
      <TabsTrigger value="briefs" style={tabStyle}>
        AI-Generated Briefs
      </TabsTrigger>
      {(user?.role === 'admin' || user?.role === 'reviewer') && (
        <TabsTrigger value="review" style={tabStyle}>
          Brief Reviews
        </TabsTrigger>
      )}
      {user?.role === 'admin' && (
        <>
          <TabsTrigger value="stack" style={tabStyle}>
            Stack & Solutions
          </TabsTrigger>
          <TabsTrigger value="archived-surveys" style={tabStyle}>
            Archived Surveys
          </TabsTrigger>
          <TabsTrigger value="archived-campaigns" style={tabStyle}>
            Archived Campaigns
          </TabsTrigger>
          <TabsTrigger value="users" style={tabStyle}>
            Members & Seats
          </TabsTrigger>
          <TabsTrigger value="invites" style={tabStyle}>
            Invitations
          </TabsTrigger>
          <TabsTrigger value="shares" style={tabStyle}>
            Share Links
          </TabsTrigger>
        </>
      )}
    </TabsList>
  );
}
