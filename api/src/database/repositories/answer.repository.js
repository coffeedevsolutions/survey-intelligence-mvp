/**
 * Answer Repository
 * 
 * Data access layer for answer-related operations
 */

import { BaseRepository } from './base.repository.js';
import { query } from '../connection.js';

export class AnswerRepository extends BaseRepository {
  constructor() {
    super('answers', 'id');
  }

  /**
   * Add answer with organization context
   */
  async addAnswerWithOrg(sessionId, questionId, text, orgId) {
    const result = await query(
      `INSERT INTO answers (session_id, question_id, text, org_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, questionId, text, orgId]
    );
    return result.rows[0];
  }

  /**
   * Get answers by session
   */
  async getAnswersBySession(sessionId) {
    const result = await query(
      `SELECT question_id, text, created_at 
       FROM answers 
       WHERE session_id = $1 
       ORDER BY created_at`,
      [sessionId]
    );
    return result.rows;
  }

  /**
   * Get answer count by session
   */
  async getAnswerCount(sessionId) {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM answers 
       WHERE session_id = $1`,
      [sessionId]
    );
    return parseInt(result.rows[0].count);
  }
}

export const answerRepository = new AnswerRepository();
export default answerRepository;
