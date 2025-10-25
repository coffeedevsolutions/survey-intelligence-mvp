/**
 * Brief Repository
 * 
 * Data access layer for brief-related operations
 */

import { BaseRepository } from '../../database/repositories/base.repository.js';
import { query, transaction } from '../../database/connection.js';

export class BriefRepository extends BaseRepository {
  constructor() {
    super('project_briefs', 'id');
  }

  /**
   * Get brief by ID and organization
   */
  async getBriefByIdAndOrg(briefId, orgId) {
    const result = await query(
      `SELECT id, title, summary_md, created_at, session_id, campaign_id, review_status, priority, priority_data, framework_id, reviewed_at, reviewed_by
       FROM project_briefs 
       WHERE id = $1 AND org_id = $2`,
      [briefId, orgId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get briefs for review
   */
  async getBriefsForReview(orgId, limit = 50) {
    // Check if roadmap_rank column exists
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'project_briefs' 
      AND column_name = 'roadmap_rank'
    `);
    
    const hasRoadmapRank = columnCheck.rows.length > 0;
    
    const result = await query(
      `SELECT 
        pb.id,
        pb.title,
        pb.summary_md,
        pb.created_at,
        COALESCE(pb.review_status, 'pending') as review_status,
        pb.priority,
        pb.priority_data,
        COALESCE(pb.framework_id, 'simple') as framework_id,
        pb.reviewed_at,
        pb.reviewed_by,
        pb.campaign_id,
        pb.session_id,
        ${hasRoadmapRank ? 'pb.roadmap_rank' : 'NULL as roadmap_rank'},
        c.name as campaign_name,
        reviewer.email as reviewed_by_email,
        latest_solution.slug as solution_slug
      FROM project_briefs pb
      LEFT JOIN campaigns c ON pb.campaign_id = c.id
      LEFT JOIN users reviewer ON pb.reviewed_by = reviewer.id
      LEFT JOIN (
        SELECT DISTINCT ON (brief_id) 
          brief_id, 
          slug, 
          created_at
        FROM solutions 
        WHERE org_id = $1
        ORDER BY brief_id, created_at DESC
      ) latest_solution ON pb.id = latest_solution.brief_id
      WHERE pb.org_id = $1
      ORDER BY 
        CASE WHEN COALESCE(pb.review_status, 'pending') = 'pending' THEN 0 ELSE 1 END,
        ${hasRoadmapRank ? 'COALESCE(pb.roadmap_rank, 999999) ASC,' : ''}
        pb.created_at DESC
      LIMIT $2`,
      [orgId, limit]
    );
    
    return result.rows;
  }

  /**
   * Update brief review
   */
  async updateBriefReview(briefId, orgId, reviewData) {
    const { priority, priorityData, reviewedBy, frameworkId } = reviewData;
    
    const result = await query(
      `UPDATE project_briefs 
       SET 
         priority = $1,
         priority_data = $2,
         framework_id = $3,
         review_status = 'reviewed',
         reviewed_at = CURRENT_TIMESTAMP,
         reviewed_by = $4
       WHERE id = $5 AND org_id = $6
       RETURNING *`,
      [priority, JSON.stringify(priorityData || null), frameworkId || 'simple', reviewedBy, briefId, orgId]
    );
    
    return result.rows[0];
  }

  /**
   * Create brief
   */
  async createBrief(briefData) {
    const { sessionId, title, summaryMd, orgId, campaignId } = briefData;
    
    const result = await query(
      `INSERT INTO project_briefs (session_id, title, summary_md, org_id, campaign_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sessionId, title, summaryMd, orgId, campaignId]
    );
    
    return result.rows[0];
  }

  /**
   * Get briefs by session
   */
  async getBriefsBySession(sessionId) {
    const result = await query(
      `SELECT id, title, summary_md, created_at, review_status, priority
       FROM project_briefs 
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    );
    return result.rows;
  }

  /**
   * Get briefs by campaign
   */
  async getBriefsByCampaign(campaignId, orgId) {
    const result = await query(
      `SELECT pb.*, s.id as session_id, s.completed as session_completed
       FROM project_briefs pb
       JOIN sessions s ON pb.session_id = s.id
       WHERE pb.campaign_id = $1 AND pb.org_id = $2
       ORDER BY pb.created_at DESC`,
      [campaignId, orgId]
    );
    return result.rows;
  }

  /**
   * Archive brief
   */
  async archiveBrief(briefId, orgId) {
    const result = await query(
      `UPDATE project_briefs 
       SET archived_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND org_id = $2
       RETURNING *`,
      [briefId, orgId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Brief not found or access denied');
    }
    
    return result.rows[0];
  }

  /**
   * Restore brief
   */
  async restoreBrief(briefId, orgId) {
    const result = await query(
      `UPDATE project_briefs 
       SET archived_at = NULL
       WHERE id = $1 AND org_id = $2 AND archived_at IS NOT NULL
       RETURNING *`,
      [briefId, orgId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Brief not found or not archived');
    }
    
    return result.rows[0];
  }

  /**
   * Get archived briefs
   */
  async getArchivedBriefs(orgId) {
    const result = await query(
      `SELECT pb.*, c.name as campaign_name, s.id as session_id
       FROM project_briefs pb
       LEFT JOIN campaigns c ON pb.campaign_id = c.id
       LEFT JOIN sessions s ON pb.session_id = s.id
       WHERE pb.org_id = $1 AND pb.archived_at IS NOT NULL
       ORDER BY pb.archived_at DESC`,
      [orgId]
    );
    return result.rows;
  }
}

export const briefRepository = new BriefRepository();
export default briefRepository;
