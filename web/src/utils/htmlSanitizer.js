import DOMPurify from 'dompurify';

/**
 * HTML Sanitizer for safe rendering of user-provided HTML
 * Prevents XSS attacks while allowing safe HTML formatting
 */

// Safe HTML configuration for headers/footers
const SAFE_HTML_CONFIG = {
  ALLOWED_TAGS: [
    // Text formatting
    'b', 'strong', 'i', 'em', 'u', 'span', 'div', 'p', 'br',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Links (with restrictions)
    'a',
    // Images (with restrictions)
    'img',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    // Other safe elements
    'small', 'sub', 'sup', 'code', 'pre'
  ],
  ALLOWED_ATTR: [
    // Styling
    'style', 'class',
    // Links
    'href', 'target', 'rel',
    // Images
    'src', 'alt', 'width', 'height',
    // Tables
    'colspan', 'rowspan',
    // General
    'title'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  ADD_ATTR: ['target'],
  FORCE_BODY: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_DOM: true,
  WHOLE_DOCUMENT: false,
  // Transform function to add security attributes
  SANITIZE_NAMED_PROPS: true,
  SANITIZE_NAMED_PROPS_PREFIX: 'user-content-'
};

/**
 * Sanitize HTML content for headers and footers
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML content
 */
export function sanitizeHeaderFooterHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Configure DOMPurify with our safe settings
  const sanitized = DOMPurify.sanitize(html, SAFE_HTML_CONFIG);
  
  // Additional safety checks
  return sanitized
    .replace(/javascript:/gi, '') // Remove any remaining javascript: protocols
    .replace(/on\w+\s*=/gi, ''); // Remove any event handlers that might have slipped through
}

/**
 * Sanitize and validate CSS styles
 * @param {string} css - CSS content
 * @returns {string} - Safe CSS content
 */
export function sanitizeCSS(css) {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Remove dangerous CSS properties and values
  return css
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/@import/gi, '') // Remove @import statements
    .replace(/-moz-binding/gi, '') // Remove Mozilla bindings
    .replace(/behavior\s*:/gi, ''); // Remove IE behaviors
}

/**
 * Create a safe HTML preview for the organization settings
 * @param {string} html - Raw HTML content
 * @param {string} type - 'header' or 'footer'
 * @returns {string} - Safe HTML for preview
 */
export function createSafeHTMLPreview(html, type = 'content') {
  const sanitized = sanitizeHeaderFooterHTML(html);
  
  // Wrap in a container with appropriate styling
  const containerClass = type === 'header' ? 'html-header-preview' : 
                        type === 'footer' ? 'html-footer-preview' : 
                        'html-content-preview';
  
  return `<div class="${containerClass}">${sanitized}</div>`;
}

/**
 * Validate HTML content and return any warnings
 * @param {string} html - Raw HTML content
 * @returns {object} - Validation result with warnings
 */
export function validateHTML(html) {
  const warnings = [];
  
  if (!html) {
    return { isValid: true, warnings };
  }

  // Check for potentially dangerous patterns
  if (/javascript:/i.test(html)) {
    warnings.push('JavaScript URLs are not allowed and will be removed');
  }
  
  if (/on\w+\s*=/i.test(html)) {
    warnings.push('Event handlers (onclick, onload, etc.) are not allowed and will be removed');
  }
  
  if (/<script/i.test(html)) {
    warnings.push('Script tags are not allowed and will be removed');
  }
  
  if (/<iframe|<object|<embed/i.test(html)) {
    warnings.push('Embedded content (iframe, object, embed) is not allowed and will be removed');
  }

  // Check for excessive nesting
  const nestingLevel = (html.match(/<div/g) || []).length;
  if (nestingLevel > 10) {
    warnings.push('Excessive nesting detected - consider simplifying your HTML structure');
  }

  return {
    isValid: true,
    warnings,
    sanitized: sanitizeHeaderFooterHTML(html)
  };
}

/**
 * Get allowed HTML documentation for users
 * @returns {object} - Documentation object
 */
export function getAllowedHTMLDocs() {
  return {
    allowedTags: SAFE_HTML_CONFIG.ALLOWED_TAGS,
    allowedAttributes: SAFE_HTML_CONFIG.ALLOWED_ATTR,
    examples: {
      header: `
<div style="text-align: center; padding: 20px; border-bottom: 2px solid #333;">
  <h2 style="margin: 0; color: #333;">Your Company Name</h2>
  <p style="margin: 5px 0 0 0; color: #666;">Professional Services Division</p>
</div>`,
      footer: `
<div style="text-align: center; padding: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
  <p style="margin: 0;">
    <strong>Confidential:</strong> This document contains proprietary information.
  </p>
  <p style="margin: 5px 0 0 0;">
    Contact: <a href="mailto:info@company.com">info@company.com</a> | 
    Phone: (555) 123-4567
  </p>
</div>`
    },
    tips: [
      'Use inline styles for consistent formatting across all documents',
      'Avoid external links to untrusted domains',
      'Keep HTML simple and semantic for best results',
      'Test your HTML in the preview before saving'
    ]
  };
}
