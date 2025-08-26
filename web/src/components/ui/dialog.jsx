import React, { createContext, useContext, useState } from 'react';

const DialogContext = createContext();

export const Dialog = ({ children, ...props }) => {
  const [open, setOpen] = useState(false);

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger = ({ asChild, children, ...props }) => {
  const context = useContext(DialogContext);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => context.setOpen(true),
      ...props
    });
  }

  return (
    <button onClick={() => context.setOpen(true)} {...props}>
      {children}
    </button>
  );
};

export const DialogContent = ({ className = '', children, ...props }) => {
  const context = useContext(DialogContext);

  if (!context.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => context.setOpen(false)}
      />
      
      {/* Content */}
      <div
        className={`
          relative z-50 grid w-full gap-4 border bg-white p-6 shadow-lg 
          duration-200 sm:rounded-lg sm:max-w-lg
          ${className}
        `}
        {...props}
      >
        {children}
        
        {/* Close button */}
        <button
          onClick={() => context.setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2"
        >
          <span className="sr-only">Close</span>
          ✕
        </button>
      </div>
    </div>
  );
};

export const DialogHeader = ({ className = '', children, ...props }) => {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`} {...props}>
      {children}
    </div>
  );
};

export const DialogTitle = ({ className = '', children, ...props }) => {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h2>
  );
};

export const DialogDescription = ({ className = '', children, ...props }) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};
