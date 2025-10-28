-- Documentation Templates System
-- Allows organizations to create customizable document presets for various document types

-- Create dedicated documentation templates table
CREATE TABLE IF NOT EXISTS documentation_templates (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'technical_brief',
    'requirements_spec',
    'spike_findings',
    'technical_design',
    'feedback_summary',
    'nps_findings',
    'satisfaction_report',
    'course_feedback',
    'customer_feedback',
    'product_feedback',
    'service_feedback',
    'employee_feedback',
    'event_feedback',
    'onboarding_feedback',
    'market_research',
    'user_research',
    'business_analysis',
    'project_proposal',
    'executive_summary',
    'status_report',
    'general_document'
  )),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Formatting configuration
  formatting_config JSONB DEFAULT '{
    "font_family": "Inter, Arial, sans-serif",
    "font_size": "12pt",
    "line_height": "1.5",
    "text_alignment": "left",
    "primary_color": "#1f2937",
    "secondary_color": "#6b7280"
  }',
  
  -- Header configuration with rich text support
  header_config JSONB DEFAULT '{
    "enabled": true,
    "content": "",
    "height": "1in",
    "position": "top",
    "align": "left",
    "border_bottom": false
  }',
  
  -- Footer configuration with rich text support
  footer_config JSONB DEFAULT '{
    "enabled": true,
    "content": "",
    "height": "0.75in",
    "position": "bottom",
    "align": "center",
    "border_top": false
  }',
  
  -- Branding configuration
  branding_config JSONB DEFAULT '{
    "logo_url": "",
    "logo_position": "left",
    "logo_size": "medium",
    "company_name": "",
    "company_address": "",
    "company_contact": "",
    "brand_colors": {
      "primary": "#2563eb",
      "secondary": "#64748b"
    }
  }',
  
  -- Layout and page setup
  layout_config JSONB DEFAULT '{
    "page_size": "A4",
    "orientation": "portrait",
    "margins": {
      "top": "1in",
      "bottom": "1in",
      "left": "1in",
      "right": "1in"
    },
    "section_spacing": "12pt",
    "paragraph_spacing": "6pt"
  }',
  
  -- AI instructions for document generation
  ai_instructions JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT REFERENCES users(id),
  
  UNIQUE(org_id, name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_templates_org_id ON documentation_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_document_type ON documentation_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_templates_active ON documentation_templates(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_doc_templates_default ON documentation_templates(org_id, document_type, is_default) WHERE is_default = true;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documentation_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_doc_template_updated_at ON documentation_templates;
CREATE TRIGGER trigger_update_doc_template_updated_at
  BEFORE UPDATE ON documentation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_template_updated_at();

-- Create default templates for existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    -- Insert default technical brief template
    INSERT INTO documentation_templates (
      org_id, name, description, document_type, is_default, is_active
    ) VALUES (
      org_record.id,
      'Default Technical Brief',
      'Standard template for technical project briefs',
      'technical_brief',
      true,
      true
    )
    ON CONFLICT (org_id, name) DO NOTHING;
    
    -- Insert default feedback summary template
    INSERT INTO documentation_templates (
      org_id, name, description, document_type, is_default, is_active
    ) VALUES (
      org_record.id,
      'Default Feedback Summary',
      'Standard template for feedback summaries',
      'feedback_summary',
      true,
      true
    )
    ON CONFLICT (org_id, name) DO NOTHING;
  END LOOP;
END $$;

