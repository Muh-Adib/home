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
    extra_bed_rate?: number;
    extra_bed_count?: number;
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
    extra_bed_amount?: number;
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
    discountAmount?: number;
    services?: any[];
}

export default function RateBreakdownCard({
    rateCalculation,
    checkIn,
    checkOut,
    discountAmount = 0,
    services = [],
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

    const totalServices = services ? services.reduce((sum, s) => sum + Number(s.total_price || 0), 0) : 0;

    // Use backend-calculated values first, fallback to calculation only if not available
    const totalBaseRate = summary?.base_nights_rate ??
        rateCalculation?.total_base_amount ??
        rateCalculation?.base_amount ??
        sortedBreakdown.reduce((sum, day) => sum + day.base_rate, 0);

    const totalExtraBed = rateCalculation?.extra_bed_amount ??
        sortedBreakdown.reduce((sum, day) => sum + (day.extra_bed_count || 0) * (day.extra_bed_rate || 0), 0);

    // Sum of room rate & extra bed rate (backend source of truth)
    const totalRoomAndBed = rateCalculation?.total_amount ??
        (sortedBreakdown.reduce((sum, day) => sum + day.final_rate, 0) + totalExtraBed);

    // Total final rate should be room + beds + services
    const totalFinalRateRaw = totalRoomAndBed + totalServices;

    const totalFinalRate = Math.max(0, totalFinalRateRaw - discountAmount);

    // Use backend-calculated premiums, otherwise calculate from difference
    const totalPremium = summary?.total_premiums ??
        (sortedBreakdown.reduce((sum, day) => sum + day.final_rate, 0) - totalBaseRate);

    // Use backend-calculated average, otherwise calculate from final rate
    const averageRate = summary?.average_nightly_rate ??
        (sortedBreakdown.length > 0 ? totalRoomAndBed / sortedBreakdown.length : 0);

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

    const getServicesOnDate = (dateStr: string) => {
        const normalized = dateStr.split(' ')[0].split('T')[0];
        return services.filter(s => s.service_date && s.service_date.split(' ')[0].split('T')[0] === normalized);
    };

    return (
        <Card className='gap-0 overflow-y-hidden'>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Rate Breakdown Per Malam
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-6">
                {/* Summary Cards 
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                    <div className="p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                Rata-rata per Malam
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold">{formatCurrency(averageRate)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                Total Base Rate
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalBaseRate)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                Total Final Rate
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-primary">
                            {formatCurrency(totalFinalRate)}
                        </p>
                    </div>
                </div>*/}

                <Separator />

                {/* Daily Breakdown Table */}
                <div className="rounded-md border overflow-x-auto overflow-y-hidden max-w-full">
                    <Table className="overflow-y-hidden">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-1.5 px-2 text-xs">Tanggal</TableHead>
                                <TableHead className="py-1.5 px-2 text-right text-xs">Tarif Kamar</TableHead>
                               {/*} <TableHead className="py-1.5 px-2 text-right text-xs">Premium</TableHead>*/}
                                <TableHead className="py-1.5 px-2 text-right text-xs">Extra Bed</TableHead>
                                <TableHead className="py-1.5 px-2 text-right text-xs">Layanan Tambahan</TableHead>
                                <TableHead className="py-1.5 px-2 text-xs">Keterangan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedBreakdown.map((day, index) => {
                                const premium = day.final_rate - day.base_rate;
                                const isWeekend =
                                    day.day_name.toLowerCase().includes('sat') ||
                                    day.day_name.toLowerCase().includes('sun');

                                const servicesOnDate = getServicesOnDate(day.date);
                                const servicesTotalOnDate = servicesOnDate.reduce((sum, s) => sum + Number(s.total_price || 0), 0);

                                return (
                                    <TableRow
                                        key={day.date || index}
                                        className={isWeekend ? 'bg-purple-50/20' : ''}
                                    >
                                        <TableCell className="py-1.5 px-2 text-xs font-medium">
                                            {formatDate(day.date)}
                                        </TableCell>
                                        <TableCell className="py-1.5 px-2 text-right text-xs font-semibold">
                                            {formatCurrency(day.final_rate)}
                                        </TableCell>
                                        {/*<TableCell className="py-1.5 px-2 text-right text-xs">
                                            {premium > 0 ? (
                                                <span className="text-orange-600 font-medium">
                                                    +{formatCurrency(premium)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-[10px]">-</span>
                                            )}
                                        </TableCell>*/}
                                        <TableCell className="py-1.5 px-2 text-right text-xs">
                                            {day.extra_bed_count && day.extra_bed_count > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium text-slate-800 text-xs">
                                                        {formatCurrency(day.extra_bed_count * (day.extra_bed_rate || 0))}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                                        {day.extra_bed_count} x {formatCurrency(day.extra_bed_rate || 0)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-[10px]">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-1.5 px-2 text-right text-xs">
                                            {servicesTotalOnDate > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-semibold text-blue-600 text-xs">
                                                        +{formatCurrency(servicesTotalOnDate)}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                                        {servicesOnDate.map(s => `${s.service_name || s.name} (x${s.quantity})`).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-[10px]">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-1.5 px-2 text-xs">
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
                    {totalExtraBed > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">
                                Total Extra Bed
                            </span>
                            <span className="font-semibold text-slate-800">
                                +{formatCurrency(totalExtraBed)}
                            </span>
                        </div>
                    )}
                    {discountAmount > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-rose-600">
                                Diskon
                            </span>
                            <span className="font-semibold text-rose-600">
                                -{formatCurrency(discountAmount)}
                            </span>
                        </div>
                    )}
                    {services && services.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Layanan Tambahan</span>
                            {services.map((service, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">
                                        {service.service_name || service.name} (x{service.quantity})
                                        {service.service_date && ` - ${new Date(service.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                                    </span>
                                    <span className="font-semibold text-slate-700">
                                        +{formatCurrency(Number(service.total_price))}
                                    </span>
                                </div>
                            ))}
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

