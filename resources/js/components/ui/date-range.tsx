"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { DateRange as DateRangeType } from 'react-day-picker';
import { format, addDays, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

interface DateRangeProps {
    startDate?: string;
    endDate?: string;
    onDateChange?: (startDate: string, endDate: string) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showNights?: boolean;
    minDate?: string;
    maxDate?: string;
    startLabel?: string;
    endLabel?: string;
    placeholder?: {
        start?: string;
        end?: string;
    };
    showFooter?: boolean;
    disabled?: boolean;
    autoTrigger?: boolean;
    triggerDelay?: number;
    minStayNights?: number;
    minStayWeekday?: number;
    minStayWeekend?: number;
    minStayPeak?: number;
    showMinStayWarning?: boolean;
    bookedDates?: string[];
    loading?: boolean;
    error?: string | null;
    adminMode?: boolean;
    showManualInput?: boolean;
}

export function DateRange({
    startDate = '',
    endDate = '',
    onDateChange,
    className,
    size = 'md',
    showNights = true,
    minDate,
    maxDate,
    startLabel = 'Check-in',
    endLabel = 'Check-out',
    placeholder = {
        start: 'Pilih tanggal masuk',
        end: 'Pilih tanggal keluar'
    },
    showFooter = true,
    disabled = false,
    autoTrigger = false,
    triggerDelay = 500,
    minStayNights = 1,
    minStayWeekday = 1,
    minStayWeekend = 2,
    minStayPeak = 3,
    showMinStayWarning = true,
    bookedDates = [],
    loading = false,
    error = null,
    adminMode = false,
    showManualInput = false,
}: DateRangeProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Hydration fix: only render formatted dates on client
    useEffect(() => {
        setMounted(true);
    }, []);

    const [dateRange, setDateRange] = useState<DateRangeType | undefined>(() => {
        if (startDate && endDate) {
            return {
                from: new Date(startDate),
                to: new Date(endDate)
            };
        }
        return undefined;
    });
    const [warning, setWarning] = useState<string | null>(null);

    // Sync internal state with props
    useEffect(() => {
        if (startDate && endDate) {
            setDateRange({
                from: new Date(startDate),
                to: new Date(endDate)
            });
        }
    }, [startDate, endDate]);

    // Calculate nights between dates
    const calculateNights = (from?: Date, to?: Date): number => {
        if (!from || !to) return 0;
        return Math.max(0, differenceInDays(to, from));
    };

    const nights = calculateNights(dateRange?.from, dateRange?.to);

    // Memo selectedRange agar tidak flicker
    const selectedRange = useMemo(() => {
        if (!dateRange?.from) return undefined;
        if (!dateRange.to) return { from: dateRange.from, to: dateRange.from };
        return dateRange;
    }, [dateRange]);

    // Check if date is booked - dengan logika shifting untuk same-day turnover
    const isDateBooked = useCallback((date: Date): boolean => {
        // Convert bookedDates to array if it's an object (API sometimes returns object with numeric keys)
        const datesArray = Array.isArray(bookedDates)
            ? bookedDates
            : (bookedDates && typeof bookedDates === 'object' ? Object.values(bookedDates) : []);

        if (datesArray.length === 0) return false;

        try {
            const dateStr = format(date, 'yyyy-MM-dd');

            // Debug: log booked dates (hanya sekali)
            if (dateStr === format(new Date(), 'yyyy-MM-dd')) {
                console.log('📅 Booked Dates:', datesArray);
            }

            // Jika sedang di step 2 (selecting checkout), geser booking 1 hari
            // Ini untuk handle same-day turnover
            if (dateRange?.from && !dateRange?.to || dateRange?.to && dateRange?.from && (error || warning)) {
                // Tanggal yang aslinya booked, sekarang dianggap available
                // Tanggal sebelumnya (yang aslinya available) sekarang dianggap booked
                const prevDay = addDays(date, -1);
                const prevDayStr = format(prevDay, 'yyyy-MM-dd');
                return datesArray.includes(prevDayStr);
            }

            // Step 1 atau lainnya, gunakan booking normal
            return datesArray.includes(dateStr);
        } catch (e) {
            console.error('Error checking booked date:', e);
            return false;
        }
    }, [bookedDates, dateRange, error, warning]);

    // Get minimum stay for date
    const getMinimumStayForDate = useCallback((date: Date): number => {
        if (adminMode) return 1;

        const baseMinStay = minStayNights;
        const nextDay = addDays(date, 1);
        const dayAfterNext = addDays(date, 2);

        if (isDateBooked(nextDay)) return 1;
        if (isDateBooked(dayAfterNext) && !isDateBooked(nextDay)) return 1;

        for (let i = 1; i <= baseMinStay; i++) {
            const checkDate = addDays(date, i);
            if (isDateBooked(checkDate)) return 1;
        }

        return baseMinStay;
    }, [minStayNights, adminMode, isDateBooked]);

    // Memo currentMinStay
    const currentMinStay = useMemo(() => {
        if (!dateRange?.from) return minStayNights;
        return getMinimumStayForDate(dateRange.from);
    }, [dateRange?.from, minStayNights, getMinimumStayForDate]);

    const isMinStayViolation = nights > 0 && nights < currentMinStay;

    // Check if range contains booked dates
    const rangeContainsBookedDates = (from: Date, to: Date): boolean => {
        let currentDate = addDays(from, 1);
        const endDate = new Date(to);

        while (currentDate < endDate) {
            if (isDateBooked(currentDate)) return true;
            currentDate = addDays(currentDate, 1);
        }
        return false;
    };

    // Handle date selection
    const handleDateSelect = (range: DateRangeType | undefined) => {
        const hasCompleteRange = dateRange?.from && dateRange?.to;

        // CASE 1: Reset
        if (!range || (!range.from && !range.to)) {
            setDateRange(undefined);
            setWarning(null);
            onDateChange?.("", "");
            return;
        }

        // CASE 2: New start date (when user already has complete range)
        if (hasCompleteRange) {
            if (range.from?.getTime() !== dateRange.from?.getTime()) {
                setDateRange({ from: range.from, to: undefined });
            } else if (range.to?.getTime() !== dateRange.to?.getTime()) {
                setDateRange({ from: range.to, to: undefined });
            }
            setWarning(null);
            return;
        }

        // CASE 3: Start date only (including when from === to, which means single click)
        if (range.from && (!range.to || range.from.getTime() === range.to.getTime())) {
            setDateRange({ from: range.from, to: undefined });
            setWarning(null);
            return;
        }

        // CASE 4: Complete range (from and to are different dates)
        if (range.from && range.to && range.from.getTime() !== range.to.getTime()) {
            validateAndSetCompleteRange(range.from, range.to);
        }
    };

    const validateAndSetCompleteRange = (fromDate: Date, toDate: Date) => {
        const correctedRange = { from: fromDate, to: toDate };

        if (rangeContainsBookedDates(fromDate, toDate)) {
            setWarning('Rentang tanggal mengandung tanggal yang sudah dipesan.');
            setDateRange(undefined);
            onDateChange?.('', '');
            return;
        }

        const nightsVal = differenceInDays(toDate, fromDate);
        const requiredMinStay = getMinimumStayForDate(fromDate);
        if (!adminMode && nightsVal < requiredMinStay) {
            setWarning(`Minimal menginap ${requiredMinStay} malam.`);
            setDateRange(correctedRange);
            return;
        }

        setDateRange(correctedRange);
        setIsOpen(false);
        setWarning(null);

        if (onDateChange) {
            const startStr = format(fromDate, 'yyyy-MM-dd');
            const endStr = format(toDate, 'yyyy-MM-dd');

            if (autoTrigger && triggerDelay) {
                setTimeout(() => onDateChange(startStr, endStr), triggerDelay);
            } else {
                onDateChange(startStr, endStr);
            }
        }
    };

    // Effective limits
    const getEffectiveMinDate = (): Date | undefined => adminMode ? undefined : (minDate ? new Date(minDate) : new Date());
    const getEffectiveMaxDate = (): Date | undefined => adminMode ? addDays(new Date(), 365 * 2) : (maxDate ? new Date(maxDate) : addDays(new Date(), 365));

    // Button sizing
    const getButtonHeight = () => {
        switch (size) {
            case 'sm': return 'h-8 text-xs px-2';
            case 'lg': return 'h-12 text-base px-4';
            default: return 'h-10 text-sm px-3';
        }
    };

    // Disabled dates
    const disabledDates = useMemo(() => {
        const matchers: any[] = [];
        const min = getEffectiveMinDate();
        const max = getEffectiveMaxDate();

        if (min) matchers.push({ before: min });
        if (max) matchers.push({ after: max });

        matchers.push((date: Date) => {
            if (isDateBooked(date)) return true;
            if (adminMode) {
                if (dateRange?.from && !dateRange.to) return date <= dateRange.from;
                return false;
            }
            if (dateRange?.from && !dateRange.to) {
                return date <= dateRange.from || differenceInDays(date, dateRange.from) > 30;
            }
            return false;
        });

        return matchers;
    }, [isDateBooked, dateRange, adminMode, minDate, maxDate]);

    const calendarModifiers: Record<string, any> = {
        booked: isDateBooked,
        today: (date: Date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            return checkDate.getTime() === today.getTime();
        },
    };
    if (dateRange?.from) calendarModifiers.range_start = (d: Date) => d.getTime() === dateRange.from!.getTime();
    if (dateRange?.to) calendarModifiers.range_end = (d: Date) => d.getTime() === dateRange.to!.getTime();
    if (dateRange?.from && dateRange?.to) calendarModifiers.range_middle = (d: Date) =>
        d.getTime() > dateRange.from!.getTime() &&
        d.getTime() < dateRange.to!.getTime();

    return (
        <div className={cn('w-full', className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-between text-left font-normal transition-all duration-200",
                            "border-input hover:border-primary/50 focus:border-primary bg-card",
                            !dateRange && "text-muted-foreground",
                            getButtonHeight(),
                            disabled && "opacity-50 cursor-not-allowed",
                            "min-w-0"
                        )}
                        disabled={disabled}
                    >
                        {(!dateRange?.from || !mounted) ? (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <CalendarIcon className="shrink-0 h-3.5 w-3.5" />
                                <span className="truncate text-left">{mounted ? startLabel : 'Loading...'}</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <CalendarIcon className="shrink-0 h-3.5 w-3.5 text-primary" />
                                    <div className="flex flex-col leading-tight min-w-0 px-2">
                                        <span className="text-[11px] text-muted-foreground leading-none">{startLabel}</span>
                                        <span className="text-sm font-semibold leading-none mt-1 truncate">
                                            {format(dateRange.from, 'd MMM yyyy', { locale: id })}
                                        </span>
                                    </div>

                                    {dateRange.to && (
                                        <>
                                            <div className="h-8 w-px bg-border shrink-0 mx-1" />
                                            <div className="flex flex-col leading-tight min-w-0 px-2">
                                                <span className="text-[11px] text-muted-foreground leading-none">{endLabel}</span>
                                                <span className="text-sm font-semibold leading-none mt-1 truncate">
                                                    {format(dateRange.to, 'd MMM yyyy', { locale: id })}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                    {!dateRange.to && (
                                        <span className="text-xs text-muted-foreground ml-1">→ Pilih check-out</span>
                                    )}
                                </div>

                                {dateRange.to && showNights && nights > 0 && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="h-6 w-px bg-border" />
                                        <Badge
                                            variant={isMinStayViolation ? "destructive" : "secondary"}
                                            className="text-xs px-2 py-0.5"
                                        >
                                            {nights} mlm
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        )}
                        <ChevronDown className={cn("shrink-0 ml-2 h-4 w-4 opacity-50", isOpen && "rotate-180")} />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0 w-auto" align="center">
                    <div className="p-2">
                        {loading && (
                            <div className="flex items-center gap-3 justify-center p-6">
                                <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
                                <span className="text-sm text-muted-foreground">Memuat ketersediaan...</span>
                            </div>
                        )}

                        {!loading && (
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from || new Date()}
                                selected={selectedRange}
                                onSelect={handleDateSelect}
                                disabled={disabledDates}
                                modifiers={calendarModifiers}
                                modifiersClassNames={{
                                    booked: "rdp-day_booked",
                                }}
                                className="rounded-lg border-0"
                                locale={id}
                                fromDate={getEffectiveMinDate()}
                                toDate={getEffectiveMaxDate()}
                            />
                        )}

                        {showFooter && mounted && (
                            <div className="pt-3 border-t space-y-3 text-xs text-muted-foreground">
                                <div>
                                    {!dateRange?.from && <span>Pilih tanggal check-in untuk memulai</span>}
                                    {dateRange?.from && !dateRange?.to && (
                                        <div className="space-y-1">
                                            <span className="text-primary font-medium">Check-in: {format(dateRange.from, 'd MMM yyyy', { locale: id })}</span>
                                            <p className="text-xs">Minimal {currentMinStay} malam dari {format(dateRange.from, 'd MMM', { locale: id })}</p>
                                        </div>
                                    )}
                                    {dateRange?.from && dateRange?.to && !error && !warning && (
                                        <span className="text-green-600 font-medium">✓ {nights} malam terpilih</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default DateRange;