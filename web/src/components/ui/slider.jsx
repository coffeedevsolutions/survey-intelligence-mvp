import React from 'react';

/**
 * Slider component for numeric input ranges
 */
export function Slider({ 
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValue = true,
  showLabels = true,
  className = '',
  'aria-label': ariaLabel,
  ...props 
}) {
  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(parseFloat(e.target.value));
    }
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`
            w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:h-5 
            [&::-webkit-slider-thumb]:w-5 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-blue-600 
            [&::-webkit-slider-thumb]:border-2 
            [&::-webkit-slider-thumb]:border-white 
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:bg-blue-700
            [&::-moz-range-thumb]:h-5 
            [&::-moz-range-thumb]:w-5 
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-blue-600 
            [&::-moz-range-thumb]:border-2 
            [&::-moz-range-thumb]:border-white 
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:appearance-none
          `.trim()}
          {...props}
        />
        
        {/* Progress track */}
        <div 
          className="absolute top-0 h-2 bg-blue-600 rounded-lg pointer-events-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-2">
        {showLabels && (
          <>
            <span className="text-sm text-gray-600">{min}</span>
            <span className="text-sm text-gray-600">{max}</span>
          </>
        )}
        {showValue && (
          <span className="text-sm font-medium text-gray-900 absolute left-1/2 transform -translate-x-1/2">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Range slider for selecting a range between two values
 */
export function RangeSlider({ 
  value = [0, 100],
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValues = true,
  showLabels = true,
  className = '',
  ...props 
}) {
  const [minValue, maxValue] = value;

  const handleMinChange = (e) => {
    const newMin = parseFloat(e.target.value);
    if (!disabled && onChange && newMin <= maxValue) {
      onChange([newMin, maxValue]);
    }
  };

  const handleMaxChange = (e) => {
    const newMax = parseFloat(e.target.value);
    if (!disabled && onChange && newMax >= minValue) {
      onChange([minValue, newMax]);
    }
  };

  const minPercentage = ((minValue - min) / (max - min)) * 100;
  const maxPercentage = ((maxValue - min) / (max - min)) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative h-2">
        {/* Track */}
        <div className="absolute w-full h-2 bg-gray-200 rounded-lg" />
        
        {/* Active range */}
        <div 
          className="absolute h-2 bg-blue-600 rounded-lg"
          style={{ 
            left: `${minPercentage}%`, 
            width: `${maxPercentage - minPercentage}%` 
          }}
        />
        
        {/* Min slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          disabled={disabled}
          className={`
            absolute w-full h-2 bg-transparent appearance-none pointer-events-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:h-5 
            [&::-webkit-slider-thumb]:w-5 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-blue-600 
            [&::-webkit-slider-thumb]:border-2 
            [&::-webkit-slider-thumb]:border-white 
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:h-5 
            [&::-moz-range-thumb]:w-5 
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-blue-600 
            [&::-moz-range-thumb]:border-2 
            [&::-moz-range-thumb]:border-white 
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:appearance-none
          `.trim()}
          {...props}
        />
        
        {/* Max slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          disabled={disabled}
          className={`
            absolute w-full h-2 bg-transparent appearance-none pointer-events-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:h-5 
            [&::-webkit-slider-thumb]:w-5 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-blue-600 
            [&::-webkit-slider-thumb]:border-2 
            [&::-webkit-slider-thumb]:border-white 
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:h-5 
            [&::-moz-range-thumb]:w-5 
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-blue-600 
            [&::-moz-range-thumb]:border-2 
            [&::-moz-range-thumb]:border-white 
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:appearance-none
          `.trim()}
          {...props}
        />
      </div>
      
      <div className="flex justify-between items-center mt-2">
        {showLabels && (
          <>
            <span className="text-sm text-gray-600">{min}</span>
            <span className="text-sm text-gray-600">{max}</span>
          </>
        )}
        {showValues && (
          <div className="flex space-x-2 text-sm font-medium text-gray-900">
            <span>{minValue}</span>
            <span>-</span>
            <span>{maxValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Slider with marks/ticks at specific values
 */
export function SliderWithMarks({ 
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  marks = [],
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <div className={`w-full ${className}`}>
      <Slider
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        showValue={false}
        showLabels={false}
        {...props}
      />
      
      {/* Marks */}
      <div className="relative mt-1">
        {marks.map((mark) => {
          const position = ((mark.value - min) / (max - min)) * 100;
          return (
            <div
              key={mark.value}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              <div className="w-1 h-1 bg-gray-400 rounded-full mx-auto" />
              <span className="text-xs text-gray-600 mt-1 block text-center whitespace-nowrap">
                {mark.label || mark.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
