import React from 'react';

export function FormInput({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  className = "",
  required = false,
  disabled = false,
  ...props 
}) {
  const inputClasses = `form-input-enhanced ${className}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="form-label-enhanced">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClasses}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}

export function FormTextarea({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  className = "",
  rows = 4,
  required = false,
  disabled = false,
  ...props 
}) {
  const textareaClasses = `form-textarea-enhanced ${className}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="form-label-enhanced">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={textareaClasses}
        rows={rows}
        disabled={disabled}
        style={{ minHeight: `${Math.max(rows * 1.5, 3)}rem` }}
        {...props}
      />
    </div>
  );
}
