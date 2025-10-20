/**
 * Review header component with back button and refresh functionality
 */
export function ReviewHeader({ onBack, onRefresh }) {
  return (
    <div style={{
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      marginBottom: 24
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {onBack && (
          <button 
            onClick={onBack}
            style={{
              padding: "8px 16px", 
              backgroundColor: "#f0f0f0", 
              border: "1px solid #ccc", 
              borderRadius: 4, 
              cursor: "pointer"
            }}
          >
            ← Back to Survey
          </button>
        )}
        <h1>Survey Sessions Review</h1>
      </div>
      <button 
        onClick={onRefresh}
        style={{
          padding: "8px 16px", 
          backgroundColor: "#e3f2fd", 
          border: "1px solid #2196f3", 
          borderRadius: 4, 
          cursor: "pointer"
        }}
      >
        Refresh
      </button>
    </div>
  );
}
