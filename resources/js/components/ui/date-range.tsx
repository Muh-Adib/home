import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getNightsBetween, 
  getDefaultDateRange, 
  formatDateRange as formatDateRangeUtil,
  isWeekend 
} from '@/lib/date-utils';

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

    // Calculate nights between dates using utility function
    const calculateNights = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        return getNightsBetween(startDateObj, endDateObj);
    };

    const nights = calculateNights(localStartDate, localEndDate);

    // Calculate minimum stay based on date type
    const getMinimumStayForDate = (date: string): number => {
        if (!date) return minStayNights;
        
        const dateObj = new Date(date);
        
        // Check if it's weekend using utility function
        if (isWeekend(dateObj)) {
            return minStayWeekend;
        }
        
        // You can add peak season logic here later
        // For now, use weekend/weekday logic
        return minStayWeekday;
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
                <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
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
                <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
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
                    isMinStayViolation ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20"
                )}>
                    <span className={cn(
                        "text-xs font-medium",
                        isMinStayViolation ? "text-destructive" : "text-primary"
                    )}>
                        {nights}
                    </span>
                    <span className={cn(
                        "text-xs flex items-center gap-1",
                        isMinStayViolation ? "text-destructive/80" : "text-primary/80"
                    )}>
                        <Clock className="h-3 w-3" />
                        {nights === 1 ? 'night' : 'nights'}
                    </span>
                    {isMinStayViolation && (
                        <span className="text-xs text-destructive/80 mt-1">
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

// Re-export utility functions for convenience
export { 
  getDefaultDateRange, 
  formatDateRange,
  formatDateRange as formatDateRangeDisplay 
} from '@/lib/date-utils';

export default DateRange; 