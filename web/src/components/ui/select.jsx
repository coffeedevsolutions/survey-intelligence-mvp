import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './utils';

const SelectContext = React.createContext();

export function Select({ defaultValue, value, onValueChange, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue || value);
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (contentRef.current && !contentRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSelect = (value) => {
    setSelectedValue(value);
    setIsOpen(false);
    if (onValueChange) {
      onValueChange(value);
    }
  };

  const contextValue = {
    isOpen,
    setIsOpen,
    selectedValue,
    handleSelect,
    triggerRef,
    contentRef
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const { isOpen, setIsOpen, selectedValue, triggerRef } = React.useContext(SelectContext);

  return (
    <button
      ref={triggerRef}
      className={cn(
        "flex h-10 w-full min-w-auto items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children || <span>{selectedValue}</span>}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const { selectedValue } = React.useContext(SelectContext);
  return <span>{selectedValue || placeholder}</span>;
}

export function SelectContent({ className, children, ...props }) {
  const { isOpen, contentRef, triggerRef } = React.useContext(SelectContext);
  const [contentWidth, setContentWidth] = React.useState('auto');

  React.useEffect(() => {
    if (isOpen && contentRef.current) {
      // Calculate the width needed for the content
      const content = contentRef.current;
      const triggerWidth = triggerRef.current?.offsetWidth || 0;
      
      // Temporarily set width to auto to measure content
      content.style.width = 'auto';
      content.style.minWidth = 'max-content';
      
      // Get the natural width of the content
      const contentWidth = content.scrollWidth;
      
      // Use the larger of trigger width or content width, with a minimum
      const finalWidth = Math.max(triggerWidth, contentWidth, 200);
      setContentWidth(`${finalWidth}px`);
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      style={{ width: contentWidth }}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className, ...props }) {
  const { handleSelect } = React.useContext(SelectContext);

  return (
    <div
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={() => handleSelect(value)}
      {...props}
    >
      {children}
    </div>
  );
}