import React from 'react';
import { type Property, type Booking } from '@/types';
import { calculateBookingPosition, isBookingInRange } from '@/utils/date';
import BookingItem from './BookingItem';
import { Building2, Users, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BookingTimelineRowProps {
    property: Property;
    bookings: Booking[];
    timelineDates: Date[];
    cellWidth?: number;
    onBookingClick: (booking: Booking) => void;
}

export default function BookingTimelineRow({ 
    property, 
    bookings, 
    timelineDates, 
    cellWidth = 120,
    onBookingClick 
}: BookingTimelineRowProps) {
    // Filter bookings that are in the timeline range
    const timelineStart = timelineDates[0];
    const timelineEnd = timelineDates[timelineDates.length - 1];
    
    const relevantBookings = bookings.filter(booking => 
        isBookingInRange(booking, timelineStart, timelineEnd)
    );

    // Get property cover image
    const coverImage = property.media?.find(m => m.file_type === 'image' && m.is_featured)?.url || 
                      property.media?.find(m => m.file_type === 'image')?.url;

    return (
        <div className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors">
            {/* Property Info Column - Fixed position */}
            <div className="w-64 flex-shrink-0 border-r border-gray-200 p-3 bg-white sticky left-0 z-10">
                <div className="flex items-start gap-3">
                    {coverImage && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                                src={coverImage} 
                                alt={property.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                            {property.name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                            {property.address}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{property.capacity}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatCurrency(property.base_rate)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Cells */}
            <div className="flex relative">
                {timelineDates.map((date, index) => (
                    <div
                        key={index}
                        className="border-r border-gray-200 relative"
                        style={{ width: cellWidth, height: '100px' }}
                    >
                        {/* Background for weekend days */}
                        {(date.getDay() === 0 || date.getDay() === 6) && (
                            <div className="absolute inset-0 bg-orange-50 opacity-30" />
                        )}
                    </div>
                ))}

                {/* Booking Items */}
                {relevantBookings.map((booking) => {
                    const position = calculateBookingPosition(booking, timelineDates, cellWidth);
                    
                    if (!position.visible) return null;

                    return (
                        <div
                            key={booking.id}
                            className="absolute"
                            style={{
                                left: position.left,
                                width: position.width,
                                height: '100px',
                                zIndex: 10
                            }}
                        >
                            <BookingItem
                                booking={booking}
                                onClick={onBookingClick}
                                cellWidth={cellWidth}
                                width={position.width}
                                nights={position.nights}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 