import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Booking } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { 
    Calendar, 
    User, 
    Building2, 
    CreditCard,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    DollarSign
} from 'lucide-react';

interface SearchResultsModalProps {
    bookings: Booking[];
    isOpen: boolean;
    onClose: () => void;
}

const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode, label: string }> = {
        pending_verification: { 
            variant: 'outline', 
            icon: <Clock className="h-3 w-3" />, 
            label: 'Pending' 
        },
        confirmed: { 
            variant: 'default', 
            icon: <CheckCircle className="h-3 w-3" />, 
            label: 'Confirmed' 
        },
        checked_in: { 
            variant: 'secondary', 
            icon: <CheckCircle className="h-3 w-3" />, 
            label: 'Checked In' 
        },
        checked_out: { 
            variant: 'secondary', 
            icon: <CheckCircle className="h-3 w-3" />, 
            label: 'Checked Out' 
        },
        cancelled: { 
            variant: 'destructive', 
            icon: <XCircle className="h-3 w-3" />, 
            label: 'Cancelled' 
        },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, icon: <AlertCircle className="h-3 w-3" />, label: status };
    
    return (
        <Badge variant={config.variant} className="flex items-center gap-1">
            {config.icon}
            {config.label}
        </Badge>
    );
};

const getPaymentStatusBadge = (status: string) => {
    const paymentConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
        dp_pending: { variant: 'outline', label: 'DP Pending' },
        dp_paid: { variant: 'secondary', label: 'DP Paid' },
        fully_paid: { variant: 'default', label: 'Fully Paid' },
    };

    const config = paymentConfig[status] || { variant: 'outline' as const, label: status };
    
    return (
        <Badge variant={config.variant} className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {config.label}
        </Badge>
    );
};

const amountPaid = (booking: Booking) => {
    return (booking.total_amount - booking.remaining_amount);
}

export default function SearchResultsModal({ bookings, isOpen, onClose }: SearchResultsModalProps) {
    const handleBookingClick = (bookingId: number) => {
        router.visit(`/admin/bookings/${bookingId}`);
        onClose();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Search Results
                    </DialogTitle>
                    <DialogDescription>
                        Found {bookings.length} booking{bookings.length !== 1 ? 's' : ''}. Click on a card to view details.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 mt-4">
                    {bookings.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No bookings found matching your search.</p>
                        </div>
                    ) : (
                        bookings.map((booking) => (
                            <Card 
                                key={booking.id}
                                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-500 hover:scale-[1.02]"
                                onClick={() => handleBookingClick(booking.id)}
                            >
                                <CardContent className="p-4 space-y-3">
                                    {/* Header: Booking Code and Status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="font-semibold text-lg text-blue-600">
                                                {booking.booking_number}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            {getStatusBadge(booking.booking_status)}
                                            {getPaymentStatusBadge(booking.payment_status)}
                                        </div>
                                    </div>

                                    {/* Guest Name */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium">{booking.guest_name}</span>
                                    </div>

                                    {/* Property and Dates */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span className="text-muted-foreground">
                                                {booking.property?.name || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span className="text-muted-foreground">
                                                {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div className="pt-3 border-t space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Total Amount:</span>
                                            <span className="font-semibold">{formatCurrency(booking.total_amount)}</span>
                                        </div>
                                        {booking.dp_amount > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">DP Amount:</span>
                                                <span className="font-medium text-blue-600">
                                                    {formatCurrency(booking.dp_amount)}
                                                </span>
                                            </div>
                                        )}
                                        {amountPaid(booking) && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Paid:</span>
                                                <span className="font-medium text-green-600">
                                                    {formatCurrency(amountPaid(booking))}
                                                </span>
                                            </div>
                                        )}
                                        {(booking.remaining_amount > 0) && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Outstanding:</span>
                                                <span className="font-medium text-orange-600">
                                                    {formatCurrency(booking.remaining_amount)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Click hint */}
                                    <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                                        Click to view details
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
