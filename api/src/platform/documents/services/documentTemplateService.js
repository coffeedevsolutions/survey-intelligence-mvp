/**
 * Document Template Service
 * Manages customizable documentation templates for various document types
 */

import { pool } from '../../../database/connection.js';

export class DocumentTemplateService {
  /**
   * Get all document templates for an organization
   * @param {number} orgId - Organization ID
   * @param {string} documentType - Optional filter by document type
   */
  async getTemplatesByOrg(orgId, documentType = null) {
    let query = `
      SELECT 
        id,
        name,
        description,
        document_type,
        is_default,
        is_active,
        formatting_config,
        header_config,
        footer_config,
        branding_config,
        layout_config,
        ai_instructions,
        created_at,
        updated_at
      FROM documentation_templates 
      WHERE org_id = $1 AND is_active = true
    `;
    
    const params = [orgId];
    
    if (documentType) {
      query += ` AND document_type = $2`;
      params.push(documentType);
    }
    
    query += ` ORDER BY is_default DESC, name ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get a specific document template by ID
   */
  async getTemplateById(templateId, orgId) {
    const templateIdInt = parseInt(templateId);
    const orgIdInt = parseInt(orgId);
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        document_type,
        is_default,
        is_active,
        formatting_config,
        header_config,
        footer_config,
        branding_config,
        layout_config,
        ai_instructions,
        created_at,
        updated_at
      FROM documentation_templates 
      WHERE id = $1 AND org_id = $2
    `, [templateIdInt, orgIdInt]);
    
    return result.rows[0] || null;
  }

  /**
   * Get the default template for a specific document type
   */
  async getDefaultTemplate(orgId, documentType) {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        document_type,
        is_default,
        is_active,
        formatting_config,
        header_config,
        footer_config,
        branding_config,
        layout_config,
        ai_instructions,
        created_at,
        updated_at
      FROM documentation_templates 
      WHERE org_id = $1 AND document_type = $2 AND is_default = true AND is_active = true
      LIMIT 1
    `, [orgId, documentType]);
    
    return result.rows[0] || null;
  }

  /**
   * Create a new document template
   */
  async createTemplate(orgId, templateData, createdBy) {
    const {
      name,
      description,
      documentType,
      isDefault = false,
      formattingConfig = {},
      headerConfig = {},
      footerConfig = {},
      brandingConfig = {},
      layoutConfig = {},
      aiInstructions = {}
    } = templateData;

    // If this is being set as default, unset other defaults for this document type
    if (isDefault) {
      await pool.query(`
        UPDATE documentation_templates 
        SET is_default = false 
        WHERE org_id = $1 AND document_type = $2 AND is_default = true
      `, [orgId, documentType]);
    }

    const result = await pool.query(`
      INSERT INTO documentation_templates (
        org_id, name, description, document_type, is_default,
        formatting_config, header_config, footer_config, branding_config,
        layout_config, ai_instructions, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, description, document_type, is_default, created_at
    `, [
      orgId, name, description, documentType, isDefault,
      JSON.stringify(formattingConfig),
      JSON.stringify(headerConfig),
      JSON.stringify(footerConfig),
      JSON.stringify(brandingConfig),
      JSON.stringify(layoutConfig),
      JSON.stringify(aiInstructions),
      createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Update an existing document template
   */
  async updateTemplate(templateId, orgId, templateData) {
    const {
      name,
      description,
      documentType,
      isDefault = false,
      formattingConfig = {},
      headerConfig = {},
      footerConfig = {},
      brandingConfig = {},
      layoutConfig = {},
      aiInstructions = {}
    } = templateData;

    // Convert IDs to integers for database
    const templateIdInt = parseInt(templateId);
    const orgIdInt = parseInt(orgId);

    // Log for debugging
    console.log('Update template params:', { 
      templateIdInt, 
      orgIdInt, 
      name, 
      description, 
      documentType,
      isDefault,
      formattingConfig,
      headerConfig,
      footerConfig 
    });

    // If this is being set as default, unset other defaults for this document type
    if (isDefault) {
      await pool.query(`
        UPDATE documentation_templates 
        SET is_default = false 
        WHERE org_id = $1 AND document_type = $2 AND is_default = true AND id != $3
      `, [orgIdInt, documentType, templateIdInt]);
    }

    const params = [
      templateIdInt, orgIdInt, name || '', description || '', documentType || 'general_document', isDefault || false,
      JSON.stringify(formattingConfig || {}),
      JSON.stringify(headerConfig || {}),
      JSON.stringify(footerConfig || {}),
      JSON.stringify(brandingConfig || {}),
      JSON.stringify(layoutConfig || {}),
      JSON.stringify(aiInstructions || {})
    ];
    
    console.log('Update template query params:', params);

    const result = await pool.query(`
      UPDATE documentation_templates 
      SET 
        name = $3,
        description = $4,
        document_type = $5,
        is_default = $6,
        formatting_config = $7,
        header_config = $8,
        footer_config = $9,
        branding_config = $10,
        layout_config = $11,
        ai_instructions = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND org_id = $2
      RETURNING id, name, description, document_type, is_default, formatting_config, header_config, footer_config, branding_config, layout_config, ai_instructions, updated_at
    `, params);

    return result.rows[0];
  }

  /**
   * Delete a document template (soft delete by setting inactive)
   */
  async deleteTemplate(templateId, orgId) {
    const templateIdInt = parseInt(templateId);
    const orgIdInt = parseInt(orgId);
    const result = await pool.query(`
      UPDATE documentation_templates 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND org_id = $2 AND is_default = false
      RETURNING id, name
    `, [templateIdInt, orgIdInt]);

    if (result.rows.length === 0) {
      throw new Error('Template not found or cannot delete default template');
    }

    return result.rows[0];
  }

  /**
   * Duplicate an existing template
   */
  async duplicateTemplate(templateId, orgId, newName) {
    const templateIdInt = parseInt(templateId);
    const orgIdInt = parseInt(orgId);
    // Get the original template
    const original = await this.getTemplateById(templateIdInt, orgIdInt);
    
    if (!original) {
      throw new Error('Template not found');
    }

    // Create a new template with the same configuration
    const result = await pool.query(`
      INSERT INTO documentation_templates (
        org_id, name, description, document_type, is_default,
        formatting_config, header_config, footer_config, branding_config,
        layout_config, ai_instructions
      )       VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, description, document_type
    `, [
      orgIdInt,
      newName,
      `Copy of ${original.description || original.name}`,
      original.document_type,
      original.formatting_config,
      original.header_config,
      original.footer_config,
      original.branding_config,
      original.layout_config,
      original.ai_instructions
    ]);

    return result.rows[0];
  }

  /**
   * Validate template configuration
   */
  validateTemplate(templateData) {
    const errors = [];
    const { name, documentType, formattingConfig, layoutConfig } = templateData;

    // Basic validation
    if (!name || name.trim().length === 0) {
      errors.push('Template name is required');
    } else if (name.length < 3 || name.length > 100) {
      errors.push('Template name must be between 3 and 100 characters');
    }

    if (!documentType || !this.isValidDocumentType(documentType)) {
      errors.push('Valid document type is required');
    }

    // Validate formatting config if provided
    if (formattingConfig) {
      if (formattingConfig.primary_color && !this.isValidColor(formattingConfig.primary_color)) {
        errors.push('Primary color must be a valid hex color code');
      }
      if (formattingConfig.secondary_color && !this.isValidColor(formattingConfig.secondary_color)) {
        errors.push('Secondary color must be a valid hex color code');
      }
      if (formattingConfig.font_size && !this.isValidFontSize(formattingConfig.font_size)) {
        errors.push('Font size must be a valid CSS font size');
      }
    }

    // Validate layout config if provided
    if (layoutConfig?.margins) {
      const margins = layoutConfig.margins;
      ['top', 'bottom', 'left', 'right'].forEach(margin => {
        if (margins[margin] && !this.isValidMargin(margins[margin])) {
          errors.push(`${margin} margin must be a valid CSS measurement`);
        }
      });
    }

    return errors;
  }

  /**
   * Check if document type is valid
   */
  isValidDocumentType(type) {
    const validTypes = [
      'technical_brief', 'requirements_spec', 'spike_findings', 'technical_design',
      'feedback_summary', 'nps_findings', 'satisfaction_report',
      'course_feedback', 'customer_feedback', 'product_feedback', 'service_feedback',
      'employee_feedback', 'event_feedback', 'onboarding_feedback',
      'market_research', 'user_research', 'business_analysis',
      'project_proposal', 'executive_summary', 'status_report',
      'general_document'
    ];
    return validTypes.includes(type);
  }

  /**
   * Check if color is valid hex code
   */
  isValidColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Check if font size is valid
   */
  isValidFontSize(size) {
    // Basic check for common CSS font size formats
    return /^[\d.]+(px|pt|em|rem|%)$/.test(size);
  }

  /**
   * Check if margin value is valid
   */
  isValidMargin(margin) {
    // Check for common CSS measurement units
    return /^[\d.]+(px|pt|em|rem|%|in|cm|mm)$/.test(margin);
  }

  /**
   * Generate template with AI assistance
   * @param {Object} requirements - Requirements for the template
   * @param {Object} orgBranding - Organization branding settings
   */
  async generateTemplateWithAI(requirements, orgBranding) {
    // This method will be called from the route handler which will call the AI service
    // The actual AI generation logic will be in the route to leverage existing AI infrastructure
    throw new Error('AI generation should be called from the route handler using the AI service');
  }
}

export const documentTemplateService = new DocumentTemplateService();

