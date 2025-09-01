import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, ChevronRight } from './icons';

const DropdownMenuContext = createContext();

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

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
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
    <DropdownMenuContext.Provider value={{ closeDropdown: () => setIsOpen(false) }}>
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
    </DropdownMenuContext.Provider>
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
  // Fallback position if not provided
  const safePosition = position || { top: 0, left: 0, right: 'auto' };
  
  const content = (
    <div 
      ref={ref}
      className="fixed min-w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-hidden animate-fadeIn"
      style={{ 
        top: safePosition.top,
        left: safePosition.left,
        right: safePosition.right,
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
  const context = useContext(DropdownMenuContext);
  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-50',
    destructive: 'text-red-600 hover:bg-red-50'
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (onClick) {
      // Execute the onClick function
      try {
        const result = onClick(event);
        
        // If it returns a promise, handle it
        if (result && typeof result.then === 'function') {
          result.catch((error) => console.error('Error in async onClick:', error));
        }
      } catch (error) {
        console.error('Error in dropdown menu item click:', error);
      }
    }
    
    // Close the dropdown after the action starts
    if (context?.closeDropdown) {
      // Small delay to ensure download starts before menu closes
      setTimeout(() => {
        context.closeDropdown();
      }, 100);
    }
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onClick={handleClick}
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

export function DropdownMenuSubmenu({ trigger, children }) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const submenuTriggerRef = useRef(null);
  const submenuRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (submenuRef.current && !submenuRef.current.contains(event.target) &&
          submenuTriggerRef.current && !submenuTriggerRef.current.contains(event.target)) {
        setIsSubmenuOpen(false);
      }
    }

    if (isSubmenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isSubmenuOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    
    if (submenuTriggerRef.current) {
      const rect = submenuTriggerRef.current.getBoundingClientRect();
      const submenuWidth = 160; // Approximate submenu width
      const viewportWidth = window.innerWidth;
      
      // Check if submenu would go off screen to the right
      const wouldOverflow = rect.right + submenuWidth + 2 > viewportWidth;
      
      setSubmenuPosition({
        top: rect.top + window.scrollY,
        left: wouldOverflow ? rect.left + window.scrollX - submenuWidth + 1 : rect.right + window.scrollX - 1
      });
    }
    setIsSubmenuOpen(true);
  };

  const handleMouseLeave = (event) => {
    // Check if we're moving to the submenu itself
    const submenuElement = submenuRef.current;
    if (submenuElement && submenuElement.contains(event.relatedTarget)) {
      return;
    }
    
    // Set a timeout to close the submenu
    closeTimeoutRef.current = setTimeout(() => {
      setIsSubmenuOpen(false);
    }, 200);
  };

  return (
    <div className="relative">
      <div
        ref={submenuTriggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          {trigger}
        </div>
        <ChevronRight className="w-4 h-4" />
      </div>
      
      {isSubmenuOpen && createPortal(
        <div
          ref={submenuRef}
          onMouseEnter={() => {
            // Clear any pending close timeout
            if (closeTimeoutRef.current) {
              clearTimeout(closeTimeoutRef.current);
              closeTimeoutRef.current = null;
            }
            setIsSubmenuOpen(true);
          }}
          onMouseLeave={(event) => {
            // Don't close immediately if moving back to trigger
            const triggerElement = submenuTriggerRef.current;
            if (triggerElement && triggerElement.contains(event.relatedTarget)) {
              return;
            }
            // Set a timeout to close the submenu
            closeTimeoutRef.current = setTimeout(() => {
              setIsSubmenuOpen(false);
            }, 200);
          }}
          className="fixed min-w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-[10000] overflow-hidden"
          style={{
            top: submenuPosition.top,
            left: submenuPosition.left,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}
