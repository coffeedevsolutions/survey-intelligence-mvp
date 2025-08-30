import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { FormInput, FormTextarea } from '../../ui/form-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Building2, Palette, FileText, Download, Eye, ExternalLink, Code, AlertTriangle } from '../../ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { useNotifications } from '../../ui/notifications';
import { API_BASE_URL } from '../../../utils/api';
import { validateHTML, getAllowedHTMLDocs, createSafeHTMLPreview } from '../../../utils/htmlSanitizer';

/**
 * Organization Settings Tab Component
 */
export function OrganizationSettingsTab({ user }) {
  const { showSuccess, showError } = useNotifications();
  const {
    settings,
    loading,
    updateSettings,
    themes
  } = useOrganizationSettings(user);

  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('branding');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      showSuccess('Organization settings updated successfully!');
    } catch (error) {
      showError('Failed to update settings: ' + error.message);
    }
  };

  const openFullPreview = () => {
    if (!formData || !user?.orgId) return;
    
    const sampleContent = `# Sample Project Brief

**Problem Statement**  
Improve user onboarding experience for new customers

**Who is affected**  
New customers and support team (approximately 500 new signups per month)

**Impact**  
Currently 40% of new users drop off during onboarding, leading to revenue loss

**Data sources/systems**  
- Analytics dashboard
- Customer support tickets
- User feedback surveys

**Current workaround**  
Manual email follow-ups from support team

**Deadline/dependencies**  
Target completion by end of Q2 to align with marketing campaign

**Acceptance criteria**  
- Reduce drop-off rate to under 20%
- Implement automated email sequences
- Create interactive tutorial system`;

    const params = new URLSearchParams({
      settings: JSON.stringify(formData),
      content: sampleContent
    });

    const previewUrl = `${API_BASE_URL}/api/orgs/${user.orgId}/briefs/preview?${params}`;
    window.open(previewUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Loading organization settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Organization Settings</h2>
          <p className="text-muted-foreground">
            Configure your organization's branding and document styling
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openFullPreview}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Full Preview
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('preview')}>
            <Eye className="w-4 h-4 mr-2" />
            Live Preview
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">
            <Building2 className="w-4 h-4 mr-2" />
            Company Branding
          </TabsTrigger>
          <TabsTrigger value="styling">
            <Palette className="w-4 h-4 mr-2" />
            Document Styling
          </TabsTrigger>
          <TabsTrigger value="export">
            <FileText className="w-4 h-4 mr-2" />
            Export Settings
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Live Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <BrandingSettings 
            formData={formData}
            onInputChange={handleInputChange}
          />
        </TabsContent>

        <TabsContent value="styling" className="space-y-6">
          <StylingSettings 
            formData={formData}
            onInputChange={handleInputChange}
            themes={themes}
          />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <ExportSettings 
            formData={formData}
            onInputChange={handleInputChange}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <PreviewSettings 
            formData={formData}
            onOpenFullPreview={openFullPreview}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Company Branding Settings Section
 */
function BrandingSettings({ formData, onInputChange }) {
  const [activeHeaderMode, setActiveHeaderMode] = useState('text');
  const [activeFooterMode, setActiveFooterMode] = useState('text');
  const [htmlValidation, setHtmlValidation] = useState({ header: null, footer: null });

  const validateHTMLField = (fieldName, value) => {
    const validation = validateHTML(value);
    setHtmlValidation(prev => ({
      ...prev,
      [fieldName]: validation
    }));
    return validation;
  };

  const handleHTMLChange = (fieldName, value) => {
    validateHTMLField(fieldName, value);
    onInputChange(fieldName, value);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Basic company details that appear on all documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormInput
            label="Company Name"
            value={formData.company_name || ''}
            onChange={(e) => onInputChange('company_name', e.target.value)}
            placeholder="Your Company Name"
          />
          
          <FormInput
            label="Logo URL"
            value={formData.logo_url || ''}
            onChange={(e) => onInputChange('logo_url', e.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Header</CardTitle>
          <CardDescription>
            Configure the header that appears at the top of your documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button 
              size="sm" 
              variant={activeHeaderMode === 'text' ? 'default' : 'outline'}
              onClick={() => setActiveHeaderMode('text')}
            >
              Text Mode
            </Button>
            <Button 
              size="sm" 
              variant={activeHeaderMode === 'html' ? 'default' : 'outline'}
              onClick={() => setActiveHeaderMode('html')}
            >
              <Code className="w-4 h-4 mr-1" />
              HTML Mode
            </Button>
          </div>

          {activeHeaderMode === 'text' ? (
            <FormTextarea
              label="Header Text"
              value={formData.document_header || ''}
              onChange={(e) => onInputChange('document_header', e.target.value)}
              placeholder="Optional header text that appears below your logo"
              rows={2}
            />
          ) : (
            <div>
              <FormTextarea
                label="Custom HTML Header"
                value={formData.document_header_html || ''}
                onChange={(e) => handleHTMLChange('document_header_html', e.target.value)}
                placeholder={getAllowedHTMLDocs().examples.header}
                rows={6}
              />
              {htmlValidation.header?.warnings?.length > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    HTML Warnings
                  </div>
                  <ul className="text-yellow-700 text-sm list-disc list-inside">
                    {htmlValidation.header.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              {formData.document_header_html && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Preview:</label>
                  <div 
                    className="border rounded p-3 bg-gray-50"
                    dangerouslySetInnerHTML={{ 
                      __html: createSafeHTMLPreview(formData.document_header_html, 'header') 
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Footer</CardTitle>
          <CardDescription>
            Configure the footer that appears at the bottom of your documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button 
              size="sm" 
              variant={activeFooterMode === 'text' ? 'default' : 'outline'}
              onClick={() => setActiveFooterMode('text')}
            >
              Text Mode
            </Button>
            <Button 
              size="sm" 
              variant={activeFooterMode === 'html' ? 'default' : 'outline'}
              onClick={() => setActiveFooterMode('html')}
            >
              <Code className="w-4 h-4 mr-1" />
              HTML Mode
            </Button>
          </div>

          {activeFooterMode === 'text' ? (
            <FormTextarea
              label="Footer Text"
              value={formData.document_footer || ''}
              onChange={(e) => onInputChange('document_footer', e.target.value)}
              placeholder="Optional footer text (e.g., confidentiality notice, contact info)"
              rows={3}
            />
          ) : (
            <div>
              <FormTextarea
                label="Custom HTML Footer"
                value={formData.document_footer_html || ''}
                onChange={(e) => handleHTMLChange('document_footer_html', e.target.value)}
                placeholder={getAllowedHTMLDocs().examples.footer}
                rows={6}
              />
              {htmlValidation.footer?.warnings?.length > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    HTML Warnings
                  </div>
                  <ul className="text-yellow-700 text-sm list-disc list-inside">
                    {htmlValidation.footer.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              {formData.document_footer_html && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Preview:</label>
                  <div 
                    className="border rounded p-3 bg-gray-50"
                    dangerouslySetInnerHTML={{ 
                      __html: createSafeHTMLPreview(formData.document_footer_html, 'footer') 
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed HTML Reference</CardTitle>
          <CardDescription>
            Safe HTML tags and attributes you can use in headers and footers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Allowed Tags:</h4>
              <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                {getAllowedHTMLDocs().allowedTags.join(', ')}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Allowed Attributes:</h4>
              <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                {getAllowedHTMLDocs().allowedAttributes.join(', ')}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Tips:</h4>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              {getAllowedHTMLDocs().tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Document Styling Settings Section
 */
function StylingSettings({ formData, onInputChange, themes }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Selection</CardTitle>
          <CardDescription>
            Choose a professional theme for your documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(themes || {}).map(([themeId, theme]) => (
              <div
                key={themeId}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  formData.theme === themeId 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onInputChange('theme', themeId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{theme.name}</h4>
                  {formData.theme === themeId && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {theme.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Customization</CardTitle>
          <CardDescription>
            Customize colors to match your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primary_color || '#1f2937'}
                  onChange={(e) => onInputChange('primary_color', e.target.value)}
                  className="w-12 h-10 border border-input rounded"
                />
                <FormInput
                  value={formData.primary_color || '#1f2937'}
                  onChange={(e) => onInputChange('primary_color', e.target.value)}
                  placeholder="#1f2937"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.secondary_color || '#6b7280'}
                  onChange={(e) => onInputChange('secondary_color', e.target.value)}
                  className="w-12 h-10 border border-input rounded"
                />
                <FormInput
                  value={formData.secondary_color || '#6b7280'}
                  onChange={(e) => onInputChange('secondary_color', e.target.value)}
                  placeholder="#6b7280"
                />
              </div>
            </div>
          </div>
          
          <FormInput
            label="Font Family"
            value={formData.font_family || 'Inter, Arial, sans-serif'}
            onChange={(e) => onInputChange('font_family', e.target.value)}
            placeholder="Inter, Arial, sans-serif"
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Export Settings Section
 */
function ExportSettings({ formData, onInputChange }) {
  const exportFormats = [
    { id: 'html', name: 'Styled HTML', description: 'Professional web document' },
    { id: 'pdf', name: 'PDF Ready', description: 'Print-ready HTML (save as PDF in browser)' },
    { id: 'markdown', name: 'Plain Markdown', description: 'Raw markdown for developers' }
  ];

  const toggleFormat = (formatId) => {
    const currentFormats = formData.export_formats || ['html', 'pdf', 'markdown'];
    const newFormats = currentFormats.includes(formatId)
      ? currentFormats.filter(f => f !== formatId)
      : [...currentFormats, formatId];
    onInputChange('export_formats', newFormats);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Export Formats</CardTitle>
          <CardDescription>
            Choose which export formats are available for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportFormats.map((format) => (
              <div 
                key={format.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{format.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {format.description}
                  </p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(formData.export_formats || []).includes(format.id)}
                    onChange={() => toggleFormat(format.id)}
                    className="mr-2"
                  />
                  <span className="text-sm">Enable</span>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Layout</CardTitle>
          <CardDescription>
            Configure document layout preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Include Letterhead</h4>
              <p className="text-sm text-muted-foreground">
                Show company logo and header on documents
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.letterhead_enabled !== false}
                onChange={(e) => onInputChange('letterhead_enabled', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Page Size</label>
              <select
                value={formData.page_size || 'A4'}
                onChange={(e) => onInputChange('page_size', e.target.value)}
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
              >
                <option value="A4">A4 (210mm × 297mm)</option>
                <option value="US Letter">US Letter (8.5" × 11")</option>
                <option value="Legal">Legal (8.5" × 14")</option>
                <option value="A3">A3 (297mm × 420mm)</option>
              </select>
            </div>
            
            <FormInput
              label="Page Margins"
              value={formData.page_margins || '1in'}
              onChange={(e) => onInputChange('page_margins', e.target.value)}
              placeholder="1in"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Live Preview Settings Section
 */
function PreviewSettings({ formData, onOpenFullPreview }) {
  const sampleContent = `# Sample Project Brief

**Problem Statement**  
Improve user onboarding experience for new customers

**Who is affected**  
New customers and support team (approximately 500 new signups per month)

**Impact**  
Currently 40% of new users drop off during onboarding, leading to revenue loss

**Data sources/systems**  
- Analytics dashboard
- Customer support tickets  
- User feedback surveys

**Current workaround**  
Manual email follow-ups from support team

**Deadline/dependencies**  
Target completion by end of Q2 to align with marketing campaign

**Acceptance criteria**  
- Reduce drop-off rate to under 20%
- Implement automated email sequences
- Create interactive tutorial system`;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>
                See how your documents will look with current styling
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={onOpenFullPreview} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Document View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Theme Preview */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Current Theme: {formData.theme || 'Professional'}</h4>
              <div className="text-sm text-muted-foreground">
                {formData.theme === 'technical' && 'Code-friendly with monospace elements'}
                {formData.theme === 'consulting' && 'Executive summary style with emphasis'}
                {formData.theme === 'minimal' && 'Clean and simple with plenty of whitespace'}
                {(!formData.theme || formData.theme === 'professional') && 'Clean corporate styling with letterhead'}
              </div>
            </div>

            {/* Color Preview */}
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: formData.primary_color || '#1f2937' }}
                ></div>
                <span className="text-sm">Primary: {formData.primary_color || '#1f2937'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: formData.secondary_color || '#6b7280' }}
                ></div>
                <span className="text-sm">Secondary: {formData.secondary_color || '#6b7280'}</span>
              </div>
            </div>

            {/* Inline Preview */}
            <div 
              className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto"
              style={{ 
                fontFamily: formData.font_family || 'Inter, sans-serif',
                backgroundColor: formData.theme === 'minimal' ? '#ffffff' : '#f9fafb'
              }}
            >
              {/* Letterhead preview */}
              {formData.letterhead_enabled !== false && (
                <div 
                  className="mb-6 p-4 rounded"
                  style={{ 
                    backgroundColor: formData.theme === 'minimal' ? '#f9fafb' : '#f3f4f6',
                    borderLeft: `4px solid ${formData.primary_color || '#1f2937'}`
                  }}
                >
                  {formData.company_name && (
                    <h2 className="text-lg font-semibold mb-1" style={{ color: formData.primary_color || '#1f2937' }}>
                      {formData.company_name}
                    </h2>
                  )}
                  {/* Show HTML header if available, otherwise show text header */}
                  {formData.document_header_html ? (
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: createSafeHTMLPreview(formData.document_header_html, 'header') 
                      }}
                    />
                  ) : formData.document_header ? (
                    <p className="text-sm text-gray-600">{formData.document_header}</p>
                  ) : null}
                </div>
              )}

              <div 
                className="prose max-w-none"
                style={{ 
                  color: formData.primary_color || '#1f2937',
                  lineHeight: '1.6'
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                  {sampleContent}
                </div>
              </div>

              {/* Footer preview */}
              {(formData.document_footer_html || formData.document_footer) && (
                <div className="mt-6 pt-4 border-t text-sm text-gray-500">
                  {formData.document_footer_html ? (
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: createSafeHTMLPreview(formData.document_footer_html, 'footer') 
                      }}
                    />
                  ) : (
                    formData.document_footer
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded">
              <strong>Document Format:</strong> Documents are formatted for {formData.page_size || 'A4'} size with {formData.page_margins || '1in'} margins. 
              The "Document View" shows the exact layout that will be used for PDF export and printing. 
              Use your browser's print function (Ctrl+P) and "Save as PDF" to export.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
