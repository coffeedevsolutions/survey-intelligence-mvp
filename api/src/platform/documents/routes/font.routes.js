/**
 * Font Management Routes
 * Handle custom font upload, listing, and deletion
 */

import { Router } from 'express';
import multer from 'multer';
import { requireMember } from '../../auth/services/auth-enhanced.js';
import * as fontService from '../services/fontService.js';

const router = Router();

// Configure multer for font file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * GET /api/orgs/:orgId/fonts
 * List all fonts for an organization
 */
router.get('/:orgId/fonts', requireMember('viewer'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fonts = await fontService.getFontsByOrg(orgId);
    res.json({ fonts });
  } catch (error) {
    console.error('Error fetching fonts:', error);
    res.status(500).json({ error: 'Failed to fetch fonts', details: error.message });
  }
});

/**
 * POST /api/orgs/:orgId/fonts
 * Upload a custom font
 */
router.post('/:orgId/fonts', requireMember('reviewer'), upload.single('font'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No font file provided' });
    }

    const fontName = req.body.fontName || req.file.originalname.replace(/\.[^/.]+$/, '');

    const font = await fontService.uploadFont(
      orgId,
      req.file,
      fontName,
      req.user.id
    );

    res.status(201).json({ message: 'Font uploaded successfully', font });
  } catch (error) {
    console.error('Error uploading font:', error);
    res.status(500).json({ error: 'Failed to upload font', details: error.message });
  }
});

/**
 * DELETE /api/orgs/:orgId/fonts/:fontId
 * Delete a custom font
 */
router.delete('/:orgId/fonts/:fontId', requireMember('reviewer'), async (req, res) => {
  try {
    const { orgId, fontId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await fontService.deleteFont(fontId, orgId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting font:', error);
    res.status(500).json({ error: 'Failed to delete font', details: error.message });
  }
});

/**
 * GET /api/orgs/:orgId/fonts/google
 * Get popular Google Fonts
 */
router.get('/:orgId/fonts/google', requireMember('viewer'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    if (parseInt(req.user.orgId) !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fonts = await fontService.getPopularGoogleFonts();
    res.json({ fonts });
  } catch (error) {
    console.error('Error fetching Google Fonts:', error);
    res.status(500).json({ error: 'Failed to fetch Google Fonts', details: error.message });
  }
});

export default router;

