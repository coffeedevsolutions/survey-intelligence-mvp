/**
 * Font Service
 * Handles font upload, validation, and management for document templates
 */

import { pool } from '../../../database/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Font upload directory
const FONTS_DIR = path.join(__dirname, '../../../../uploads/fonts');

/**
 * Ensure fonts directory exists
 */
async function ensureFontsDirectory() {
  try {
    await fs.access(FONTS_DIR);
  } catch (error) {
    await fs.mkdir(FONTS_DIR, { recursive: true });
  }
}

/**
 * Get all fonts for an organization
 */
export async function getFontsByOrg(orgId) {
  const result = await pool.query(
    `SELECT id, font_name, font_family, font_files, font_source, created_at
     FROM organization_fonts
     WHERE org_id = $1 AND is_active = true
     ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

/**
 * Get a specific font by ID
 */
export async function getFontById(fontId, orgId) {
  const result = await pool.query(
    `SELECT id, font_name, font_family, font_files, font_source, created_at
     FROM organization_fonts
     WHERE id = $1 AND org_id = $2 AND is_active = true`,
    [fontId, orgId]
  );
  return result.rows[0] || null;
}

/**
 * Upload and save a custom font
 */
export async function uploadFont(orgId, fontFile, fontName, createdBy) {
  await ensureFontsDirectory();
  
  // Validate file
  const validExtensions = ['ttf', 'woff', 'woff2'];
  const fileExtension = path.extname(fontFile.originalname).slice(1).toLowerCase();
  
  if (!validExtensions.includes(fileExtension)) {
    throw new Error(`Invalid font file type. Allowed: ${validExtensions.join(', ')}`);
  }

  // Check file size (max 5MB)
  if (fontFile.size > 5 * 1024 * 1024) {
    throw new Error('Font file too large. Maximum size is 5MB.');
  }

  // Create org-specific directory
  const orgDir = path.join(FONTS_DIR, `org-${orgId}`);
  await fs.mkdir(orgDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const safeFileName = `${fontName.replace(/[^a-zA-Z0-9-]/g, '_')}_${timestamp}.${fileExtension}`;
  const fontFilePath = path.join(orgDir, safeFileName);

  // Save file
  await fs.writeFile(fontFilePath, fontFile.buffer);

  // Create relative URL path
  const fontUrl = `/uploads/fonts/org-${orgId}/${safeFileName}`;

  // Store in database
  const result = await pool.query(
    `INSERT INTO organization_fonts (org_id, font_name, font_family, font_files, font_source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, font_name, font_family, font_source`,
    [
      orgId,
      fontName,
      fontName, // font_family defaults to font_name
      JSON.stringify({ [fileExtension]: fontUrl }),
      'custom',
      createdBy
    ]
  );

  return result.rows[0];
}

/**
 * Delete a custom font
 */
export async function deleteFont(fontId, orgId) {
  // Get font info before deletion
  const font = await getFontById(fontId, orgId);
  
  if (!font) {
    throw new Error('Font not found');
  }

  // Soft delete in database
  await pool.query(
    `UPDATE organization_fonts 
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND org_id = $2`,
    [fontId, orgId]
  );

  // Delete physical files
  if (font.font_files) {
    const fontFiles = typeof font.font_files === 'string' 
      ? JSON.parse(font.font_files) 
      : font.font_files;
    
    for (const [format, url] of Object.entries(fontFiles)) {
      if (url && url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '../../../../', url);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error(`Failed to delete font file ${url}:`, error);
          // Continue deletion even if one file fails
        }
      }
    }
  }

  return { success: true, font: font.font_name };
}

/**
 * Get popular Google Fonts
 */
export async function getPopularGoogleFonts() {
  // Return a curated list of popular Google Fonts
  return [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Raleway',
    'Source Sans Pro',
    'Poppins',
    'Merriweather',
    'Playfair Display',
    'Oswald',
    'Roboto Condensed',
    'Ubuntu',
    'Lora',
    'Roboto Slab',
    'Noto Sans',
    'PT Sans',
    'Titillium Web',
    'Dosis',
    'Arimo',
    'PT Serif',
    'Droid Sans',
    'Crimson Text',
    'Fira Sans',
    'Work Sans'
  ];
}

/**
 * Generate @font-face CSS for custom fonts
 */
export async function generateFontFaceCSS(orgId) {
  const fonts = await getFontsByOrg(orgId);
  
  let css = '';
  
  for (const font of fonts) {
    const fontFiles = typeof font.font_files === 'string' 
      ? JSON.parse(font.font_files) 
      : font.font_files;
    
    if (Object.keys(fontFiles).length > 0) {
      css += `@font-face {
  font-family: '${font.font_family}';
  font-weight: normal;
  font-style: normal;
  src: `;
      
      const sources = [];
      if (fontFiles.woff2) {
        sources.push(`url('${fontFiles.woff2}') format('woff2')`);
      }
      if (fontFiles.woff) {
        sources.push(`url('${fontFiles.woff}') format('woff')`);
      }
      if (fontFiles.ttf) {
        sources.push(`url('${fontFiles.ttf}') format('truetype')`);
      }
      
      css += sources.join(',\n       ');
      css += `;
}\n\n`;
    }
  }
  
  return css;
}

/**
 * Get Google Fonts CSS import URL
 */
export function getGoogleFontsImportURL(fontFamilies) {
  if (!fontFamilies || fontFamilies.length === 0) {
    return '';
  }

  // Filter out custom fonts, keep only Google Fonts
  const googleFonts = fontFamilies.filter(font => {
    const fontObj = typeof font === 'string' ? { name: font, source: 'google' } : font;
    return fontObj.source === 'google';
  }).map(font => {
    const name = typeof font === 'string' ? font : font.name;
    return name.replace(/\s+/g, '+');
  });

  if (googleFonts.length === 0) {
    return '';
  }

  return `https://fonts.googleapis.com/css2?${googleFonts.map(f => `family=${f}:wght@400;700`).join('&')}&display=swap`;
}

export default {
  getFontsByOrg,
  getFontById,
  uploadFont,
  deleteFont,
  getPopularGoogleFonts,
  generateFontFaceCSS,
  getGoogleFontsImportURL
};

