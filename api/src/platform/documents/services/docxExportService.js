/**
 * DOCX Export Service
 * Generates true DOCX files with formatted headers and footers
 */

import { Document, Packer, Paragraph, TextRun, Header, Footer, HeadingLevel, AlignmentType, WidthType } from 'docx';
import { marked } from 'marked';

/**
 * Convert HTML to DOCX text runs
 */
function parseHTMLToDocxElements(htmlContent) {
  if (!htmlContent) return [];
  
  const elements = [];
  const regex = /<([^>]+)>/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(htmlContent)) !== null) {
    // Add text before tag
    const textBefore = htmlContent.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      // Check if there's a previous text run
      if (elements.length > 0 && elements[elements.length - 1] instanceof TextRun) {
        elements[elements.length - 1].text += textBefore;
      } else {
        elements.push(new TextRun(textBefore));
      }
    }
    
    const tag = match[1].split(' ')[0].toLowerCase();
    
    // Handle common HTML tags
    if (tag === 'br' || tag === 'br/') {
      elements.push(new Paragraph({ children: [new TextRun('')] }));
    } else if (tag.startsWith('b') || tag.startsWith('strong')) {
      // Bold - will be handled by styling
    } else if (tag.startsWith('i') || tag.startsWith('em')) {
      // Italic - will be handled by styling
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  const remainingText = htmlContent.substring(lastIndex);
  if (remainingText.trim()) {
    if (elements.length > 0 && elements[elements.length - 1] instanceof TextRun) {
      elements[elements.length - 1].text += remainingText;
    } else {
      elements.push(new TextRun(remainingText));
    }
  }
  
  return elements.length > 0 ? elements : [new TextRun('')];
}

/**
 * Convert HTML to paragraph for header/footer
 */
function htmlToParagraph(htmlContent) {
  // Strip HTML tags for simple implementation
  const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  const paragraph = new Paragraph({
    children: [new TextRun(textContent)],
    spacing: { before: 200, after: 200 }
  });
  
  return paragraph;
}

/**
 * Convert markdown to DOCX elements
 */
async function parseMarkdownToDocxElements(markdown) {
  const html = marked.parse(markdown);
  const elements = [];
  
  // Split by lines and convert
  const lines = html.split('\n');
  
  for (const line of lines) {
    const text = line.replace(/<[^>]*>/g, '').trim();
    if (text) {
      // Determine heading level
      let headingLevel;
      if (line.includes('<h1>')) headingLevel = HeadingLevel.HEADING_1;
      else if (line.includes('<h2>')) headingLevel = HeadingLevel.HEADING_2;
      else if (line.includes('<h3>')) headingLevel = HeadingLevel.HEADING_3;
      
      if (headingLevel) {
        elements.push(new Paragraph({
          text,
          heading: headingLevel,
          spacing: { before: 400, after: 200 }
        }));
      } else if (line.includes('<li>')) {
        elements.push(new Paragraph({
          text,
          bullet: { level: 0 }
        }));
      } else {
        elements.push(new Paragraph({
          children: [new TextRun(text)],
          spacing: { after: 200 }
        }));
      }
    }
  }
  
  return elements;
}

/**
 * Get page size configuration
 */
function getPageSize(pageSize) {
  const sizes = {
    'A4': { width: 12240, height: 15840 }, // 21 x 29.7 cm in twips
    'US Letter': { width: 12240, height: 15840 },
    'Legal': { width: 12240, height: 20160 },
    'A3': { width: 16837, height: 23811 }
  };
  
  return sizes[pageSize] || sizes['A4'];
}

/**
 * Convert margin string to twips
 */
function marginToTwips(margin) {
  const value = parseFloat(margin);
  if (margin.includes('in')) {
    return value * 1440; // inches to twips
  } else if (margin.includes('cm')) {
    return value * 566.9291; // cm to twips
  } else if (margin.includes('pt')) {
    return value * 20; // points to twips
  }
  return value; // assume already twips
}

/**
 * Get margins configuration
 */
function getMargins(margins) {
  return {
    top: marginToTwips(margins.top),
    bottom: marginToTwips(margins.bottom),
    left: marginToTwips(margins.left),
    right: marginToTwips(margins.right)
  };
}

/**
 * Generate DOCX file from brief markdown and template configuration
 */
export async function generateDOCX(briefMarkdown, template, orgSettings = {}) {
  try {
    // Parse HTML header/footer to DOCX elements
    const headerContent = template.header_config?.enabled && template.header_config?.content
      ? htmlToParagraph(template.header_config.content)
      : new Paragraph({ children: [new TextRun('')] });
    
    const footerContent = template.footer_config?.enabled && template.footer_config?.content
      ? htmlToParagraph(template.footer_config.content)
      : new Paragraph({ children: [new TextRun('')] });
    
    // Parse markdown to DOCX elements
    const documentElements = await parseMarkdownToDocxElements(briefMarkdown);
    
    // Create document with page configuration
    const doc = new Document({
      creator: orgSettings.company_name || 'AI Survey',
      title: orgSettings.document_title || 'Document',
      description: 'Generated from template',
      sections: [{
        properties: {
          page: {
            size: getPageSize(template.layout_config?.page_size || 'A4'),
            margin: getMargins(template.layout_config?.margins || {
              top: '1in',
              bottom: '1in',
              left: '1in',
              right: '1in'
            }),
            orientation: template.layout_config?.orientation === 'landscape' ? 'landscape' : 'portrait'
          }
        },
        headers: {
          default: new Header({
            children: [headerContent]
          })
        },
        footers: {
          default: new Footer({
            children: [footerContent]
          })
        },
        children: documentElements
      }]
    });
    
    // Generate DOCX file
    const blob = await Packer.toBlob(doc);
    
    return blob;
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error(`Failed to generate DOCX: ${error.message}`);
  }
}

/**
 * Export brief as DOCX file
 */
export async function exportBriefAsDOCX(briefMarkdown, format, template, orgSettings = {}) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `document-${timestamp}`;
  
  if (format.toLowerCase() === 'docx') {
    const blob = await generateDOCX(briefMarkdown, template, orgSettings);
    
    return {
      content: blob,
      filename: `${filename}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }
  
  throw new Error(`Unsupported format: ${format}`);
}

export default {
  generateDOCX,
  exportBriefAsDOCX
};

