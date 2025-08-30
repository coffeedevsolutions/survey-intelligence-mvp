import React, { useState } from 'react';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Download, ChevronDown, FileText, Globe, Code, Eye } from './icons';
import { API_BASE_URL } from '../../utils/api.js';
import { useNotifications } from './notifications';

/**
 * Enhanced Download Button with Multiple Format Options
 */
export function EnhancedDownloadButton({ 
  briefId, 
  orgId, 
  briefContent, 
  sessionId,
  variant = "outline",
  size = "default",
  className = ""
}) {
  const [isExporting, setIsExporting] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const exportFormats = [
    {
      id: 'html',
      name: 'Professional HTML',
      description: 'Styled document with branding',
      icon: Globe,
      color: 'text-blue-600'
    },
    {
      id: 'pdf',
      name: 'PDF Ready',
      description: 'Print-ready styled HTML',
      icon: FileText,
      color: 'text-red-600'
    },
    {
      id: 'markdown',
      name: 'Plain Markdown',
      description: 'Raw markdown for developers',
      icon: Code,
      color: 'text-gray-600'
    }
  ];

  const handleExport = async (format) => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      if (briefId && orgId) {
        // Use API export for stored briefs
        const response = await fetch(
          `${API_BASE_URL}/orgs/${orgId}/briefs/${briefId}/export/${format}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to export brief');
        }

        // Get filename from Content-Disposition header or generate one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `brief-${briefId}.${format}`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }

        const blob = await response.blob();
        downloadBlob(blob, filename);
        
        showSuccess(`Brief exported as ${format.toUpperCase()} successfully!`);
      } else if (briefContent && sessionId) {
        // Fallback to client-side export for public surveys
        const filename = `survey-brief-${sessionId}.${format === 'html' ? 'html' : 'md'}`;
        
        if (format === 'html') {
          // Generate basic HTML for public surveys (without org branding)
          const htmlContent = generateBasicHTML(briefContent);
          const blob = new Blob([htmlContent], { type: 'text/html' });
          downloadBlob(blob, filename);
        } else {
          // Markdown export
          const blob = new Blob([briefContent], { type: 'text/markdown' });
          downloadBlob(blob, filename);
        }
        
        showSuccess(`Brief downloaded as ${format.toUpperCase()} successfully!`);
      } else {
        throw new Error('Missing required parameters for export');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError(`Failed to export brief: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = async () => {
    if (!briefId || !orgId) {
      showError('Preview not available for this brief');
      return;
    }

    try {
      const previewUrl = `${API_BASE_URL}/orgs/${orgId}/briefs/${briefId}/preview`;
      window.open(previewUrl, '_blank', 'width=800,height=600');
    } catch (error) {
      showError('Failed to open preview');
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateBasicHTML = (markdown) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Brief</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      color: #374151; 
      line-height: 1.6; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem;
    }
    h1 { color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 2rem; }
    h3 { color: #4b5563; }
    pre { white-space: pre-wrap; font-family: inherit; }
  </style>
</head>
<body>
  <pre>${markdown}</pre>
</body>
</html>`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={className}
          disabled={isExporting}
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Download Brief'}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {briefId && orgId && (
          <>
            <DropdownMenuItem onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Styled
            </DropdownMenuItem>
            <div className="border-t border-border my-1"></div>
          </>
        )}
        {exportFormats.map((format) => (
          <DropdownMenuItem 
            key={format.id}
            onClick={() => handleExport(format.id)}
            className="flex items-start py-3"
          >
            <format.icon className={`w-4 h-4 mr-3 mt-0.5 ${format.color}`} />
            <div className="flex-1">
              <div className="font-medium">{format.name}</div>
              <div className="text-xs text-muted-foreground">
                {format.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple Enhanced Download for backward compatibility
 */
export function SimpleEnhancedDownload({ briefContent, sessionId, className = "" }) {
  const { showSuccess } = useNotifications();

  const handleDownload = (format = 'markdown') => {
    const filename = `brief-${sessionId || Date.now()}.${format === 'html' ? 'html' : 'md'}`;
    
    let content = briefContent;
    let mimeType = 'text/markdown';
    
    if (format === 'html') {
      content = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Brief</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem; 
      line-height: 1.6;
    }
    h1 { color: #1f2937; border-bottom: 2px solid #e5e7eb; }
    pre { white-space: pre-wrap; font-family: inherit; }
  </style>
</head>
<body>
  <pre>${briefContent}</pre>
</body>
</html>`;
      mimeType = 'text/html';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess(`Brief downloaded successfully!`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="w-4 h-4 mr-2" />
          Download Brief
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleDownload('html')}>
          <Globe className="w-4 h-4 mr-2" />
          Styled HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('markdown')}>
          <Code className="w-4 h-4 mr-2" />
          Plain Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
