import React from 'react';
import { useReview } from '../../hooks/useReview.js';

// Layout Components
import { ReviewHeader } from './components/ReviewHeader.jsx';
import { ReviewLoadingState } from './components/ReviewLoadingState.jsx';
import { ReviewErrorState } from './components/ReviewErrorState.jsx';
import { ReviewEmptyState } from './components/ReviewEmptyState.jsx';

// Data Components
import { SessionsTable } from './components/SessionsTable.jsx';
import { ReviewStats } from './components/ReviewStats.jsx';

/**
 * Main Review component for displaying survey sessions
 */
export default function Review({ onBack }) {
  const { sessions, loading, error, refreshSessions } = useReview();

  // Handle loading state
  if (loading) {
    return <ReviewLoadingState />;
  }

  // Handle error state
  if (error) {
    return <ReviewErrorState error={error} />;
  }

  return (
    <div className="w-full min-w-0 content-full-width p-4" style={{
      fontFamily: "system-ui, sans-serif"
    }}>
      <ReviewHeader 
        onBack={onBack} 
        onRefresh={refreshSessions} 
      />
      
      {sessions.length === 0 ? (
        <ReviewEmptyState />
      ) : (
        <>
          <SessionsTable sessions={sessions} />
          <ReviewStats sessions={sessions} />
        </>
      )}
    </div>
  );
}
