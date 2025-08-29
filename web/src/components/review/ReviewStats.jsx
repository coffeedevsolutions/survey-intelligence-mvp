import { reviewUtils } from '../../utils/reviewApi.js';

/**
 * Review statistics component
 */
export function ReviewStats({ sessions }) {
  const stats = reviewUtils.calculateStats(sessions);

  return (
    <div style={{ 
      marginTop: 24, 
      padding: 20, 
      backgroundColor: "#f9f9f9", 
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
    }}>
      <h3 style={{ 
        marginTop: 0, 
        marginBottom: 16, 
        color: "#333",
        fontSize: "1.1em",
        fontWeight: 600
      }}>
        Quick Stats
      </h3>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 16 
      }}>
        <StatItem 
          label="Total Sessions" 
          value={stats.totalSessions}
          icon="📊"
        />
        <StatItem 
          label="Completed" 
          value={stats.completedSessions}
          icon="✅"
        />
        <StatItem 
          label="With Briefs" 
          value={stats.sessionsWithBriefs}
          icon="📄"
        />
        <StatItem 
          label="Average Answers" 
          value={stats.averageAnswers}
          icon="💬"
        />
      </div>
    </div>
  );
}

/**
 * Individual stat item component
 */
function StatItem({ label, value, icon }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: 12,
      backgroundColor: "white",
      borderRadius: 6,
      border: "1px solid #e0e0e0"
    }}>
      <span style={{ fontSize: "1.2em" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.85em", color: "#666", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: "1.2em", fontWeight: 600, color: "#333" }}>
          {value}
        </div>
      </div>
    </div>
  );
}
