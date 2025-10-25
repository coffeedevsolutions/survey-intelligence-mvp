/**
 * Session Repository
 * 
 * Data access layer for session-related operations
 */

import { BaseRepository } from './base.repository.js';
import { pool, query, transaction } from '../connection.js';

export class SessionRepository extends BaseRepository {
  constructor() {
    super('sessions', 'id');
  }

  /**
   * Create session with organization context
   */
  async createWithOrg(sessionData, orgId) {
    const { id, currentQuestionId, completed = false } = sessionData;
    const result = await query(
      `INSERT INTO sessions (id, current_question_id, completed, org_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, currentQuestionId, completed, orgId]
    );
    return result.rows[0];
  }

  /**
   * Create campaign session
   */
  async createCampaignSession({ id, orgId, campaignId, flowId, linkId }) {
    const result = await query(
      `INSERT INTO sessions (id, org_id, campaign_id, flow_id, link_id, current_question_id, completed)
       VALUES ($1, $2, $3, $4, $5, 'intro', false)
       RETURNING *`,
      [id, orgId, campaignId, flowId, linkId]
    );
    return result.rows[0];
  }

  /**
   * Get session with answers and facts
   */
  async getSessionWithData(sessionId) {
    const sessionResult = await query(
      "SELECT * FROM sessions WHERE id = $1",
      [sessionId]
    );
    
    if (sessionResult.rows.length === 0) return null;
    
    const session = sessionResult.rows[0];
    
    // Get answers with question text from conversation history
    const answersResult = await query(`
      SELECT 
        a.question_id, 
        a.text,
        ch.question_text
      FROM answers a
      LEFT JOIN conversation_history ch ON a.session_id = ch.session_id AND a.question_id = ch.question_id
      WHERE a.session_id = $1 
      ORDER BY a.created_at
    `, [sessionId]);
    
    const factsResult = await query(
      "SELECT key, value FROM facts WHERE session_id = $1",
      [sessionId]
    );
    
    const facts = {};
    for (const row of factsResult.rows) {
      facts[row.key] = row.value;
    }
    
    return {
      id: session.id,
      currentQuestionId: session.current_question_id,
      completed: session.completed,
      answers: answersResult.rows.map((row) => ({ 
        questionId: row.question_id, 
        text: row.text,
        question_text: row.question_text || `Question ${row.question_id}`
      })),
      facts,
      orgId: session.org_id,
      campaignId: session.campaign_id,
      flowId: session.flow_id,
      linkId: session.link_id
    };
  }

  /**
   * Get sessions by organization
   */
  async getSessionsByOrg(orgId, limit = 50) {
    const result = await query(
      `SELECT * FROM session_summaries 
       WHERE org_id = $1 AND archived_at IS NULL
       ORDER BY last_answer_at DESC NULLS LAST 
       LIMIT $2`,
      [orgId, limit]
    );
    return result.rows;
  }

  /**
   * Get campaign responses
   */
  async getCampaignResponses(campaignId, orgId) {
    const result = await query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM answers a WHERE a.session_id = s.id) as answer_count,
              (SELECT MAX(a.created_at) FROM answers a WHERE a.session_id = s.id) as last_answer_at,
              EXISTS(SELECT 1 FROM project_briefs pb WHERE pb.session_id = s.id) as has_brief
       FROM sessions s
       WHERE s.campaign_id = $1 AND s.org_id = $2
       ORDER BY s.created_at DESC`,
      [campaignId, orgId]
    );
    return result.rows;
  }

  /**
   * Archive session
   */
  async archiveSession(sessionId, orgId) {
    const result = await query(
      `UPDATE sessions 
       SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND org_id = $2 AND archived_at IS NULL
       RETURNING *`,
      [sessionId, orgId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or already archived');
    }
    
    return result.rows[0];
  }

  /**
   * Restore session
   */
  async restoreSession(sessionId, orgId) {
    const result = await query(
      `UPDATE sessions 
       SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
       RETURNING *`,
      [sessionId, orgId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or not archived');
    }
    
    return result.rows[0];
  }

  /**
   * Delete session permanently
   */
  async deleteSessionPermanently(sessionId, orgId) {
    const result = await query(
      `DELETE FROM sessions 
       WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
       RETURNING *`,
      [sessionId, orgId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or not archived');
    }
    
    return result.rows[0];
  }

  /**
   * Get archived sessions
   */
  async getArchivedSessions(orgId) {
    const result = await query(
      `SELECT 
        s.id AS session_id,
        s.org_id,
        s.campaign_id,
        s.completed,
        s.created_at,
        s.archived_at,
        COALESCE(MAX(a.created_at), s.created_at) AS last_answer_at,
        (SELECT COUNT(*) FROM answers a2 WHERE a2.session_id = s.id) AS answer_count,
        EXISTS (SELECT 1 FROM project_briefs pb WHERE pb.session_id = s.id) AS has_brief,
        c.name as campaign_name
      FROM sessions s
      LEFT JOIN answers a ON a.session_id = s.id
      LEFT JOIN campaigns c ON c.id = s.campaign_id
      WHERE s.org_id = $1 AND s.archived_at IS NOT NULL
      GROUP BY s.id, s.org_id, s.campaign_id, s.completed, s.created_at, s.archived_at, c.name
      ORDER BY s.archived_at DESC`,
      [orgId]
    );
    return result.rows;
  }
}

export const sessionRepository = new SessionRepository();
export default sessionRepository;
