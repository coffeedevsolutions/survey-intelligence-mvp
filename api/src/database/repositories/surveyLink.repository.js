/**
 * Survey Link Repository
 * 
 * Data access layer for survey link operations
 */

import { BaseRepository } from '../../database/repositories/base.repository.js';
import { query } from '../../database/connection.js';
import crypto from 'crypto';

export class SurveyLinkRepository extends BaseRepository {
  constructor() {
    super('survey_links', 'id');
  }

  /**
   * Create survey link
   */
  async createSurveyLink(linkData) {
    const { orgId, campaignId, flowId, expiresAt, maxUses, createdBy } = linkData;
    const token = crypto.randomBytes(16).toString('base64url');
    
    const result = await query(
      `INSERT INTO survey_links (org_id, campaign_id, flow_id, token, expires_at, max_uses, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orgId, campaignId, flowId, token, expiresAt, maxUses, createdBy]
    );
    
    return result.rows[0];
  }

  /**
   * Get survey link by token
   */
  async getSurveyLinkByToken(token) {
    const result = await query(
      `SELECT sl.*, 
              c.name as campaign_name, 
              c.survey_template_id as campaign_template_id,
              sf.spec_json, 
              sf.use_ai,
              sf.survey_template_id as flow_template_id
       FROM survey_links sl
       JOIN campaigns c ON sl.campaign_id = c.id
       JOIN survey_flows sf ON sl.flow_id = sf.id
       WHERE sl.token = $1 
         AND sl.revoked = false 
         AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
         AND (sl.max_uses IS NULL OR sl.uses < sl.max_uses)`,
      [token]
    );
    
    return result.rows[0];
  }

  /**
   * Get survey links by organization
   */
  async getSurveyLinksByOrg(orgId) {
    const result = await query(
      `SELECT sl.*, c.name as campaign_name, sf.version as flow_version, u.email as created_by_email
       FROM survey_links sl
       JOIN campaigns c ON sl.campaign_id = c.id
       JOIN survey_flows sf ON sl.flow_id = sf.id
       LEFT JOIN users u ON sl.created_by = u.id
       WHERE sl.org_id = $1
       ORDER BY sl.created_at DESC`,
      [orgId]
    );
    
    return result.rows;
  }

  /**
   * Revoke survey link
   */
  async revokeSurveyLink(linkId, orgId) {
    const result = await query(
      'UPDATE survey_links SET revoked = true WHERE id = $1 AND org_id = $2 RETURNING *',
      [linkId, orgId]
    );
    return result.rows[0];
  }

  /**
   * Increment survey link use count
   */
  async incrementSurveyLinkUse(linkId) {
    await query(
      'UPDATE survey_links SET uses = uses + 1 WHERE id = $1',
      [linkId]
    );
  }

  /**
   * Get survey link statistics
   */
  async getSurveyLinkStats(orgId) {
    const result = await query(
      `SELECT 
        COUNT(*) as total_links,
        COUNT(CASE WHEN revoked = false THEN 1 END) as active_links,
        COUNT(CASE WHEN revoked = true THEN 1 END) as revoked_links,
        SUM(uses) as total_uses,
        AVG(uses) as avg_uses_per_link
       FROM survey_links 
       WHERE org_id = $1`,
      [orgId]
    );
    
    return result.rows[0];
  }
}

export const surveyLinkRepository = new SurveyLinkRepository();
export default surveyLinkRepository;
