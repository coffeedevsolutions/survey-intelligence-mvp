import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { FormInput, FormTextarea } from '../../../components/ui/form-input';
import { Code, AlertTriangle } from '../../../components/ui/icons';
import { validateHTML, getAllowedHTMLDocs, createSafeHTMLPreview } from '../../../utils/htmlSanitizer';

/**
 * Branding Tab Component for Enterprise Organization Settings
 */
export function BrandingTab({ formData, onInputChange }) {
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

