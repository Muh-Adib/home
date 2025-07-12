import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
    checkIn: string;
    checkOut: string;
    onCheckInChange: (date: string) => void;
    onCheckOutChange: (date: string) => void;
    minDate?: Date;
    className?: string;
}

export default function DateRangePicker({
    checkIn,
    checkOut,
    onCheckInChange,
    onCheckOutChange,
    minDate = new Date(),
    className
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const checkInDate = checkIn ? new Date(checkIn) : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;

    // Generate calendar days for current month
    const generateCalendarDays = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const days = [];
        const current = new Date(startDate);

        while (current <= lastDay || days.length < 42) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    const calendarDays = generateCalendarDays(currentMonth);

    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        
        if (!checkInDate || (checkInDate && checkOutDate)) {
            // Start new selection
            onCheckInChange(dateStr);
            onCheckOutChange('');
        } else {
            // Complete selection
            if (date < checkInDate) {
                onCheckInChange(dateStr);
                onCheckOutChange(checkInDate.toISOString().split('T')[0]);
            } else {
                onCheckOutChange(dateStr);
            }
        }
    };

    const isInRange = (date: Date) => {
        if (!checkInDate || !checkOutDate) return false;
        return date > checkInDate && date < checkOutDate;
    };

    const isSelected = (date: Date) => {
        return (checkInDate && date.toDateString() === checkInDate.toDateString()) || 
               (checkOutDate && date.toDateString() === checkOutDate.toDateString());
    };

    const isDisabled = (date: Date) => {
        return date < minDate;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const displayText = () => {
        if (checkInDate && checkOutDate) {
            return `${checkInDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${checkOutDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`;
        } else if (checkInDate) {
            return checkInDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return 'Pilih tanggal';
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal bg-white border-blue-200 hover:bg-blue-50",
                        !checkInDate && "text-muted-foreground",
                        className
                    )}
                >
                    <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                    {displayText()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateMonth('prev')}
                            className="h-8 w-8 p-0 hover:bg-blue-100"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium text-gray-900">
                            {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateMonth('next')}
                            className="h-8 w-8 p-0 hover:bg-blue-100"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                            <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                            const isRange = isInRange(day);
                            const isSelectedDay = isSelected(day);
                            const isDisabledDay = isDisabled(day);

                            return (
                                <Button
                                    key={index}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 w-8 p-0 text-xs",
                                        !isCurrentMonth && "text-gray-300",
                                        isRange && "bg-blue-100 hover:bg-blue-200 text-blue-700",
                                        isSelectedDay && "bg-blue-600 text-white hover:bg-blue-700",
                                        isDisabledDay && "opacity-30 cursor-not-allowed",
                                        isCurrentMonth && !isRange && !isSelectedDay && !isDisabledDay && "hover:bg-gray-100"
                                    )}
                                    onClick={() => !isDisabledDay && handleDateClick(day)}
                                    disabled={isDisabledDay}
                                >
                                    {day.getDate()}
                                </Button>
                            );
                        })}
                    </div>

                    {checkInDate && checkOutDate && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                Durasi: {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} malam
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
} 