import React from 'react';
import { cn } from './utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ className, ...props }) {
  return (
    <CardSkeleton className={cn("h-[300px]", className)} {...props}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex space-x-2 mt-4">
          <Skeleton className="h-2 w-8 bg-blue-200" />
          <Skeleton className="h-2 w-12 bg-green-200" />
          <Skeleton className="h-2 w-6 bg-yellow-200" />
          <Skeleton className="h-2 w-10 bg-red-200" />
        </div>
      </div>
    </CardSkeleton>
  );
}

export function TableSkeleton({ className, rows = 5, ...props }) {
  return (
    <CardSkeleton className={cn("h-[400px]", className)} {...props}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/6" />
              <Skeleton className="h-3 w-1/5" />
            </div>
          ))}
        </div>
      </div>
    </CardSkeleton>
  );
}

export function KpiCardSkeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}