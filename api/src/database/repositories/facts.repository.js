/**
 * Facts Repository
 * 
 * Data access layer for facts-related operations
 */

import { BaseRepository } from './base.repository.js';
import { query, transaction } from '../connection.js';

export class FactsRepository extends BaseRepository {
  constructor() {
    super('facts', 'id');
  }

  /**
   * Upsert fact with organization context
   */
  async upsertFactWithOrg(sessionId, key, value, orgId) {
    const result = await query(
      `INSERT INTO facts (session_id, key, value, org_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sessionId, key, value, orgId]
    );
    return result.rows[0];
  }

  /**
   * Upsert multiple facts with organization context
   */
  async upsertMultipleFactsWithOrg(sessionId, factsObject, orgId) {
    return await transaction(async (client) => {
      for (const [key, value] of Object.entries(factsObject)) {
        await client.query(
          `INSERT INTO facts (session_id, key, value, org_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (session_id, key)
           DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [sessionId, key, value, orgId]
        );
      }
    });
  }

  /**
   * Get facts by session
   */
  async getFactsBySession(sessionId) {
    const result = await query(
      `SELECT key, value 
       FROM facts 
       WHERE session_id = $1`,
      [sessionId]
    );
    
    const facts = {};
    for (const row of result.rows) {
      facts[row.key] = row.value;
    }
    
    return facts;
  }

  /**
   * Get fact by session and key
   */
  async getFact(sessionId, key) {
    const result = await query(
      `SELECT value 
       FROM facts 
       WHERE session_id = $1 AND key = $2`,
      [sessionId, key]
    );
    
    return result.rows[0]?.value || null;
  }

  /**
   * Delete facts by session
   */
  async deleteFactsBySession(sessionId) {
    const result = await query(
      `DELETE FROM facts 
       WHERE session_id = $1`,
      [sessionId]
    );
    return result.rowCount;
  }
}

export const factsRepository = new FactsRepository();
export default factsRepository;
