import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { getBookingStatusColor, getBookingStatusText, diffInDays, formatDate } from '@/utils/date';
import { type Booking } from '@/types';
import { Users, Building2, Calendar, Phone, Mail } from 'lucide-react';

interface BookingItemProps {
    booking: Booking;
    onClick: (booking: Booking) => void;
    cellWidth?: number;
    width?: number;
    nights?: number;
}

export default function BookingItem({ 
    booking, 
    onClick, 
    cellWidth = 120,
    width,
    nights 
}: BookingItemProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const calculatedNights = nights || diffInDays(booking.check_in, booking.check_out);
    const statusColor = getBookingStatusColor(booking.booking_status);
    const statusText = getBookingStatusText(booking.booking_status);
    
    // Calculate if this is a short booking (1-2 nights)
    const isShortBooking = calculatedNights <= 2;
    const isVeryShortBooking = calculatedNights === 1;

    return (
        <div
            className={`
                absolute top-1 left-1 right-1 bottom-1
                rounded-lg shadow-sm border border-gray-200
                cursor-pointer transition-all duration-200
                hover:shadow-md hover:scale-[1.02]
                ${statusColor}
                text-white
                ${isVeryShortBooking ? 'min-w-[80px]' : ''}
                relative
            `}
            onClick={() => onClick(booking)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
                minHeight: '60px',
                maxHeight: '80px',
                overflow: 'hidden',
                width: width ? `${width - 8}px` : undefined // Subtract padding
            }}
        >
            <div className="p-2 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">
                            {booking.guest_name}
                        </div>
                        {!isShortBooking && (
                            <div className="text-xs opacity-90 truncate">
                                {booking.property?.name}
                            </div>
                        )}
                    </div>
                    <div className="text-xs font-medium bg-white bg-opacity-20 px-1 rounded flex-shrink-0">
                        {statusText}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{booking.guest_count}</span>
                    </div>
                    <div className="text-right">
                        {!isVeryShortBooking && (
                            <div className="font-medium">
                                {formatCurrency(booking.total_amount)}
                            </div>
                        )}
                        <div className="opacity-80">
                            {calculatedNights} night{calculatedNights > 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                        <div className="font-semibold mb-2">{booking.guest_name}</div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                <span>{booking.property?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span>{booking.guest_count} guests ({booking.guest_male}M/{booking.guest_female}F/{booking.guest_children}C)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{booking.guest_phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{booking.guest_email}</span>
                            </div>
                            <div className="border-t border-gray-700 pt-1 mt-1">
                                <div className="font-medium">{formatCurrency(booking.total_amount)}</div>
                                <div className="text-gray-300">DP: {formatCurrency(booking.dp_amount)}</div>
                            </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            )}

            {/* Tooltip content for accessibility */}
            <div className="sr-only">
                Booking: {booking.guest_name} - {booking.property?.name}
                Check-in: {new Date(booking.check_in).toLocaleDateString()}
                Check-out: {new Date(booking.check_out).toLocaleDateString()}
                Status: {statusText}
                Amount: {formatCurrency(booking.total_amount)}
                Nights: {calculatedNights}
            </div>
        </div>
    );
} 