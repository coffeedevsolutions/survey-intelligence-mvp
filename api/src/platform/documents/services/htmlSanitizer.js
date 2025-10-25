import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

/**
 * Server-side HTML Sanitizer for safe rendering of user-provided HTML
 * Prevents XSS attacks while allowing safe HTML formatting
 */

// Create a virtual DOM for server-side sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window);

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
  WHOLE_DOCUMENT: false
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

  try {
    // Configure DOMPurify with our safe settings
    const sanitized = purify.sanitize(html, SAFE_HTML_CONFIG);
    
    // Additional safety checks
    return sanitized
      .replace(/javascript:/gi, '') // Remove any remaining javascript: protocols
      .replace(/on\w+\s*=/gi, ''); // Remove any event handlers that might have slipped through
  } catch (error) {
    console.error('HTML sanitization error:', error);
    return ''; // Return empty string if sanitization fails
  }
}

/**
 * Sanitize organization settings HTML fields
 * @param {object} settings - Organization settings object
 * @returns {object} - Settings with sanitized HTML fields
 */
export function sanitizeOrganizationSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const sanitizedSettings = { ...settings };

  // Sanitize HTML fields if they exist
  if (sanitizedSettings.document_header_html) {
    sanitizedSettings.document_header_html = sanitizeHeaderFooterHTML(sanitizedSettings.document_header_html);
  }

  if (sanitizedSettings.document_footer_html) {
    sanitizedSettings.document_footer_html = sanitizeHeaderFooterHTML(sanitizedSettings.document_footer_html);
  }

  return sanitizedSettings;
}

/**
 * Get the appropriate header content (HTML or text)
 * @param {object} settings - Organization settings
 * @returns {object} - Header content and type
 */
export function getHeaderContent(settings) {
  if (settings.document_header_html && settings.document_header_html.trim()) {
    return {
      content: sanitizeHeaderFooterHTML(settings.document_header_html),
      type: 'html'
    };
  } else if (settings.document_header && settings.document_header.trim()) {
    return {
      content: settings.document_header,
      type: 'text'
    };
  }
  return { content: '', type: 'text' };
}

/**
 * Get the appropriate footer content (HTML or text)
 * @param {object} settings - Organization settings
 * @returns {object} - Footer content and type
 */
export function getFooterContent(settings) {
  if (settings.document_footer_html && settings.document_footer_html.trim()) {
    return {
      content: sanitizeHeaderFooterHTML(settings.document_footer_html),
      type: 'html'
    };
  } else if (settings.document_footer && settings.document_footer.trim()) {
    return {
      content: settings.document_footer,
      type: 'text'
    };
  }
  return { content: '', type: 'text' };
}
