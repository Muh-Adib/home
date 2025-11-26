"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, ChevronDown, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange as DateRangeType } from 'react-day-picker';
import { format, addDays, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

// Custom CSS for range selection styling
// Hapus customCalendarStyles dan <style>

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
    disabled?: boolean;
    autoTrigger?: boolean;
    triggerDelay?: number;
    minStayNights?: number;
    minStayWeekday?: number;
    minStayWeekend?: number;
    minStayPeak?: number;
    showMinStayWarning?: boolean;
    // Data availability yang diterima dari parent component
    bookedDates?: string[];
    loading?: boolean;
    error?: string | null;
    // compact prop removed - always compact mode
    // Admin mode props
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
    // compact always true
    adminMode = false,
    showManualInput = false,
}: DateRangeProps) {
    const [isOpen, setIsOpen] = useState(false);
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


    // Hapus hoveredDate state dan logika terkait



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

    // Check if date is booked dengan logika bergeser untuk step 2
    const isDateBooked = useMemo(() => {
        return (date: Date): boolean => {
            const dateStr = format(date, 'yyyy-MM-dd');

            // Jika sedang di step 2 (selecting checkout), geser booking 1 hari
            if (dateRange?.from && !dateRange?.to || dateRange?.to && dateRange?.from && (error || warning)) {
                // Tanggal yang aslinya booked, sekarang dianggap available
                // Tanggal sebelumnya (yang aslinya available) sekarang dianggap booked
                const prevDay = addDays(date, -1);
                const prevDayStr = format(prevDay, 'yyyy-MM-dd');
                return bookedDates.includes(prevDayStr);
            }

            // Step 1 atau lainnya, gunakan booking normal
            return bookedDates.includes(dateStr);
        };
    }, [bookedDates, dateRange, error, warning]);

    // Get minimum stay for date dengan logika tambahan untuk tanggal yang terjepit
    // Gunakan minStayNights sebagai base (sudah dihitung dengan seasonal rate dari parent)
    // Hanya adjust jika ada booked dates yang membatasi
    const getMinimumStayForDate = useMemo(() => {
        return (date: Date): number => {
            // Admin mode: no minimum stay restrictions
            if (adminMode) {
                return 1; // Admin can book even 1 night
            }

            // Gunakan minStayNights yang sudah dihitung dari parent (dengan seasonal rate)
            // Hook use-property-minimum-stay sudah menghitung minimum stay dengan mempertimbangkan seasonal rate
            // Jadi kita hanya perlu adjust jika ada booked dates yang membatasi
            const baseMinStay = minStayNights;

            // Cek apakah ada booking setelah tanggal check-in yang membatasi
            const nextDay = addDays(date, 1);
            const dayAfterNext = addDays(date, 2);

            // Jika hari berikutnya sudah booked, allow 1 night only
            if (isDateBooked(nextDay)) {
                return 1;
            }

            // Jika 2 hari setelahnya booked tapi besok masih free, allow 1 night
            if (isDateBooked(dayAfterNext) && !isDateBooked(nextDay)) {
                return 1;
            }

            // Jika ada booking dalam rentang base minimum stay, allow 1 night
            for (let i = 1; i <= baseMinStay; i++) {
                const checkDate = addDays(date, i);
                if (isDateBooked(checkDate)) {
                    return 1;
                }
            }

            // Return base minimum stay (sudah include seasonal rate calculation dari hook)
            return baseMinStay;
        };
    }, [minStayNights, adminMode, isDateBooked]);

    // Memo currentMinStay - gunakan minStayNights sebagai base (sudah include seasonal rate dari hook)
    // Hanya adjust jika ada booked dates yang membatasi
    const currentMinStay = useMemo(() => {
        if (!dateRange?.from) {
            return minStayNights;
        }
        // Gunakan getMinimumStayForDate yang akan menggunakan minStayNights sebagai base
        // dan hanya adjust jika ada booked dates yang membatasi
        return getMinimumStayForDate(dateRange.from);
    }, [dateRange?.from, minStayNights, getMinimumStayForDate]);

    const isMinStayViolation = nights > 0 && nights < currentMinStay;



    // Check if range contains booked dates (exclusive of start and end dates)
    const rangeContainsBookedDates = (from: Date, to: Date): boolean => {
        let currentDate = addDays(from, 1); // Start from day after check-in
        const endDate = new Date(to);

        while (currentDate < endDate) {
            if (isDateBooked(currentDate)) {
                return true;
            }
            currentDate = addDays(currentDate, 1);
        }
        return false;
    };

    // Handle date selection
    const handleDateSelect = (range: DateRangeType | undefined) => {
        const hasCompleteRange = dateRange?.from && dateRange?.to;

    // CASE 1: Reset jika kosong
    if (!range || (!range.from && !range.to)) {
        setDateRange(undefined);

        setWarning(null);
        onDateChange?.("", "");
        return;
    }

    // CASE 2: User SUDAH memilih range lengkap → klik tanggal baru
    if (hasCompleteRange) {
        console.log("🔄 Resetting and setting new start date");
        if (range.from?.getTime() !== dateRange.from?.getTime()) {
            // Set CLICK sebagai start baru
            setDateRange({
                from: range.from,
                to: undefined
            });
        }
        if (range.to?.getTime() !== dateRange.to?.getTime()) {
            // Set CLICK sebagai start baru
            setDateRange({
                from: range.to,
                to: undefined
            });
        }

        setWarning(null);
        return;
    }

    // CASE 3: User memilih tanggal pertama (start)
    if (range.from && !range.to) {
        console.log("🔄 Start date chosen");
        setDateRange({ from: range.from, to: undefined });
        setWarning(null);
        return;
    }

    // CASE 4: User memilih end-date → complete range
    if (range.from && range.to) {
        console.log("🔄 Complete range chosen");
        return validateAndSetCompleteRange(range.from, range.to);
    }

        // Fungsi helper untuk validasi dan set range lengkap
        function validateAndSetCompleteRange(fromDate: Date, toDate: Date) {
            console.log('🔄 Validating complete range:', fromDate, 'to', toDate);

            const correctedRange = { from: fromDate, to: toDate };
            // Tetapkan jumlah malam

            // Validasi: cek apakah range mengandung tanggal yang sudah dipesan
            if (typeof rangeContainsBookedDates === 'function' && rangeContainsBookedDates(fromDate, toDate)) {
                setWarning('Rentang tanggal yang dipilih mengandung tanggal yang sudah dipesan. Silakan pilih rentang tanggal lain.');
                setDateRange(undefined);
                if (onDateChange) {
                    onDateChange('', '');
                }
                return;
            }

            // Validasi minimum stay (skip untuk admin mode)
            if (!adminMode && typeof differenceInDays === 'function' && typeof getMinimumStayForDate === 'function') {
                const nights = differenceInDays(toDate, fromDate);
                const requiredMinStay = getMinimumStayForDate(fromDate);

                if (nights < requiredMinStay) {
                    setWarning(`Untuk tanggal yang dipilih, minimal menginap ${requiredMinStay} malam. Silakan sesuaikan tanggal check-out.`);
                    setDateRange(correctedRange);
                    return;
                }
            }

            // Validasi berhasil - simpan range lengkap dan tutup kalender
            console.log('🔄 Range validation passed, setting final range');
            setDateRange(correctedRange);

            // Tutup kalender hanya setelah range lengkap dan valid
            if (typeof setIsOpen === 'function') {
                setIsOpen(false);
            }

            setWarning(null);

            // Panggil onDateChange dengan range lengkap
            if (onDateChange) {
                const startStr = fromDate.toLocaleDateString('en-CA');
                const endStr = toDate.toLocaleDateString('en-CA');

                console.log('🔄 Calling onDateChange with:', startStr, endStr);

                if (autoTrigger && typeof triggerDelay !== 'undefined') {
                    setTimeout(() => {
                        console.log('🔄 Delayed onDateChange execution');
                        onDateChange(startStr, endStr);
                    }, triggerDelay);
                } else {
                    onDateChange(startStr, endStr);
                }
            }
        }
    };


    // Admin mode: override min date restrictions
    const getEffectiveMinDate = (): Date | undefined => {
        if (adminMode) {
            // Admin can select any date, including past dates
            return undefined;
        }
        return minDate ? new Date(minDate) : new Date();
    };

    const getEffectiveMaxDate = (): Date | undefined => {
        if (adminMode) {
            // Admin can select dates far in the future
            return addDays(new Date(), 365 * 2); // 2 years ahead
        }
        return maxDate ? new Date(maxDate) : addDays(new Date(), 365); // 1 year ahead
    };

    // Format display text
    const formatDisplayText = () => {
        if (!dateRange?.from) {
            return startLabel;
        }

        if (dateRange.from && dateRange.to) {
            // Compact format: d MMM - d MMM
            const startFormat = format(dateRange.from, 'd MMM', { locale: id });
            const endFormat = format(dateRange.to, 'd MMM yyyy', { locale: id });
            return `${startFormat} - ${endFormat}`;
        }

        // Hanya start date yang dipilih, tampilkan dengan indikator bahwa user masih memilih
        const fromFormat = format(dateRange.from, 'd MMM', { locale: id });
        return `${fromFormat} → ?`;
    };


    // Button sizing
    const getButtonHeight = () => {
        switch (size) {
            case 'sm': return 'h-8 text-xs px-2';
            case 'lg': return 'h-12 text-base px-4';
            default: return 'h-10 text-sm px-3';
        }
    };

    // Memo disabledDates
    const minimumDate = adminMode ? undefined : (minDate ? new Date(minDate) : new Date());
    const maximumDate = adminMode ? addDays(new Date(), 365 * 2) : (maxDate ? new Date(maxDate) : addDays(new Date(), 60));
    const disabledDates = useMemo(() => {
        const matchers: any[] = [];

        // Add date range restrictions
        if (!adminMode && minimumDate) {
            matchers.push({ before: minimumDate });
        }

        if (!adminMode && maximumDate) {
            matchers.push({ after: maximumDate });
        }

        // Add custom disabled logic
        matchers.push((date: Date) => {
            if (isDateBooked(date)) return true;

            // No range restrictions in admin mode
            if (adminMode) {
                if (!dateRange?.from || dateRange.to) return false;
                return date <= dateRange.from;
            }

            // Normal mode: apply range restrictions
            if (!dateRange?.from || dateRange.to) return false;
            return date <= dateRange.from || differenceInDays(date, dateRange.from) > 30;
        });

        return matchers;
    }, [minimumDate, maximumDate, isDateBooked, dateRange, adminMode]);

    const calendarModifiers: Record<string, any> = {
        booked: isDateBooked,
    };
    if (dateRange?.from) calendarModifiers.rangeStart = (d: Date) => d.getTime() === dateRange.from!.getTime();
    if (dateRange?.to) calendarModifiers.rangeEnd = (d: Date) => d.getTime() === dateRange.to!.getTime();


    return (
        <div className={cn('w-full', className)}>
            {/* Hapus <style> bawaan */}
            <Popover
                open={isOpen}
                onOpenChange={(open) => {
                    // Jangan paksa tutup jika user sedang dalam proses memilih
                    if (!open && dateRange?.from && !dateRange?.to) {
                        // Biarkan popover tertutup tapi pertahankan partial selection
                        setIsOpen(false);
                        return;
                    }
                    setIsOpen(open);
                }}
            >
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
                        <div className={cn(
                            "flex items-center gap-1 min-w-0 flex-1"
                        )}>
                            <CalendarIcon className={cn(
                                "shrink-0",
                                "h-3 w-3"
                            )} />
                            <span className="truncate text-left">
                                {formatDisplayText()}
                            </span>
                            {showNights && nights > 0 && (
                                <Badge
                                    variant={isMinStayViolation ? "destructive" : "secondary"}
                                    className={cn(
                                        "ml-auto shrink-0",
                                        "text-xs px-1"
                                    )}
                                >
                                    {nights} mlm
                                </Badge>
                            )}
                        </div>
                        <ChevronDown className={cn(
                            "shrink-0 opacity-50 transition-transform duration-200",
                            "h-3 w-3",
                            isOpen && "rotate-180"
                        )} />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="p-0 w-auto !max-w-none rounded-xl shadow-lg border bg-card"
                    align="start"
                    side="bottom"
                    sideOffset={8}
                >
                    <div className="p-4 space-y-4">

                        {/* Loading */}
                        {loading && (
                            <div className="flex items-center gap-3 justify-center p-6">
                                <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
                                <span className="text-sm text-muted-foreground">Memuat ketersediaan...</span>
                            </div>
                        )}

                        {/* Calendar */}
                        {!loading && (
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from || new Date()}
                                selected={selectedRange}
                                onSelect={handleDateSelect}
                                disabled={disabledDates}
                                modifiers={calendarModifiers}
                                modifiersStyles={{
                                    selected: {
                                        backgroundColor: 'hsl(var(--brand-accent))',
                                        color: 'hsl(var(--brand-accent-foreground))',
                                        fontWeight: 600,
                                    },
                                    booked: {
                                        backgroundColor: 'hsl(var(--destructive))',
                                        color: 'hsl(var(--destructive-foreground))',
                                        textDecoration: 'line-through',
                                    },
                                    rangeStart: {
                                        backgroundColor: 'hsl(var(--primary))',
                                        color: 'hsl(var(--primary-foreground))',
                                        fontWeight: 600,
                                    },
                                    rangeEnd: {
                                        backgroundColor: 'hsl(var(--primary))',
                                        color: 'hsl(var(--primary-foreground))',
                                        fontWeight: 600,
                                    },
                                }}
                                className="rounded-lg border-0"
                                locale={id}
                                fromDate={getEffectiveMinDate()}
                                toDate={getEffectiveMaxDate()}
                            />
                        )}

                        {/* Footer info */}
                        <div className="pt-3 border-t space-y-3 text-xs text-muted-foreground">

                            <div>
                                {!dateRange?.from && <span>Pilih tanggal check-in untuk memulai</span>}

                                {dateRange?.from && !dateRange?.to && (
                                    <div className="space-y-1">
                                        <span className="text-primary font-medium">
                                            Check-in: {format(dateRange.from, 'd MMM yyyy', { locale: id })}
                                        </span>
                                        <p className="text-xs">`Minimal {currentMinStay} malam dari {format(dateRange.from, 'd MMM', { locale: id })}`</p>
                                    </div>
                                )}

                                {dateRange?.from && dateRange?.to && !error && !warning && (
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                        ✓ {nights} malam terpilih, pilih tanggal awal atau reset
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="pt-2 border-t text-xs flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-destructive"></div>
                                <span>Dipesan</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-brand-accent border"></div>
                                <span>Dipilih</span>
                            </div>
                        </div>
                        


                    </div>
                </PopoverContent>

            </Popover>
        </div>
    );
}

export const getDefaultDateRange = (nights: number = 1) => {
    const today = new Date();
    const endDate = addDays(today, nights);

    return {
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
};

export const formatDateRange = (startDate: string, endDate: string, locale: string = 'id-ID') => {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);

    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    };

    return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}`;
};

export default DateRange;