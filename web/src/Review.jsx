import React from 'react';
import { useReview } from './hooks/useReview.js';

// Layout Components
import { ReviewHeader } from './components/review/ReviewHeader.jsx';
import { ReviewLoadingState } from './components/review/ReviewLoadingState.jsx';
import { ReviewErrorState } from './components/review/ReviewErrorState.jsx';
import { ReviewEmptyState } from './components/review/ReviewEmptyState.jsx';

// Data Components
import { SessionsTable } from './components/review/SessionsTable.jsx';
import { ReviewStats } from './components/review/ReviewStats.jsx';

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
    <div style={{
      maxWidth: 1200, 
      margin: "40px auto", 
      fontFamily: "system-ui, sans-serif",
      padding: "0 16px"
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
