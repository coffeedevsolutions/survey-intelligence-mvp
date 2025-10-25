/**
 * Solution Repository
 * 
 * Data access layer for solution-related operations
 */

import { BaseRepository } from '../../database/repositories/base.repository.js';
import { query } from '../../database/connection.js';

export class SolutionRepository extends BaseRepository {
  constructor() {
    super('solutions', 'id');
  }

  /**
   * Create solution
   */
  async createSolution(solutionData) {
    const { 
      briefId, 
      orgId, 
      title, 
      description, 
      status = 'draft',
      createdBy 
    } = solutionData;
    
    const result = await query(
      `INSERT INTO solutions (brief_id, org_id, title, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [briefId, orgId, title, description, status, createdBy]
    );
    
    return result.rows[0];
  }

  /**
   * Get solutions by organization
   */
  async getSolutionsByOrg(orgId) {
    const result = await query(
      `SELECT s.*, pb.title as brief_title, u.email as created_by_email
       FROM solutions s
       LEFT JOIN project_briefs pb ON s.brief_id = pb.id
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.org_id = $1
       ORDER BY s.created_at DESC`,
      [orgId]
    );
    
    return result.rows;
  }

  /**
   * Get solution by ID and organization
   */
  async getSolutionById(solutionId, orgId) {
    const result = await query(
      `SELECT s.*, pb.title as brief_title, pb.summary_md as brief_content
       FROM solutions s
       LEFT JOIN project_briefs pb ON s.brief_id = pb.id
       WHERE s.id = $1 AND s.org_id = $2`,
      [solutionId, orgId]
    );
    
    return result.rows[0];
  }
}

export const solutionRepository = new SolutionRepository();
export default solutionRepository;
