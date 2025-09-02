import React from 'react';

/**
 * Radio button component with consistent styling
 */
export function Radio({ 
  checked = false,
  onChange,
  disabled = false,
  size = 'default',
  className = '',
  id,
  name,
  value,
  'aria-label': ariaLabel,
  ...props 
}) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <input
      type="radio"
      id={id}
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        border-gray-300 text-blue-600 shadow-sm transition-colors duration-200
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
 * Radio button with integrated label
 */
export function RadioWithLabel({ 
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
        <Radio
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
 * Radio group for single selection
 */
export function RadioGroup({ 
  options = [],
  value,
  onChange,
  disabled = false,
  orientation = 'vertical',
  name,
  className = '',
  ...props 
}) {
  const generatedId = React.useId();
  const groupName = name || generatedId;

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
          <RadioWithLabel
            key={optionValue}
            name={groupName}
            value={optionValue}
            checked={value === optionValue}
            onChange={() => onChange?.(optionValue)}
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
 * Card-style radio for prominent options
 */
export function RadioCard({ 
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
        <Radio
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

/**
 * Radio group with card-style options
 */
export function RadioCardGroup({ 
  options = [],
  value,
  onChange,
  disabled = false,
  columns = 1,
  name,
  className = '',
  ...props 
}) {
  const generatedId = React.useId();
  const groupName = name || generatedId;
  
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid gap-4 ${gridClasses[columns]} ${className}`} {...props}>
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionTitle = typeof option === 'string' ? option : option.title || option.label;
        const optionDescription = typeof option === 'object' ? option.description : undefined;
        const optionIcon = typeof option === 'object' ? option.icon : undefined;
        const isDisabled = disabled || (typeof option === 'object' && option.disabled);

        return (
          <RadioCard
            key={optionValue}
            name={groupName}
            value={optionValue}
            checked={value === optionValue}
            onChange={() => onChange?.(optionValue)}
            disabled={isDisabled}
            title={optionTitle}
            description={optionDescription}
            icon={optionIcon}
          />
        );
      })}
    </div>
  );
}
