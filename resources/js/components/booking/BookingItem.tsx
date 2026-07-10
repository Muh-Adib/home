import React, { useState } from 'react';
import { formatCurrency, formatCurrencyShort } from '@/lib/utils';
import { getBookingStatusColor, getBookingStatusText, diffInDays, formatDate } from '@/utils/date';
import { type Booking, type BookingStatus } from '@/types';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { PaymentStatusBadge } from '@/components/booking/PaymentStatusBadge';
import { Users, Building2, Calendar, Phone, Mail, Bed } from 'lucide-react';

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

    // Parse dates to determine background categories
    const checkInDate = new Date(booking.check_in);
    checkInDate.setHours(0, 0, 0, 0);

    const checkOutDate = new Date(booking.check_out);
    checkOutDate.setHours(0, 0, 0, 0);

    const todayVal = new Date();
    todayVal.setHours(0, 0, 0, 0);

    const isCheckInToday = checkInDate.getTime() === todayVal.getTime();
    const isCheckOutToday = checkOutDate.getTime() === todayVal.getTime();
    const isCheckOutPending = isCheckOutToday && booking.booking_status !== 'checked_out';
    
    // Stay: tamu yang masih menginap dan sudah check in dari kemarin (atau hari-hari sebelumnya)
    const isStay = booking.booking_status === 'checked_in' && checkInDate < todayVal;
    const isUpcoming = checkInDate > todayVal;

    // Check if booking is overdue (checkout passed but not checked_out)
    const isOverdue = checkOutDate < todayVal && booking.booking_status !== 'checked_out';

    // 1. Background styles based on categories (Upcoming, Check-In Today, Check-Out Today, Stay)
    const getCardCategoryStyles = () => {
        if (booking.booking_status === 'cancelled') {
            return 'bg-red-100 hover:bg-red-300 text-red-950 border-red-300';
        }
        if (isCheckOutToday && booking.booking_status !== 'checked_out') {
            // "check out hari ini khusus yang belum check out" - warna ungu mencolok (Vibrant Purple)
            return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 font-extrabold shadow-sm ring-1 ring-purple-400/30';
        }
        if (booking.booking_status === 'checked_out') {
            return 'bg-slate-100 hover:bg-slate-300 text-slate-700 border-slate-300';
        }
        if (calculatedNights >= 5) {
            // "long stay" - pink soft agak tua dikit (solid pink-200)
            return 'bg-pink-200 hover:bg-pink-300 text-pink-950 border-pink-400 font-bold';
        }
        if (isCheckInToday) {
            // "booking yang akan check in" - mencolok sky-blue
            return 'bg-sky-200 hover:bg-sky-400 text-sky-950 border-sky-300 font-bold';
        }
        if (isCheckOutToday) {
            // "booking yang jadwalnya check out" - mencolok rose-pink
            return 'bg-rose-100 hover:bg-rose-300 text-rose-950 border-rose-300 font-bold';
        }
        if (isStay) {
            // "booking yang stay" - mencolok indigo
            return 'bg-rose-200 hover:bg-rose-300 text-black border-rose-300 font-bold';
        }
        if (isUpcoming) {
            // "booking mendatang" - warm amber
            return 'bg-amber-100 hover:bg-amber-300 text-amber-950 border-amber-300';
        }
        return 'bg-slate-100 hover:bg-slate-300 text-slate-800 border-slate-300';
    };

    // 2. Thick Left Border indicating Booking Status
    const getStatusBorderStyle = (status: Booking['booking_status']) => {
        switch (status) {
            case 'confirmed':
                return 'border-l-[5px] border-l-green-600';
            case 'checked_in':
                return 'border-l-[5px] border-l-blue-600';
            case 'checked_out':
                return 'border-l-[5px] border-l-slate-500';
            case 'cancelled':
                return 'border-l-[5px] border-l-red-600';
            case 'pending_verification':
                return 'border-l-[5px] border-l-yellow-600';
            default:
                return 'border-l-[5px] border-l-gray-400';
        }
    };

    // 3. Payment status badge styling for numbers
    const getPaymentBadgeClass = (status: Booking['payment_status']) => {
        switch (status) {
            case 'fully_paid':
                return 'bg-green-600 text-white border border-green-700 shadow-xs';
            case 'dp_received':
                return 'bg-blue-600 text-white border border-blue-700 shadow-xs';
            case 'dp_pending':
                return 'bg-orange-500 text-white border border-orange-600 shadow-xs';
            case 'overdue':
                return 'bg-red-600 text-white border border-red-700 shadow-xs';
            case 'refunded':
                return 'bg-slate-500 text-white border border-slate-600 shadow-xs';
            default:
                return 'bg-slate-500 text-white border border-slate-600 shadow-xs';
        }
    };

    const cardBgClass = isOverdue
        ? 'bg-red-100 hover:bg-red-200 text-red-950 border-red-400 font-bold ring-2 ring-red-400/50'
        : getCardCategoryStyles();

    const borderStyleClass = getStatusBorderStyle(booking.booking_status);
    const paymentBadgeClass = getPaymentBadgeClass(booking.payment_status);

    const cardWidth = width ? width - 8 : 150;
    const useNarrow = cardWidth < 125;
    const remaining = booking.remaining_amount ?? 0;
    const isLunas = remaining <= 0;

    // Calculate scale factor and reference width
    let scale = 1;
    let refWidth = cardWidth;

    if (useNarrow) {
        if (cardWidth < 100) {
            refWidth = 100;
            scale = cardWidth / 100;
        }
    } else {
        if (cardWidth < 160) {
            refWidth = 160;
            scale = cardWidth / 160;
        }
    }

    const innerStyle: React.CSSProperties = {
        width: `${refWidth}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'left center',
        flexShrink: 0,
        height: '100%',
    };

    let statusLabel = '';
    let statusBadgeClass = '';

    switch (booking.booking_status) {
        case 'confirmed':
            if (isUpcoming) {
                statusLabel = 'Menunggu Jadwal';
                statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
            } else {
                statusLabel = 'Confirmed';
                statusBadgeClass = 'bg-green-100 text-green-800 border-green-200';
            }
            break;
        case 'checked_in':
            statusLabel = 'Checked In';
            statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
            break;
        case 'checked_out':
            statusLabel = 'Checked Out';
            statusBadgeClass = 'bg-slate-200 text-slate-800 border-slate-300';
            break;
        case 'cancelled':
            statusLabel = 'Batal';
            statusBadgeClass = 'bg-red-100 text-red-800 border-red-200';
            break;
        case 'pending_verification':
            statusLabel = 'Pending';
            statusBadgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
            break;
        default:
            statusLabel = booking.booking_status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            statusBadgeClass = 'bg-slate-200 text-slate-800 border-slate-300';
    }

    const pendingPaymentsCount = booking.payments?.filter(
        p => p.payment_status === 'pending'
    ).length || 0;

    return (
        <>
            <div
                className={`
                    absolute top-1 bottom-1 rounded-md border shadow-xs cursor-pointer
                    transition-all duration-200 group z-10
                    flex flex-col justify-center overflow-hidden
                    ${cardBgClass} ${borderStyleClass}
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
                {/* Content */}
                <div style={innerStyle} className="flex flex-col justify-center">
                    {useNarrow ? (
                        <div className="flex h-full w-full flex-col justify-center px-1 py-0.5 text-center select-none overflow-hidden space-y-1">

                            {/* Guest Name */}
                            <div className={`truncate text-[10px] font-bold leading-none ${isCheckOutPending ? 'text-white' : 'text-slate-900'}`}>
                                {booking.guest_name}
                            </div>

                            {/* Guest & Extra Bed */}
                            <div className="flex items-center justify-center gap-2">
                                {pendingPaymentsCount > 0 && (
                                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[7px] font-bold text-white animate-pulse" title="Pending Payment">
                                        {pendingPaymentsCount}
                                    </span>
                                )}
                                <span className="flex items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 text-[8px] font-semibold text-slate-700">
                                    <Users className="h-2.5 w-2.5" />
                                    {booking.guest_count}
                                </span>

                                {booking.extra_bed_count > 0 && (
                                    <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-semibold text-amber-700">
                                        <Bed className="h-2.5 w-2.5" />
                                        {booking.extra_bed_count}
                                    </span>
                                )}
                            </div>

                            {/* Payment */}
                            <div className="flex justify-center">
                                <span
                                    className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${paymentBadgeClass}`}
                                >
                                    {isLunas
                                        ? `✓ ${formatCurrencyShort(booking.total_amount)}`
                                        : `Sisa ${formatCurrencyShort(remaining)}`}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full w-full flex-col justify-between p-2 overflow-hidden select-none">

                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">

                                <div className="min-w-0 flex-1">
                                    <div className={`truncate text-[12px] font-bold ${isCheckOutPending ? 'text-white' : 'text-slate-900'}`}>
                                        {booking.guest_name}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {pendingPaymentsCount > 0 && (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white animate-pulse" title={`${pendingPaymentsCount} pending payment(s)`}>
                                            {pendingPaymentsCount}
                                        </span>
                                    )}
                                    <span
                                        className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${statusBadgeClass}`}
                                    >
                                        {statusLabel}
                                    </span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-2 flex items-center justify-between">

                                {/* Guest Info */}
                                <div className="flex items-center gap-2">

                                    <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                                        <Users className="h-3 w-3" />
                                        {booking.guest_count}
                                    </span>

                                    {booking.extra_bed_count > 0 && (
                                        <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                            <Bed className="h-3 w-3" />
                                            {booking.extra_bed_count}
                                        </span>
                                    )}

                                </div>

                                {/* Payment */}
                                <span
                                    className={`rounded px-2 py-0.5 text-[9px] font-bold ${paymentBadgeClass}`}
                                >
                                    {isLunas
                                        ? `✓ ${formatCurrencyShort(booking.total_amount)}`
                                        : `Sisa ${formatCurrencyShort(remaining)}`}
                                </span>

                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tooltip on Hover - Detailed Info */}
            {showTooltip && (
                <div className="
                    fixed z-[9999] pointer-events-none fade-in-50
                    bg-gray-900 text-white text-xs rounded-xl p-3
                    shadow-xl whitespace-nowrap border border-gray-700
                "
                    style={{
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
                        {booking.extra_bed_count > 0 && (
                            <TooltipRow icon={Bed} text={`${booking.extra_bed_count} extra beds`} />
                        )}
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
            )}
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
