/**
 * Campaign Repository
 * 
 * Data access layer for campaign-related operations
 */

import { BaseRepository } from '../../database/repositories/base.repository.js';
import { query, transaction } from '../../database/connection.js';

export class CampaignRepository extends BaseRepository {
  constructor() {
    super('campaigns', 'id');
  }

  /**
   * Create campaign
   */
  async createCampaign(campaignData) {
    const { 
      orgId, 
      slug, 
      name, 
      purpose, 
      templateMd, 
      unifiedTemplateId = null,
      briefTemplate = null,
      briefAiInstructions = null,
      createdBy, 
      surveyTemplateId = null 
    } = campaignData;
    
    const result = await query(
      `INSERT INTO campaigns (org_id, slug, name, purpose, template_md, unified_template_id, brief_template, brief_ai_instructions, created_by, survey_template_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [orgId, slug, name, purpose, templateMd, unifiedTemplateId, briefTemplate, briefAiInstructions, createdBy, surveyTemplateId]
    );
    return result.rows[0];
  }

  /**
   * Get campaigns by organization
   */
  async getCampaignsByOrg(orgId) {
    const result = await query(
      `SELECT c.*, u.email as created_by_email,
              (SELECT COUNT(*) FROM survey_flows sf WHERE sf.campaign_id = c.id) as flow_count,
              (SELECT COUNT(*) FROM sessions s WHERE s.campaign_id = c.id) as response_count
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.org_id = $1 AND c.archived_at IS NULL
       ORDER BY c.updated_at DESC`,
      [orgId]
    );
    return result.rows;
  }

  /**
   * Get campaign by ID and organization
   */
  async getCampaignById(campaignId, orgId) {
    const result = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND org_id = $2',
      [campaignId, orgId]
    );
    return result.rows[0];
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId, orgId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['name', 'purpose', 'template_md', 'is_active'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(campaignId, orgId);

    const queryText = `
      UPDATE campaigns 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND org_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await query(queryText, values);
    return result.rows[0];
  }

  /**
   * Archive campaign
   */
  async archiveCampaign(campaignId, orgId) {
    return await transaction(async (client) => {
      // Archive the campaign
      const campaignResult = await client.query(
        `UPDATE campaigns 
         SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND org_id = $2 AND archived_at IS NULL
         RETURNING *`,
        [campaignId, orgId]
      );
      
      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found or already archived');
      }
      
      // Archive all sessions in this campaign
      await client.query(
        `UPDATE sessions 
         SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE campaign_id = $1 AND org_id = $2 AND archived_at IS NULL`,
        [campaignId, orgId]
      );
      
      return campaignResult.rows[0];
    });
  }

  /**
   * Restore campaign
   */
  async restoreCampaign(campaignId, orgId) {
    return await transaction(async (client) => {
      // Restore the campaign
      const campaignResult = await client.query(
        `UPDATE campaigns 
         SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
         RETURNING *`,
        [campaignId, orgId]
      );
      
      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found or not archived');
      }
      
      // Restore all sessions in this campaign
      await client.query(
        `UPDATE sessions 
         SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE campaign_id = $1 AND org_id = $2 AND archived_at IS NOT NULL`,
        [campaignId, orgId]
      );
      
      return campaignResult.rows[0];
    });
  }

  /**
   * Delete campaign permanently
   */
  async deleteCampaignPermanently(campaignId, orgId) {
    const result = await query(
      `DELETE FROM campaigns 
       WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
       RETURNING *`,
      [campaignId, orgId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Campaign not found or not archived');
    }
    
    return result.rows[0];
  }

  /**
   * Get archived campaigns
   */
  async getArchivedCampaigns(orgId) {
    const result = await query(
      `SELECT 
        c.*,
        COUNT(s.id) as session_count,
        MAX(s.created_at) as last_session_at
      FROM campaigns c
      LEFT JOIN sessions s ON s.campaign_id = c.id AND s.archived_at IS NOT NULL
      WHERE c.org_id = $1 AND c.archived_at IS NOT NULL
      GROUP BY c.id
      ORDER BY c.archived_at DESC`,
      [orgId]
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
}

export const campaignRepository = new CampaignRepository();
export default campaignRepository;
