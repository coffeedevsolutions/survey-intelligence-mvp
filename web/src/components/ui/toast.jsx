import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, X } from './icons';

// Toast context
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast provider component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { 
      id, 
      ...toast, 
      duration: toast.duration || (toast.type === 'error' ? 6000 : 4000) 
    };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => addToast({ type: 'error', message, ...options }),
    warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => addToast({ type: 'info', message, ...options })
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast container that renders toasts
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] space-y-3">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={() => onRemove(toast.id)} 
        />
      ))}
    </div>,
    document.body
  );
}

// Individual toast item
function ToastItem({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(), 200);
  };

  const getToastStyles = () => {
    const baseStyles = "flex items-center gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-200 max-w-md";
    
    const typeStyles = {
      success: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800",
      error: "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800", 
      warning: "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-800",
      info: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800"
    };

    const animationStyles = isLeaving 
      ? "opacity-0 translate-x-full scale-95" 
      : isVisible 
        ? "opacity-100 translate-x-0 scale-100" 
        : "opacity-0 translate-x-full scale-95";

    return `${baseStyles} ${typeStyles[toast.type]} ${animationStyles}`;
  };

  const getIcon = () => {
    const iconStyles = "w-5 h-5 flex-shrink-0";
    
    switch (toast.type) {
      case 'success':
        return <CheckCircle className={`${iconStyles} text-green-600`} />;
      case 'error':
        return <XCircle className={`${iconStyles} text-red-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconStyles} text-amber-600`} />;
      default:
        return <CheckCircle className={`${iconStyles} text-blue-600`} />;
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="font-semibold text-sm mb-1">
            {toast.title}
          </div>
        )}
        <div className="text-sm leading-relaxed">
          {toast.message}
        </div>
      </div>

      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}
