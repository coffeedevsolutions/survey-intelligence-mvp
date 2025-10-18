import { SessionRow } from './SessionRow.jsx';

/**
 * Sessions table component displaying all session data
 */
export function SessionsTable({ sessions }) {
  return (
    <table style={{ 
      width: "100%", 
      borderCollapse: "collapse", 
      border: "1px solid #ddd",
      backgroundColor: "white",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <thead>
        <tr style={{ backgroundColor: "#f5f5f5" }}>
          <th style={{ 
            padding: 12, 
            textAlign: "left", 
            border: "1px solid #ddd",
            fontWeight: 600,
            color: "#333"
          }}>
            Session ID
          </th>
          <th style={{ 
            padding: 12, 
            textAlign: "center", 
            border: "1px solid #ddd",
            fontWeight: 600,
            color: "#333"
          }}>
            Answers
          </th>
          <th style={{ 
            padding: 12, 
            textAlign: "center", 
            border: "1px solid #ddd",
            fontWeight: 600,
            color: "#333"
          }}>
            Completed
          </th>
          <th style={{ 
            padding: 12, 
            textAlign: "center", 
            border: "1px solid #ddd",
            fontWeight: 600,
            color: "#333"
          }}>
            Has Brief
          </th>
          <th style={{ 
            padding: 12, 
            textAlign: "center", 
            border: "1px solid #ddd",
            fontWeight: 600,
            color: "#333"
          }}>
            Last Activity
          </th>
          <th style={{ 
            padding: 12, 
            textAlign: "center", 
            border: "1px solid #ddd",
            fontWeight: 600,
            color: "#333"
          }}>
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {sessions.map(session => (
          <SessionRow 
            key={session.session_id} 
            session={session} 
          />
        ))}
      </tbody>
    </table>
  );
}
