"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
const customCalendarStyles = `
  .rdp-day_range_start:not(.rdp-day_outside) {
    background-color: #059669 !important;
    color: white !important;
    border: 2px solid #047857 !important;
    font-weight: bold !important;
  }
  
  .rdp-day_range_end:not(.rdp-day_outside) {
    background-color: #059669 !important;
    color: white !important;
    border: 2px solid #047857 !important;
    font-weight: bold !important;
  }
  
  .rdp-day_range_middle:not(.rdp-day_outside) {
    background-color: #10b981 !important;
    color: white !important;
    opacity: 0.6 !important;
  }
  
  .rdp-day_selected:not(.rdp-day_outside) {
    background-color: #059669 !important;
    color: white !important;
    font-weight: bold !important;
  }
`;

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
    compact?: boolean;
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
    compact = true,
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
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

    // Update local state when props change
    useEffect(() => {
        if (startDate && endDate) {
            setDateRange({
                from: new Date(startDate),
                to: new Date(endDate)
            });
        } else {
            setDateRange(undefined);
        }
    }, [startDate, endDate]);

    // Calculate nights between dates
    const calculateNights = (from?: Date, to?: Date): number => {
        if (!from || !to) return 0;
        return Math.max(0, differenceInDays(to, from));
    };

    const nights = calculateNights(dateRange?.from, dateRange?.to);

    // Check if date is booked dengan logika bergeser untuk step 2
    const isDateBooked = (date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');

        // Jika sedang di step 2 (selecting checkout), geser booking 1 hari
        if (dateRange?.from && !dateRange?.to||dateRange?.to && dateRange?.from && (error || warning)) {
            // Tanggal yang aslinya booked, sekarang dianggap available
            // Tanggal sebelumnya (yang aslinya available) sekarang dianggap booked
            const prevDay = addDays(date, -1);
            const prevDayStr = format(prevDay, 'yyyy-MM-dd');
            return bookedDates.includes(prevDayStr);
        }

        // Step 1 atau lainnya, gunakan booking normal
        return bookedDates.includes(dateStr);
    };

    // Get minimum stay for date dengan logika tambahan untuk tanggal yang terjepit
    const getMinimumStayForDate = (date: Date): number => {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
        const defaultMinStay = isWeekend ? minStayWeekend : minStayWeekday;

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

        // Jika ada booking dalam rentang default minimum stay, allow 1 night
        for (let i = 1; i <= defaultMinStay; i++) {
            const checkDate = addDays(date, i);
            if (isDateBooked(checkDate)) {
                return 1;
            }
        }

        return defaultMinStay;
    };

    const currentMinStay = dateRange?.from ? getMinimumStayForDate(dateRange.from) : minStayNights;
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

    // Get preview range based on hovered date
    const getPreviewRange = (): DateRangeType | undefined => {
        if (dateRange?.from && !dateRange?.to && hoveredDate) {
            // Make sure hovered date is after start date
            if (hoveredDate > dateRange.from) {
                return {
                    from: dateRange.from,
                    to: hoveredDate
                };
            }
        }
        return dateRange;
    };

    // Handle date selection
    const handleDateSelect = (range: DateRangeType | undefined) => {
        console.log('🔄 handleDateSelect called with:', range);
        console.log('🔄 Current dateRange state:', dateRange);

        // Jika range kosong/undefined, reset semua
        if (!range) {
            console.log('🔄 Resetting date range - no range provided');
            setDateRange(undefined);
            setWarning(null);
            if (onDateChange) {
                onDateChange('', '');
            }
            return;
        }

        // Kasus 1: Hanya tanggal 'from' yang dipilih (first click)
        if (range.from && !range.to) {
            console.log('🔄 First date selected:', range.from);

            // Jika sudah ada dateRange.from dan user klik tanggal yang sama, reset
            if (dateRange?.from && range.from.getTime() === dateRange.from.getTime()) {
                console.log('🔄 Same start date clicked, resetting selection');
                setDateRange(undefined);
                setWarning(null);
                if (onDateChange) {
                    onDateChange('', '');
                }
                return;
            }

            // Jika sudah ada dateRange.from dan user klik tanggal berbeda, 
            // anggap sebagai pemilihan end date
            if (dateRange?.from && !dateRange.to) {
                console.log('🔄 Setting end date based on existing start date');
                const fromDate = dateRange.from;
                const toDate = range.from;

                // Pastikan urutan tanggal benar
                let startDate = fromDate;
                let endDate = toDate;

                if (startDate.getTime() > endDate.getTime()) {
                    console.log('🔄 Swapping dates - start was after end');
                    [startDate, endDate] = [endDate, startDate];
                }

                // Validasi range lengkap
                return validateAndSetCompleteRange(startDate, endDate);
            }

            // Set sebagai start date baru
            console.log('🔄 Setting new start date, waiting for end date');
            setDateRange({
                from: range.from,
                to: undefined
            });
            setWarning(null);
            // Jangan tutup kalender, tunggu pemilihan tanggal kedua
            return;
        }

        // Kasus 2: Kedua tanggal dipilih sekaligus (range complete dari calendar component)
        if (range.from && range.to) {
            console.log('🔄 Complete range received:', range.from, 'to', range.to);

            // Pastikan urutan tanggal benar
            let fromDate = range.from;
            let toDate = range.to;

            if (fromDate.getTime() > toDate.getTime()) {
                console.log('🔄 Swapping dates - from was after to');
                [fromDate, toDate] = [toDate, fromDate];
            }

            return validateAndSetCompleteRange(fromDate, toDate);
        }

        // Fungsi helper untuk validasi dan set range lengkap
        function validateAndSetCompleteRange(fromDate: Date, toDate: Date) {
            console.log('🔄 Validating complete range:', fromDate, 'to', toDate);

            const correctedRange = { from: fromDate, to: toDate };

            // Validasi: cek apakah range mengandung tanggal yang sudah dipesan
            if (typeof rangeContainsBookedDates === 'function' && rangeContainsBookedDates(fromDate, toDate)) {
                setWarning('Rentang tanggal yang dipilih mengandung tanggal yang sudah dipesan. Silakan pilih rentang tanggal lain.');
                setDateRange(correctedRange);
                return;
            }

            // Validasi minimum stay
            if (typeof differenceInDays === 'function' && typeof getMinimumStayForDate === 'function') {
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

    // Format display text
    const formatDisplayText = () => {
        if (!dateRange?.from) {
            return compact ? startLabel : `${startLabel} - ${endLabel}`;
        }

        if (dateRange.from && dateRange.to) {
            const fromFormat = format(dateRange.from, compact ? 'd MMM' : 'd MMM yyyy', { locale: id });
            const toFormat = format(dateRange.to, compact ? 'd MMM' : 'd MMM yyyy', { locale: id });
            return `${fromFormat} - ${toFormat}`;
        }

        // Hanya start date yang dipilih, tampilkan dengan indikator bahwa user masih memilih
        const fromFormat = format(dateRange.from, compact ? 'd MMM' : 'd MMM yyyy', { locale: id });
        return compact ?
            `${fromFormat} → ?` :
            `${fromFormat} → Pilih tanggal keluar`;
    };

    // Get current step for user guidance
    const getCurrentStep = () => {
        if (!dateRange?.from) {
            return {
                step: 1,
                message: '1️⃣ Pilih tanggal check-in',
                description: 'Klik tanggal yang diinginkan untuk memulai'
            };
        }

        if (dateRange.from && !dateRange.to) {
            return {
                step: 2,
                message: '2️⃣ Pilih tanggal check-out',
                description: `Minimal ${currentMinStay} malam dari ${format(dateRange.from, 'd MMM', { locale: id })}`
            };
        }

        if (dateRange.from && dateRange.to) {
            if (error || warning) {
                return {
                    step: 3,
                    message: '⚠️ Perlu penyesuaian',
                    description: 'Silakan sesuaikan pilihan tanggal'
                };
            }
            return {
                step: 3,
                message: '✅ Tanggal siap digunakan',
                description: `${nights} malam, ${format(dateRange.from, 'd MMM', { locale: id })} - ${format(dateRange.to, 'd MMM', { locale: id })}`
            };
        }

        return { step: 1, message: '', description: '' };
    };

    const currentStepInfo = getCurrentStep();                   

    // Button sizing
    const getButtonHeight = () => {
        switch (size) {
            case 'sm': return 'h-8 text-xs px-2';
            case 'lg': return 'h-12 text-base px-4';
            default: return 'h-10 text-sm px-3';
        }
    };

    const minimumDate = minDate ? new Date(minDate) : new Date();
    const maximumDate = maxDate ? new Date(maxDate) : addDays(new Date(), 90);

    const disabledDates = [
        { before: minimumDate },
        { after: maximumDate },
        (date: Date) => {
            // Always disable individually booked dates
            if (isDateBooked(date)) {
                return true;
            }

            // If selecting check-out (after check-in is selected)
            if (dateRange?.from && !dateRange?.to) {
                // Can't select same day as check-in (need at least 1 night)
                if (date.getTime() === dateRange.from.getTime()) {
                    return true;
                }

                // Can't select before check-in
                if (date < dateRange.from) {
                    return true;
                }

                // Don't allow more than 30 days after check-in
                if (differenceInDays(date, dateRange.from) > 30) {
                    return true;
                }
            }

            return false;
        }
    ];


    return (
        <div className={cn('w-full', className)}>
            {/* Custom styles for calendar range selection */}
            <style>{`
                .rdp-day_range_start:not(.rdp-day_outside) {
                    background-color: #059669 !important;
                    color: white !important;
                    border: 2px solid #047857 !important;
                    font-weight: bold !important;
                }
                
                .rdp-day_range_end:not(.rdp-day_outside) {
                    background-color: #059669 !important;
                    color: white !important;
                    border: 2px solid #047857 !important;
                    font-weight: bold !important;
                }
                
                .rdp-day_range_middle:not(.rdp-day_outside) {
                    background-color: #10b981 !important;
                    color: white !important;
                    opacity: 0.6 !important;
                }
                
                .rdp-day_selected:not(.rdp-day_outside) {
                    background-color: #059669 !important;
                    color: white !important;
                    font-weight: bold !important;
                }
            `}</style>
            
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
                            "border-input hover:border-primary/50 focus:border-primary",
                            !dateRange && "text-muted-foreground",
                            getButtonHeight(),
                            disabled && "opacity-50 cursor-not-allowed",
                            compact && "min-w-0"
                        )}
                        disabled={disabled}
                    >
                        <div className={cn(
                            "flex items-center gap-2 min-w-0 flex-1",
                            compact && "gap-1"
                        )}>
                            <CalendarIcon className={cn(
                                "shrink-0",
                                compact ? "h-3 w-3" : "h-4 w-4"
                            )} />
                            <span className="truncate text-left">
                                {formatDisplayText()}
                            </span>
                            {showNights && nights > 0 && (
                                <Badge
                                    variant={isMinStayViolation ? "destructive" : "secondary"}
                                    className={cn(
                                        "ml-auto shrink-0",
                                        compact ? "text-xs px-1" : "text-xs px-2"
                                    )}
                                >
                                    {nights} {compact ? 'mlm' : 'malam'}
                                </Badge>
                            )}
                        </div>
                        <ChevronDown className={cn(
                            "shrink-0 opacity-50 transition-transform duration-200",
                            compact ? "h-3 w-3" : "h-4 w-4",
                            isOpen && "rotate-180"
                        )} />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="w-auto p-0"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                >
                    <div className="p-3">
                        {loading && (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                <span className="ml-2 text-sm text-muted-foreground">
                                    Memuat ketersediaan...
                                </span>
                            </div>
                        )}

                        {/* Step Indicator */}
                        {!loading && (
                            <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Info className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium text-primary">
                                        {currentStepInfo.message}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {currentStepInfo.description}
                                </p>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive" className="mb-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {warning && !error && (
                            <Alert className="mb-3 border-orange-200 bg-orange-50">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-700">{warning}</AlertDescription>
                            </Alert>
                        )}

                        {!loading && (
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from || new Date()}
                                selected={getPreviewRange()}
                                onSelect={handleDateSelect}
                                numberOfMonths={1}
                                disabled={disabledDates}
                                onDayMouseEnter={(date) => {
                                    if (dateRange?.from && !dateRange?.to) {
                                        // Hanya set hover jika tanggal valid untuk check-out
                                        const isValidCheckout = date > dateRange.from &&
                                            !isDateBooked(date) &&
                                            differenceInDays(date, dateRange.from) <= 30 &&
                                            !rangeContainsBookedDates(dateRange.from, date);
                                        if (isValidCheckout) {
                                            setHoveredDate(date);
                                        }
                                    }
                                }}
                                onDayMouseLeave={() => {
                                    setHoveredDate(null);
                                }}
                                modifiers={{
                                    booked: (date: Date) => isDateBooked(date),
                                    hovered: (date: Date) => {
                                        if (!dateRange?.from || dateRange?.to || !hoveredDate) return false;
                                        return date > dateRange.from && date <= hoveredDate;
                                    },
                                    startSelected: (date: Date) => {
                                        return dateRange?.from ? date.getTime() === dateRange.from.getTime() : false;
                                    },
                                    endSelected: (date: Date) => {
                                        return dateRange?.to ? date.getTime() === dateRange.to.getTime() : false;
                                    },
                                }}
                                modifiersStyles={{
                                    booked: {
                                        backgroundColor: '#f97316', // Orange-500
                                        color: 'white',
                                        opacity: 0.8,
                                        textDecoration: 'line-through',
                                        fontWeight: 'normal',
                                    },
                                    hovered: {
                                        backgroundColor: '#10b981', // Emerald-500 (green)
                                        color: 'white',
                                        opacity: 0.4,
                                    },
                                    startSelected: {
                                        backgroundColor: '#059669', // Emerald-600 (darker green)
                                        color: 'white',
                                        fontWeight: 'bold',
                                        border: '2px solid #047857', // Emerald-700 border
                                    },
                                    endSelected: {
                                        backgroundColor: '#059669', // Emerald-600 (darker green)
                                        color: 'white',
                                        fontWeight: 'bold',
                                        border: '2px solid #047857', // Emerald-700 border
                                    },
                                }}
                                className="rounded-md border-0 green-calendar-theme"
                                locale={id}
                            />
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <div className="flex-1">
                                {!dateRange?.from && (
                                    <span>Mulai dengan memilih tanggal check-in</span>
                                )}
                                {dateRange?.from && !dateRange?.to && (
                                    <div className="space-y-1">
                                        <span className="text-primary font-medium">
                                            Check-in: {format(dateRange.from, 'd MMM yyyy', { locale: id })}
                                        </span>
                                        <div className="text-xs">
                                            Hover untuk preview, klik untuk konfirmasi
                                        </div>
                                    </div>
                                )}
                                {dateRange?.from && dateRange?.to && !error && !warning && (
                                    <span className="text-green-600 font-medium">
                                        ✓ {nights} malam terpilih
                                    </span>
                                )}
                            </div>

                            {dateRange?.from && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                        handleDateSelect(undefined);
                                        setWarning(null);
                                        setHoveredDate(null);
                                    }}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316', opacity: 0.8 }}></div>
                                <span>Dipesan</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#059669', border: '1px solid #047857' }}></div>
                                <span>Dipilih</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981', opacity: 0.4 }}></div>
                                <span>Preview</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-background border border-border rounded"></div>
                                <span>Tersedia</span>
                            </div>
                        </div>

                        {dateRange?.from && dateRange?.to && !isMinStayViolation && !error && !warning && (
                            <Alert className="mt-2 border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">
                                    Pilihan {nights} malam valid untuk reservasi
                                </AlertDescription>
                            </Alert>
                        )}
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
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    };

    return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}`;
};

export default DateRange;