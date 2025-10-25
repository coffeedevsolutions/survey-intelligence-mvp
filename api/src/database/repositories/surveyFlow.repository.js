/**
 * Survey Flow Repository
 * 
 * Data access layer for survey flow operations
 */

import { BaseRepository } from '../../database/repositories/base.repository.js';
import { query, transaction } from '../../database/connection.js';

export class SurveyFlowRepository extends BaseRepository {
  constructor() {
    super('survey_flows', 'id');
  }

  /**
   * Create survey flow
   */
  async createSurveyFlow(flowData) {
    const { 
      campaignId, 
      title, 
      specJson, 
      useAi = true, 
      surveyTemplateId = null,
      unifiedTemplateId = null 
    } = flowData;
    
    return await transaction(async (client) => {
      // Get next version number for this campaign
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM survey_flows WHERE campaign_id = $1',
        [campaignId]
      );
      const version = versionResult.rows[0].next_version;

      // Extract unified_template_id from spec_json if available
      const unifiedTemplateFromSpec = specJson?.unified_template_id;
      const finalUnifiedTemplateId = unifiedTemplateId || unifiedTemplateFromSpec || null;

      // Create the flow
      const result = await client.query(
        `INSERT INTO survey_flows (campaign_id, version, title, spec_json, use_ai, survey_template_id, unified_template_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [campaignId, version, title, specJson, useAi, surveyTemplateId, finalUnifiedTemplateId]
      );

      return result.rows[0];
    });
  }

  /**
   * Get flows by campaign
   */
  async getFlowsByCampaign(campaignId) {
    const result = await query(
      'SELECT * FROM survey_flows WHERE campaign_id = $1 ORDER BY version DESC',
      [campaignId]
    );
    return result.rows;
  }

  /**
   * Get flow by ID
   */
  async getFlowById(flowId) {
    const result = await query(
      'SELECT * FROM survey_flows WHERE id = $1',
      [flowId]
    );
    return result.rows[0];
  }

  /**
   * Get latest flow for campaign
   */
  async getLatestFlowForCampaign(campaignId) {
    const result = await query(
      'SELECT * FROM survey_flows WHERE campaign_id = $1 ORDER BY version DESC LIMIT 1',
      [campaignId]
    );
    return result.rows[0];
  }
}

export const surveyFlowRepository = new SurveyFlowRepository();
export default surveyFlowRepository;
