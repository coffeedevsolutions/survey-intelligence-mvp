-- Custom Fonts Support Migration
-- Adds support for organization-level custom font management

-- Create organization_fonts table
CREATE TABLE IF NOT EXISTS organization_fonts (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  font_name TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_files JSONB NOT NULL, -- {woff: "url", woff2: "url", ttf: "url"}
  font_source TEXT CHECK (font_source IN ('google', 'custom')) DEFAULT 'custom',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, font_family)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_fonts_org_id ON organization_fonts(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_fonts_active ON organization_fonts(org_id, is_active) WHERE is_active = true;

-- Add comment to table
COMMENT ON TABLE organization_fonts IS 'Stores custom fonts uploaded by organizations for use in document templates';

-- Add comments to columns
COMMENT ON COLUMN organization_fonts.font_files IS 'JSONB object containing URLs to font files in different formats';
COMMENT ON COLUMN organization_fonts.font_source IS 'Source of the font: google (from Google Fonts API) or custom (uploaded by user)';

-- Update documentation_templates table to support available_fonts in formatting_config
-- This is a JSONB field, so we just add documentation
COMMENT ON COLUMN documentation_templates.formatting_config IS 'JSONB configuration including font_family (default), available_fonts (array of font names), font_size, line_height, text_alignment, colors';

