import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Settings, BarChart3, ExternalLink } from './icons';

export function CampaignCard({ campaign, onClick }) {
  const statusClasses = campaign.is_active 
    ? 'campaign-status-indicator campaign-status-active' 
    : 'campaign-status-indicator campaign-status-inactive';

  return (
    <Card className="campaign-card" onClick={onClick}>
      <CardHeader className="pb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className={statusClasses}></div>
              <Badge variant={campaign.is_active ? "default" : "secondary"} className="text-xs px-3 py-1">
                {campaign.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <CardTitle className="text-xl font-semibold text-foreground truncate mb-2 group-hover:text-primary transition-colors">
              {campaign.name}
            </CardTitle>
            <CardDescription className="text-muted-foreground leading-relaxed line-clamp-2">
              {campaign.purpose}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="campaign-stat-card">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-primary" />
              <span className="text-lg font-semibold text-foreground">{campaign.flow_count || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Flows</p>
          </div>
          <div className="campaign-stat-card">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-lg font-semibold text-foreground">{campaign.response_count || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Responses</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="campaign-avatar">
              <span className="text-[10px] font-medium text-primary">
                {campaign.created_by_email?.[0]?.toUpperCase()}
              </span>
            </div>
            <span>Created by {campaign.created_by_email}</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
