import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useBriefs } from '../../hooks/useBriefs.js';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton.jsx';
import { LoadingSpinner } from '../../components/ui/loading-spinner.jsx';
import { RoadmapTable } from './components/RoadmapTable.jsx';
import { SolutionGenerationProvider } from '../solutionmgmt/providers/SolutionGenerationProvider.jsx';

/**
 * Main Roadmap page component
 */
export default function Roadmap() {
  const { user, loading: userLoading } = useAuth();
  const briefsData = useBriefs(user);

  // Loading states
  if (userLoading || briefsData.loading) {
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
          <p className="text-muted-foreground">You don't have permission to view the roadmap.</p>
        </div>
      </div>
    );
  }

  return (
    <SolutionGenerationProvider user={user}>
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground">Prioritize and organize your project briefs in a visual roadmap</p>
        </div>
        
        <RoadmapTable 
          briefsForReview={briefsData.briefsForReview}
          loading={briefsData.loading}
          onSubmitReview={briefsData.submitBriefReview}
          onViewDetails={briefsData.viewBriefResponseDetails}
          onViewDocument={briefsData.viewBriefDocument}
          user={user}
          onRefreshBriefs={briefsData.refreshBriefs}
        />
      </div>
    </SolutionGenerationProvider>
  );
}
