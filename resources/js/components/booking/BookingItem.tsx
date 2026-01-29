import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { getBookingStatusColor, getBookingStatusText, diffInDays, formatDate } from '@/utils/date';
import { type Booking, type BookingStatus } from '@/types';
import { BookingStatusBadge } from '@/components//Booking/BookingStatusBadge';
import { PaymentStatusBadge } from '@/components//Booking/PaymentStatusBadge';
import { Users, Building2, Calendar, Phone, Mail } from 'lucide-react';

interface BookingItemProps {
    booking: Booking;
    onClick?: (booking: Booking) => void;
    left?: number;
    width?: number;
    nights?: number;
}

export default function BookingItem({
    booking,
    onClick,
    left,
    width,
    nights
}: BookingItemProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const calculatedNights = nights || diffInDays(booking.check_in, booking.check_out);

    // 1. Payment Status Background Colors
    const getPaymentColor = (status: Booking['payment_status']) => {
        switch (status) {
            case 'fully_paid': return 'bg-green-100 border-green-200 hover:bg-green-200 text-green-900';
            case 'dp_received': return 'bg-blue-100 border-blue-200 hover:bg-blue-200 text-blue-900';
            case 'dp_pending': return 'bg-orange-100 border-orange-200 hover:bg-orange-200 text-orange-900';
            case 'overdue': return 'bg-red-100 border-red-200 hover:bg-red-200 text-red-900';
            case 'refunded': return 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-900';
            default: return 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900';
        }
    };

    // 2. Booking Status Dot Colors
    const getBookingStatusDotColor = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed': return 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]';
            case 'checked_in': return 'bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.6)]';
            case 'checked_out': return 'bg-gray-500';
            case 'cancelled': return 'bg-red-500';
            case 'pending_verification': return 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.6)]';
            default: return 'bg-gray-400';
        }
    };

    // Check if booking is overdue (checkout passed but not checked_out)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkoutDate = new Date(booking.check_out);
    checkoutDate.setHours(0, 0, 0, 0);
    const isOverdue = checkoutDate < today && booking.booking_status !== 'checked_out';

    // Debug log
    if (isOverdue) {
        console.log(`[OVERDUE] ${booking.booking_number}:`, {
            checkout: booking.check_out,
            status: booking.booking_status,
            checkoutDate,
            today
        });
    }

    // Determine card color - red if overdue, otherwise payment status
    const paymentColorClass = isOverdue
        ? 'bg-red-50 border-red-300 hover:bg-red-100 text-red-900 ring-2 ring-red-200'
        : getPaymentColor(booking.payment_status);
    const bookingDotColor = getBookingStatusDotColor(booking.booking_status);

    return (
        <>
            <div
                className={`
                    absolute top-1 bottom-1 rounded-md border shadow-sm cursor-pointer
                    transition-all duration-200 group z-10
                    flex flex-col justify-center
                    ${paymentColorClass}
                `}
                style={{
                    left: `${left}px`,
                    width: width ? `${width - 8}px` : undefined,
                }}
                onClick={() => onClick?.(booking)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                title={isOverdue ? `⚠️ OVERDUE: ${booking.guest_name}` : undefined}
            >
                {/* Visual Indicator for Booking Status (Top Right) */}
                <div
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${bookingDotColor}`}
                    title={`Booking Status: ${booking.booking_status.replace('_', ' ').toUpperCase()}`}
                />

                {/* Overdue Warning Badge */}
                {isOverdue && (
                    <div className="absolute top-0 left-0 bg-red-600 text-white text-[8px] px-1 rounded-br font-bold">
                        OVERDUE
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 flex items-center justify-center text-center px-1 select-none overflow-hidden">
                    <div className="flex flex-col items-center justify-center w-full">
                        <div className="text-[11px] sm:text-[12px] font-bold truncate w-full leading-tight">
                            {booking.guest_name}
                        </div>
                        {/* Details Row: Guests • Total • Nights */}
                        <div className="text-[9px] sm:text-[10px] opacity-90 truncate w-full mt-0.5 font-medium flex items-center justify-center gap-1">
                            <span className="flex items-center gap-0.5">
                                <Users className="w-3 h-3" /> {booking.guest_count}
                            </span>
                            <span className="opacity-50">•</span>
                            <span>{formatCurrency(booking.total_amount)}</span>
                            <span className="opacity-50">•</span>
                            <span>{calculatedNights} night{calculatedNights > 1 ? "s" : ""}</span>
                        </div >
                    </div >
                </div >
            </div >

            {/* Tooltip on Hover - Detailed Info */}
            {
                showTooltip && (
                    <div className="
                    fixed z-[9999] pointer-events-none fade-in-50
                    bg-gray-900 text-white text-xs rounded-xl p-3
                    shadow-xl whitespace-nowrap border border-gray-700
                "
                        style={{
                            // Use fixed positioning relative to viewport to avoid clipping
                            // This is a simplification; for production a library like floating-ui is better
                            // We rely on the fact that this is likely rendered near the cursor or element
                            // But we can't easily get element position here without ref.
                            // Let's use a simpler absolute positioning if possible, but user asked for modal-like
                            // defaulting to simple absolute relative to parent Group for now.
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '8px'
                        }}>
                        <div className="font-semibold mb-2 text-sm">{booking.guest_name}</div>

                        <div className="space-y-1 mb-2">
                            <TooltipRow icon={Building2} text={booking.property?.name || 'Unknown Property'} />
                            <TooltipRow icon={Calendar} text={`${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}`} />
                            <TooltipRow icon={Users} text={`${booking.guest_count} guests`} />
                            {booking.guest_phone && <TooltipRow icon={Phone} text={booking.guest_phone} />}
                        </div>

                        <div className="border-t border-gray-700 pt-2 mt-2">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Total</span>
                                <span className="font-medium text-green-400">{formatCurrency(booking.total_amount)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-[10px] mt-1 uppercase tracking-wider">
                                <BookingStatusBadge status={booking.booking_status} className="text-[10px] py-0 px-1" />
                                <PaymentStatusBadge status={booking.payment_status} className="text-[10px] py-0 px-1" />
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 
                        border-l-[6px] border-l-transparent
                        border-r-[6px] border-r-transparent
                        border-t-[6px] border-t-gray-900"
                        />
                    </div>
                )
            }
        </>
    );
}

function TooltipRow({ icon: Icon, text }: { icon: any; text: string }) {
    return (
        <div className="flex items-center gap-2 text-gray-300">
            <Icon className="h-3 w-3" />
            <span className="truncate max-w-[180px]">{text}</span>
        </div>
    );
}
