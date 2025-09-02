import React from 'react';
import { Minus, Plus } from './icons';

/**
 * Basic input component with consistent styling
 */
export function Input({ 
  type = 'text',
  className = '',
  error = false,
  disabled = false,
  size = 'default',
  ...props 
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    default: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  return (
    <input
      type={type}
      disabled={disabled}
      className={`
        block w-full rounded-md border shadow-sm transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
        ${error 
          ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
          : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
        }
        ${sizeClasses[size]}
        ${className}
      `.trim()}
      {...props}
    />
  );
}

/**
 * Textarea component with consistent styling
 */
export function Textarea({ 
  className = '',
  error = false,
  disabled = false,
  resize = true,
  rows = 4,
  ...props 
}) {
  return (
    <textarea
      rows={rows}
      disabled={disabled}
      className={`
        block w-full rounded-md border shadow-sm transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
        ${resize ? 'resize-y' : 'resize-none'}
        ${error 
          ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
          : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
        }
        px-3 py-2 text-sm
        ${className}
      `.trim()}
      {...props}
    />
  );
}

/**
 * Input with icon
 */
export function InputWithIcon({ 
  icon,
  iconPosition = 'left',
  className = '',
  ...props 
}) {
  const inputId = React.useId();

  if (iconPosition === 'left') {
    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="h-5 w-5 text-gray-400">
            {icon}
          </div>
        </div>
        <Input
          id={inputId}
          className={`pl-10 ${className}`}
          {...props}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        className={`pr-10 ${className}`}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <div className="h-5 w-5 text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Number input with increment/decrement buttons
 */
export function NumberInput({ 
  value,
  onChange,
  min,
  max,
  step = 1,
  className = '',
  ...props 
}) {
  const handleIncrement = () => {
    const newValue = (parseInt(value) || 0) + step;
    if (!max || newValue <= max) {
      onChange?.(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = (parseInt(value) || 0) - step;
    if (!min || newValue >= min) {
      onChange?.(newValue);
    }
  };

  const handleInputChange = (e) => {
    const newValue = parseInt(e.target.value);
    if (!isNaN(newValue)) {
      onChange?.(newValue);
    }
  };

  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={(min !== undefined && value <= min)}
        className="relative -mr-px inline-flex items-center px-2 py-2 border border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md"
      >
        <span className="sr-only">Decrease</span>
        <Minus className="h-4 w-4" />
      </button>
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        step={step}
        className={`rounded-none border-l-0 border-r-0 text-center ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={(max !== undefined && value >= max)}
        className="relative -ml-px inline-flex items-center px-2 py-2 border border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md"
      >
        <span className="sr-only">Increase</span>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
