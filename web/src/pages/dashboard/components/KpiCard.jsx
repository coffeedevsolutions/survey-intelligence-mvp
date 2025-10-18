import React, { useState, useRef, useEffect } from 'react';
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
  const [showIcon, setShowIcon] = useState(true);
  const contentRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current && iconRef.current) {
        const content = contentRef.current;
        const icon = iconRef.current;
        
        // Temporarily hide icon to measure content width
        icon.style.display = 'none';
        const contentWidthWithoutIcon = content.scrollWidth;
        
        // Show icon and measure total width
        icon.style.display = 'block';
        const totalWidth = content.scrollWidth;
        
        // If content would overflow, hide the icon
        const shouldHideIcon = contentWidthWithoutIcon > content.clientWidth;
        setShowIcon(!shouldHideIcon);
      }
    };

    // Check on mount and resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    // Use ResizeObserver for more precise detection
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener('resize', checkOverflow);
      resizeObserver.disconnect();
    };
  }, [title, value, trendLabel]);

  return (
    <div className={cn(
      "rounded-lg border p-4 lg:p-6 min-h-[120px] flex flex-col",
      variant === "gradient" 
        ? "bg-gradient-to-br from-[#6E00FF] to-[#00D1FF] text-white border-0" 
        : "bg-card text-card-foreground"
    )}>
      <div ref={contentRef} className="flex items-start justify-between flex-1">
        <div className="space-y-1 min-w-0 flex-1">
          <p className={cn(
            "text-xs lg:text-sm font-medium",
            variant === "gradient" ? "text-white/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-xl lg:text-2xl font-bold",
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
        <div 
          ref={iconRef}
          className={cn(
            "p-2 rounded-lg flex-shrink-0 ml-2 transition-opacity duration-200",
            variant === "gradient" 
              ? "bg-white/20" 
              : "bg-muted",
            !showIcon && "opacity-0 pointer-events-none"
          )}
          style={{ display: showIcon ? 'block' : 'none' }}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
