import { reviewUtils } from '../../../utils/reviewApi.js';
import { SessionActions } from './SessionActions.jsx';

/**
 * Individual session row component
 */
export function SessionRow({ session }) {
  return (
    <tr style={{ 
      borderBottom: "1px solid #eee",
      transition: "background-color 0.2s",
      "&:hover": { backgroundColor: "#f9f9f9" }
    }}>
      <td style={{ padding: 12, border: "1px solid #ddd" }}>
        <code style={{ 
          fontSize: "0.9em", 
          backgroundColor: "#f5f5f5", 
          padding: "2px 6px", 
          borderRadius: 3,
          color: "#666"
        }}>
          {session.session_id}
        </code>
      </td>
      <td style={{ 
        padding: 12, 
        textAlign: "center", 
        border: "1px solid #ddd",
        fontWeight: 500
      }}>
        {session.answer_count || 0}
      </td>
      <td style={{ 
        padding: 12, 
        textAlign: "center", 
        border: "1px solid #ddd",
        fontSize: "1.2em"
      }}>
        {session.completed ? "✅" : "⏳"}
      </td>
      <td style={{ 
        padding: 12, 
        textAlign: "center", 
        border: "1px solid #ddd",
        fontSize: "1.2em"
      }}>
        {session.has_brief ? "📄" : "—"}
      </td>
      <td style={{ 
        padding: 12, 
        textAlign: "center", 
        border: "1px solid #ddd", 
        fontSize: "0.9em",
        color: "#666"
      }}>
        {reviewUtils.formatDate(session.last_answer_at)}
      </td>
      <td style={{ padding: 12, textAlign: "center", border: "1px solid #ddd" }}>
        <SessionActions session={session} />
      </td>
    </tr>
  );
}
