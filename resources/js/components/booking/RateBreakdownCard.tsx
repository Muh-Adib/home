import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, TrendingUp, Info } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface DailyRateBreakdown {
    date: string;
    day_name: string;
    base_rate: number;
    final_rate: number;
    premiums?: Array<{
        type: string;
        name: string;
        description?: string;
        amount: number;
    }>;
    seasonal_rate?: {
        name: string;
        type: string;
        value: number;
    };
}

interface RateBreakdown {
    daily_breakdown?: DailyRateBreakdown[] | Record<string, DailyRateBreakdown>;
    rate_breakdown?: {
        base_rate_per_night?: number;
        weekend_premium_percent?: number;
        peak_season_applied?: boolean;
        long_weekend_applied?: boolean;
    };
    summary?: {
        average_nightly_rate?: number;
        total_nights?: number;
        base_nights_rate?: number;
        total_premiums?: number;
        effective_discount?: number;
        taxes_and_fees?: number;
    };
}

interface RateCalculation {
    breakdown?: RateBreakdown;
    daily_breakdown?: DailyRateBreakdown[] | Record<string, DailyRateBreakdown>;
    nights?: number;
    base_amount?: number;
    total_base_amount?: number;
    total_amount?: number;
    summary?: {
        average_nightly_rate?: number;
        total_nights?: number;
        base_nights_rate?: number;
        total_premiums?: number;
        effective_discount?: number;
        taxes_and_fees?: number;
    };
}

interface RateBreakdownCardProps {
    rateCalculation?: RateCalculation | null;
    checkIn: string;
    checkOut: string;
}

export default function RateBreakdownCard({
    rateCalculation,
    checkIn,
    checkOut,
}: RateBreakdownCardProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Extract daily breakdown from different possible structures
    const getDailyBreakdown = (): DailyRateBreakdown[] => {
        if (!rateCalculation) return [];

        // Check if daily_breakdown exists directly
        if (rateCalculation.daily_breakdown) {
            if (Array.isArray(rateCalculation.daily_breakdown)) {
                return rateCalculation.daily_breakdown;
            } else if (typeof rateCalculation.daily_breakdown === 'object') {
                // Convert object to array
                return Object.values(rateCalculation.daily_breakdown);
            }
        }

        // Check if it's in breakdown.daily_breakdown
        if (rateCalculation.breakdown?.daily_breakdown) {
            if (Array.isArray(rateCalculation.breakdown.daily_breakdown)) {
                return rateCalculation.breakdown.daily_breakdown;
            } else if (typeof rateCalculation.breakdown.daily_breakdown === 'object') {
                return Object.values(rateCalculation.breakdown.daily_breakdown);
            }
        }

        return [];
    };

    const dailyBreakdown = getDailyBreakdown();

    // If no breakdown data, show message
    if (dailyBreakdown.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Rate Breakdown Per Malam
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Info className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                            Data breakdown tarif per malam tidak tersedia untuk booking ini.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Sort by date
    const sortedBreakdown = [...dailyBreakdown].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // IMPORTANT: Use summary from backend if available to ensure consistency
    // Backend calculates these values, so we should use them instead of recalculating
    // This prevents discrepancies due to floating point precision or calculation differences
    const summary = rateCalculation?.summary || rateCalculation?.breakdown?.summary;
    
    // Use backend-calculated values first, fallback to calculation only if not available
    const totalBaseRate = summary?.base_nights_rate ?? 
                         rateCalculation?.total_base_amount ?? 
                         rateCalculation?.base_amount ??
                         sortedBreakdown.reduce((sum, day) => sum + day.base_rate, 0);
    
    // Always use total_amount from backend as it's the source of truth
    const totalFinalRate = rateCalculation?.total_amount ?? 
                          sortedBreakdown.reduce((sum, day) => sum + day.final_rate, 0);
    
    // Use backend-calculated premiums, otherwise calculate from difference
    const totalPremium = summary?.total_premiums ?? 
                         (totalFinalRate - totalBaseRate);
    
    // Use backend-calculated average, otherwise calculate from final rate
    const averageRate = summary?.average_nightly_rate ?? 
                       (sortedBreakdown.length > 0 ? totalFinalRate / sortedBreakdown.length : 0);

    // Get premium badges
    const getPremiumBadges = (day: DailyRateBreakdown) => {
        const badges: React.ReactNode[] = [];

        if (day.seasonal_rate) {
            badges.push(
                <Badge key="seasonal" variant="default" className="bg-blue-100 text-blue-700 text-xs">
                    {day.seasonal_rate.name}
                </Badge>
            );
        }

        if (day.premiums && day.premiums.length > 0) {
            day.premiums.forEach((premium, index) => {
                if (premium.type === 'weekend') {
                    badges.push(
                        <Badge
                            key={`weekend-${index}`}
                            variant="secondary"
                            className="bg-purple-100 text-purple-700 text-xs"
                        >
                            Weekend
                        </Badge>
                    );
                } else if (premium.type === 'holiday') {
                    badges.push(
                        <Badge
                            key={`holiday-${index}`}
                            variant="default"
                            className="bg-orange-100 text-orange-700 text-xs"
                        >
                            Holiday
                        </Badge>
                    );
                } else if (premium.type === 'seasonal') {
                    badges.push(
                        <Badge
                            key={`seasonal-${index}`}
                            variant="default"
                            className="bg-blue-100 text-blue-700 text-xs"
                        >
                            {premium.name}
                        </Badge>
                    );
                }
            });
        }

        return badges;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Rate Breakdown Per Malam
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Rata-rata per Malam
                            </span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(averageRate)}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Total Base Rate
                            </span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(totalBaseRate)}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Total Final Rate
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {formatCurrency(totalFinalRate)}
                        </p>
                    </div>
                </div>

                <Separator />

                {/* Daily Breakdown Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">Tanggal</TableHead>
                                <TableHead>Hari</TableHead>
                                <TableHead className="text-right">Base Rate</TableHead>
                                <TableHead className="text-right">Final Rate</TableHead>
                                <TableHead className="text-right">Premium</TableHead>
                                <TableHead>Keterangan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedBreakdown.map((day, index) => {
                                const premium = day.final_rate - day.base_rate;
                                const isWeekend =
                                    day.day_name.toLowerCase().includes('sat') ||
                                    day.day_name.toLowerCase().includes('sun');

                                return (
                                    <TableRow
                                        key={day.date || index}
                                        className={isWeekend ? 'bg-purple-50/50' : ''}
                                    >
                                        <TableCell className="font-medium">
                                            {formatDate(day.date)}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={
                                                    isWeekend
                                                        ? 'font-semibold text-purple-700'
                                                        : ''
                                                }
                                            >
                                                {day.day_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(day.base_rate)}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(day.final_rate)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {premium > 0 ? (
                                                <span className="text-orange-600 font-medium">
                                                    +{formatCurrency(premium)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {getPremiumBadges(day)}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Total Summary */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Base Rate ({sortedBreakdown.length} malam)</span>
                        <span className="font-semibold">{formatCurrency(totalBaseRate)}</span>
                    </div>
                    {totalPremium > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-orange-600">
                                Total Premium
                            </span>
                            <span className="font-semibold text-orange-600">
                                +{formatCurrency(totalPremium)}
                            </span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Total Final Rate</span>
                        <span className="text-lg font-bold text-primary">
                            {formatCurrency(totalFinalRate)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

