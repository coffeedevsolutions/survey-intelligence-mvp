/**
 * Empty state component for review when no sessions are found
 */
export function ReviewEmptyState() {
  return (
    <div style={{ 
      padding: 40, 
      textAlign: 'center', 
      backgroundColor: '#f9f9f9', 
      borderRadius: 8,
      color: '#666'
    }}>
      <p style={{ fontSize: 18, marginBottom: 8 }}>No sessions found.</p>
      <p style={{ fontSize: 14 }}>Survey sessions will appear here once users start responding.</p>
    </div>
  );
}
