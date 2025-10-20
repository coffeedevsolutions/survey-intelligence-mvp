import React from 'react';
import { cn } from './utils';

export function GlossyBubble({ 
  children, 
  className, 
  onClick, 
  collapsed = false,
  ...props 
}) {
  return (
    <button
      className={cn(
        "relative font-semibold text-white h-[56px]",
        "backdrop-blur-md",
        "border-none",
        "shadow-[0_10px_20px_rgba(60,108,255,.35),inset_0_-2px_6px_rgba(0,0,0,.2)]",
        "transition-all duration-300 ease-in-out",
        "hover:-translate-y-0",
        "active:translate-y-0",
        "flex items-center justify-center",
        "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-50",
        "before:transition-all before:duration-300 before:ease-in-out",
        collapsed ? "before:rounded-full" : "before:rounded-lg",
        // Dynamic classes based on collapsed state
        collapsed ? "rounded-full w-[56px] h-[56px] px-0" : "rounded-lg w-[224px] h-[56px] px-6",
        className
      )}
      style={{ 
        fontFamily: 'var(--font-suse-mono)',
        fontWeight: '600',
        // Match sidebar gradient exactly
        background: 'linear-gradient(90deg, rgba(73,118,255,1) 0%, rgba(143,52,252,1) 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradient-x 8s ease infinite'
      }}
      onClick={onClick}
      {...props}
    >
      {/* "sheen" */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none",
          "transition-all duration-300 ease-in-out",
          collapsed ? "rounded-full" : "rounded-md"
        )}
      />
      <div 
        className={cn(
          "flex items-center transition-all duration-300 ease-in-out",
          collapsed ? "gap-0" : "gap-1"
        )}
        style={{ 
          fontSize: collapsed ? '1.25rem' : '1.5rem',
          fontFamily: 'var(--font-suse-mono)',
          fontWeight: '600'
        }}
      >
        {React.Children.map(children, (child, index) => {
          // When collapsed, only show the first child (logo), hide text
          if (collapsed && index > 0) {
            return null;
          }
          return child;
        })}
      </div>
    </button>
  );
}
