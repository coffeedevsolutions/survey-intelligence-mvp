/**
 * Error state component for review
 */
export function ReviewErrorState({ error }) {
  return (
    <div style={{ padding: 20, color: 'red' }}>
      Error: {error}
    </div>
  );
}
