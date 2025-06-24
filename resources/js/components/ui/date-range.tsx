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
    bookedDates?: string[]; // Array of booked dates in YYYY-MM-DD format
    propertySlug?: string; // For fetching availability
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
        start: 'Select check-in date',
        end: 'Select check-out date'
    },
    disabled = false,
    autoTrigger = false,
    triggerDelay = 500,
    minStayNights = 1,
    minStayWeekday = 1,
    minStayWeekend = 1,
    minStayPeak = 1,
    showMinStayWarning = true,
    bookedDates = [],
    propertySlug,
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

    // Fetch availability data when property slug changes and popover opens
    useEffect(() => {
        if (propertySlug && isOpen && !loading) {
            fetchAvailability();
        }
    }, [propertySlug, isOpen]);

    // Fetch availability data from API
    const fetchAvailability = async () => {
        if (!propertySlug) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/properties/${propertySlug}/availability`, {
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
                    setError(data.message || 'Failed to fetch availability');
                }
            } else {
                setError('Failed to load availability data');
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
            setError('Network error while fetching availability');
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

    // Calculate minimum stay based on date type
    const getMinimumStayForDate = (date: Date): number => {
        const dayOfWeek = date.getDay();
        // Weekend: Friday(5), Saturday(6), Sunday(0)
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
        return isWeekend ? minStayWeekend : minStayWeekday;
    };

    const currentMinStay = dateRange?.from ? getMinimumStayForDate(dateRange.from) : minStayNights;
    const isMinStayViolation = nights > 0 && nights < currentMinStay;

    // Check if a date is booked/unavailable
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

    // Handle date selection with validation
    const handleDateSelect = (range: DateRangeType | undefined) => {
        if (!range) {
            setDateRange(undefined);
            if (onDateChange) {
                onDateChange('', '');
            }
            return;
        }

        // If only start date is selected
        if (range.from && !range.to) {
            const requiredMinStay = getMinimumStayForDate(range.from);
            let minEndDate = addDays(range.from, requiredMinStay);
            
            // Find next available date if minimum end date is booked
            while (isDateBooked(minEndDate)) {
                minEndDate = addDays(minEndDate, 1);
            }
            
            const updatedRange = {
                from: range.from,
                to: minEndDate
            };
            
            setDateRange(updatedRange);
            
            if (onDateChange) {
                const startStr = range.from.toISOString().split('T')[0];
                const endStr = minEndDate.toISOString().split('T')[0];
                
                if (autoTrigger) {
                    setTimeout(() => {
                        onDateChange(startStr, endStr);
                    }, triggerDelay);
                } else {
                    onDateChange(startStr, endStr);
                }
            }
        } 
        // If both dates are selected
        else if (range.from && range.to) {
            // Check if range contains booked dates
            if (rangeContainsBookedDates(range.from, range.to)) {
                // Don't allow selection if range contains booked dates
                return;
            }
            
            // Check minimum stay requirement
            const nights = differenceInDays(range.to, range.from);
            const requiredMinStay = getMinimumStayForDate(range.from);
            
            if (nights < requiredMinStay) {
                // Auto-adjust to minimum stay
                const adjustedEndDate = addDays(range.from, requiredMinStay);
                
                // Check if adjusted range is valid
                if (!rangeContainsBookedDates(range.from, adjustedEndDate)) {
                    const adjustedRange = {
                        from: range.from,
                        to: adjustedEndDate
                    };
                    
                    setDateRange(adjustedRange);
                    
                    if (onDateChange) {
                        const startStr = range.from.toISOString().split('T')[0];
                        const endStr = adjustedEndDate.toISOString().split('T')[0];
                        onDateChange(startStr, endStr);
                    }
                }
                return;
            }
            
            // Valid selection
            setDateRange(range);
            setIsOpen(false);
            
            if (onDateChange) {
                const startStr = range.from.toISOString().split('T')[0];
                const endStr = range.to.toISOString().split('T')[0];
                
                if (autoTrigger) {
                    setTimeout(() => {
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
            return `${startLabel} - ${endLabel}`;
        }
        
        if (dateRange.from && dateRange.to) {
            const fromFormat = format(dateRange.from, 'd MMM');
            const toFormat = format(dateRange.to, 'd MMM');
            return `${fromFormat} - ${toFormat}`;
        }
        
        const fromFormat = format(dateRange.from, 'd MMM');
        return `${fromFormat} - ${endLabel}`;
    };

    // Get button size based on size prop
    const getButtonHeight = () => {
        switch (size) {
            case 'sm': return 'h-8 text-xs';
            case 'lg': return 'h-12 text-base';
            default: return 'h-10 text-sm';
        }
    };

    // Get minimum date (default to today)
    const minimumDate = minDate ? new Date(minDate) : new Date();

    // Get maximum date
    const maximumDate = maxDate ? new Date(maxDate) : undefined;

    // Create disabled date matcher for react-day-picker
    const disabledDates = [
        { before: minimumDate },
        ...(maximumDate ? [{ after: maximumDate }] : []),
        // Function to disable booked dates
        (date: Date) => isDateBooked(date),
    ];

    return (
        <div className={cn('w-full', className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-between text-left font-normal transition-all duration-200",
                            !dateRange && "text-muted-foreground",
                            getButtonHeight(),
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={disabled}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CalendarIcon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{formatDisplayText()}</span>
                            {showNights && nights > 0 && (
                                <Badge 
                                    variant={isMinStayViolation ? "destructive" : "secondary"} 
                                    className="ml-auto shrink-0 text-xs"
                                >
                                    {nights}n
                                </Badge>
                            )}
                        </div>
                        <ChevronDown className={cn(
                            "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
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
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                <span className="ml-2 text-sm text-muted-foreground">Loading availability...</span>
                            </div>
                        ) : error ? (
                            <Alert variant="destructive" className="mb-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}
                        
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from || new Date()}
                            selected={dateRange}
                            onSelect={handleDateSelect}
                            numberOfMonths={1}
                            disabled={disabledDates}
                            modifiers={{
                                booked: (date: Date) => isDateBooked(date),
                                
                            }}
                            modifiersStyles={{
                                booked: {
                                    backgroundColor: '#fecaca',
                                    color: '#dc2626',
                                    textDecoration: 'line-through',
                                    position: 'relative'
                                },
                                highlight: {
                                    backgroundColor: '#f0fdf4',
                                    color: '#16a34a',
                                    textDecoration: 'none',
                                    position: 'relative'
                                }
                            }}
                            className="rounded-md border-0"
                        />
                        
                        {/* Status Info */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <div>
                                {!dateRange?.from && 'Select check-in date'}
                                {dateRange?.from && !dateRange?.to && 'Select check-out date'}
                                {dateRange?.from && dateRange?.to && `${nights} night${nights !== 1 ? 's' : ''} selected`}
                            </div>
                            
                            {dateRange && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleDateSelect(undefined)}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-200 border border-red-300 rounded"></div>
                                <span>Booked</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-primary border border-primary rounded"></div>
                                <span>Selected</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-muted border border-border rounded"></div>
                                <span>Available</span>
                            </div>
                        </div>

                        {/* Minimum Stay Warning */}
                        {showMinStayWarning && isMinStayViolation && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Minimum stay of {currentMinStay} night{currentMinStay > 1 ? 's' : ''} required for selected dates
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Success message when valid range is selected */}
                        {dateRange?.from && dateRange?.to && !isMinStayViolation && (
                            <Alert className="mt-2">
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Valid {nights} night{nights > 1 ? 's' : ''} stay selected
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// Helper function to get default date range (today to tomorrow+nights)
export const getDefaultDateRange = (nights: number = 1) => {
    const today = new Date();
    const endDate = addDays(today, nights);
    
    return {
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
};

// Helper function to format date range for display
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