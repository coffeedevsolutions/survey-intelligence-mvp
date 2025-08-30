import { marked } from 'marked';
import { getHeaderContent, getFooterContent } from '../utils/htmlSanitizer.js';

/**
 * Document Export Service
 * Handles multi-format export with organization branding
 */

// Document themes with CSS styling
export const DOCUMENT_THEMES = {
  professional: {
    name: 'Professional',
    css: `
      body { 
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; 
        color: #1f2937; 
        line-height: 1.6; 
        max-width: 800px; 
        margin: 0 auto; 
        padding: 2rem;
      }
      .letterhead { 
        background: #f9fafb; 
        padding: 2rem; 
        margin-bottom: 2rem; 
        border-radius: 8px;
        border-left: 4px solid var(--primary-color, #1f2937);
      }
      .company-logo { 
        max-height: 60px; 
        margin-bottom: 1rem; 
      }
      h1 { 
        color: #111827; 
        border-bottom: 2px solid #e5e7eb; 
        padding-bottom: 0.5rem; 
        margin-bottom: 1.5rem;
        font-weight: 600;
      }
      h2 { 
        color: #374151; 
        margin-top: 2rem; 
        font-weight: 600;
      }
      h3 { 
        color: #4b5563; 
        margin-top: 1.5rem;
      }
      .document-footer { 
        margin-top: 3rem; 
        padding-top: 2rem; 
        border-top: 1px solid #e5e7eb; 
        font-size: 0.875rem; 
        color: #6b7280; 
        text-align: center;
      }
      @media print {
        body { margin: 0; padding: 1in; }
        .letterhead { background: white; border: 1px solid #e5e7eb; }
      }
    `
  },
  technical: {
    name: 'Technical',
    css: `
      body { 
        font-family: system-ui, -apple-system, sans-serif; 
        color: #374151; 
        line-height: 1.6; 
        max-width: 900px; 
        margin: 0 auto; 
        padding: 2rem;
      }
      .letterhead { 
        border: 1px solid #d1d5db; 
        padding: 1.5rem; 
        margin-bottom: 2rem; 
        background: #f8fafc;
      }
      h1 { 
        color: #1f2937; 
        font-family: 'JetBrains Mono', monospace; 
        font-weight: 600; 
        font-size: 1.75rem;
      }
      code { 
        background: #f3f4f6; 
        padding: 0.25rem 0.5rem; 
        border-radius: 4px; 
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.875rem;
      }
      pre { 
        background: #1f2937; 
        color: #f9fafb; 
        padding: 1rem; 
        border-radius: 6px; 
        overflow-x: auto;
      }
      .document-footer { 
        margin-top: 2rem; 
        font-family: monospace; 
        font-size: 0.75rem; 
        color: #6b7280;
      }
    `
  },
  consulting: {
    name: 'Consulting',
    css: `
      body { 
        font-family: Georgia, 'Times New Roman', serif; 
        color: #1f2937; 
        line-height: 1.7; 
        max-width: 750px; 
        margin: 0 auto; 
        padding: 2rem;
      }
      .letterhead { 
        text-align: center; 
        padding: 2rem; 
        margin-bottom: 3rem; 
        border-bottom: 2px solid var(--primary-color, #059669);
      }
      h1 { 
        color: var(--primary-color, #059669); 
        font-size: 2.25rem; 
        margin-bottom: 0.5rem; 
        font-weight: 400;
      }
      h2 { 
        color: #047857; 
        font-size: 1.5rem; 
        margin-top: 2.5rem; 
        font-weight: 500;
      }
      .summary { 
        background: #ecfdf5; 
        border-left: 4px solid #10b981; 
        padding: 1.5rem; 
        margin: 2rem 0; 
        border-radius: 0 6px 6px 0;
      }
      .document-footer { 
        margin-top: 3rem; 
        padding-top: 1.5rem; 
        border-top: 1px solid #d1d5db; 
        text-align: center; 
        font-style: italic; 
        color: #6b7280;
      }
    `
  },
  minimal: {
    name: 'Minimal',
    css: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
        color: #374151; 
        line-height: 1.6; 
        max-width: 600px; 
        margin: 0 auto; 
        padding: 3rem 2rem;
      }
      .letterhead { 
        text-align: center; 
        margin-bottom: 3rem; 
        padding-bottom: 1rem;
      }
      h1 { 
        color: #111827; 
        font-weight: 300; 
        font-size: 2rem; 
        margin-bottom: 0.5rem;
      }
      h2 { 
        color: #374151; 
        font-weight: 400; 
        margin-top: 2rem;
      }
      .document-footer { 
        margin-top: 4rem; 
        text-align: center; 
        font-size: 0.875rem; 
        color: #9ca3af;
      }
    `
  }
};

/**
 * Generate styled HTML document
 */
export function generateStyledHTML(briefMarkdown, orgSettings = {}) {
  const theme = DOCUMENT_THEMES[orgSettings.theme || 'professional'];
  const markdownHtml = marked.parse(briefMarkdown);
  
  // Replace CSS variables with actual colors
  const css = theme.css
    .replace(/var\(--primary-color[^)]*\)/g, orgSettings.primary_color || '#1f2937')
    .replace(/var\(--secondary-color[^)]*\)/g, orgSettings.secondary_color || '#6b7280');
  
  const letterhead = generateLetterhead(orgSettings);
  const footer = generateFooter(orgSettings);
  const pageCSS = generatePageCSS(orgSettings);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orgSettings.company_name || 'Project Brief'}</title>
  <style>
    ${pageCSS}
    ${css}
    ${orgSettings.font_family ? `body { font-family: ${orgSettings.font_family}; }` : ''}
  </style>
</head>
<body>
  <div class="document-container">
    ${letterhead}
    <div class="content">
      ${markdownHtml}
    </div>
    ${footer}
  </div>
</body>
</html>`;
}

/**
 * Generate page formatting CSS for document dimensions
 */
function generatePageCSS(orgSettings) {
  const pageSize = orgSettings.page_size || 'A4';
  const margins = orgSettings.page_margins || '1in';
  
  // Standard page dimensions
  const pageDimensions = {
    'A4': { width: '210mm', height: '297mm' },
    'US Letter': { width: '8.5in', height: '11in' },
    'Legal': { width: '8.5in', height: '14in' },
    'A3': { width: '297mm', height: '420mm' }
  };
  
  const dimensions = pageDimensions[pageSize] || pageDimensions['A4'];
  
  return `
    /* Page setup for consistent document formatting */
    @page {
      size: ${dimensions.width} ${dimensions.height};
      margin: ${margins};
    }
    
    /* Screen display that matches print dimensions */
    @media screen {
      body {
        width: ${dimensions.width};
        min-height: ${dimensions.height};
        margin: 0 auto;
        padding: ${margins};
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        position: relative;
      }
      
      /* Add page break indicators for long documents */
      .page-break {
        page-break-before: always;
        border-top: 1px dashed #ccc;
        margin-top: 2rem;
        padding-top: 2rem;
      }
      
      /* Simulate page boundaries */
      .document-container {
        min-height: calc(${dimensions.height} - 2 * ${margins});
        position: relative;
      }
    }
    
    /* Print-specific styles */
    @media print {
      body {
        width: 100%;
        margin: 0;
        padding: 0;
        background: white;
        box-shadow: none;
      }
      
      .page-break {
        page-break-before: always;
        border: none;
        margin: 0;
        padding: 0;
      }
      
      /* Ensure proper margins are applied */
      .content {
        margin: 0;
      }
      
      /* Hide elements that shouldn't print */
      .no-print {
        display: none !important;
      }
      
      /* Optimize text for print */
      body {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
    }
    
    /* Base document styling */
    html, body {
      font-size: 12pt; /* Standard document font size */
      line-height: 1.6;
      color: #333;
    }
    
    /* Typography adjustments for document format */
    h1 { font-size: 18pt; margin: 0 0 12pt 0; }
    h2 { font-size: 16pt; margin: 12pt 0 8pt 0; }
    h3 { font-size: 14pt; margin: 10pt 0 6pt 0; }
    h4, h5, h6 { font-size: 12pt; margin: 8pt 0 4pt 0; }
    
    p { margin: 0 0 6pt 0; }
    ul, ol { margin: 6pt 0; padding-left: 20pt; }
    li { margin: 3pt 0; }
    
    /* Table styling for documents */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 6pt 8pt;
      text-align: left;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    
    /* Image handling */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* Code blocks */
    pre, code {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
    }
    
    pre {
      background: #f8f8f8;
      padding: 8pt;
      border: 1px solid #ddd;
      margin: 6pt 0;
      white-space: pre-wrap;
    }
  `;
}

/**
 * Generate organization letterhead
 */
function generateLetterhead(orgSettings) {
  if (orgSettings.letterhead_enabled === false) return '';
  
  let letterhead = '<div class="letterhead">';
  
  if (orgSettings.logo_url) {
    letterhead += `<img src="${orgSettings.logo_url}" alt="${orgSettings.company_name || 'Company'} Logo" class="company-logo">`;
  }
  
  if (orgSettings.company_name) {
    letterhead += `<h3 style="margin: 0; color: ${orgSettings.primary_color || '#1f2937'};">${orgSettings.company_name}</h3>`;
  }
  
  // Use HTML header if available, otherwise use text header
  const headerContent = getHeaderContent(orgSettings);
  if (headerContent.content) {
    if (headerContent.type === 'html') {
      letterhead += headerContent.content;
    } else {
      letterhead += `<p style="margin: 0.5rem 0 0 0; color: #6b7280;">${headerContent.content}</p>`;
    }
  }
  
  letterhead += '</div>';
  return letterhead;
}

/**
 * Generate document footer
 */
function generateFooter(orgSettings) {
  // Use HTML footer if available, otherwise use text footer
  const footerContent = getFooterContent(orgSettings);
  if (!footerContent.content) return '';
  
  if (footerContent.type === 'html') {
    return `<div class="document-footer">${footerContent.content}</div>`;
  } else {
    return `<div class="document-footer">${footerContent.content}</div>`;
  }
}

/**
 * Export brief in specified format
 */
export async function exportBrief(briefMarkdown, format, orgSettings = {}) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `project-brief-${timestamp}`;
  
  switch (format.toLowerCase()) {
    case 'html':
      return {
        content: generateStyledHTML(briefMarkdown, orgSettings),
        filename: `${filename}.html`,
        mimeType: 'text/html'
      };
      
    case 'pdf':
      // Note: PDF generation would require a library like puppeteer
      // For now, we'll return HTML that can be printed to PDF
      return {
        content: generateStyledHTML(briefMarkdown, orgSettings),
        filename: `${filename}.html`,
        mimeType: 'text/html',
        note: 'Use browser Print > Save as PDF for PDF export'
      };
      
    case 'markdown':
    case 'md':
      return {
        content: briefMarkdown,
        filename: `${filename}.md`,
        mimeType: 'text/markdown'
      };
      
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Get available export formats
 */
export function getAvailableFormats() {
  return [
    { id: 'html', name: 'Styled HTML', description: 'Professional web document' },
    { id: 'pdf', name: 'PDF Ready', description: 'Print-ready HTML (use browser to save as PDF)' },
    { id: 'markdown', name: 'Plain Markdown', description: 'Raw markdown for developers' }
  ];
}
