import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from './icons';

/**
 * Modern Dropdown Menu Component
 */
export function DropdownMenu({ children, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, right: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: align === 'left' ? rect.left + window.scrollX : undefined,
        right: align === 'right' ? window.innerWidth - rect.right - window.scrollX : undefined
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <DropdownMenuTrigger ref={triggerRef} onClick={handleToggle} />
      {isOpen && (
        <DropdownMenuContent 
          ref={dropdownRef}
          align={align} 
          position={position}
        >
          {children}
        </DropdownMenuContent>
      )}
    </div>
  );
}

export const DropdownMenuTrigger = React.forwardRef(({ onClick }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <MoreHorizontal className="w-4 h-4 text-gray-500" />
    </button>
  );
});

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export const DropdownMenuContent = React.forwardRef(({ children, position }, ref) => {
  const content = (
    <div 
      ref={ref}
      className="fixed min-w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-hidden animate-fadeIn"
      style={{ 
        top: position.top,
        left: position.left,
        right: position.right,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
      }}
    >
      {children}
    </div>
  );

  // Render to portal to avoid any container clipping
  return createPortal(content, document.body);
});

DropdownMenuContent.displayName = 'DropdownMenuContent';

export function DropdownMenuItem({ children, onClick, variant = 'default' }) {
  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-50',
    destructive: 'text-red-600 hover:bg-red-50'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium border-none bg-transparent cursor-pointer transition-colors duration-150 text-left ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return (
    <div className="h-px bg-gray-200 my-1" />
  );
}
