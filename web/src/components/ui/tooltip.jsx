import React, { useState, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './utils';

const TooltipContext = createContext();

/**
 * Tooltip provider component
 */
export function TooltipProvider({ children, delayDuration = 0 }) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

/**
 * Tooltip component
 */
export function Tooltip({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, position, setPosition }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children, asChild = false }) {
  const { setIsOpen, setPosition } = useContext(TooltipContext);
  
  const handleMouseEnter = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      top: rect.top - 8,
      left: rect.left + rect.width / 2
    });
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  if (asChild) {
    return React.cloneElement(children, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    });
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

export function TooltipContent({ 
  children, 
  hidden = false,
  className = '',
  ...props 
}) {
  const { isOpen, position } = useContext(TooltipContext);

  if (!isOpen || hidden) return null;

  const content = (
    <div
      className={cn(
        'fixed z-50 rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-md',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)'
      }}
      {...props}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
}
