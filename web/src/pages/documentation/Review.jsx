import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useBriefs } from '../../hooks/useBriefs.js';

// Tab Components
import { EnhancedReviewsTab } from './tabs/EnhancedReviewsTab.jsx';

// Solution Generation Provider
import { SolutionGenerationProvider } from '../solutionmgmt/providers/SolutionGenerationProvider.jsx';

/**
 * Main Review component for document review and prioritization
 */
export default function Review() {
  const { user } = useAuth();
  const briefsData = useBriefs(user);

  return (
    <div className="w-full min-w-0 content-full-width p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Briefs & Reviews</h1>
        <p className="text-muted-foreground">Review and prioritize AI-generated briefs</p>
      </div>
      
      {!user || (user.role !== 'admin' && user.role !== 'reviewer') ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view reviews.</p>
          </div>
        </div>
      ) : (
        <SolutionGenerationProvider user={user}>
          <EnhancedReviewsTab
            briefsForReview={briefsData.briefsForReview}
            loading={briefsData.loading}
            onSubmitReview={briefsData.submitBriefReview}
            onViewDetails={briefsData.viewBriefResponseDetails}
            onViewDocument={briefsData.viewBriefDocument}
            user={user}
            onRefreshBriefs={briefsData.refreshBriefs}
          />
        </SolutionGenerationProvider>
      )}
    </div>
  );
}
