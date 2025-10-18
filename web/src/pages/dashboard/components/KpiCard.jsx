import React from 'react';
import { cn } from '../../../components/ui/utils';

export function KpiCard({ 
  title, 
  value, 
  trend, 
  trendLabel, 
  icon, 
  variant = "default" 
}) {
  const isPositiveTrend = trend > 0;
  const isNegativeTrend = trend < 0;
  
  return (
    <div className={cn(
      "rounded-lg border p-6",
      variant === "gradient" 
        ? "bg-gradient-to-br from-[#6E00FF] to-[#00D1FF] text-white border-0" 
        : "bg-card text-card-foreground"
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            variant === "gradient" ? "text-white/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-2xl font-bold",
            variant === "gradient" ? "text-white" : "text-foreground"
          )}>
            {value}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-xs font-medium",
                isPositiveTrend ? "text-green-600" : isNegativeTrend ? "text-red-600" : "text-muted-foreground",
                variant === "gradient" ? "text-white/80" : ""
              )}>
                {isPositiveTrend ? "+" : ""}{trend}%
              </span>
              <span className={cn(
                "text-xs",
                variant === "gradient" ? "text-white/60" : "text-muted-foreground"
              )}>
                {trendLabel}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-2 rounded-lg",
          variant === "gradient" 
            ? "bg-white/20" 
            : "bg-muted"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
