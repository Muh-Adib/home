"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    disabled?: boolean;
    autoTrigger?: boolean;
    triggerDelay?: number;
    minStayNights?: number;
    minStayWeekday?: number;
    minStayWeekend?: number;
    minStayPeak?: number;
    showMinStayWarning?: boolean;
    bookedDates?: string[];
    propertySlug?: string;
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
    propertySlug,
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
    const [availabilityData, setAvailabilityData] = useState<string[]>(bookedDates);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Fetch availability when property slug changes
    useEffect(() => {
        if (propertySlug) {
            fetchAvailability();
        }
    }, [propertySlug]);

    // Fetch availability data from API
    const fetchAvailability = async () => {
        if (!propertySlug) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const startDate = new Date();
            const endDate = addDays(startDate, 90);
            
            const response = await fetch(`/api/properties/${propertySlug}/availability?check_in=${format(startDate, 'yyyy-MM-dd')}&check_out=${format(endDate, 'yyyy-MM-dd')}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAvailabilityData(data.bookedDates || []);
                } else {
                    setError(data.message || 'Gagal memuat ketersediaan');
                }
            } else {
                setError('Gagal memuat ketersediaan');
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
            setError('Kesalahan jaringan');
        } finally {
            setLoading(false);
        }
    };

    // Calculate nights between dates
    const calculateNights = (from?: Date, to?: Date): number => {
        if (!from || !to) return 0;
        return Math.max(0, differenceInDays(to, from));
    };

    const nights = calculateNights(dateRange?.from, dateRange?.to);

    // Get minimum stay for date
    const getMinimumStayForDate = (date: Date): number => {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
        return isWeekend ? minStayWeekend : minStayWeekday;
    };

    const currentMinStay = dateRange?.from ? getMinimumStayForDate(dateRange.from) : minStayNights;
    const isMinStayViolation = nights > 0 && nights < currentMinStay;

    // Check if date is booked
    const isDateBooked = (date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return availabilityData.includes(dateStr);
    };

    // Check if range contains booked dates
    const rangeContainsBookedDates = (from: Date, to: Date): boolean => {
        let currentDate = new Date(from);
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
        if (!range) {
            setDateRange(undefined);
            setError(null);
            if (onDateChange) {
                onDateChange('', '');
            }
            return;
        }

        // Start date only - user memilih tanggal pertama
        if (range.from && !range.to) {
            // Jika user mengklik tanggal yang sama dengan start date yang sudah ada, reset selection
            if (dateRange?.from && range.from.getTime() === dateRange.from.getTime()) {
                setDateRange(undefined);
                setError(null);
                if (onDateChange) {
                    onDateChange('', '');
                }
                return;
            }
            
            // Simpan start date saja, tunggu user memilih end date
            setDateRange({
                from: range.from,
                to: undefined
            });
            setError(null);
            // Jangan panggil onDateChange sampai range lengkap dipilih
            // Jangan tutup kalender, biarkan user memilih tanggal kedua
        } 
        // Complete range - user telah memilih kedua tanggal
        else if (range.from && range.to) {
            // Validasi: cek apakah range mengandung tanggal yang sudah dipesan
            if (rangeContainsBookedDates(range.from, range.to)) {
                setError('Rentang tanggal mengandung tanggal yang sudah dipesan');
                // Reset ke start date saja, biarkan user memilih ulang end date
                setDateRange({
                    from: range.from,
                    to: undefined
                });
                return;
            }
            
            // Validasi minimum stay
            const nights = differenceInDays(range.to, range.from);
            const requiredMinStay = getMinimumStayForDate(range.from);
            
            if (nights < requiredMinStay) {
                setError(`Minimal menginap ${requiredMinStay} malam untuk tanggal yang dipilih`);
                // Reset ke start date saja, biarkan user memilih ulang end date
                setDateRange({
                    from: range.from,
                    to: undefined
                });
                return;
            }
            
            // Validasi berhasil - simpan range lengkap dan tutup kalender
            setDateRange(range);
            setIsOpen(false);
            setError(null);
            
            // Sekarang baru panggil onDateChange dengan range lengkap
            if (onDateChange) {
                const startStr = range.from.toISOString().split('T')[0];
                const endStr = range.to.toISOString().split('T')[0];
                
                if (autoTrigger) {
                    setTimeout(() => onDateChange(startStr, endStr), triggerDelay);
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

    // Button sizing
    const getButtonHeight = () => {
        switch (size) {
            case 'sm': return 'h-8 text-xs px-2';
            case 'lg': return 'h-12 text-base px-4';
            default: return 'h-10 text-sm px-3';
        }
    };

    const minimumDate = minDate ? new Date(minDate) : new Date();
    const maximumDate = maxDate ? new Date(maxDate) : addDays(new Date(), 365);

    const disabledDates = [
        { before: minimumDate },
        { after: maximumDate },
        (date: Date) => isDateBooked(date),
        // Disable dates sebelum start date jika start date sudah dipilih
        (date: Date) => {
            if (dateRange?.from && !dateRange?.to) {
                return date <= dateRange.from;
            }
            return false;
        },
    ];

    return (
        <div className={cn('w-full', className)}>
            <Popover 
                open={isOpen} 
                onOpenChange={(open) => {
                    // Jika user menutup popover saat hanya start date yang dipilih,
                    // pertahankan state dan jangan reset
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
                        
                        {error && (
                            <Alert variant="destructive" className="mb-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        {!loading && (
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from || new Date()}
                                selected={dateRange}
                                onSelect={handleDateSelect}
                                numberOfMonths={compact ? 1 : 2}
                                disabled={disabledDates}
                                modifiers={{
                                    booked: (date: Date) => isDateBooked(date),
                                }}
                                modifiersStyles={{
                                    booked: {
                                        backgroundColor: 'hsl(var(--destructive))',
                                        color: 'hsl(var(--destructive-foreground))',
                                        opacity: 0.5,
                                        textDecoration: 'line-through',
                                    },
                                }}
                                className="rounded-md border-0"
                                locale={id}
                            />
                        )}
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <div className="flex-1">
                                {!dateRange?.from && (
                                    <span>Pilih tanggal check-in</span>
                                )}
                                {dateRange?.from && !dateRange?.to && (
                                    <div className="space-y-1">
                                        <span className="text-primary font-medium">
                                            Check-in: {format(dateRange.from, 'd MMM yyyy', { locale: id })}
                                        </span>
                                        <div className="text-xs">
                                            Sekarang pilih tanggal check-out
                                        </div>
                                    </div>
                                )}
                                {dateRange?.from && dateRange?.to && (
                                    <span className="text-primary font-medium">
                                        {nights} malam dipilih
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
                                        setError(null);
                                    }}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-destructive opacity-50 border border-destructive rounded"></div>
                                <span>Dipesan</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-primary border border-primary rounded"></div>
                                <span>Dipilih</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-background border border-border rounded"></div>
                                <span>Tersedia</span>
                            </div>
                        </div>

                        {showMinStayWarning && isMinStayViolation && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Minimal menginap {currentMinStay} malam untuk tanggal yang dipilih
                                </AlertDescription>
                            </Alert>
                        )}

                        {dateRange?.from && dateRange?.to && !isMinStayViolation && !error && (
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