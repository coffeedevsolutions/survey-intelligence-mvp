import { reviewUtils } from '../../utils/reviewApi.js';

/**
 * Session actions component with data and brief links
 */
export function SessionActions({ session }) {
  const sessionUrl = reviewUtils.generateSessionUrl(session.session_id);
  const briefUrl = reviewUtils.generateBriefUrl(session.session_id);

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <a 
        href={sessionUrl} 
        target="_blank" 
        rel="noreferrer"
        style={{
          textDecoration: "none", 
          padding: "6px 12px", 
          backgroundColor: "#e3f2fd", 
          borderRadius: 6,
          fontSize: "0.85em",
          fontWeight: 500,
          color: "#1976d2",
          border: "1px solid #bbdefb",
          transition: "all 0.2s"
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = "#bbdefb";
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = "#e3f2fd";
        }}
      >
        📊 Data
      </a>
      {session.has_brief && (
        <a 
          href={briefUrl} 
          target="_blank" 
          rel="noreferrer"
          style={{
            textDecoration: "none", 
            padding: "6px 12px", 
            backgroundColor: "#e8f5e8", 
            borderRadius: 6,
            fontSize: "0.85em",
            fontWeight: 500,
            color: "#388e3c",
            border: "1px solid #c8e6c9",
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#c8e6c9";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#e8f5e8";
          }}
        >
          📄 Brief
        </a>
      )}
    </div>
  );
}
