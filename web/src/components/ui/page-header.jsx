import React from 'react';

export function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  action, 
  backButton,
  statusBadge,
  className = ""
}) {
  return (
    <div className={`header-sticky ${className}`}>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {backButton}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">{title}</h1>
                  {description && <p className="text-muted-foreground mt-1">{description}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {statusBadge}
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
