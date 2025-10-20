import React from 'react';
import { cn } from './utils';

/**
 * Separator component
 */
export function Separator({ 
  orientation = 'horizontal', 
  className = '', 
  ...props 
}) {
  return (
    <div
      className={cn(
        'shrink-0 bg-gray-200',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  );
}