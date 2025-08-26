import { useEffect, useState } from "react";

const API = "http://localhost:8787";

export default function Review({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/sessions`, {
      credentials: "include"
    })
      .then(r => r.json())
      .then(data => {
        setRows(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div style={{padding: 20}}>Loading sessions...</div>;
  if (error) return <div style={{padding: 20, color: 'red'}}>Error: {error}</div>;

  return (
    <div style={{maxWidth: 1200, margin: "40px auto", fontFamily: "system-ui, sans-serif"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24}}>
        <div style={{display: "flex", alignItems: "center", gap: 16}}>
          {onBack && (
            <button 
              onClick={onBack}
              style={{padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer"}}
            >
              ← Back to Survey
            </button>
          )}
          <h1>Survey Sessions Review</h1>
        </div>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
      
      {rows.length === 0 ? (
        <p>No sessions found.</p>
      ) : (
        <table style={{width: "100%", borderCollapse: "collapse", border: "1px solid #ddd"}}>
          <thead>
            <tr style={{backgroundColor: "#f5f5f5"}}>
              <th style={{padding: 12, textAlign: "left", border: "1px solid #ddd"}}>Session ID</th>
              <th style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>Answers</th>
              <th style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>Completed</th>
              <th style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>Has Brief</th>
              <th style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>Last Activity</th>
              <th style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.session_id} style={{borderBottom: "1px solid #eee"}}>
                <td style={{padding: 12, border: "1px solid #ddd"}}>
                  <code style={{fontSize: "0.9em"}}>{row.session_id}</code>
                </td>
                <td style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>
                  {row.answer_count || 0}
                </td>
                <td style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>
                  {row.completed ? "✅" : "⏳"}
                </td>
                <td style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>
                  {row.has_brief ? "📄" : "—"}
                </td>
                <td style={{padding: 12, textAlign: "center", border: "1px solid #ddd", fontSize: "0.9em"}}>
                  {formatDate(row.last_answer_at)}
                </td>
                <td style={{padding: 12, textAlign: "center", border: "1px solid #ddd"}}>
                  <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                    <a 
                      href={`${API}/api/sessions/${row.session_id}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{textDecoration: "none", padding: "4px 8px", backgroundColor: "#e3f2fd", borderRadius: 4}}
                    >
                      📊 Data
                    </a>
                    {row.has_brief && (
                      <a 
                        href={`${API}/api/sessions/${row.session_id}/brief`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{textDecoration: "none", padding: "4px 8px", backgroundColor: "#e8f5e8", borderRadius: 4}}
                      >
                        📄 Brief
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <div style={{marginTop: 24, padding: 16, backgroundColor: "#f9f9f9", borderRadius: 8}}>
        <h3>Quick Stats</h3>
        <ul>
          <li>Total Sessions: {rows.length}</li>
          <li>Completed: {rows.filter(r => r.completed).length}</li>
          <li>With Briefs: {rows.filter(r => r.has_brief).length}</li>
          <li>Average Answers: {rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.answer_count || 0), 0) / rows.length) : 0}</li>
        </ul>
      </div>
    </div>
  );
}
