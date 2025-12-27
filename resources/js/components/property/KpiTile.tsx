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
  gradient?: string; // New gradient option
}

export function KpiTile({
  title,
  value,
  trend,
  icon,
  className,
  loading = false,
  gradient
}: KpiTileProps) {
  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return <TrendingUp className="h-3 w-3" />;
    if (trendValue < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (trendValue: number) => {
    if (gradient) {
      // For gradient tiles, use lighter colors
      if (trendValue > 0) return 'text-emerald-200';
      if (trendValue < 0) return 'text-red-200';
      return 'text-white/60';
    }
    if (trendValue > 0) return 'text-green-600';
    if (trendValue < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className={cn(
        "p-4 sm:p-5 rounded-2xl border animate-pulse",
        gradient ? gradient : "bg-card/50",
        className
      )}>
        <div className="space-y-3">
          <div className={`h-4 rounded w-3/4 ${gradient ? "bg-white/20" : "bg-muted"}`}></div>
          <div className={`h-8 rounded w-1/2 ${gradient ? "bg-white/20" : "bg-muted"}`}></div>
          <div className={`h-3 rounded w-1/3 ${gradient ? "bg-white/20" : "bg-muted"}`}></div>
        </div>
      </div>
    );
  }

  // Gradient version (modern design)
  if (gradient) {
    return (
      <div className={cn(
        "relative overflow-hidden p-4 sm:p-5 rounded-2xl",
        gradient,
        className
      )}>
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-white/80 truncate">
              {title}
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tabular-nums">
              {value}
            </p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                getTrendColor(trend.value)
              )}>
                {getTrendIcon(trend.value)}
                <span className="tabular-nums">
                  {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.period}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2 rounded-xl bg-white/20 text-white flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />
      </div>
    );
  }

  // Standard version
  return (
    <div className={cn(
      "p-4 sm:p-5 rounded-2xl border bg-card/50 hover:bg-card/80 transition-colors",
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
