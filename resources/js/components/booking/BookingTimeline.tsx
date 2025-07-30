import React, { useState, useMemo } from 'react';
import { type Property, type Booking } from '@/types';
import { generateTimelineDates } from '@/utils/date';
import BookingTimelineHeader from './BookingTimelineHeader';
import BookingTimelineRow from './BookingTimelineRow';
import BookingDetailModal from './BookingDetailModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar,
    Plus,
    Filter,
    RefreshCw
} from 'lucide-react';
import { Link } from '@inertiajs/react';

interface BookingTimelineProps {
    properties: Property[];
    bookings: Booking[];
    startDate?: Date;
    days?: number;
    cellWidth?: number;
    canVerify?: boolean;
    canCancel?: boolean;
    canCheckIn?: boolean;
    onRefresh?: () => void;
}

export default function BookingTimeline({
    properties,
    bookings,
    startDate,
    days = 14,
    cellWidth = 120,
    canVerify = false,
    canCancel = false,
    canCheckIn = false,
    onRefresh
}: BookingTimelineProps) {
    const [currentStartDate, setCurrentStartDate] = useState(startDate || new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Generate timeline dates
    const timelineDates = useMemo(() => 
        generateTimelineDates(days, currentStartDate), 
        [days, currentStartDate]
    );

    // Group bookings by property
    const bookingsByProperty = useMemo(() => {
        const grouped: Record<number, Booking[]> = {};
        
        properties.forEach(property => {
            grouped[property.id] = bookings.filter(booking => 
                booking.property_id === property.id
            );
        });
        
        return grouped;
    }, [properties, bookings]);

    // Calculate timeline width
    const timelineWidth = timelineDates.length * cellWidth;

    const handleBookingClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedBooking(null);
    };

    const navigateTimeline = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentStartDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - days);
        } else {
            newDate.setDate(newDate.getDate() + days);
        }
        setCurrentStartDate(newDate);
    };

    const goToToday = () => {
        setCurrentStartDate(new Date());
    };

    const formatDateRange = () => {
        const start = timelineDates[0];
        const end = timelineDates[timelineDates.length - 1];
        return `${start.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short' 
        })} - ${end.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
        })}`;
    };

    return (
        <div className="space-y-4">
            {/* Header Controls */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Booking Timeline
                            </CardTitle>
                            <div className="text-sm text-gray-600">
                                {formatDateRange()}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToToday}
                            >
                                Today
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateTimeline('prev')}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateTimeline('next')}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            {onRefresh && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onRefresh}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            )}
                            <Button asChild size="sm">
                                <Link href="/admin/bookings/create">
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Booking
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Timeline Container */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <div style={{ width: Math.max(timelineWidth + 256, 720) }}>
                            {/* Timeline Header */}
                            <BookingTimelineHeader 
                                dates={timelineDates} 
                                cellWidth={cellWidth} 
                            />

                            {/* Timeline Rows */}
                            <div className="relative">
                                {properties.map((property) => (
                                    <BookingTimelineRow
                                        key={property.id}
                                        property={property}
                                        bookings={bookingsByProperty[property.id] || []}
                                        timelineDates={timelineDates}
                                        cellWidth={cellWidth}
                                        onBookingClick={handleBookingClick}
                                    />
                                ))}

                                {/* Empty state */}
                                {properties.length === 0 && (
                                    <div className="flex items-center justify-center py-12 text-gray-500">
                                        <div className="text-center">
                                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">No properties found</p>
                                            <p className="text-sm">Add properties to see them in the timeline</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Booking Detail Modal */}
            <BookingDetailModal
                booking={selectedBooking}
                isOpen={isModalOpen}
                onClose={handleModalClose}
                canVerify={canVerify}
                canCancel={canCancel}
                canCheckIn={canCheckIn}
            />
        </div>
    );
} 