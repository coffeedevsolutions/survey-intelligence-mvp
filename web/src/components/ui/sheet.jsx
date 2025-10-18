import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from './icons';
import { cn } from './utils';

const SheetContext = createContext();

/**
 * Sheet component for mobile overlays
 */
export function Sheet({ children, open, onOpenChange }) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetContent({ 
  children, 
  side = 'left', 
  className = '',
  ...props 
}) {
  const { open, onOpenChange } = useContext(SheetContext);
  
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Sheet */}
      <div 
        className={cn(
          'fixed top-0 h-full w-80 bg-white shadow-xl',
          side === 'left' ? 'left-0' : 'right-0',
          className
        )}
        {...props}
      >
        <div className="flex h-full flex-col">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export function SheetHeader({ children, className = '', ...props }) {
  return (
    <div className={cn('flex flex-col space-y-2 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function SheetTitle({ children, className = '', ...props }) {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  );
}

export function SheetDescription({ children, className = '', ...props }) {
  return (
    <p className={cn('text-sm text-gray-500', className)} {...props}>
      {children}
    </p>
  );
}
