/**
 * Document Template Management Routes
 */

import { Router } from 'express';
import { requireMember } from '../../auth/services/auth-enhanced.js';
import { documentTemplateService } from '../services/documentTemplateService.js';
import { generateStyledHTML, exportBrief } from '../services/documentExport.js';
import { generateDOCX } from '../services/docxExportService.js';
import * as fontService from '../services/fontService.js';

const router = Router();

// GET all templates
router.get('/:orgId/document-templates', requireMember(), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { document_type } = req.query;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const templates = await documentTemplateService.getTemplatesByOrg(orgId, document_type);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
  }
});

// GET specific template
router.get('/:orgId/document-templates/:templateId', requireMember(), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const template = await documentTemplateService.getTemplateById(templateId, orgId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template', details: error.message });
  }
});

// POST create template
router.post('/:orgId/document-templates', requireMember(), async (req, res) => {
  try {
    const { orgId } = req.params;
    const templateData = req.body;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const errors = documentTemplateService.validateTemplate(templateData);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid template', details: errors });
    }

    const template = await documentTemplateService.createTemplate(orgId, templateData, req.user.id);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template', details: error.message });
  }
});

// PUT update template
router.put('/:orgId/document-templates/:templateId', requireMember(), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const templateData = req.body;
    
    console.log('Received template data:', JSON.stringify(templateData, null, 2));
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const errors = documentTemplateService.validateTemplate(templateData);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid template', details: errors });
    }

    const template = await documentTemplateService.updateTemplate(templateId, orgId, templateData);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template', details: error.message });
  }
});

// DELETE template
router.delete('/:orgId/document-templates/:templateId', requireMember(), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await documentTemplateService.deleteTemplate(templateId, orgId);
    res.json({ message: 'Template deleted', template: result });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template', details: error.message });
  }
});

// POST duplicate template
router.post('/:orgId/document-templates/:templateId/duplicate', requireMember(), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const { name } = req.body;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!name) {
      return res.status(400).json({ error: 'New template name is required' });
    }

    const template = await documentTemplateService.duplicateTemplate(templateId, orgId, name);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template', details: error.message });
  }
});

/**
 * POST /api/orgs/:orgId/document-templates/:templateId/export
 * Export template as a sample document in specified format
 */
router.post('/:orgId/document-templates/:templateId/export', requireMember(), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const { format = 'html' } = req.body;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get template
    const template = await documentTemplateService.getTemplateById(templateId, orgId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get fonts for org
    const fonts = await fontService.getFontsByOrg(orgId);
    
    // Sample content for preview
    const sampleMarkdown = `# Sample Document

This is a preview of how your document will look with this template.

## Content Section

The template includes:
- Formatted headers and footers
- Custom fonts (${template.formatting_config?.available_fonts?.join(', ') || 'default'})
- Professional styling
- Brand colors

## Features

Your template configuration is applied to demonstrate the final output.`;

    const orgSettings = {
      company_name: template.branding_config?.company_name || 'Your Company',
      primary_color: template.formatting_config?.primary_color || '#2563eb',
      secondary_color: template.formatting_config?.secondary_color || '#64748b'
    };

    let result;
    if (format.toLowerCase() === 'docx') {
      const blob = await generateDOCX(sampleMarkdown, template, orgSettings);
      // Convert blob to buffer for sending
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="template-preview.docx"`);
      return res.send(buffer);
    } else {
      // HTML export
      result = await exportBrief(sampleMarkdown, format, orgSettings);
      res.setHeader('Content-Type', result.mimeType);
      res.send(result.content);
    }
  } catch (error) {
    console.error('Error exporting template:', error);
    res.status(500).json({ error: 'Failed to export template', details: error.message });
  }
});

/**
 * POST /api/orgs/:orgId/document-templates/:templateId/preview
 * Preview template with sample content
 */
router.post('/:orgId/document-templates/:templateId/preview', requireMember(), async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get template
    const template = await documentTemplateService.getTemplateById(templateId, orgId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get fonts for org
    const fonts = await fontService.getFontsByOrg(orgId);
    const customFontCSS = await fontService.generateFontFaceCSS(orgId);
    
    // Sample content
    const sampleMarkdown = `# Document Preview

This is a preview of your document template.

## Header Configuration
${template.header_config?.enabled ? '✓ Headers enabled' : '✗ Headers disabled'}

## Footer Configuration
${template.footer_config?.enabled ? '✓ Footers enabled' : '✗ Footers disabled'}

## Styling
- Font: ${template.formatting_config?.font_family}
- Available Fonts: ${template.formatting_config?.available_fonts?.join(', ') || 'default'}
- Colors: Primary ${template.formatting_config?.primary_color}, Secondary ${template.formatting_config?.secondary_color}`;

    const orgSettings = {
      company_name: template.branding_config?.company_name || 'Your Company',
      primary_color: template.formatting_config?.primary_color || '#2563eb',
      secondary_color: template.formatting_config?.secondary_color || '#64748b',
      custom_fonts_css: customFontCSS
    };

    const html = generateStyledHTML(sampleMarkdown, orgSettings);
    res.json({ html });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template', details: error.message });
  }
});

export default router;

