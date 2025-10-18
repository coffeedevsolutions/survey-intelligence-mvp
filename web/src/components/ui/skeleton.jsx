import React from 'react';
import { cn } from './utils';

/**
 * Skeleton component for loading states
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
      {...props}
    />
  );
}
