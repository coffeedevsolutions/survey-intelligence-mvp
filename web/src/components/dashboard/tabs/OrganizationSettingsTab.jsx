import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { FormInput, FormTextarea } from '../../ui/form-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Building2, Palette, FileText, Download, Eye, ExternalLink, Code, AlertTriangle, Trash2 } from '../../ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { useNotifications } from '../../ui/notifications';
import { API_BASE_URL } from '../../../utils/api';
import { validateHTML, getAllowedHTMLDocs, createSafeHTMLPreview } from '../../../utils/htmlSanitizer';
import { ComplianceSettings } from './EnterpriseSettings';
import { PrioritizationSettings } from './PrioritizationSettings';
import { SolutionGenerationSettings } from './SolutionGenerationSettings';

/**
 * Organization Settings Tab Component
 */
export function OrganizationSettingsTab({ user }) {
  const { showSuccess, showError } = useNotifications();
  const {
    settings,
    solutionConfig,
    loading,
    updateSettings,
    themes
  } = useOrganizationSettings(user);

  const [formData, setFormData] = useState({});
  const [solutionConfigData, setSolutionConfigData] = useState({});
  const [activeTab, setActiveTab] = useState('branding');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (solutionConfig) {
      setSolutionConfigData(solutionConfig);
    }
  }, [solutionConfig]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSolutionConfigChange = (newConfig) => {
    setSolutionConfigData(newConfig);
  };

  const handleSave = async () => {
    try {
      // Determine if solution config has changes
      const hasChanges = JSON.stringify(solutionConfigData) !== JSON.stringify(solutionConfig);
      
      await updateSettings(
        formData, 
        hasChanges ? solutionConfigData : null
      );
      
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="branding">
            <Building2 className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="styling">
            <Palette className="w-4 h-4 mr-2" />
            Document
          </TabsTrigger>
          <TabsTrigger value="survey">
            <Eye className="w-4 h-4 mr-2" />
            Survey
          </TabsTrigger>
          <TabsTrigger value="solution-generation">
            <div className="w-4 h-4 mr-2">⚡</div>
            Solutions
          </TabsTrigger>
          <TabsTrigger value="prioritization">
            <div className="w-4 h-4 mr-2">📊</div>
            Priority
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <div className="w-4 h-4 mr-2">🔒</div>
            Compliance
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
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

        <TabsContent value="survey" className="space-y-6">
          <SurveyTemplateSettings 
            user={user}
          />
        </TabsContent>

        <TabsContent value="solution-generation" className="space-y-6">
          <SolutionGenerationSettings 
            config={solutionConfigData}
            onConfigChange={handleSolutionConfigChange}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="prioritization" className="space-y-6">
          <PrioritizationSettings 
            formData={formData}
            onInputChange={handleInputChange}
            user={user}
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceSettings 
            formData={formData}
            onInputChange={handleInputChange}
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

/**
 * Survey Template Settings Section
 */
function SurveyTemplateSettings({ user }) {
  const [templates, setTemplates] = React.useState([]);
  const [aiTemplates, setAITemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [_editingTemplate, setEditingTemplate] = React.useState(null);
  const [templateForm, setTemplateForm] = React.useState({
    name: '',
    description: '',
    survey_theme: 'professional',
    survey_primary_color: '#1f2937',
    survey_background_color: '#ffffff',
    survey_font_family: 'Inter, Arial, sans-serif',
    survey_welcome_message: 'Welcome! Thank you for taking the time to provide your feedback.',
    survey_completion_message: 'Thank you for completing our survey! Your responses have been recorded.',
    survey_show_logo: true,
    survey_show_progress: true,
    survey_smooth_transitions: true,
    // Experience Settings
    survey_layout: 'centered',
    survey_card_style: 'floating',
    progress_style: 'bar',
    question_flow_type: 'adaptive',
    show_brief_to_user: true,
    auto_save_progress: true,
    max_questions: null,
    time_per_question: null,
    isDefault: false,
    // AI Integration
    enable_ai: false,
    ai_template_id: null,
    // Brief Template
    brief_template: '',
    brief_ai_instructions: ''
  });
  const { showSuccess, showError } = useNotifications();

  const fetchTemplates = React.useCallback(async () => {
    if (!user?.orgId) return;
    
    setLoading(true);
    try {
      // Fetch both survey templates and AI templates
      const [surveyResponse, aiResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/survey-templates`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/ai-templates`, {
          credentials: 'include'
        })
      ]);
      
      if (surveyResponse.ok) {
        const data = await surveyResponse.json();
        setTemplates(data.templates || []);
      }
      
      if (aiResponse.ok) {
        const data = await aiResponse.json();
        setAITemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showError('Failed to load templates');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.orgId]);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);



  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      showError('Please enter a template name');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/survey-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: templateForm.name,
          description: templateForm.description,
          isDefault: templateForm.isDefault,
          enable_ai: templateForm.enable_ai,
          ai_template_id: templateForm.enable_ai ? templateForm.ai_template_id : null,
          brief_template: templateForm.brief_template,
          brief_ai_instructions: templateForm.brief_ai_instructions,
          settings: {
            survey_theme: templateForm.survey_theme,
            survey_primary_color: templateForm.survey_primary_color,
            survey_background_color: templateForm.survey_background_color,
            survey_font_family: templateForm.survey_font_family,
            survey_welcome_message: templateForm.survey_welcome_message,
            survey_completion_message: templateForm.survey_completion_message,
            survey_show_logo: templateForm.survey_show_logo,
            survey_show_progress: templateForm.survey_show_progress,
            survey_smooth_transitions: templateForm.survey_smooth_transitions,
            // Experience Settings
            survey_layout: templateForm.survey_layout,
            survey_card_style: templateForm.survey_card_style,
            progress_style: templateForm.progress_style,
            question_flow_type: templateForm.question_flow_type,
            show_brief_to_user: templateForm.show_brief_to_user,
            auto_save_progress: templateForm.auto_save_progress,
            max_questions: templateForm.max_questions,
            time_per_question: templateForm.time_per_question
          }
        })
      });

      if (response.ok) {
        showSuccess('Template created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchTemplates();
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      showError('Failed to create template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/survey-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('Template deleted successfully!');
        fetchTemplates();
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('Failed to delete template');
    }
  };

  const openPreview = (template) => {
    const params = new URLSearchParams({
      preview: 'true',
      orgId: user.orgId,
      settings: JSON.stringify(template.settings)
    });

    const previewUrl = `${API_BASE_URL}/public/preview?${params}`;
    window.open(previewUrl, '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      survey_theme: 'professional',
      survey_primary_color: '#1f2937',
      survey_background_color: '#ffffff',
      survey_font_family: 'Inter, Arial, sans-serif',
      survey_welcome_message: 'Welcome! Thank you for taking the time to provide your feedback.',
      survey_completion_message: 'Thank you for completing our survey! Your responses have been recorded.',
      survey_show_logo: true,
      survey_show_progress: true,
      survey_smooth_transitions: true,
      // Experience Settings
      survey_layout: 'centered',
      survey_card_style: 'floating',
      progress_style: 'bar',
      question_flow_type: 'adaptive',
      show_brief_to_user: true,
      auto_save_progress: true,
      max_questions: null,
      time_per_question: null,
      isDefault: false,
      // AI Integration
      enable_ai: false,
      ai_template_id: null,
      // Brief Template
      brief_template: '',
      brief_ai_instructions: ''
    });
    setEditingTemplate(null);
  };

  const surveyThemes = [
    { id: 'professional', name: 'Professional', preview: 'bg-white border-gray-200' },
    { id: 'modern', name: 'Modern', preview: 'bg-gradient-to-br from-blue-50 to-indigo-100' },
    { id: 'minimal', name: 'Minimal', preview: 'bg-gray-50 border-gray-100' },
    { id: 'friendly', name: 'Friendly', preview: 'bg-gradient-to-br from-green-50 to-blue-50' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Survey Templates</CardTitle>
              <CardDescription>
                Create reusable survey appearance templates that can be applied to campaigns and individual surveys
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No survey templates created yet.</p>
              <p className="text-sm">Create your first template to customize how surveys appear to respondents.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.is_default && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openPreview(template)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Theme: {template.settings.survey_theme || 'Professional'}</span>
                    <span>Color: {template.settings.survey_primary_color || '#1f2937'}</span>
                    <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Survey Template</h3>
              <Button variant="ghost" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <FormInput
                label="Template Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Customer Feedback Template"
              />
              
              <FormTextarea
                label="Description (Optional)"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when to use this template..."
                rows={2}
              />

              {/* AI Integration Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm mb-3">AI Integration</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enable_ai"
                      checked={templateForm.enable_ai}
                      onChange={(e) => setTemplateForm(prev => ({ 
                        ...prev, 
                        enable_ai: e.target.checked,
                        ai_template_id: !e.target.checked ? null : prev.ai_template_id
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="enable_ai" className="text-sm font-medium">
                      Enable AI-powered surveys
                    </label>
                  </div>
                  
                  {templateForm.enable_ai && (
                    <div>
                      <label className="block text-sm font-medium mb-2">AI Template</label>
                      <select
                        value={templateForm.ai_template_id || ''}
                        onChange={(e) => setTemplateForm(prev => ({ 
                          ...prev, 
                          ai_template_id: e.target.value || null 
                        }))}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Select an AI template...</option>
                        {aiTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.category})
                          </option>
                        ))}
                      </select>
                      {aiTemplates.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          No AI templates available. Create one in AI Survey Templates first.
                        </p>
                      )}
                      {templateForm.ai_template_id && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                          <strong>AI Behavior:</strong> Surveys using this template will dynamically generate questions based on user responses and the selected AI template's goals.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Brief Template Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm mb-3">Brief Generation Template</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Brief Template (Markdown/HTML)
                    </label>
                    <textarea
                      value={templateForm.brief_template}
                      onChange={(e) => setTemplateForm(prev => ({ 
                        ...prev, 
                        brief_template: e.target.value 
                      }))}
                      placeholder={`## Executive Summary
{executive_summary}

## Problem Statement
{problem_statement}

## Key Findings
{key_findings}

## Recommendations
{recommendations}

## Next Steps
{next_steps}`}
                      className="w-full p-3 border rounded font-mono text-sm"
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use placeholders like {'{executive_summary}'} that AI will replace with generated content.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      AI Instructions for Brief Generation
                    </label>
                    <textarea
                      value={templateForm.brief_ai_instructions}
                      onChange={(e) => setTemplateForm(prev => ({ 
                        ...prev, 
                        brief_ai_instructions: e.target.value 
                      }))}
                      placeholder="Analyze the survey responses and generate a professional business brief. Focus on identifying the root cause, impact assessment, and actionable recommendations. Keep language clear and executive-friendly."
                      className="w-full p-3 border rounded"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Instructions for how AI should analyze responses and generate the brief content.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <select
                    value={templateForm.survey_theme}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, survey_theme: e.target.value }))}
                    className="w-full p-2 border rounded"
                  >
                    {surveyThemes.map(theme => (
                      <option key={theme.id} value={theme.id}>{theme.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={templateForm.survey_primary_color}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, survey_primary_color: e.target.value }))}
                    className="w-full h-10 border rounded"
                  />
                </div>
              </div>

              <FormTextarea
                label="Welcome Message"
                value={templateForm.survey_welcome_message}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, survey_welcome_message: e.target.value }))}
                rows={2}
              />

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm mb-3">Survey Experience</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Layout Style</label>
                    <select
                      value={templateForm.survey_layout}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, survey_layout: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="centered">Centered Focus</option>
                      <option value="split-screen">Split Screen</option>
                      <option value="wizard">Step-by-Step Wizard</option>
                      <option value="conversational">Conversational</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {templateForm.survey_layout === 'centered' && 'Standard layout with progress sidebar'}
                      {templateForm.survey_layout === 'split-screen' && 'Welcome panel + survey side-by-side'}
                      {templateForm.survey_layout === 'wizard' && 'Minimal, step-focused design'}
                      {templateForm.survey_layout === 'conversational' && 'Chat-like progressive disclosure'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Card Style</label>
                    <select
                      value={templateForm.survey_card_style}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, survey_card_style: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="floating">Floating Cards</option>
                      <option value="fullscreen">Full Screen</option>
                      <option value="minimal">Minimal</option>
                      <option value="boxed">Boxed</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {templateForm.survey_card_style === 'floating' && 'Elevated cards with shadows'}
                      {templateForm.survey_card_style === 'fullscreen' && 'Edge-to-edge without borders'}
                      {templateForm.survey_card_style === 'minimal' && 'Clean design without decorations'}
                      {templateForm.survey_card_style === 'boxed' && 'Strong borders and defined containers'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Progress Display</label>
                    <select
                      value={templateForm.progress_style}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, progress_style: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="bar">Progress Bar</option>
                      <option value="steps">Step Indicators</option>
                      <option value="percentage">Percentage</option>
                      <option value="fraction">Fraction (2/10)</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Question Flow</label>
                    <select
                      value={templateForm.question_flow_type}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, question_flow_type: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="adaptive">Adaptive (AI-driven)</option>
                      <option value="fixed">Fixed sequence</option>
                      <option value="branching">Conditional branching</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Questions</label>
                    <input
                      type="number"
                      value={templateForm.max_questions || ''}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, max_questions: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Unlimited"
                      className="w-full p-2 border rounded"
                      min="1"
                      max="50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Time Per Question (sec)</label>
                    <input
                      type="number"
                      value={templateForm.time_per_question || ''}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, time_per_question: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="No limit"
                      className="w-full p-2 border rounded"
                      min="30"
                      max="600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show brief to user after completion</span>
                    <input
                      type="checkbox"
                      checked={templateForm.show_brief_to_user}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, show_brief_to_user: e.target.checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-save progress</span>
                    <input
                      type="checkbox"
                      checked={templateForm.auto_save_progress}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, auto_save_progress: e.target.checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">Set as organization default</span>
                <input
                  type="checkbox"
                  checked={templateForm.isDefault}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleCreateTemplate} className="flex-1">
                Create Template
              </Button>
              <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Brief Templates Settings Section
 */
function BriefTemplatesSettings({ user }) {
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState(null);
  const [templateForm, setTemplateForm] = React.useState({
    name: '',
    description: '',
    template_content: '',
    ai_instructions: '',
    is_default: false
  });
  const { showSuccess, showError } = useNotifications();

  const fetchTemplates = React.useCallback(async () => {
    if (!user?.orgId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/brief-templates`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching brief templates:', error);
      showError('Failed to load brief templates');
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.template_content) {
      showError('Please enter a template name and content');
      return;
    }

    try {
      const url = editingTemplate 
        ? `${API_BASE_URL}/api/orgs/${user.orgId}/brief-templates/${editingTemplate.id}`
        : `${API_BASE_URL}/api/orgs/${user.orgId}/brief-templates`;
      
      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(templateForm)
      });

      if (response.ok) {
        showSuccess(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchTemplates();
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Failed to save template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      template_content: template.template_content,
      ai_instructions: template.ai_instructions || '',
      is_default: template.is_default
    });
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/brief-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('Template deleted successfully!');
        fetchTemplates();
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('Failed to delete template');
    }
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      template_content: '',
      ai_instructions: '',
      is_default: false
    });
    setEditingTemplate(null);
  };

  const getDefaultTemplate = () => `# Business Brief

## Executive Summary
{executive_summary}

## Problem Statement
{problem_statement}

## Key Findings
{key_findings}

## Impact Assessment
{impact_assessment}

## Affected Stakeholders
{stakeholders}

## Recommendations
{recommendations}

## Next Steps
{next_steps}

## Timeline
{timeline}

---
*Generated on {generated_date} from survey responses*`;

  if (loading) {
    return <div className="p-6">Loading brief templates...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Brief Templates</CardTitle>
              <CardDescription>
                Create reusable AI brief templates for generating professional business documents from survey responses
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No brief templates created yet.</p>
              <p className="text-sm">Create your first template to customize how AI generates business briefs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingTemplate ? 'Edit Brief Template' : 'Create Brief Template'}
              </h3>
              <Button variant="ghost" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <FormInput
                label="Template Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard Business Brief"
              />
              
              <FormTextarea
                label="Description (Optional)"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when to use this template..."
                rows={2}
              />

              <div>
                <label className="block text-sm font-medium mb-2">
                  Brief Template (Markdown/HTML)
                </label>
                <textarea
                  value={templateForm.template_content}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, template_content: e.target.value }))}
                  placeholder={getDefaultTemplate()}
                  className="w-full p-3 border rounded-lg font-mono text-sm"
                  rows={15}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use placeholders like <code>{'{executive_summary}'}</code> that AI will replace with generated content.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  AI Instructions
                </label>
                <textarea
                  value={templateForm.ai_instructions}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, ai_instructions: e.target.value }))}
                  placeholder="Analyze the survey responses to create a professional business brief. Focus on identifying the root cause, business impact, affected stakeholders, and actionable recommendations. Use clear, executive-friendly language and prioritize practical solutions over technical details."
                  className="w-full p-3 border rounded-lg"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Instructions for how AI should analyze responses and generate the brief content.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={templateForm.is_default}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="is_default" className="text-sm font-medium">
                  Set as default template
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Available Placeholders</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <code className="bg-white px-2 py-1 rounded border">{'{executive_summary}'}</code>
                  <code className="bg-white px-2 py-1 rounded border">{'{problem_statement}'}</code>
                  <code className="bg-white px-2 py-1 rounded border">{'{key_findings}'}</code>
                  <code className="bg-white px-2 py-1 rounded border">{'{impact_assessment}'}</code>
                  <code className="bg-white px-2 py-1 rounded border">{'{stakeholders}'}</code>
                  <code className="bg-white px-2 py-1 rounded border">{'{recommendations}'}</code>
                  <code className="bg-white px-2 py-1 rounded border">{'{next_steps}'}</code>
                  <code className="bg-white px-2 py-1 rounded border">{'{timeline}'}</code>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleCreateTemplate} className="flex-1">
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
