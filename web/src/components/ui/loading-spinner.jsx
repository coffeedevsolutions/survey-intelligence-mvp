import React from 'react';

export function LoadingSpinner({ className = "", children }) {
  return (
    <div className={`text-center space-y-4 ${className}`}>
      <div className="spinner"></div>
      {children && <p className="text-muted-foreground">{children}</p>}
    </div>
  );
}
