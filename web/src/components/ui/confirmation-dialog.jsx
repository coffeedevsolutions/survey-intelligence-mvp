import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from './icons';
import { Button } from './button';

// Confirmation dialog context
const ConfirmationContext = createContext();

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

// Confirmation provider component
export function ConfirmationProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = ({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'destructive',
    onConfirm,
    onCancel
  }) => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setDialog(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          if (onCancel) onCancel();
          resolve(false);
        }
      });
    });
  };

  const closeDialog = () => {
    if (dialog?.onCancel) {
      dialog.onCancel();
    } else {
      setDialog(null);
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <ConfirmationDialog 
          dialog={dialog} 
          onClose={closeDialog}
        />
      )}
    </ConfirmationContext.Provider>
  );
}

// Confirmation dialog component
function ConfirmationDialog({ dialog, onClose }) {
  const getVariantStyles = () => {
    const variants = {
      destructive: {
        icon: 'text-red-600',
        iconBg: 'bg-red-100',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white border-red-600'
      },
      warning: {
        icon: 'text-amber-600',
        iconBg: 'bg-amber-100', 
        confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
      },
      default: {
        icon: 'text-blue-600',
        iconBg: 'bg-blue-100',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
      }
    };
    return variants[dialog.variant] || variants.default;
  };

  const styles = getVariantStyles();

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full animate-fadeIn border border-gray-200">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {dialog.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {dialog.message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-2">
          <Button
            variant="outline"
            onClick={dialog.onCancel}
            className="flex-1"
          >
            {dialog.cancelText}
          </Button>
          <Button
            onClick={dialog.onConfirm}
            className={`flex-1 ${styles.confirmButton}`}
          >
            {dialog.confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
