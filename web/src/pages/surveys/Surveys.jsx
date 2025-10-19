import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useDashboard } from '../../hooks/useDashboard.js';
import { useBriefs } from '../../hooks/useBriefs.js';
import { SurveysTab } from './tabs/SurveysTab.jsx';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton.jsx';
import { LoadingSpinner } from '../../components/ui/loading-spinner.jsx';

/**
 * Main Surveys page component
 */
export default function Surveys() {
  const { user, loading: userLoading } = useAuth();
  const { sessions, loading: sessionsLoading, refetchSessions } = useDashboard();
  const briefsData = useBriefs(user);

  // Loading states
  if (userLoading || sessionsLoading) {
    return <LoadingSkeleton />;
  }

  // Access control
  if (!user) {
    return (
      <div className="page-gradient flex items-center justify-center">
        <LoadingSpinner>Loading user information...</LoadingSpinner>
      </div>
    );
  }

  if (!user.orgId || user.role === 'requestor') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view surveys.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 content-full-width p-6">
      <SurveysTab 
        sessions={sessions} 
        onFetchBrief={briefsData.fetchSessionBrief} 
        user={user} 
        onRefresh={refetchSessions} 
      />
    </div>
  );
}
