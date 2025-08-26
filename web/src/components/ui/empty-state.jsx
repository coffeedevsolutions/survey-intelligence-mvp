import React from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionText,
  onAction,
  centered = false,
  className = ""
}) {
  const content = (
    <Card className={`empty-state-card max-w-lg ${className}`}>
      <CardContent className="text-center py-16 px-8">
        {Icon && (
          <div className="empty-state-icon">
            <Icon className="w-10 h-10 text-primary" />
          </div>
        )}
        <h3 className="text-2xl font-semibold text-foreground mb-3">{title}</h3>
        <p className="text-muted-foreground mb-8 leading-relaxed">{description}</p>
        {action || (actionText && onAction && (
          <Button size="lg" onClick={onAction} className="shadow-lg hover:shadow-xl transition-all duration-200">
            {actionText}
          </Button>
        ))}
      </CardContent>
    </Card>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {content}
      </div>
    );
  }

  return content;
}
