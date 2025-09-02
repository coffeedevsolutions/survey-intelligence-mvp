import React from 'react';

/**
 * Checkbox component with consistent styling
 */
export function Checkbox({ 
  checked = false,
  onChange,
  disabled = false,
  indeterminate = false,
  size = 'default',
  className = '',
  id,
  name,
  value,
  'aria-label': ariaLabel,
  ...props 
}) {
  const checkboxRef = React.useRef(null);
  
  // Handle indeterminate state
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const sizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      id={id}
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        rounded border-gray-300 text-blue-600 shadow-sm transition-colors duration-200
        focus:ring-blue-500 focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${className}
      `.trim()}
      {...props}
    />
  );
}

/**
 * Checkbox with integrated label
 */
export function CheckboxWithLabel({ 
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className = '',
  ...props 
}) {
  const id = React.useId();

  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="flex items-center h-5">
        <Checkbox
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
      </div>
      <div className="flex-1 min-w-0">
        {label && (
          <label 
            htmlFor={id}
            className={`
              block text-sm font-medium text-gray-700 cursor-pointer
              ${disabled ? 'opacity-50' : ''}
            `.trim()}
          >
            {label}
          </label>
        )}
        {description && (
          <p className={`
            text-sm text-gray-600 mt-1
            ${disabled ? 'opacity-50' : ''}
          `.trim()}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Checkbox group for multiple selections
 */
export function CheckboxGroup({ 
  options = [],
  value = [],
  onChange,
  disabled = false,
  orientation = 'vertical',
  className = '',
  ...props 
}) {
  const handleCheckboxChange = (optionValue, isChecked) => {
    if (isChecked) {
      onChange?.([...value, optionValue]);
    } else {
      onChange?.(value.filter(v => v !== optionValue));
    }
  };

  const orientationClasses = {
    vertical: 'space-y-3',
    horizontal: 'flex flex-wrap gap-4'
  };

  return (
    <div className={`${orientationClasses[orientation]} ${className}`} {...props}>
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        const optionDescription = typeof option === 'object' ? option.description : undefined;
        const isDisabled = disabled || (typeof option === 'object' && option.disabled);

        return (
          <CheckboxWithLabel
            key={optionValue}
            checked={value.includes(optionValue)}
            onChange={(e) => handleCheckboxChange(optionValue, e.target.checked)}
            disabled={isDisabled}
            label={optionLabel}
            description={optionDescription}
          />
        );
      })}
    </div>
  );
}

/**
 * Card-style checkbox for prominent options
 */
export function CheckboxCard({ 
  checked,
  onChange,
  disabled = false,
  title,
  description,
  icon,
  className = '',
  ...props 
}) {
  const id = React.useId();

  return (
    <label
      htmlFor={id}
      className={`
        flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors
        ${checked 
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
          : 'border-gray-200 bg-white hover:bg-gray-50'
        }
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:border-gray-300'
        }
        ${className}
      `.trim()}
    >
      <div className="flex items-center h-5">
        <Checkbox
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start space-x-3">
          {icon && (
            <div className="flex-shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          <div className="flex-1">
            {title && (
              <div className="text-sm font-medium text-gray-900">
                {title}
              </div>
            )}
            {description && (
              <div className="text-sm text-gray-600 mt-1">
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
    </label>
  );
}
