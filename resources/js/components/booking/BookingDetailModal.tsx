import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getBookingStatusText, formatDate } from '@/utils/date';
import { type Booking } from '@/types';
import { 
    Users, 
    Building2, 
    Calendar, 
    Phone, 
    Mail, 
    DollarSign,
    Eye,
    Edit,
    XCircle,
    CheckCircle,
    UserCheck,
    UserX
} from 'lucide-react';
import { Link, router } from '@inertiajs/react';

interface BookingDetailModalProps {
    booking: Booking | null;
    isOpen: boolean;
    onClose: () => void;
    canVerify?: boolean;
    canCancel?: boolean;
    canCheckIn?: boolean;
}

export default function BookingDetailModal({ 
    booking, 
    isOpen, 
    onClose,
    canVerify = false,
    canCancel = false,
    canCheckIn = false
}: BookingDetailModalProps) {
    if (!booking) return null;

    const statusText = getBookingStatusText(booking.booking_status);
    const nights = Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24));

    const handleAction = (action: string) => {
        const actions = {
            verify: () => router.patch(`/admin/bookings/${booking.booking_number}/verify`),
            reject: () => router.patch(`/admin/bookings/${booking.booking_number}/reject`),
            cancel: () => router.patch(`/admin/bookings/${booking.booking_number}/cancel`),
            checkin: () => router.patch(`/admin/bookings/${booking.booking_number}/checkin`),
            checkout: () => router.patch(`/admin/bookings/${booking.booking_number}/checkout`),
        };

        if (actions[action as keyof typeof actions]) {
            actions[action as keyof typeof actions]();
            onClose();
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'pending_verification':
                return 'secondary';
            case 'confirmed':
                return 'default';
            case 'checked_in':
                return 'default';
            case 'checked_out':
                return 'outline';
            case 'cancelled':
                return 'destructive';
            case 'no_show':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Booking Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">{booking.guest_name}</h3>
                            <p className="text-sm text-gray-600">{booking.property?.name}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(booking.booking_status)}>
                            {statusText}
                        </Badge>
                    </div>

                    {/* Booking Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <div>
                                    <div className="text-sm font-medium">Check-in</div>
                                    <div className="text-sm text-gray-600">
                                        {formatDate(booking.check_in)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <div>
                                    <div className="text-sm font-medium">Check-out</div>
                                    <div className="text-sm text-gray-600">
                                        {formatDate(booking.check_out)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <div>
                                    <div className="text-sm font-medium">Guests</div>
                                    <div className="text-sm text-gray-600">
                                        {booking.guest_count} ({booking.guest_male}M/{booking.guest_female}F/{booking.guest_children}C)
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-500" />
                                <div>
                                    <div className="text-sm font-medium">Phone</div>
                                    <div className="text-sm text-gray-600">{booking.guest_phone}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-500" />
                                <div>
                                    <div className="text-sm font-medium">Email</div>
                                    <div className="text-sm text-gray-600">{booking.guest_email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-500" />
                                <div>
                                    <div className="text-sm font-medium">Total Amount</div>
                                    <div className="text-sm text-gray-600">
                                        {formatCurrency(booking.total_amount)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Payment Status</span>
                            <Badge variant={booking.payment_status === 'fully_paid' ? 'default' : 'secondary'}>
                                {booking.payment_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                        </div>
                    </div>

                    {/* Special Requests */}
                    {booking.special_requests && (
                        <div className="border-t pt-4">
                            <div className="text-sm font-medium mb-2">Special Requests</div>
                            <p className="text-sm text-gray-600">{booking.special_requests}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="border-t pt-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/admin/bookings/${booking.booking_number}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                </Link>
                            </Button>

                            {canVerify && booking.booking_status === 'pending_verification' && (
                                <>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleAction('verify')}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Verify
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => handleAction('reject')}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                </>
                            )}

                            {canCheckIn && booking.payment_status === 'fully_paid' && (
                                <Button 
                                    size="sm"
                                    onClick={() => handleAction('checkin')}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Check In
                                </Button>
                            )}

                            {canCheckIn && booking.booking_status === 'checked_in' && (
                                <Button 
                                    size="sm"
                                    onClick={() => handleAction('checkout')}
                                    className="bg-gray-600 hover:bg-gray-700"
                                >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Check Out
                                </Button>
                            )}

                            {canCancel && ['pending_verification', 'confirmed'].includes(booking.booking_status) && (
                                <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleAction('cancel')}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 