import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { AnalyticsTab } from './tab/AnalyticsTab.jsx';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton.jsx';
import { LoadingSpinner } from '../../components/ui/loading-spinner.jsx';

/**
 * Main Analytics page component
 */
export default function Analytics() {
  const { user, loading: userLoading } = useAuth();

  // Loading states
  if (userLoading) {
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
          <p className="text-muted-foreground">You don't have permission to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 content-full-width p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">View detailed analytics and insights</p>
      </div>
      
      <AnalyticsTab user={user} />
    </div>
  );
}
