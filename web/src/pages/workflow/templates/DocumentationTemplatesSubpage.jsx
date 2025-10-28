/**
 * Documentation Templates Subpage for Workflow Management
 * Full-featured template management system for document presets
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { FormInput, FormTextarea } from '../../../components/ui/form-input.jsx';
import { Select } from '../../../components/ui/simple-select.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { RichTextEditor } from '../../../components/ui/rich-text-editor.jsx';
import { FontPicker } from '../../../components/ui/font-picker.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';
import { API_BASE_URL } from '../../../utils/api.js';
import { 
  Plus, Copy, Trash2, Save, Settings, Info
} from '../../../components/ui/icons.jsx';

// Document types organized by category
const DOCUMENT_TYPES = [
  // Technical Documents
  { value: 'technical_brief', label: 'Technical Brief', category: 'technical' },
  { value: 'requirements_spec', label: 'Requirements Specification', category: 'technical' },
  { value: 'spike_findings', label: 'Spike Findings', category: 'technical' },
  { value: 'technical_design', label: 'Technical Design', category: 'technical' },
  
  // Feedback Documents
  { value: 'feedback_summary', label: 'Feedback Summary', category: 'feedback' },
  { value: 'nps_findings', label: 'NPS Findings', category: 'feedback' },
  { value: 'satisfaction_report', label: 'Satisfaction Report', category: 'feedback' },
  
  // Survey Templates
  { value: 'course_feedback', label: 'Course Feedback', category: 'survey' },
  { value: 'customer_feedback', label: 'Customer Feedback', category: 'survey' },
  { value: 'product_feedback', label: 'Product Feedback', category: 'survey' },
  { value: 'service_feedback', label: 'Service Feedback', category: 'survey' },
  { value: 'employee_feedback', label: 'Employee Feedback', category: 'survey' },
  { value: 'event_feedback', label: 'Event Feedback', category: 'survey' },
  { value: 'onboarding_feedback', label: 'Onboarding Feedback', category: 'survey' },
  
  // Research & Analysis
  { value: 'market_research', label: 'Market Research', category: 'research' },
  { value: 'user_research', label: 'User Research', category: 'research' },
  { value: 'business_analysis', label: 'Business Analysis', category: 'research' },
  
  // General Documents
  { value: 'project_proposal', label: 'Project Proposal', category: 'general' },
  { value: 'executive_summary', label: 'Executive Summary', category: 'general' },
  { value: 'status_report', label: 'Status Report', category: 'general' },
  { value: 'general_document', label: 'General Document', category: 'general' }
];

export function DocumentationTemplatesSubpage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.orgId]);

  const fetchTemplates = async () => {
    if (!user?.orgId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/document-templates`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Response error:', errorData);
        // If 403 Forbidden, it might be a permissions issue
        if (response.status === 403) {
          showError('You do not have permission to access document templates');
          setLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data || []);
      
      // Select default template or first template
      if (!selectedTemplate && data && data.length > 0) {
        const defaultTemplate = data.find(t => t.is_default) || data[0];
        setSelectedTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (templateData) => {
    if (!user?.orgId) return;
    
    setSaving(true);
    try {
      const url = templateData.id 
        ? `${API_BASE_URL}/api/orgs/${user.orgId}/document-templates/${templateData.id}`
        : `${API_BASE_URL}/api/orgs/${user.orgId}/document-templates`;
      
      const method = templateData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to save template');
      }

      showSuccess(`Template ${templateData.id ? 'updated' : 'created'} successfully`);
      await fetchTemplates();
      setIsCreating(false);
      
      // Update selected template if we just created/updated it
      const newData = await response.json();
      if (templateData.id === selectedTemplate?.id) {
        setSelectedTemplate(newData);
      }
      
      // Close modal after save
      setShowTemplateEditor(false);
      setSelectedTemplate(newData);
    } catch (error) {
      console.error('Error saving template:', error);
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const duplicateTemplate = async (template) => {
    const newName = prompt('Enter name for the duplicated template:', `${template.name} Copy`);
    if (!newName) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/document-templates/${template.id}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: newName })
        }
      );

      if (!response.ok) throw new Error('Failed to duplicate template');
      
      showSuccess('Template duplicated successfully');
      await fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      showError('Failed to duplicate template');
    }
  };

  const deleteTemplate = async (template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/document-templates/${template.id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Failed to delete template');
      
      showSuccess('Template deleted successfully');
      
      // Clear selection if deleting the selected template
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(null);
      }
      
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showError(error.message || 'Failed to delete template');
    }
  };

  const handleAIGeneratorClose = () => {
    setShowAIGenerator(false);
  };

  const handleAIGeneratorComplete = (generatedTemplate) => {
    setShowAIGenerator(false);
    setSelectedTemplate(generatedTemplate);
  };

  // Filter templates by selected type
  const filteredTemplates = selectedTypeFilter === 'all' 
    ? templates 
    : templates.filter(t => DOCUMENT_TYPES.find(dt => dt.value === t.document_type)?.category === selectedTypeFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Templates</h2>
          <p className="text-gray-600 mt-1">
            Create reusable document presets with formatting and branding
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAIGenerator(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            🤖 AI Generate Template
          </Button>
          <Button 
            onClick={() => {
              console.log('New Template clicked, opening modal');
              setSelectedTemplate(null);
              setIsCreating(true);
              setShowTemplateEditor(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Document Templates</strong> define how your documents are formatted and styled when exported.
                Create templates for different document types with custom headers, footers, branding, and formatting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="technical">Technical Documents</option>
          <option value="feedback">Feedback Documents</option>
          <option value="survey">Survey Templates</option>
          <option value="research">Research & Analysis</option>
          <option value="general">General Documents</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 cursor-pointer border-l-4 transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedTemplate(template);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                          {template.name}
                          {template.is_default && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {DOCUMENT_TYPES.find(dt => dt.value === template.document_type)?.label || template.document_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateTemplate(template);
                          }}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(template);
                          }}
                          title="Delete"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredTemplates.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No templates found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Preview */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedTemplate.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {selectedTemplate.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowTemplateEditor(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TemplatePreview template={selectedTemplate} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a template to view its preview or create a new one</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && (isCreating || selectedTemplate) && createPortal(
        <TemplateEditorModal
          template={selectedTemplate}
          onSave={(templateData) => {
            saveTemplate(templateData);
          }}
          onClose={() => {
            setShowTemplateEditor(false);
            setIsCreating(false);
          }}
          saving={saving}
        />,
        document.body
      )}

      {/* AI Template Generator Modal */}
      {showAIGenerator && (
        <AIDocumentTemplateGeneratorModal
          orgId={user?.orgId}
          onClose={handleAIGeneratorClose}
          onComplete={handleAIGeneratorComplete}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}
    </div>
  );
}

// Helper function to convert absolute units to container-relative percentages
function convertToContainerPercent(value, pageWidthInches) {
  // Parse the value and extract number and unit
  if (!value || value === '0') return '0';
  
  const valueStr = String(value).trim();
  const match = valueStr.match(/^([\d.]+)(\w+)?$/);
  
  if (!match) return value; // Return as-is if we can't parse
  
  const numValue = parseFloat(match[1]);
  const unit = match[2];
  
  // Convert to inches
  let inches;
  if (!unit || unit === 'in') {
    inches = numValue;
  } else if (unit === 'mm') {
    inches = numValue / 25.4;
  } else if (unit === 'pt') {
    inches = numValue / 72;
  } else if (unit === 'px') {
    // Assuming 96 DPI
    inches = numValue / 96;
  } else {
    // Unknown unit, return as percentage
    return value;
  }
  
  // Convert to percentage of page width
  return `${(inches / pageWidthInches) * 100}%`;
}

// Helper function to scale inline font-size styles in HTML content
function scaleHTMLFontSizes(html, scaleFactor) {
  if (!html) return html;
  
  // Replace font-size values in inline styles (e.g., style="font-size: 14px")
  return html.replace(/font-size:\s*([\d.]+)(px|pt|em|%)/gi, (match, value, unit) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return match;
    
    if (unit.toLowerCase() === 'px' || unit.toLowerCase() === 'pt') {
      // Scale pixel and point values
      return `font-size: ${numValue * scaleFactor}px`;
    } else if (unit.toLowerCase() === 'em') {
      // Scale em values (keep as em)
      return `font-size: ${numValue * scaleFactor}em`;
    } else if (unit.toLowerCase() === '%') {
      // Scale percentage values
      return `font-size: ${numValue * scaleFactor}%`;
    }
    return match;
  });
}

// Template Preview Component
function TemplatePreview({ template }) {
  const [zoom, setZoom] = useState(1);
  const [panStart, setPanStart] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isGrabbing, setIsGrabbing] = useState(false);
  
  const pageSizes = {
    'A4': { width: 210, height: 297, unit: 'mm' },
    'US Letter': { width: 8.5, height: 11, unit: 'in' },
    'Legal': { width: 8.5, height: 14, unit: 'in' },
    'A3': { width: 297, height: 420, unit: 'mm' }
  };

  const layoutConfig = template.layout_config || {};
  const formattingConfig = template.formatting_config || {};
  const headerConfig = template.header_config || {};
  const footerConfig = template.footer_config || {};

  const pageSize = layoutConfig.page_size || 'A4';
  const orientation = layoutConfig.orientation || 'portrait';
  const page = pageSizes[pageSize] || pageSizes['A4'];
  
  let width = page.width;
  let height = page.height;
  if (orientation === 'landscape') {
    [width, height] = [height, width];
  }

  const aspectRatio = width / height;

  // Fixed preview size: A4 portrait at 200px width (proportional scaling)
  // This gives us a consistent preview size regardless of window size
  const fixedPreviewWidth = 200; // pixels
  
  // Calculate font size proportional to page dimensions at fixed preview width
  // 14pt = 18.67px at 96 DPI, so calculate what 14pt looks like at our preview scale
  const pageWidthInches = page.unit === 'mm' ? width / 25.4 : width;
  const pageWidthPx = pageWidthInches * 96; // Real-world pixels at 96 DPI
  const scaleFactor = fixedPreviewWidth / pageWidthPx; // How much we're scaling down
  const baseFontSizePx = 18.67; // 14pt = 18.67px at full scale (96 DPI)
  const previewFontSize = baseFontSizePx * scaleFactor * zoom; // Scale font with zoom
  const fontScaleFactor = scaleFactor * zoom; // Factor to scale inline font sizes in HTML
  
  console.log('Preview settings:', { scaleFactor, previewFontSize, pageWidthPx, zoom });
  
  // Handle pan (drag) functionality when zoomed
  const handlePanStart = (e) => {
    if (zoom === 1) return; // Only pan when zoomed
    e.preventDefault();
    setIsGrabbing(true);
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handlePanMove = (e) => {
    if (!panStart || zoom === 1) return;
    e.preventDefault();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setPanOffset({ x: clientX - panStart.x, y: clientY - panStart.y });
  };

  const handlePanEnd = () => {
    setPanStart(null);
    setIsGrabbing(false);
  };

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    if (newZoom === 1) {
      setPanOffset({ x: 0, y: 0 }); // Reset pan when resetting zoom
    }
  };
  
  // Convert margins to container-relative percentages
  const margins = layoutConfig.margins || {};
  const topMargin = convertToContainerPercent(margins.top || '1in', pageWidthInches);
  const bottomMargin = convertToContainerPercent(margins.bottom || '1in', pageWidthInches);
  const leftMargin = convertToContainerPercent(margins.left || '1in', pageWidthInches);
  const rightMargin = convertToContainerPercent(margins.right || '1in', pageWidthInches);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Template Preview
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <span className="w-4 h-0.5 border-t border-dashed border-blue-400"></span>
            Dashed = margins
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoomChange(Math.max(0.5, zoom - 0.25))}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-xs px-2">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              title="Zoom In"
            >
              +
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => handleZoomChange(1)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                title="Reset Zoom"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Document Preview - Fixed size with zoom */}
      <div 
        className="overflow-auto border border-gray-200 rounded bg-gray-50 p-4" 
        style={{ maxHeight: '600px' }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handlePanStart}
        onTouchMove={handlePanMove}
        onTouchEnd={handlePanEnd}
      >
        <div 
          className="bg-white border-2 border-gray-300 rounded shadow-inner mx-auto relative"
          style={{
            width: `${fixedPreviewWidth * zoom}px`,
            aspectRatio: aspectRatio,
            display: 'flex',
            flexDirection: 'column',
            cursor: isGrabbing ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
        {/* Margin Indicator Lines */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            paddingTop: topMargin,
            paddingBottom: bottomMargin,
            paddingLeft: leftMargin,
            paddingRight: rightMargin
          }}
        >
          {topMargin !== '0' && (
            <div 
              className="absolute left-0 right-0 border-t border-dashed border-blue-400"
              style={{ top: topMargin }}
            />
          )}
          {bottomMargin !== '0' && (
            <div 
              className="absolute left-0 right-0 border-t border-dashed border-blue-400"
              style={{ bottom: bottomMargin }}
            />
          )}
          {leftMargin !== '0' && (
            <div 
              className="absolute top-0 bottom-0 border-l border-dashed border-blue-400"
              style={{ left: leftMargin }}
            />
          )}
          {rightMargin !== '0' && (
            <div 
              className="absolute top-0 bottom-0 border-l border-dashed border-blue-400"
              style={{ right: rightMargin }}
            />
          )}
        </div>

        {/* Header Preview */}
        {headerConfig.enabled && (
          <div
            className="border-b-2"
            style={{
              minHeight: convertToContainerPercent(headerConfig.height || '1in', pageWidthInches),
              backgroundColor: headerConfig.background_color || '#ffffff',
              borderBottomColor: headerConfig.border_bottom ? '#e5e7eb' : 'transparent',
              paddingLeft: leftMargin,
              paddingRight: rightMargin,
              paddingTop: '8px',
              paddingBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: headerConfig.align === 'center' ? 'center' : headerConfig.align === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            <div className="w-full" style={{ textAlign: headerConfig.align || 'left', fontSize: `${previewFontSize}px` }}>
              {headerConfig.image_url && (
                <div style={{ marginBottom: headerConfig.image_margin_bottom || '0px', marginTop: headerConfig.image_margin_top || '0px' }}>
                  <img 
                    src={headerConfig.image_url}
                    alt="Header image"
                    style={{
                      width: headerConfig.image_width || '100%',
                      height: headerConfig.image_height || 'auto',
                      float: headerConfig.image_position === 'left' ? 'left' : headerConfig.image_position === 'right' ? 'right' : 'none',
                      margin: headerConfig.image_position === 'left' ? '0 10px 10px 0' : headerConfig.image_position === 'right' ? '0 0 10px 10px' : '0 auto 10px',
                      display: headerConfig.image_position === 'center' ? 'block' : 'inline-block'
                    }}
                  />
                </div>
              )}
              <div 
                dangerouslySetInnerHTML={{
                  __html: scaleHTMLFontSizes(headerConfig.content || '<p style="color: #9ca3af">No header content</p>', fontScaleFactor)
                }}
              />
            </div>
          </div>
        )}

        {/* Body Preview with margins */}
        <div 
          className="flex-1"
          style={{
            paddingLeft: leftMargin,
            paddingRight: rightMargin,
            paddingTop: topMargin,
            paddingBottom: bottomMargin,
            overflow: 'auto'
          }}
        >
          <div 
            style={{ 
              textAlign: formattingConfig.text_alignment || 'left',
              fontFamily: formattingConfig.font_family || 'inherit',
              fontSize: `${previewFontSize}px`,
              lineHeight: '1.5',
              color: formattingConfig.primary_color || 'inherit'
            }}
          >
            <h2 style={{ fontSize: '120%', fontWeight: 'bold', marginBottom: '0.67em' }}>Document Title</h2>
            <p style={{ fontSize: '100%', marginBottom: '0.33em' }}>
              This is a preview of your document template.
            </p>
            <p style={{ fontSize: '100%', marginBottom: '0.33em' }}>
              <strong>Template Name:</strong> {template.name}
            </p>
            <p style={{ fontSize: '100%', marginBottom: '0.33em' }}>
              <strong>Document Type:</strong> {DOCUMENT_TYPES.find(dt => dt.value === template.document_type)?.label || template.document_type}
            </p>
            <p style={{ fontSize: '100%' }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. The header and footer 
              will appear on all pages of documents created with this template.
            </p>
          </div>
        </div>

        {/* Footer Preview */}
        {footerConfig.enabled && (
          <div
            className="border-t-2"
            style={{
              minHeight: convertToContainerPercent(footerConfig.height || '0.75in', pageWidthInches),
              backgroundColor: footerConfig.background_color || '#ffffff',
              borderTopColor: footerConfig.border_top ? '#e5e7eb' : 'transparent',
              paddingLeft: leftMargin,
              paddingRight: rightMargin,
              paddingTop: '8px',
              paddingBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: footerConfig.align === 'center' ? 'center' : footerConfig.align === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            <div className="w-full" style={{ textAlign: footerConfig.align || 'center', fontSize: `${previewFontSize}px` }}>
              {footerConfig.image_url && (
                <div style={{ marginBottom: footerConfig.image_margin_bottom || '0px', marginTop: footerConfig.image_margin_top || '0px' }}>
                  <img 
                    src={footerConfig.image_url}
                    alt="Footer image"
                    style={{
                      width: footerConfig.image_width || '100%',
                      height: footerConfig.image_height || 'auto',
                      float: footerConfig.image_position === 'left' ? 'left' : footerConfig.image_position === 'right' ? 'right' : 'none',
                      margin: footerConfig.image_position === 'left' ? '0 10px 10px 0' : footerConfig.image_position === 'right' ? '0 0 10px 10px' : '0 auto 10px',
                      display: footerConfig.image_position === 'center' ? 'block' : 'inline-block'
                    }}
                  />
                </div>
              )}
              <div 
                dangerouslySetInnerHTML={{
                  __html: scaleHTMLFontSizes(footerConfig.content || '<p style="color: #9ca3af">No footer content</p>', fontScaleFactor)
                }}
              />
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Template Info Summary */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <strong className="text-blue-900">Font:</strong> {formattingConfig.font_family || 'Default'}
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <strong className="text-green-900">Page Size:</strong> {pageSize}
        </div>
        <div className="p-3 bg-purple-50 border border-purple-200 rounded">
          <strong className="text-purple-900">Orientation:</strong> {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
        </div>
        <div className="p-3 bg-orange-50 border border-orange-200 rounded">
          <strong className="text-orange-900">Type:</strong> {DOCUMENT_TYPES.find(dt => dt.value === template.document_type)?.label || template.document_type}
        </div>
      </div>
    </div>
  );
}

// Template Editor Modal Wrapper
function TemplateEditorModal({ template, onSave, onClose, saving }) {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-[9999] bg-black bg-opacity-50"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-gray-200">
        <TemplateEditor 
          template={template}
          onSave={onSave}
          saving={saving}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function TemplateEditor({ template, onSave, saving, onCancel }) {
  console.log('TemplateEditor rendering with template:', template);
  const { user } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [panStart, setPanStart] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [formData, setFormData] = useState({
    id: template?.id || null,
    name: template?.name || '',
    description: template?.description || '',
    documentType: template?.document_type || 'general_document',
    isDefault: template?.is_default || false,
    formattingConfig: template?.formatting_config || {
      font_family: 'Inter, Arial, sans-serif',
      available_fonts: ['Inter', 'Arial', 'Helvetica'],
      font_size: '12pt',
      line_height: '1.5',
      text_alignment: 'left',
      primary_color: '#1f2937',
      secondary_color: '#6b7280'
    },
    headerConfig: template?.header_config || {
      enabled: true,
      content: '',
      height: '1in',
      position: 'top',
      align: 'left',
      border_bottom: false
    },
    footerConfig: template?.footer_config || {
      enabled: true,
      content: '',
      height: '0.75in',
      position: 'bottom',
      align: 'center',
      border_top: false
    },
    brandingConfig: template?.branding_config || {
      logo_url: '',
      logo_position: 'left',
      logo_size: 'medium',
      company_name: '',
      company_address: '',
      company_contact: '',
      brand_colors: {
        primary: '#2563eb',
        secondary: '#64748b'
      }
    },
    layoutConfig: template?.layout_config || {
      page_size: 'A4',
      orientation: 'portrait',
      margins: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      },
      section_spacing: '12pt',
      paragraph_spacing: '6pt'
    },
    aiInstructions: template?.ai_instructions || {}
  });

  // Load organization branding if available
  useEffect(() => {
    if (user?.orgId) {
      // TODO: Fetch org branding from organization settings
      // For now, set default values
    }
  }, [user?.orgId]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Template name is required');
      return;
    }

    console.log('Submitting template with data:', {
      headerConfig: formData.headerConfig,
      footerConfig: formData.footerConfig
    });

    onSave({
      ...formData,
      documentType: formData.documentType,
      formattingConfig: formData.formattingConfig,
      headerConfig: formData.headerConfig,
      footerConfig: formData.footerConfig,
      brandingConfig: formData.brandingConfig,
      layoutConfig: formData.layoutConfig,
      aiInstructions: formData.aiInstructions,
      isDefault: formData.isDefault
    });
  };

  // Group document types by category for better UX
  const groupedTypes = DOCUMENT_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {});

  // Handle pan (drag) functionality when zoomed
  const handlePanStartEditor = (e) => {
    if (zoom === 1) return; // Only pan when zoomed
    e.preventDefault();
    setIsGrabbing(true);
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handlePanMoveEditor = (e) => {
    if (!panStart || zoom === 1) return;
    e.preventDefault();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setPanOffset({ x: clientX - panStart.x, y: clientY - panStart.y });
  };

  const handlePanEndEditor = () => {
    setPanStart(null);
    setIsGrabbing(false);
  };

  const handleZoomChangeEditor = (newZoom) => {
    setZoom(newZoom);
    if (newZoom === 1) {
      setPanOffset({ x: 0, y: 0 }); // Reset pan when resetting zoom
    }
  };

  return (
    <>
      {/* Modal Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {template ? `Edit: ${template.name}` : 'Create New Template'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure your document template settings
          </p>
        </div>
        <Button 
          type="button" 
          onClick={onCancel} 
          variant="outline" 
          size="sm"
          className="shrink-0"
        >
          ✕ Close
        </Button>
      </div>

      {/* Modal Content - Split Screen */}
      <div className="flex-1 overflow-hidden flex" style={{ height: 'calc(90vh - 160px)' }}>
        {/* Left Panel - Customization */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto overflow-x-hidden bg-gray-50 h-full">
          <div className="p-6 max-w-full overflow-x-hidden">
        <Tabs defaultValue="basic" className="space-y-4 max-w-full">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="formatting">Formatting</TabsTrigger>
            <TabsTrigger value="pagesetup">Page Setup</TabsTrigger>
            <TabsTrigger value="headerfooter">Header & Footer</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <FormInput
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <FormTextarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this template and when to use it"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type *
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {Object.entries(groupedTypes).map(([category, types]) => (
                  <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                    {types.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                gebe="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">
                Set as default template for this document type
              </label>
            </div>
          </TabsContent>

          <TabsContent value="formatting" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Family
              </label>
              <FormInput
                value={formData.formattingConfig.font_family}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  formattingConfig: { ...prev.formattingConfig, font_family: e.target.value }
                }))}
                placeholder="Inter, Arial, sans-serif"
              />
            </div>

            <div>
              <FontPicker
                selectedFonts={formData.formattingConfig.available_fonts || []}
                onChange={(fonts) => setFormData(prev => ({
                  ...prev,
                  formattingConfig: { 
                    ...prev.formattingConfig, 
                    available_fonts: fonts,
                    // Update the primary font_family to match the first selected font
                    font_family: fonts.length > 0 ? `${fonts[0]}, Arial, sans-serif` : prev.formattingConfig.font_family
                  }
                }))}
                orgId={user?.orgId}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size
                </label>
                <FormInput
                  value={formData.formattingConfig.font_size}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    formattingConfig: { ...prev.formattingConfig, font_size: e.target.value }
                  }))}
                  placeholder="12pt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Height
                </label>
                <FormInput
                  value={formData.formattingConfig.line_height}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    formattingConfig: { ...prev.formattingConfig, line_height: e.target.value }
                  }))}
                  placeholder="1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-rading mb-2">
                  Primary Color
                </label>
                <input
                  type="color"
                  value={formData.formattingConfig.primary_color}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    formattingConfig: { ...prev.formattingConfig, primary_color: e.target.value }
                  }))}
                  className="w-full h-10 rounded border border-gray-300"
                spelling/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <input
                  type="color"
                  value={formData.formattingConfig.secondary_color}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    formattingConfig: { ...prev.formattingConfig, secondary_color: e.target.value }
                  }))}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Alignment
              </label>
              <select
                value={formData.formattingConfig.text_alignment}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  formattingConfig: { ...prev.formattingConfig, text_alignment: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </div>
          </TabsContent>

          <TabsContent value="pagesetup" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Size
                </label>
                <select
                  value={formData.layoutConfig.page_size}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    layoutConfig: { ...prev.layoutConfig, page_size: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="US Letter">US Letter (8.5 × 11 in)</option>
                  <option value="Legal">Legal (8.5 × 14 in)</option>
                  <option value="A3">A3 (297 × 420 mm)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orientation
                </label>
                <select
                  value={formData.layoutConfig.orientation}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    layoutConfig: { ...prev.layoutConfig, orientation: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Top Margin
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.top) || 0.5;
                      const newValue = Math.max(0, current - 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, top: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    −
                  </button>
                  <FormInput
                    value={formData.layoutConfig.margins.top.replace('in', '')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, top: `${e.target.value}in` } }
                    }))}
                    type="number"
                    step="0.1"
                    min="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600">in</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.top) || 0.5;
                      const newValue = (current + 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, top: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bottom Margin
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.bottom) || 0.5;
                      const newValue = Math.max(0, current - 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, bottom: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    −
                  </button>
                  <FormInput
                    value={formData.layoutConfig.margins.bottom.replace('in', '')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, bottom: `${e.target.value}in` } }
                    }))}
                    type="number"
                    step="0.1"
                    min="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600">in</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.bottom) || 0.5;
                      const newValue = (current + 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, bottom: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Left Margin
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.left) || 0.5;
                      const newValue = Math.max(0, current - 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, left: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    −
                  </button>
                  <FormInput
                    value={formData.layoutConfig.margins.left.replace('in', '')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, left: `${e.target.value}in` } }
                    }))}
                    type="number"
                    step="0.1"
                    min="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600">in</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.left) || 0.5;
                      const newValue = (current + 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, left: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Right Margin
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.right) || 0.5;
                      const newValue = Math.max(0, current - 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, right: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    −
                  </button>
                  <FormInput
                    value={formData.layoutConfig.margins.right.replace('in', '')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      layoutConfig: { ...prev.layoutConfig, margins: { ...prev.layoutConfig.margins, right: `${e.target.value}in` } }
                    }))}
                    type="number"
                    step="0.1"
                    min="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600">in</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(formData.layoutConfig.margins.right) || 0.5;
                      const newValue = (current + 0.1).toFixed(1);
                      setFormData(prev => ({
                        ...prev,
                        layoutConfig: { ...prev.layoutConfig.explicit, margins: { ...prev.layoutConfig.margins, right: `${newValue}in` } }
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="headerfooter" className="space-y-4">
            <div className="space-y-6">
              <div className="border-2 border-blue-400 rounded-lg p-5">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-gray-700">📄</span>
                  <span className="text-gray-900">Header Configuration</span>
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <input
                      type="checkbox"
                      id="headerEnabled"
                      checked={formData.headerConfig.enabled}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        headerConfig: { ...prev.headerConfig, enabled: e.target.checked }
                      }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="headerEnabled" className="text-sm font-medium text-gray-700">
                      Enable header
                    </label>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Header Content
                    </label>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <p className="text-xs text-yellow-800 font-medium mb-1 flex items-center gap-1">
                        💡 Using HTML
                      </p>
                      <p className="text-xs text-yellow-700">
                        You can use HTML tags to format your header. For example: <code className="bg-yellow-100 px-1 py-0.5 rounded">&lt;b&gt;bold&lt;/b&gt;</code>, <code className="bg-yellow-100 px-1 py-0.5 rounded">&lt;i&gt;italic&lt;/i&gt;</code>, <code className="bg-yellow-100 px-1 py-0.5 rounded">&lt;br&gt;</code> for line breaks.
                      </p>
                    </div>
                    <FormTextarea
                      value={formData.headerConfig.content}
                      onChange={(e) => {
                        console.log('Header content changed:', e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          headerConfig: { ...prev.headerConfig, content: e.target.value }
                        }));
                      }}
                      placeholder="Enter header text. Use variables: {{date}}, {{page_number}}, {{company_name}}"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Variables:</span> {`{{date}}`}, {`{{page_number}}`}, {`{{company_name}}`}, {`{{company_address}}`}, {`{{document_title}}`}
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-300 rounded p-4 mt-4">
                    <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span className="text-gray-700">🖼️</span>
                      <span className="text-gray-900">Header Image</span>
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Image
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const imageUrl = event.target?.result;
                                if (imageUrl) {
                                  setFormData(prev => ({
                                    ...prev,
                                    headerConfig: { ...prev.headerConfig, image_url: imageUrl }
                                  }));
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      {formData.headerConfig.image_url && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Width
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_width) || 100;
                                    const newValue = Math.max(10, current - 10);
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_width: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  −
                                </button>
                                <FormInput
                                  value={formData.headerConfig.image_width || '100px'}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    headerConfig: { ...prev.headerConfig, image_width: e.target.value }
                                  }))}
                                  placeholder="100px"
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">px</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_width) || 100;
                                    const newValue = current + 10;
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_width: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Height
                              </label>
                              <div className="flex items-center gap-2">
                                <button
られている                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_height) || 50;
                                    const newValue = Math.max(10, current - 10);
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_height: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  −
                                </button>
                                <FormInput
                                  value={formData.headerConfig.image_height || '50px'}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    headerConfig: { ...prev.headerConfig, image_height: e.target.value }
                                  }))}
                                  placeholder="50px"
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">px</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_height) || 50;
                                    const newValue = current + 10;
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_height: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Image Position
                            </label>
                            <select
                              value={formData.headerConfig.image_position || 'left'}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                headerConfig: { ...prev.headerConfig, image_position: e.target.value }
                              }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Margin Top
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_margin_top) || 0;
                                    const newValue = Math.max(0, current - 5);
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_margin_top: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  −
                                </button>
                                <FormInput
                                  value={formData.headerConfig.image_margin_top || '0px'}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    headerConfig: { ...prev.headerConfig, image_margin_top: e.target.value }
                                  }))}
                                  placeholder="0px"
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">px</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_margin_top) || 0;
                                    const newValue = current + 5;
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_margin_top: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Margin Bottom
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_margin_bottom) || 0;
                                    const newValue = Math.max(0, current - 5);
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_margin_bottom: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  −
                                </button>
                                <FormInput
                                  value={formData.headerConfig.image_margin_bottom || '0px'}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    headerConfig: { ...prev.headerConfig, image_margin_bottom: e.target.value }
                                  }))}
                                  placeholder="0px"
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">px</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = parseInt(formData.headerConfig.image_margin_bottom) || 0;
                                    const newValue = current + 5;
                                    setFormData(prev => ({
                                      ...prev,
                                      headerConfig: { ...prev.headerConfig, image_margin_bottom: `${newValue}px` }
                                    }));
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Height
                      </label>
                      <FormInput
                        value={formData.headerConfig.height}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          headerConfig: { ...prev.headerConfig, height: e.target.value }
                        }))}
                        placeholder="1in"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alignment
                      </label>
                      <select
                        value={formData.headerConfig.align}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          headerConfig: { ...prev.headerConfig, align: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                    <input
                      type="checkbox"
                      checked={formData.headerConfig.border_bottom}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        headerConfig: { ...prev.headerConfig, border_bottom: e.target.checked }
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Show border below header</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 border-2 border-purple-400 rounded-lg p-5">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-gray-700">📄</span>
                  <span className="text-gray-900">Footer Configuration</span>
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <input
                      type="checkbox"
                      id="footerEnabled"
                      checked={formData.footerConfig.enabled}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        footerConfig: { ...prev.footerConfig, enabled: e.target.checked }
                      }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="footerEnabled" className="text-sm font-medium text-gray-700">
                      Enable footer
                    </label>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Footer Content
                    </label>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <p className="text-xs text-yellow-800 font-medium mb-1 flex items-center gap-1">
                        💡 Using HTML
                      </p>
                      <p className="text-xs text-yellow-700">
                        You can use HTML tags to format your footer. For example: <code className="bg-yellow-100 px-1 py-0.5 rounded">&lt;b&gt;bold&lt;/b&gt;</code>, <code className="bg-yellow-100 px-1 py-0.5 rounded">&lt;i&gt;italic&lt;/i&gt;</code>, <code className="bg-yellow-100 px-1 py-0.5 rounded">&lt;br&gt;</code> for line breaks.
                      </p>
                    </div>
                    <FormTextarea
                      value={formData.footerConfig.content}
                      onChange={(e) => {
                        console.log('Footer content changed:', e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          footerConfig: { ...prev.footerConfig, content: e.target.value }
                        }));
                      }}
                      placeholder="Enter footer text. Use vàoriables: {{date}}, {{page_number}}, {{company_name}}"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Variables:</span> {`{{date}}`}, {`{{page_number}}`}, {`{{company_name}}`}, {`{{company_address}}`}, {`{{document_title}}`}
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-300 rounded p-4 mt-4">
                    <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span className="text-gray-700">🖼️</span>
                      <span className="text-gray-900">Footer Image</span>
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Image
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const imageUrl = event.target?.result;
                                if (imageUrl) {
                                  setFormData(prev => ({
                                    ...prev,
                                    footerConfig: { ...prev.footerConfig, image_url: imageUrl }
                                  }));
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      {formData.footerConfig.image_url && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Width
                              </label>
                              <FormInput
                                value={formData.footerConfig.image_width || '100%'}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  footerConfig: { ...prev.footerConfig, image_width: e.target.value }
                                }))}
                                placeholder="100% or 200px"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Height
                              </label>
                              <FormInput
                                value={formData.footerConfig.image_height || 'auto'}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  footerConfig: { ...prev.footerConfig, image_height: e.target.value }
                                }))}
                                placeholder="auto or 50px"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Image Position
                            </label>
                            <select
                              value={formData.footerConfig.image_position || 'left'}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                footerConfig: { ...prev.footerConfig, image_position: e.target.value }
                              }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Margin Top
                              </label>
                              <FormInput
                                value={formData.footerConfig.image_margin_top || '0px'}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                    footerConfig: { ...prev.footerConfig, image_margin_top: e.target.value }
                                  }))}
                                placeholder="0px"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image Margin Bottom
                              </label>
                              <FormInput
                                value={formData.footerConfig.image_margin_bottom || '0px'}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  footerConfig: { ...prev.footerConfig, image_margin_bottom: e.target.value }
                                }))}
                                placeholder="0px"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Height
                      </label>
                      <FormInput
                        value={formData.footerConfig.height}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          footerConfig: { ...prev.footerConfig, height: e.target.value }
                        }))}
                        placeholder="0.75in"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alignment
                      </label>
                      <select
                        value={formData.footerConfig.align}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          footerConfig: { ...prev.footerConfig, align: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                    <input
                      type="checkbox"
                      checked={formData.footerConfig.border_top}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        footerConfig: { ...prev.footerConfig, border_top: e.target.checked }
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Show border above footer</span>
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <FormInput
                    value={formData.brandingConfig.logo_url}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      brandingConfig: { ...prev.brandingConfig, logo_url: e.target.value }
                    }))}
                    placeholder="https://example.com/logo.png or upload image"
                  />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setFormData(prev => ({
                          ...prev,
                          brandingConfig: { ...prev.brandingConfig, logo_url: event.target?.result || '' }
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              {formData.brandingConfig.logo_url && (formData.brandingConfig.logo_url.startsWith('data:') || formData.brandingConfig.logo_url.startsWith('http')) && (
                <div className="mt-3 p-3 border border-gray-300 rounded bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">Logo Preview:</p>
                  <img 
                    src={formData.brandingConfig.logo_url} 
                    alt="Logo preview" 
                    className="max-h-20 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo Position
                </label>
                <select
                  value={formData.brandingConfig.logo_position}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandingConfig: { ...prev.brandingConfig, logo_position: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo Size
                </label>
                <select
                  value={formData.brandingConfig.logo_size}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandingConfig: { ...prev.brandingConfig, logo_size: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <FormInput
                value={formData.brandingConfig.company_name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  brandingConfig: { ...prev.brandingConfig, company_name: e.target.value }
                }))}
                placeholder="Your Company Name"
              />
            </div>

            <FormTextarea
              label="Company Address"
              value={formData.brandingConfig.company_address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                brandingConfig: { ...prev.brandingConfig, company_address: e.target.value }
              }))}
              rows={2}
            />

            <FormTextarea
              label="Company Contact"
              value={formData.brandingConfig.company_contact}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                brandingConfig: { ...prev.brandingConfig, company_contact: e.target.value }
              }))}
              rows={2}
              placeholder="Email, phone, website, etc."
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Primary Color
                </label>
                <input
                  type="color"
                  value={formData.brandingConfig.brand_colors.primary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandingConfig: {
                      ...prev.brandingConfig,
                      brand_colors: { ...prev.brandingConfig.brand_colors, primary: e.target.value }
                    }
                  }))}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Secondary Color
                </label>
                <input
                  type="color"
                  value={formData.brandingConfig.brand_colors.secondary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandingConfig: {
                      ...prev.brandingConfig,
                      brand_colors: { ...prev.brandingConfig.brand_colors, secondary: e.target.value }
                    }
                  }))}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="w-1/2 overflow-y-auto bg-gray-100 p-8 h-full">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Live Preview
                </h3>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <span className="w-4 h-0.5 border-t border-dashed border-blue-400"></span>
                  Dashed = margins
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleZoomChangeEditor(Math.max(0.5, zoom - 0.25))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  title="Zoom Out"
                >
                  −
                </button>
                <span className="text-xs px-2">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => handleZoomChangeEditor(Math.min(3, zoom + 0.25))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  title="Zoom In"
                >
                  +
                </button>
                {zoom !== 1 && (
                  <button
                    onClick={() => handleZoomChangeEditor(1)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            {/* Document Preview - Dynamic based on page size */}
            {(() => {
              const pageSizes = {
                'A4': { width: 210, height: 297, unit: 'mm' },
                'US Letter': { width: 8.5, height: 11, unit: 'in' },
                'Legal': { width: 8.5, height: 14, unit: 'in' },
                'A3': { width: 297, height: 420, unit: 'mm' }
              };

              const pageSize = formData.layoutConfig.page_size || 'A4';
              const orientation = formData.layoutConfig.orientation || 'portrait';
              const page = pageSizes[pageSize] || pageSizes['A4'];
              
              let width = page.width;
              let height = page.height;
              if (orientation === 'landscape') {
                [width, height] = [height, width];
              }

              const aspectRatio = width / height;

              // Fixed preview size (same as main preview)
              const fixedPreviewWidth = 200; // pixels
              const pageWidthInches = page.unit === 'mm' ? width / 25.4 : width;
              const pageWidthPx = pageWidthInches * 96;
              const scaleFactor = fixedPreviewWidth / pageWidthPx;
              const baseFontSizePx = 18.67; // 14pt = 18.67px at full scale (96 DPI)
              const previewFontSize = baseFontSizePx * scaleFactor * zoom; // Scale font with zoom
              const fontScaleFactor = scaleFactor * zoom; // Factor to scale inline font sizes in HTML
              
              console.log('Editor preview:', { scaleFactor, previewFontSize, zoom });

              // Convert margins to container-relative percentages
              const margins = formData.layoutConfig.margins || {};
              const topMargin = convertToContainerPercent(margins.top || '1in', pageWidthInches);
              const bottomMargin = convertToContainerPercent(margins.bottom || '1in', pageWidthInches);
              const leftMargin = convertToContainerPercent(margins.left || '1in', pageWidthInches);
              const rightMargin = convertToContainerPercent(margins.right || '1in', pageWidthInches);

              return (
                <div 
                  className="overflow-auto border border-gray-200 rounded bg-gray-50 p-4" 
                  style={{ maxHeight: '400px' }}
                  onMouseDown={handlePanStartEditor}
                  onMouseMove={handlePanMoveEditor}
                  onMouseUp={handlePanEndEditor}
                  onMouseLeave={handlePanEndEditor}
                  onTouchStart={handlePanStartEditor}
                  onTouchMove={handlePanMoveEditor}
                  onTouchEnd={handlePanEndEditor}
                >
                  <div 
                    className="bg-white border-2 border-gray-300 rounded shadow-inner mx-auto relative"
                    style={{
                      width: `${fixedPreviewWidth * zoom}px`,
                      aspectRatio: aspectRatio,
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: isGrabbing ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                    }}
                  >
                  {/* Margin Indicator Lines - Visual guides that won't appear in final output */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      paddingTop: topMargin,
                      paddingBottom: bottomMargin,
                      paddingLeft: leftMargin,
                      paddingRight: rightMargin
                    }}
                  >
                    {/* Top margin line */}
                    {topMargin !== '0' && (
                      <div 
                        className="absolute left-0 right-0 border-t border-dashed border-blue-400"
                        style={{ top: topMargin }}
                      />
                    )}
                    {/* Bottom margin line */}
                    {bottomMargin !== '0' && (
                      <div 
                        className="absolute left-0 right-0 border-t border-dashed border-blue-400"
                        style={{ bottom: bottomMargin }}
                      />
                    )}
                    {/* Left margin line */}
                    {leftMargin !== '0' && (
                      <div 
                        className="absolute top-0 bottom-0 border-l border-dashed border-blue-400"
                        style={{ left: leftMargin }}
                      />
                    )}
                    {/* Right margin line */}
                    {rightMargin !== '0' && (
                      <div 
                        className="absolute top-0 bottom-0 border-l border-dashed border-blue-400"
                        style={{ right: rightMargin }}
                      />
                    )}
                  </div>
              {/* Header Preview */}
              {formData.headerConfig.enabled && (
                <div
                  className="border-b-2"
                  style={{
                    minHeight: convertToContainerPercent(formData.headerConfig.height || '1in', pageWidthInches),
                    backgroundColor: formData.headerConfig.background_color || '#ffffff',
                    borderBottomColor: formData.headerConfig.border_bottom ? '#e5e7eb' : 'transparent',
                    paddingLeft: leftMargin,
                    paddingRight: rightMargin,
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: formData.headerConfig.align === 'center' ? 'center' : formData.headerConfig.align === 'right' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div className="w-full" style={{ textAlign: formData.headerConfig.align || 'left', fontSize: `${previewFontSize}px` }}>
                    {formData.headerConfig.image_url && (
                      <div style={{ marginBottom: formData.headerConfig.image_margin_bottom || '0px', marginTop: formData.headerConfig.image_margin_top || '0px' }}>
                        <img 
                          src={formData.headerConfig.image_url}
                          alt="Header image"
                          style={{
                            width: formData.headerConfig.image_width || '100%',
                            height: formData.headerConfig.image_height || 'auto',
                            float: formData.headerConfig.image_position === 'left' ? 'left' : formData.headerConfig.image_position === 'right' ? 'right' : 'none',
                            margin: formData.headerConfig.image_position === 'left' ? '0 10px 10px 0' : formData.headerConfig.image_position === 'right' ? '0 0 10px 10px' : '0 auto 10px',
                            display: formData.headerConfig.image_position === 'center' ? 'block' : 'inline-block'
                          }}
                        />
                      </div>
                    )}
                    <div 
                      dangerouslySetInnerHTML={{
                        __html: scaleHTMLFontSizes(formData.headerConfig.content || '<p style="color: #9ca3af">Header content</p>', fontScaleFactor)
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Body Preview with margins */}
              <div 
                className="flex-1"
                style={{
                  paddingLeft: leftMargin,
                  paddingRight: rightMargin,
                  paddingTop: topMargin,
                  paddingBottom: bottomMargin,
                  overflow: 'auto'
                }}
              >
                <div 
            style={{ 
              textAlign: formData.formattingConfig.text_alignment || 'left',
              fontFamily: formData.formattingConfig.font_family || 'inherit',
              fontSize: `${previewFontSize}px`,
              lineHeight: '1.5',
              color: formData.formattingConfig.primary_color || 'inherit'
            }}
                >
                  <h2 style={{ fontSize: '120%', fontWeight: 'bold', marginBottom: '0.67em' }}>Document Title</h2>
                  <p style={{ fontSize: '100%', marginBottom: '0.33em' }}>
                    This is a live preview of your document template.
                  </p>
                  <p style={{ fontSize: '100%', marginBottom: '0.33em' }}>
                    <strong>Template Name:</strong> {formData.name || 'Untitled Template'}
                  </p>
                  <p style={{ fontSize: '100%', marginBottom: '0.33em' }}>
                    <strong>Document Type:</strong> {formData.documentType || 'general_document'}
                  </p>
                  <p style={{ fontSize: '100%' }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. The header and footer 
                    will appear on all pages of documents created with this template.
                  </p>
                </div>
              </div>

                  {/* Footer Preview */}
                  {formData.footerConfig.enabled && (
                    <div
                      className="border-t-2"
                      style={{
                        minHeight: convertToContainerPercent(formData.footerConfig.height || '0.75in', pageWidthInches),
                        backgroundColor: formData.footerConfig.background_color || '#ffffff',
                        borderTopColor: formData.footerConfig.border_top ? '#e5e7eb' : 'transparent',
                        paddingLeft: leftMargin,
                        paddingRight: rightMargin,
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: formData.footerConfig.align === 'center' ? 'center' : formData.footerConfig.align === 'right' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div className="w-full" style={{ textAlign: formData.footerConfig.align || 'center', fontSize: `${previewFontSize}px` }}>
                        {formData.footerConfig.image_url && (
                          <div style={{ marginBottom: formData.footerConfig.image_margin_bottom || '0px', marginTop: formData.footerConfig.image_margin_top || '0px' }}>
                            <img 
                              src={formData.footerConfig.image_url}
                              alt="Footer image"
                              style={{
                                width: formData.footerConfig.image_width || '100%',
                                height: formData.footerConfig.image_height || 'auto',
                                float: formData.footerConfig.image_position === 'left' ? 'left' : formData.footerConfig.image_position === 'right' ? 'right' : 'none',
                                margin: formData.footerConfig.image_position === 'left' ? '0 10px 10px 0' : formData.footerConfig.image_position === 'right' ? '0 0 10px 10px' : '0 auto 10px',
                                display: formData.footerConfig.image_position === 'center' ? 'block' : 'inline-block'
                              }}
                            />
                          </div>
                        )}
                        <div 
                          style={{ fontSize: 'inherit' }}
                          dangerouslySetInnerHTML={{
                            __html: scaleHTMLFontSizes(formData.footerConfig.content || '<p style="color: #9ca3af">Footer content</p>', fontScaleFactor)
                          }}
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })()}

            {/* Template Info Summary */}
            <div className="mt-4 text-sm space-y-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <strong className="text-blue-900">Font:</strong> {formData.formattingConfig.font_family || 'Default'}
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <strong className="text-green-900">Page Size:</strong> {formData.layoutConfig.page_size || 'A4'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <Button 
          type="button" 
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleSubmit}
          disabled={saving || !formData.name}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2 inline" />
              {template ? 'Update Template' : 'Create Template'}
            </>
          )}
        </Button>
      </div>
    </>
  );
}

/**
 * AI Document Template Generator Modal
 * Guides user through questionnaire and generates template with AI
 */
function AIDocumentTemplateGeneratorModal({ onClose, onComplete, showSuccess, showError }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [formData, setFormData] = useState({
    documentType: 'general_document',
    purpose: '',
    audience: '',
    style: 'professional',
    branding: true,
    preferences: ''
  });

  const steps = [
    {
      label: 'Document Type',
      question: 'What type of document is this template for?',
      component: 'select',
      options: DOCUMENT_TYPES.map(dt => ({ value: dt.value, label: dt.label }))
    },
    {
      label: 'Purpose',
      question: "What's the primary purpose of this document?",
      component: 'textarea',
      placeholder: 'Describe what this document will be used for...'
    },
    {
      label: 'Audience',
      question: 'Who is the target audience?',
      component: 'textarea',
      placeholder: 'Describe who will read this document...'
    },
    {
      label: 'Style',
      question: 'What formatting style do you prefer?',
      component: 'select',
      options: [
        { value: 'professional', label: 'Professional - Clean and modern' },
        { value: 'technical', label: 'Technical - Optimized for documentation' },
        { value: 'consulting', label: 'Consulting - Elegant and formal' },
        { value: 'minimal', label: 'Minimal - Simple and clean' }
      ]
    },
    {
      label: 'Preferences',
      question: 'Any specific customization preferences? (Optional)',
      component: 'textarea',
      placeholder: 'Additional notes about formatting, branding, or layout...',
      optional: true
    }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const systemPrompt = `You are an expert document template designer. Based on user requirements, generate a complete, intelligent template configuration.

User Requirements:
- Document Type: ${DOCUMENT_TYPES.find(dt => dt.value === formData.documentType)?.label || formData.documentType}
- Purpose: ${formData.purpose}
- Target Audience: ${formData.audience}
- Preferred Style: ${formData.style}
- Additional Preferences: ${formData.preferences || 'None specified'}

Generate a comprehensive template configuration that includes:

1. Template Name: Create a descriptive, professional name
2. Description: Write a clear description of when to use this template
3. Formatting Config: Font family appropriate for ${formData.style} style, font size 12pt, line height 1.5
4. Header Config: Create appropriate header content with variables like {{date}}, {{company_name}}
5. Footer Config: Create appropriate footer with {{page_number}} and contact info
6. Branding Config: Set up default branding structure
7. Layout Config: Set appropriate margins and page size for ${formData.style} style

Return ONLY a valid JSON object matching the documentation_templates schema.`;

      const userPrompt = `Please generate a document template configuration based on the requirements provided. Make sure all configurations are complete and professional.`;

      const response = await fetch(`${API_BASE_URL}/api/ai/generate-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          model: 'gpt-4o-mini',
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) throw new Error('Failed to generate template');

      const result = await response.json();
      const config = JSON.parse(result.content);

      // Map AI response to template format
      const generatedTemplate = {
        name: config.name || 'AI Generated Template',
        description: config.description || 'Template generated by AI',
        documentType: formData.documentType,
        formattingConfig: config.formatting_config || {},
        headerConfig: config.header_config || {},
        footerConfig: config.footer_config || {},
        brandingConfig: config.branding_config || {},
        layoutConfig: config.layout_config || {},
        aiInstructions: config.ai_instructions || {},
        isDefault: false
      };

      showSuccess('Template generated successfully! Review and save when ready.');
      onComplete(generatedTemplate);
    } catch (error) {
      console.error('Error generating template:', error);
      showError('Failed to generate template. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    const currentField = steps[currentStep];
    
    // Validate required fields
    if (!currentField.optional && !formData[currentField.label.toLowerCase().replace(' ', '')]) {
      showError('Please provide an answer before continuing');
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const currentField = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Template Generator</h2>
            <p className="text-sm text-gray-600 mt-1">
              Answer a few questions and I'll create a custom template for you
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>✕</Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{currentField.question}</h3>
            
            {currentField.component === 'select' && (
              <select
                value={formData[currentField.label.toLowerCase().replace(' ', '')]}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  [currentField.label.toLowerCase().replace(' ', '')]: e.target.value 
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select an option...</option>
                {currentField.options.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}

            {currentField.component === 'textarea' && (
              <FormTextarea
                value={formData[currentField.label.toLowerCase().replace(' ', '')]}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  [currentField.label.toLowerCase().replace(' ', '')]: e.target.value 
                }))}
                placeholder={currentField.placeholder}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            )}

            {isGenerating && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating your custom template...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Previous
              </Button>
            )}
            <Button 
              onClick={handleNext}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? 'Generating...' : (currentStep === steps.length - 1 ? 'Generate' : 'Next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationTemplatesSubpage;
