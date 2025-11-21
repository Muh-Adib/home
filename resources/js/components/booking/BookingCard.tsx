import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/utils';
import { type Booking } from '@/types';
import { Link } from '@inertiajs/react';
import { 
    MoreHorizontal,
    Eye,
    CheckCircle,
    XCircle,
    UserCheck,
    UserX,
    Building2,
    CalendarDays,
    Users,
    Phone,
    Mail
} from 'lucide-react';

interface BookingCardProps {
    booking: Booking;
    onVerify: (booking: Booking) => void;
    onReject: (booking: Booking) => void;
    onCancel: (booking: Booking) => void;
    onCheckIn: (booking: Booking) => void;
    onCheckOut: (booking: Booking) => void;
    loadingActions: Record<string, boolean>;
    canVerify: boolean;
    canCancel: boolean;
    canCheckIn: boolean;
}

export default function BookingCard({
    booking,
    onVerify,
    onReject,
    onCancel,
    onCheckIn,
    onCheckOut,
    loadingActions,
    canVerify,
    canCancel,
    canCheckIn
}: BookingCardProps) {
    const getBookingStatusBadge = (status: Booking['booking_status']) => {
        const statusConfig = {
            pending_verification: { variant: 'secondary' as const, label: 'Pending', icon: '⏳' },
            confirmed: { variant: 'default' as const, label: 'Confirmed', icon: '✅' },
            checked_in: { variant: 'default' as const, label: 'Checked In', icon: '🏠' },
            checked_out: { variant: 'outline' as const, label: 'Checked Out', icon: '🚪' },
            cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: '❌' },
            no_show: { variant: 'destructive' as const, label: 'No Show', icon: '⏰' },
        };
        
        const config = statusConfig[status];
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <span>{config.icon}</span>
                {config.label}
            </Badge>
        );
    };

    const getPaymentStatusBadge = (status: Booking['payment_status']) => {
        const statusConfig = {
            dp_pending: { variant: 'secondary' as const, label: 'DP Pending' },
            dp_received: { variant: 'default' as const, label: 'DP Received' },
            fully_paid: { variant: 'default' as const, label: 'Fully Paid' },
            refunded: { variant: 'outline' as const, label: 'Refunded' },
            overdue: { variant: 'destructive' as const, label: 'Overdue' },
        };
        
        const config = statusConfig[status];
        return (
            <Badge variant={config.variant}>
                {config.label}
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold truncate">{booking.guest_name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            {booking.booking_number}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {getBookingStatusBadge(booking.booking_status)}
                            {getPaymentStatusBadge(booking.payment_status)}
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Property Info */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{booking.property?.name}</span>
                </div>
                
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span className="text-xs font-medium">Check-in</span>
                        </div>
                        <p className="font-medium text-sm">{formatDate(booking.check_in)}</p>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span className="text-xs font-medium">Check-out</span>
                        </div>
                        <p className="font-medium text-sm">{formatDate(booking.check_out)}</p>
                    </div>
                </div>
                
                {/* Guest & Amount Info */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            {booking.guest_count} guests ({booking.guest_male}M/{booking.guest_female}F/{booking.guest_children}C)
                        </span>
                    </div>
                    <div className="text-right">
                        <div className="font-semibold text-lg">{formatCurrency(booking.total_amount)}</div>
                        <div className="text-xs text-muted-foreground">
                            DP: {formatCurrency(booking.dp_amount)}
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{booking.guest_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground truncate">{booking.guest_email}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-3 border-t">
                    <Button asChild className="w-full" variant="outline">
                        <Link href={`/admin/bookings/${booking.booking_number}`}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                        </Link>
                    </Button>
                    
                    <div className="flex gap-2">
                        {canVerify && booking.booking_status === 'pending_verification' && (
                            <>
                                <Button 
                                    onClick={() => onVerify(booking)} 
                                    size="sm" 
                                    className="flex-1" 
                                    variant="default"
                                    disabled={loadingActions[`verify-${booking.id}`]}
                                >
                                    {loadingActions[`verify-${booking.id}`] ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                    )}
                                    {loadingActions[`verify-${booking.id}`] ? 'Verifying...' : 'Verify'}
                                </Button>
                                <Button 
                                    onClick={() => onReject(booking)} 
                                    size="sm" 
                                    className="flex-1" 
                                    variant="destructive"
                                    disabled={loadingActions[`reject-${booking.id}`]}
                                >
                                    {loadingActions[`reject-${booking.id}`] ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                    ) : (
                                        <XCircle className="h-4 w-4 mr-1" />
                                    )}
                                    {loadingActions[`reject-${booking.id}`] ? 'Rejecting...' : 'Reject'}
                                </Button>
                            </>
                        )}
                        
                        {canCheckIn && booking.payment_status === 'fully_paid' && (
                            <Button 
                                onClick={() => onCheckIn(booking)} 
                                size="sm" 
                                className="flex-1"
                                variant="default"
                                disabled={loadingActions[`checkin-${booking.id}`]}
                            >
                                {loadingActions[`checkin-${booking.id}`] ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                ) : (
                                    <UserCheck className="h-4 w-4 mr-1" />
                                )}
                                {loadingActions[`checkin-${booking.id}`] ? 'Checking In...' : 'Check In'}
                            </Button>
                        )}
                        
                        {canCheckIn && booking.booking_status === 'checked_in' && (
                            <Button 
                                onClick={() => onCheckOut(booking)} 
                                size="sm" 
                                className="flex-1"
                                variant="outline"
                                disabled={loadingActions[`checkout-${booking.id}`]}
                            >
                                {loadingActions[`checkout-${booking.id}`] ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                ) : (
                                    <UserX className="h-4 w-4 mr-1" />
                                )}
                                {loadingActions[`checkout-${booking.id}`] ? 'Checking Out...' : 'Check Out'}
                            </Button>
                        )}
                    </div>

                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                                <MoreHorizontal className="h-4 w-4 mr-2" />
                                More Actions
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/bookings/${booking.booking_number}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                </Link>
                            </DropdownMenuItem>
                            
                            {canVerify && booking.booking_status === 'pending_verification' && (
                                <>
                                    <DropdownMenuItem onClick={() => onVerify(booking)}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Verify Booking
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReject(booking)}>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject Booking
                                    </DropdownMenuItem>
                                </>
                            )}
                            
                            {canCheckIn && booking.booking_status === 'confirmed' && (
                                <DropdownMenuItem onClick={() => onCheckIn(booking)}>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Check In Guest
                                </DropdownMenuItem>
                            )}
                            
                            {canCheckIn && booking.booking_status === 'checked_in' && (
                                <DropdownMenuItem onClick={() => onCheckOut(booking)}>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Check Out Guest
                                </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {canCancel && ['pending_verification', 'confirmed'].includes(booking.booking_status) && (
                                <DropdownMenuItem 
                                    onClick={() => onCancel(booking)}
                                    className="text-destructive"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Booking
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
} 