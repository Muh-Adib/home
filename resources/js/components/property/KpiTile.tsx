import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiTileProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    period: string;
  };
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export function KpiTile({ 
  title, 
  value, 
  trend, 
  icon, 
  className,
  loading = false 
}: KpiTileProps) {
  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return <TrendingUp className="h-3 w-3" />;
    if (trendValue < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return 'text-green-600';
    if (trendValue < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className={cn(
        "p-4 sm:p-6 rounded-lg border bg-card/50 animate-pulse",
        className
      )}>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-3 bg-muted rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 sm:p-6 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors",
      "focus-within:ring-2 focus-within:ring-primary/20",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground tabular-nums">
            {value}
          </p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              getTrendColor(trend.value)
            )}>
              {getTrendIcon(trend.value)}
              <span className="tabular-nums">
                {Math.abs(trend.value)}% {trend.period}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground/60 flex-shrink-0 ml-2">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

