import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Download, ChevronDown, FileText, Globe, Code, Eye } from './icons';
import { API_BASE_URL } from '../../utils/api.js';
import { useNotifications } from './notifications';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { showSuccess, showError } = useNotifications();



  // Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Protective check - if no data available, don't render
  if (!briefId && !briefContent && !sessionId) {
    return null;
  }

  const exportFormats = [
    {
      id: 'html',
      name: 'Professional HTML',
      description: 'Styled document with branding',
      icon: Globe,
      color: 'text-blue-600'
    },
    {
      id: 'docx',
      name: 'Microsoft Word',
      description: 'Word document (.docx)',
      icon: FileText,
      color: 'text-blue-800'
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
        // Handle Word document format differently (client-side generation)
        if (format === 'docx') {
          // First get the brief content
          const apiUrl = API_BASE_URL || 'http://localhost:8787';
          const briefUrl = `${apiUrl}/api/orgs/${orgId}/briefs/${briefId}/export/markdown`;
          
          const response = await fetch(briefUrl, { 
            credentials: 'include',
            headers: { 'Accept': 'text/markdown' }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get brief content: ${response.status} - ${errorText}`);
          }

          const markdownContent = await response.text();
          const filename = `brief-${briefId}.docx`;
          
          await generateWordDocument(markdownContent, filename);
          showSuccess('Brief exported as Word document successfully!');
        } else {
          // Use API export for other formats
          const apiUrl = API_BASE_URL || 'http://localhost:8787';
          const exportUrl = `${apiUrl}/api/orgs/${orgId}/briefs/${briefId}/export/${format}`;
          
          const response = await fetch(exportUrl, { 
            credentials: 'include',
            headers: {
              'Accept': format === 'html' ? 'text/html' : 'text/markdown'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to export brief: ${response.status} - ${errorText}`);
          }

          // Get filename from Content-Disposition header or generate one
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = `brief-${briefId}.${format === 'html' ? 'html' : format === 'pdf' ? 'html' : 'md'}`;
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
          }

          const blob = await response.blob();
          downloadBlob(blob, filename);
          
          showSuccess(`Brief exported as ${format.toUpperCase()} successfully!`);
        }
      } else if (briefContent && sessionId) {
        // Fallback to client-side export for public surveys
        if (format === 'docx') {
          const filename = `survey-brief-${sessionId}.docx`;
          await generateWordDocument(briefContent, filename);
          showSuccess('Brief downloaded as Word document successfully!');
        } else {
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
        }
      } else {
        throw new Error('Missing required parameters for export. Please ensure the brief data is loaded.');
      }
    } catch (error) {
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
    } catch {
      showError('Failed to open preview');
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateWordDocument = async (markdownContent, filename) => {
    try {
      // Parse markdown into structured content
      const lines = markdownContent.split('\n');
      const documentChildren = [];

      let currentParagraphText = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle headings
        if (line.startsWith('# ')) {
          // Flush any pending paragraph
          if (currentParagraphText.trim()) {
            documentChildren.push(new Paragraph({
              children: [new TextRun(currentParagraphText.trim())],
              spacing: { after: 200 }
            }));
            currentParagraphText = '';
          }
          
          documentChildren.push(new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }));
        } else if (line.startsWith('## ')) {
          // Flush any pending paragraph
          if (currentParagraphText.trim()) {
            documentChildren.push(new Paragraph({
              children: [new TextRun(currentParagraphText.trim())],
              spacing: { after: 200 }
            }));
            currentParagraphText = '';
          }
          
          documentChildren.push(new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
          }));
        } else if (line.startsWith('### ')) {
          // Flush any pending paragraph
          if (currentParagraphText.trim()) {
            documentChildren.push(new Paragraph({
              children: [new TextRun(currentParagraphText.trim())],
              spacing: { after: 200 }
            }));
            currentParagraphText = '';
          }
          
          documentChildren.push(new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 250, after: 100 }
          }));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          // Handle bullet points
          if (currentParagraphText.trim()) {
            documentChildren.push(new Paragraph({
              children: [new TextRun(currentParagraphText.trim())],
              spacing: { after: 200 }
            }));
            currentParagraphText = '';
          }
          
          documentChildren.push(new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun(line.substring(2))
            ],
            spacing: { after: 100 },
            indent: { left: 720 } // 0.5 inch indent
          }));
        } else if (line.trim() === '') {
          // Empty line - finish current paragraph
          if (currentParagraphText.trim()) {
            documentChildren.push(new Paragraph({
              children: [new TextRun(currentParagraphText.trim())],
              spacing: { after: 200 }
            }));
            currentParagraphText = '';
          }
        } else {
          // Regular text line
          if (currentParagraphText) {
            currentParagraphText += ' ' + line;
          } else {
            currentParagraphText = line;
          }
        }
      }

      // Flush any remaining paragraph text
      if (currentParagraphText.trim()) {
        documentChildren.push(new Paragraph({
          children: [new TextRun(currentParagraphText.trim())],
          spacing: { after: 200 }
        }));
      }

      // Create the document
      const doc = new Document({
        sections: [{
          properties: {},
          children: documentChildren
        }]
      });

      // Generate and save the document
      const blob = await Packer.toBlob(doc);
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error generating Word document:', error);
      throw new Error('Failed to generate Word document');
    }
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
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant={variant} 
        size={size}
        className={`${className} flex items-center gap-2 ${variant === 'outline' ? 'border-blue-200 hover:border-blue-300 hover:bg-blue-50' : ''}`}
        disabled={isExporting}
        style={{
          backgroundColor: variant === 'outline' ? 'transparent' : undefined,
          borderColor: variant === 'outline' ? '#3b82f6' : undefined,
          color: variant === 'outline' ? '#3b82f6' : undefined
        }}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <Download className="w-4 h-4" style={{ color: '#3b82f6' }} />
        <span>{isExporting ? 'Exporting...' : 'Download'}</span>
        <ChevronDown className="w-4 h-4" style={{ color: '#6b7280' }} />
      </Button>
      
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
          {briefId && orgId && (
            <>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                onClick={() => {
                  setIsDropdownOpen(false);
                  handlePreview();
                }}
              >
                <Eye className="w-4 h-4" />
                Preview Styled
              </button>
              <div className="border-t border-gray-200 my-1"></div>
            </>
          )}
          {exportFormats.map((format) => (
            <button
              key={format.id}
              className="w-full flex items-start gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left"
              onClick={() => {
                setIsDropdownOpen(false);
                handleExport(format.id);
              }}
            >
              <format.icon className={`w-4 h-4 mt-0.5 ${format.color}`} />
              <div className="flex-1">
                <div className="font-medium">{format.name}</div>
                <div className="text-xs text-gray-500">
                  {format.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
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
