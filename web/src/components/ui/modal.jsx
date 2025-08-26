import React, { useEffect } from 'react';
import { Button } from './button';
import { XCircle } from './icons';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children,
  footer,
  className = "",
  closeOnOverlayClick = true
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div className={`modal-content ${className}`}>
        <div className="modal-header">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 pr-4">
              <h2 id="modal-title" className="text-2xl font-semibold text-foreground tracking-tight">
                {title}
              </h2>
              {description && (
                <p id="modal-description" className="text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="rounded-xl w-11 h-11 p-0 hover:bg-muted/50 transition-all duration-200 hover:scale-105 flex-shrink-0"
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
