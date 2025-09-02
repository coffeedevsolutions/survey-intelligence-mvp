import React from 'react';

/**
 * Label component for form inputs with consistent styling
 */
export function Label({ 
  htmlFor, 
  children, 
  className = '',
  required = false,
  ...props 
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`
        block text-sm font-medium text-gray-700 mb-1
        ${required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </label>
  );
}

/**
 * Inline label variant for checkboxes and radios
 */
export function InlineLabel({ 
  htmlFor, 
  children, 
  className = '',
  ...props 
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`
        inline-flex items-center text-sm font-medium text-gray-700 cursor-pointer
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </label>
  );
}

/**
 * Description text that pairs with labels
 */
export function LabelDescription({ 
  children, 
  className = '',
  ...props 
}) {
  return (
    <p
      className={`
        text-sm text-gray-600 mt-1
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Error text for form validation
 */
export function LabelError({ 
  children, 
  className = '',
  ...props 
}) {
  if (!children) return null;
  
  return (
    <p
      className={`
        text-sm text-red-600 mt-1
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </p>
  );
}
