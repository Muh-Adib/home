import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Users, 
    Building2,
    Clock,
    CheckCircle,
    XCircle,
    Info
} from 'lucide-react';
import { type Booking, type Property } from '@/types';

interface AvailabilityCalendarProps {
    bookings: Booking[];
    properties: Property[];
    startDate?: Date;
    endDate?: Date;
}

interface CalendarDay {
    date: Date;
    isToday: boolean;
    isWeekend: boolean;
    dayOfWeek: string;
    dayOfMonth: number;
}

interface PropertyAvailability {
    property: Property;
    bookings: Booking[];
    availability: {
        [dateKey: string]: {
            status: 'available' | 'booked' | 'blocked';
            booking?: Booking;
            isCheckIn: boolean;
            isCheckOut: boolean;
        };
    };
}

export default function AvailabilityCalendar({ 
    bookings, 
    properties, 
    startDate = new Date(),
    endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
}: AvailabilityCalendarProps) {
    const [currentStartDate, setCurrentStartDate] = useState(startDate);
    const [currentEndDate, setCurrentEndDate] = useState(endDate);
    const [hoveredCell, setHoveredCell] = useState<{ propertyId: number; dateKey: string } | null>(null);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days: CalendarDay[] = [];
        const current = new Date(currentStartDate);
        
        while (current <= currentEndDate) {
            const today = new Date();
            days.push({
                date: new Date(current),
                isToday: current.toDateString() === today.toDateString(),
                isWeekend: current.getDay() === 0 || current.getDay() === 6,
                dayOfWeek: current.toLocaleDateString('id-ID', { weekday: 'short' }),
                dayOfMonth: current.getDate(),
            });
            current.setDate(current.getDate() + 1);
        }
        
        return days;
    }, [currentStartDate, currentEndDate]);

    // Process property availability
    const propertyAvailability = useMemo(() => {
        const availability: PropertyAvailability[] = properties.map(property => {
            const propertyBookings = bookings.filter(booking => 
                booking.property_id === property.id &&
                new Date(booking.check_in) <= currentEndDate &&
                new Date(booking.check_out) >= currentStartDate
            );

            const propertyAvailability: { [dateKey: string]: any } = {};

            // Initialize all days as available
            calendarDays.forEach(day => {
                const dateKey = day.date.toISOString().split('T')[0];
                propertyAvailability[dateKey] = {
                    status: 'available' as const,
                    isCheckIn: false,
                    isCheckOut: false,
                };
            });

            // Mark booked days
            propertyBookings.forEach(booking => {
                const checkIn = new Date(booking.check_in);
                const checkOut = new Date(booking.check_out);
                
                let current = new Date(checkIn);
                while (current < checkOut) {
                    const dateKey = current.toISOString().split('T')[0];
                    if (propertyAvailability[dateKey]) {
                        propertyAvailability[dateKey] = {
                            status: 'booked' as const,
                            booking,
                            isCheckIn: current.toDateString() === checkIn.toDateString(),
                            isCheckOut: false,
                        };
                    }
                    current.setDate(current.getDate() + 1);
                }
                
                // Mark check-out day
                const checkOutKey = checkOut.toISOString().split('T')[0];
                if (propertyAvailability[checkOutKey]) {
                    propertyAvailability[checkOutKey] = {
                        status: 'booked' as const,
                        booking,
                        isCheckIn: false,
                        isCheckOut: true,
                    };
                }
            });

            return {
                property,
                bookings: propertyBookings,
                availability: propertyAvailability,
            };
        });

        return availability;
    }, [properties, bookings, calendarDays, currentStartDate, currentEndDate]);

    const navigateDateRange = useCallback((direction: 'prev' | 'next') => {
        const daysToMove = 30; // Move by 30 days
        if (direction === 'prev') {
            setCurrentStartDate(prev => {
                const newStart = new Date(prev);
                newStart.setDate(newStart.getDate() - daysToMove);
                return newStart;
            });
            setCurrentEndDate(prev => {
                const newEnd = new Date(prev);
                newEnd.setDate(newEnd.getDate() - daysToMove);
                return newEnd;
            });
        } else {
            setCurrentStartDate(prev => {
                const newStart = new Date(prev);
                newStart.setDate(newStart.getDate() + daysToMove);
                return newStart;
            });
            setCurrentEndDate(prev => {
                const newEnd = new Date(prev);
                newEnd.setDate(newEnd.getDate() + daysToMove);
                return newEnd;
            });
        }
    }, []);

    const getStatusColor = (status: string, isCheckIn: boolean, isCheckOut: boolean) => {
        if (status === 'booked') {
            if (isCheckIn) return 'bg-blue-600 border-l-4 border-l-green-500';
            if (isCheckOut) return 'bg-blue-600 border-r-4 border-r-red-500';
            return 'bg-blue-500';
        }
        if (status === 'blocked') return 'bg-red-500';
        return 'bg-green-100 border border-green-200';
    };

    const getStatusText = (status: string, isCheckIn: boolean, isCheckOut: boolean) => {
        if (status === 'booked') {
            if (isCheckIn) return 'Check-in';
            if (isCheckOut) return 'Check-out';
            return 'Booked';
        }
        if (status === 'blocked') return 'Blocked';
        return 'Available';
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };



    return (
        <TooltipProvider>
            <Card className="w-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Property Availability Calendar
                        </CardTitle>
                        
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateDateRange('prev')}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <span className="text-sm font-medium">
                                {formatDate(currentStartDate)} - {formatDate(currentEndDate)}
                            </span>
                            
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateDateRange('next')}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                            <span>Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span>Booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span>Blocked</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-600 border-l-4 border-l-green-500 rounded"></div>
                            <span>Check-in</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-600 border-r-4 border-r-red-500 rounded"></div>
                            <span>Check-out</span>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent>
                    <div className="overflow-x-auto">
                        <div className="min-w-max">
                            {/* Header with dates */}
                            <div className="grid grid-cols-[200px_repeat(auto-fill,minmax(40px,1fr))] gap-1 mb-2">
                                <div className="h-8"></div> {/* Empty corner */}
                                {calendarDays.map((day, index) => (
                                    <div
                                        key={index}
                                        className={`h-8 flex flex-col items-center justify-center text-xs font-medium border-b ${
                                            day.isToday ? 'bg-blue-50 border-blue-200' : ''
                                        } ${day.isWeekend ? 'text-red-600' : 'text-gray-700'}`}
                                    >
                                        <div className="text-xs text-gray-500">{day.dayOfWeek}</div>
                                        <div className={`${day.isToday ? 'font-bold text-blue-600' : ''}`}>
                                            {day.dayOfMonth}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Property rows */}
                            {propertyAvailability.map((propertyData) => (
                                <div
                                    key={propertyData.property.id}
                                    className="grid grid-cols-[200px_repeat(auto-fill,minmax(40px,1fr))] gap-1 mb-1"
                                >
                                    {/* Property name */}
                                    <div className="h-12 flex items-center p-2 bg-gray-50 border rounded">
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {propertyData.property.name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {propertyData.property.address}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability cells */}
                                    {calendarDays.map((day, dayIndex) => {
                                        const dateKey = day.date.toISOString().split('T')[0];
                                        const availability = propertyData.availability[dateKey];
                                        
                                        if (!availability) return (
                                            <div key={dayIndex} className="h-12 border rounded bg-gray-50"></div>
                                        );

                                        return (
                                            <Tooltip key={dayIndex}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={`h-12 border rounded cursor-pointer transition-colors ${
                                                            getStatusColor(availability.status, availability.isCheckIn, availability.isCheckOut)
                                                        } ${
                                                            hoveredCell?.propertyId === propertyData.property.id && 
                                                            hoveredCell?.dateKey === dateKey 
                                                                ? 'ring-2 ring-blue-400' 
                                                                : ''
                                                        }`}
                                                        onMouseEnter={() => setHoveredCell({
                                                            propertyId: propertyData.property.id,
                                                            dateKey
                                                        })}
                                                        onMouseLeave={() => setHoveredCell(null)}
                                                    >
                                                        {availability.booking && (
                                                            <div className="h-full flex items-center justify-center">
                                                                <Users className="h-3 w-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <div className="space-y-2">
                                                        <div className="font-medium">
                                                            {propertyData.property.name}
                                                        </div>
                                                        <div className="text-sm">
                                                            {formatDate(day.date)}
                                                        </div>
                                                        <div className="text-sm">
                                                            Status: {getStatusText(availability.status, availability.isCheckIn, availability.isCheckOut)}
                                                        </div>
                                                        
                                                        {availability.booking && (
                                                            <div className="space-y-1 text-xs">
                                                                <div className="flex items-center gap-1">
                                                                    <Users className="h-3 w-3" />
                                                                    <span>{availability.booking.guest_name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Building2 className="h-3 w-3" />
                                                                    <span>{availability.booking.guest_count} guests</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium">
                                                                        {formatCurrency(availability.booking.total_amount)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    <span>{availability.booking.booking_status}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                                <span>Available Properties: {properties.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                <span>Active Bookings: {bookings.filter(b => 
                                    ['confirmed', 'checked_in'].includes(b.booking_status)
                                ).length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-600 border-l-4 border-l-green-500 rounded"></div>
                                <span>Check-ins Today: {bookings.filter(b => {
                                    const today = new Date().toDateString();
                                    return b.check_in && new Date(b.check_in).toDateString() === today;
                                }).length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-600 border-r-4 border-r-red-500 rounded"></div>
                                <span>Check-outs Today: {bookings.filter(b => {
                                    const today = new Date().toDateString();
                                    return b.check_out && new Date(b.check_out).toDateString() === today;
                                }).length}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
} 