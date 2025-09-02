import React from 'react';

/**
 * Switch component for toggle functionality
 * A modern alternative to checkboxes for boolean values
 */
export function Switch({ 
  checked = false,
  onCheckedChange,
  disabled = false,
  size = 'default',
  className = '',
  id,
  name,
  'aria-label': ariaLabel,
  ...props 
}) {
  const sizeClasses = {
    sm: 'h-4 w-7',
    default: 'h-6 w-11', 
    lg: 'h-8 w-14'
  };
  
  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-6 w-6'
  };
  
  const translateClasses = {
    sm: checked ? 'translate-x-3' : 'translate-x-0.5',
    default: checked ? 'translate-x-6' : 'translate-x-1',
    lg: checked ? 'translate-x-7' : 'translate-x-1'
  };

  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      id={id}
      name={name}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${sizeClasses[size]}
        ${checked 
          ? 'bg-blue-600 hover:bg-blue-700' 
          : 'bg-gray-200 hover:bg-gray-300'
        }
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer'
        }
        ${className}
      `.trim()}
      {...props}
    >
      <span
        className={`
          inline-block transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out
          ${thumbSizeClasses[size]}
          ${translateClasses[size]}
        `.trim()}
      />
      <span className="sr-only">
        {checked ? 'Enabled' : 'Disabled'}
      </span>
    </button>
  );
}

/**
 * Switch with integrated label
 */
export function SwitchWithLabel({ 
  checked,
  onCheckedChange,
  disabled = false,
  size = 'default',
  label,
  description,
  className = '',
  ...props 
}) {
  const id = React.useId();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex-1">
        {label && (
          <label 
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 cursor-pointer"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-gray-600 mt-1">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        size={size}
        {...props}
      />
    </div>
  );
}

/**
 * Card-style switch for prominent settings
 */
export function SwitchCard({ 
  checked,
  onCheckedChange,
  disabled = false,
  title,
  description,
  icon,
  className = '',
  ...props 
}) {
  const id = React.useId();

  return (
    <div className={`
      flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors
      ${disabled ? 'opacity-50' : ''}
      ${className}
    `.trim()}>
      <div className="flex items-start space-x-3 flex-1">
        {icon && (
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <label 
              htmlFor={id}
              className="block text-sm font-medium text-gray-900 cursor-pointer"
            >
              {title}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}
