import React from 'react';

export function Select({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option",
  className = "",
  required = false,
  disabled = false,
  ...props 
}) {
  const selectClasses = `form-select-enhanced ${className}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="form-label-enhanced">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={selectClasses}
        disabled={disabled}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={option.value || index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
