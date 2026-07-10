import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Sun, Sparkles, Bed } from 'lucide-react';
import { RevenueBreakdown } from '@/types/dashboard';

interface RevenueBreakdownCardProps {
    data?: RevenueBreakdown;
}

export function RevenueBreakdownCard({ data }: RevenueBreakdownCardProps) {
    if (!data) {
        return (
            <Card className="h-[350px] sm:h-[400px]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Revenue Breakdown
                    </CardTitle>
                    <CardDescription>This month's revenue by source</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[280px]">
                    <p className="text-sm text-muted-foreground">No data available</p>
                </CardContent>
            </Card>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatShort = (value: number) => {
        if (value >= 1000000000) {
            const val = value / 1000000000;
            return `Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
        }
        if (value >= 1000000) {
            const val = value / 1000000;
            return `Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Jt`;
        }
        if (value >= 1000) {
            const val = value / 1000;
            return `Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Rb`;
        }
        return `Rp ${value.toLocaleString('id-ID')}`;
    };

    const breakdown = [
        {
            label: 'Base Rate',
            value: data.current_month.base_amount,
            percentage: data.percentages.base,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            icon: DollarSign,
        },
        {
            label: 'Weekend',
            value: data.current_month.weekend_premium,
            percentage: data.percentages.weekend,
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
            icon: Calendar,
        },
        {
            label: 'Seasonal',
            value: data.current_month.seasonal_premium,
            percentage: data.percentages.seasonal,
            color: 'bg-amber-500',
            textColor: 'text-amber-600',
            bgColor: 'bg-amber-50',
            icon: Sun,
        },
        {
            label: 'Extra Bed',
            value: data.current_month.extra_bed_amount,
            percentage: data.percentages.extra_bed,
            color: 'bg-purple-500',
            textColor: 'text-purple-600',
            bgColor: 'bg-purple-50',
            icon: Bed,
        },
    ].filter(item => item.value > 0);

    const TrendIcon = data.change >= 0 ? TrendingUp : TrendingDown;
    const trendColor = data.change >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <Card className="h-[350px] sm:h-[400px] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            Revenue Breakdown
                        </CardTitle>
                        <CardDescription>This month's revenue by source</CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className={`${trendColor} border-current text-xs`}
                    >
                        <TrendIcon className="h-3 w-3 mr-1" />
                        {Math.abs(data.change)}%
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-3">
                {/* Total Revenue */}
                <div className="text-center py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                        {formatShort(data.current_month.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {data.current_month.days_count} nights booked
                    </p>
                </div>

                {/* Progress Bar Visualization */}
                <div className="space-y-1">
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                        {breakdown.map((item) => (
                            <div
                                key={item.label}
                                style={{ width: `${item.percentage}%` }}
                                className={`${item.color} transition-all duration-500`}
                                title={`${item.label}: ${item.percentage}%`}
                            />
                        ))}
                    </div>
                </div>

                {/* Breakdown List */}
                <div className="space-y-1.5">
                    {breakdown.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.label}
                                className={`flex items-center justify-between p-2 rounded-lg ${item.bgColor}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`p-1 rounded ${item.color}`}>
                                        <Icon className="h-3 w-3 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                                        {item.label}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs sm:text-sm font-semibold ${item.textColor}`}>
                                        {formatShort(item.value)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {item.percentage}%
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Stats Footer */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                        <p className="text-sm sm:text-lg font-semibold text-gray-700">
                            {data.current_month.weekend_days}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Weekend</p>
                    </div>
                    <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                        <p className="text-sm sm:text-lg font-semibold text-gray-700">
                            {data.current_month.seasonal_days}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Seasonal</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
