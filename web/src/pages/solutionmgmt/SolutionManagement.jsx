import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { SolutioningTab } from './tabs/SolutioningTab.jsx';
import { SolutionGenerationProvider } from './providers/SolutionGenerationProvider.jsx';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton';
import { LoadingSpinner } from '../../components/ui/loading-spinner';

/**
 * Main Solution Management page component
 */
export default function SolutionManagement() {
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

  if (!user.orgId || (user.role !== 'admin' && user.role !== 'reviewer')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view solution management.</p>
        </div>
      </div>
    );
  }

  return (
    <SolutionGenerationProvider user={user}>
      <div className="w-full min-w-0 content-full-width p-6">     
        <SolutioningTab user={user} refreshTrigger={0} />
      </div>
    </SolutionGenerationProvider>
  );
}
