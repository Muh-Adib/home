import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}: DateRangeProps) {
    const [localStartDate, setLocalStartDate] = useState(startDate);
    const [localEndDate, setLocalEndDate] = useState(endDate);

    // Update local state when props change
    useEffect(() => {
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
    }, [startDate, endDate]);

    // Calculate nights between dates
    const calculateNights = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        const diffTime = endDateObj.getTime() - startDateObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    const nights = calculateNights(localStartDate, localEndDate);

    // Calculate minimum stay based on date type
    const getMinimumStayForDate = (date: string): number => {
        if (!date) return minStayNights;
        
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        
        // Check if it's weekend (Friday-Sunday: 5,6,0)
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
        
        // You can add peak season logic here later
        // For now, use weekend/weekday logic
        return isWeekend ? minStayWeekend : minStayWeekday;
    };

    const currentMinStay = getMinimumStayForDate(localStartDate);
    const isMinStayViolation = nights > 0 && nights < currentMinStay;

    // Handle date changes with auto-trigger
    const handleDateChange = (type: 'start' | 'end', value: string) => {
        let newStartDate = localStartDate;
        let newEndDate = localEndDate;

        if (type === 'start') {
            newStartDate = value;
            setLocalStartDate(value);
            
            // Auto-adjust end date based on minimum stay
            const requiredMinStay = getMinimumStayForDate(value);
            const minEndDate = new Date(value);
            minEndDate.setDate(minEndDate.getDate() + requiredMinStay);
            const minEndDateStr = minEndDate.toISOString().split('T')[0];
            
            // Auto-adjust end date if it's before minimum required date
            if (!newEndDate || new Date(newEndDate) < minEndDate) {
                newEndDate = minEndDateStr;
                setLocalEndDate(newEndDate);
            }
        } else {
            newEndDate = value;
            setLocalEndDate(value);
        }

        // Trigger callback
        if (onDateChange) {
            if (autoTrigger) {
                setTimeout(() => {
                    onDateChange(newStartDate, newEndDate);
                }, triggerDelay);
            } else {
                onDateChange(newStartDate, newEndDate);
            }
        }
    };

    // Get input size classes
    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'w-32 text-sm';
            case 'lg':
                return 'w-48 text-base';
            default:
                return 'w-40';
        }
    };

    // Get minimum date for end date input
    const getMinEndDate = () => {
        if (localStartDate) {
            const startDateObj = new Date(localStartDate);
            const requiredMinStay = getMinimumStayForDate(localStartDate);
            startDateObj.setDate(startDateObj.getDate() + requiredMinStay);
            return startDateObj.toISOString().split('T')[0];
        }
        return minDate;
    };

    return (
        <div className={cn('flex gap-2 items-end', className)}>
            {/* Start Date */}
            <div className="flex flex-col">
                <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {startLabel}
                </Label>
                <Input
                    type="date"
                    value={localStartDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className={cn(getSizeClasses(), disabled && 'opacity-60')}
                    min={minDate}
                    max={maxDate}
                    disabled={disabled}
                    placeholder={placeholder.start}
                />
            </div>

            {/* End Date */}
            <div className="flex flex-col">
                <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {endLabel}
                </Label>
                <Input
                    type="date"
                    value={localEndDate}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className={cn(getSizeClasses(), disabled && 'opacity-60')}
                    min={getMinEndDate()}
                    max={maxDate}
                    disabled={disabled}
                    placeholder={placeholder.end}
                />
            </div>

            {/* Nights Indicator */}
            {showNights && localStartDate && localEndDate && nights > 0 && (
                <div className={cn(
                    "flex flex-col items-center px-3 py-2 rounded-md border",
                    isMinStayViolation ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                )}>
                    <span className={cn(
                        "text-xs font-medium",
                        isMinStayViolation ? "text-red-600" : "text-blue-600"
                    )}>
                        {nights}
                    </span>
                    <span className={cn(
                        "text-xs flex items-center gap-1",
                        isMinStayViolation ? "text-red-500" : "text-blue-500"
                    )}>
                        <Clock className="h-3 w-3" />
                        {nights === 1 ? 'night' : 'nights'}
                    </span>
                    {isMinStayViolation && (
                        <span className="text-xs text-red-500 mt-1">
                            Min: {currentMinStay}
                        </span>
                    )}
                </div>
            )}

            {/* Minimum Stay Warning */}
            {showMinStayWarning && isMinStayViolation && (
                <div className="flex flex-col">
                    <Badge variant="destructive" className="text-xs">
                        Minimum {currentMinStay} nights required
                    </Badge>
                </div>
            )}

            {/* Date Range Summary Badge (for small screens) */}
            {localStartDate && localEndDate && (
                <div className="hidden max-sm:flex">
                    <Badge variant="outline" className="text-xs">
                        {nights} {nights === 1 ? 'night' : 'nights'}
                    </Badge>
                </div>
            )}
        </div>
    );
}

// Helper function to get default date range (today to tomorrow)
export const getDefaultDateRange = (nights: number = 1) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + nights);
    
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