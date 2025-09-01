import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { FormInput } from './form-input';
import { 
  getFramework, 
  calculatePriorityScore, 
  getPriorityLabel, 
  formatPriorityDisplay,
  validatePriorityValues 
} from '../../utils/prioritizationFrameworks';

/**
 * Priority Input Component
 * Renders different input types based on the selected prioritization framework
 */
export function PriorityInput({ 
  frameworkId = 'simple', 
  value, 
  onChange, 
  size = 'default',
  disabled = false,
  showLabel = true,
  compact = false,
  className = ''
}) {
  const framework = getFramework(frameworkId);
  const [currentValues, setCurrentValues] = useState(value || {});
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setCurrentValues(value || {});
  }, [value]);

  const handleValueChange = (newValues) => {
    setCurrentValues(newValues);
    
    // Validate values
    const validationErrors = validatePriorityValues(frameworkId, newValues);
    setErrors(validationErrors);
    
    // Call onChange with the new values
    if (onChange) {
      onChange(newValues, validationErrors.length === 0);
    }
  };

  const handleSimpleValueChange = (newValue) => {
    const valueObj = { value: newValue };
    handleValueChange(valueObj);
  };

  const handleCompositeFieldChange = (fieldKey, fieldValue) => {
    const newValues = {
      ...currentValues,
      [fieldKey]: fieldValue
    };
    handleValueChange(newValues);
  };

  // Render simple numeric/categorical frameworks (1-5, MoSCoW, etc.)
  if (framework.type === 'numeric' || framework.type === 'categorical') {
    if (compact) {
      // Compact mode: just show buttons for the values
      return (
        <div className={`flex gap-1 ${className}`}>
          {framework.values.map((option) => {
            const isSelected = currentValues.value === option.value;
            return (
              <Button
                key={option.value}
                size={size === 'sm' ? 'sm' : 'sm'}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => handleSimpleValueChange(option.value)}
                disabled={disabled}
                style={{
                  minWidth: size === 'sm' ? '32px' : '40px',
                  backgroundColor: isSelected ? option.color : option.bgColor,
                  borderColor: option.borderColor,
                  color: isSelected ? 'white' : option.color,
                  fontSize: size === 'sm' ? '12px' : '14px'
                }}
                title={`${option.label}${option.description ? ': ' + option.description : ''}`}
              >
                {framework.type === 'categorical' ? option.label.split(' ')[0] : option.value}
              </Button>
            );
          })}
        </div>
      );
    }

    // Full mode: show buttons with labels
    return (
      <div className={`space-y-2 ${className}`}>
        {showLabel && (
          <label className="block text-sm font-medium">
            {framework.name}
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {framework.values.map((option) => {
            const isSelected = currentValues.value === option.value;
            return (
              <Button
                key={option.value}
                size={size}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => handleSimpleValueChange(option.value)}
                disabled={disabled}
                style={{
                  backgroundColor: isSelected ? option.color : option.bgColor,
                  borderColor: option.borderColor,
                  color: isSelected ? 'white' : option.color
                }}
                className="flex flex-col items-center p-3 h-auto"
                title={option.description}
              >
                <span className="font-semibold">
                  {framework.type === 'categorical' ? option.label.split(' ')[0] : option.value}
                </span>
                <span className="text-xs mt-1">{option.label.split(' ').slice(1).join(' ')}</span>
              </Button>
            );
          })}
        </div>
        {!compact && currentValues.value && (
          <div className="mt-2">
            <Badge variant="outline" style={{ color: getPriorityLabel(frameworkId, currentValues).color }}>
              Selected: {getPriorityLabel(frameworkId, currentValues).label}
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // Render composite frameworks (ICE, RICE, Value vs Effort)
  if (framework.type === 'composite' || framework.type === 'matrix') {
    if (compact) {
      // Compact mode: show current score or "Set Priority" button
      const hasValues = framework.fields.every(field => currentValues[field.key] !== undefined);
      
      if (hasValues) {
        const score = calculatePriorityScore(frameworkId, currentValues);
        const label = getPriorityLabel(frameworkId, currentValues);
        
        return (
          <Badge 
            variant="outline" 
            style={{ color: label.color }}
            className={className}
          >
            {formatPriorityDisplay(frameworkId, currentValues).displayText}
          </Badge>
        );
      }
      
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className={className}
          onClick={() => {
            // This would typically open a modal or expand the form
            // For now, just initialize with default values
            const defaultValues = {};
            framework.fields.forEach(field => {
              defaultValues[field.key] = field.min;
            });
            handleValueChange(defaultValues);
          }}
        >
          Set Priority
        </Button>
      );
    }

    // Full mode: show input fields for each dimension
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{framework.name}</CardTitle>
          <p className="text-xs text-gray-600">{framework.description}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {framework.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-1">
                {field.label}
                {field.unit && ` (${field.unit})`}
              </label>
              {field.description && (
                <p className="text-xs text-gray-500 mb-1">{field.description}</p>
              )}
              
              {field.options ? (
                // Dropdown for predefined options (like RICE impact)
                <select
                  value={currentValues[field.key] || ''}
                  onChange={(e) => handleCompositeFieldChange(field.key, parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full p-2 text-sm border rounded"
                >
                  <option value="">Select...</option>
                  {field.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                // Numeric input
                <FormInput
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step || 1}
                  value={currentValues[field.key] || ''}
                  onChange={(e) => handleCompositeFieldChange(field.key, parseFloat(e.target.value) || '')}
                  disabled={disabled}
                  placeholder={`${field.min}-${field.max}`}
                  className="text-sm"
                />
              )}
            </div>
          ))}
          
          {/* Show calculated score */}
          {framework.fields.every(field => currentValues[field.key] !== undefined) && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Score:</span>
                <Badge 
                  variant="default" 
                  style={{ backgroundColor: getPriorityLabel(frameworkId, currentValues).color }}
                >
                  {formatPriorityDisplay(frameworkId, currentValues).displayText}
                </Badge>
              </div>
            </div>
          )}
          
          {/* Show validation errors */}
          {errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback for unknown framework types
  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      Unknown framework type: {framework.type}
    </div>
  );
}

/**
 * Priority Display Component
 * Shows the current priority in a read-only format
 */
export function PriorityDisplay({ 
  frameworkId = 'simple', 
  value, 
  size = 'default',
  showScore = true,
  className = ''
}) {
  const framework = getFramework(frameworkId);
  
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return (
      <span className={`text-gray-400 text-sm ${className}`}>
        Not set
      </span>
    );
  }

  const display = formatPriorityDisplay(frameworkId, value);
  
  return (
    <Badge 
      variant="outline" 
      style={{ 
        color: display.color,
        borderColor: display.borderColor || display.color + '40',
        backgroundColor: display.bgColor || display.color + '10'
      }}
      className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}
    >
      {showScore ? display.displayText : display.label}
    </Badge>
  );
}

/**
 * Priority Quick Actions Component
 * Shows quick action buttons for setting priority (used in tables)
 */
export function PriorityQuickActions({ 
  frameworkId = 'simple', 
  currentValue, 
  onChange,
  disabled = false,
  className = ''
}) {
  const framework = getFramework(frameworkId);

  // For composite frameworks, show a single "Set Priority" button
  if (framework.type === 'composite' || framework.type === 'matrix') {
    const hasValue = currentValue && typeof currentValue === 'object' && Object.keys(currentValue).length > 0;
    
    return (
      <div className={`flex gap-1 ${className}`}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // This would typically open a modal for setting composite values
            // For now, just call onChange with a placeholder
            if (onChange) {
              onChange({ action: 'open_modal', framework: frameworkId });
            }
          }}
          disabled={disabled}
          className="text-xs"
        >
          {hasValue ? 'Update' : 'Set'} Priority
        </Button>
      </div>
    );
  }

  // For simple frameworks, show quick buttons
  return (
    <div className={`flex gap-1 ${className}`}>
      {framework.values.slice(0, 5).map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant="outline"
          onClick={() => onChange && onChange({ value: option.value })}
          disabled={disabled}
          style={{
            minWidth: '32px',
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: option.bgColor,
            borderColor: option.borderColor,
            color: option.color
          }}
          title={option.label}
        >
          {framework.type === 'categorical' ? option.label.charAt(0) : option.value}
        </Button>
      ))}
    </div>
  );
}
