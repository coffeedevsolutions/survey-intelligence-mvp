/**
 * Organization Repository
 * 
 * Data access layer for organization-related operations
 */

import { BaseRepository } from '../../database/repositories/base.repository.js';
import { query } from '../../database/connection.js';

export class OrganizationRepository extends BaseRepository {
  constructor() {
    super('organizations', 'id');
  }

  /**
   * Create organization
   */
  async createOrganization(orgData) {
    const { 
      name, 
      slug, 
      tier = 'starter',
      createdBy 
    } = orgData;
    
    const result = await query(
      `INSERT INTO organizations (name, slug, tier, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, slug, tier, createdBy]
    );
    
    return result.rows[0];
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug) {
    const result = await query(
      'SELECT * FROM organizations WHERE slug = $1',
      [slug]
    );
    
    return result.rows[0];
  }

  /**
   * Get organization with user count
   */
  async getOrganizationWithStats(orgId) {
    const result = await query(
      `SELECT o.*, 
              COUNT(DISTINCT uor.user_id) as user_count,
              COUNT(DISTINCT c.id) as campaign_count,
              COUNT(DISTINCT s.id) as session_count
       FROM organizations o
       LEFT JOIN user_org_roles uor ON o.id = uor.org_id
       LEFT JOIN campaigns c ON o.id = c.org_id
       LEFT JOIN sessions s ON o.id = s.org_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [orgId]
    );
    
    return result.rows[0];
  }

  /**
   * Update organization tier
   */
  async updateOrganizationTier(orgId, tier) {
    const result = await query(
      'UPDATE organizations SET tier = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [tier, orgId]
    );
    
    return result.rows[0];
  }
}

export const organizationRepository = new OrganizationRepository();
export default organizationRepository;
