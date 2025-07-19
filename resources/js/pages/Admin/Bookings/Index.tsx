import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type Booking, type BreadcrumbItem, type User, type PaginatedData, type PageProps, type Property } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { 
    Calendar, 
    Plus, 
    Search, 
    Filter, 
    MoreHorizontal,
    Edit,
    Eye,
    UserCheck,
    UserX,
    Clock,
    CheckCircle,
    XCircle,
    Users,
    Building2,
    DollarSign,
    Phone,
    Mail,
    CalendarDays,
    BarChart3
} from 'lucide-react';
import { useState } from 'react';
import AvailabilityCalendar from '@/components/availability-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface BookingsIndexProps {
    bookings: PaginatedData<Booking>;
    filters: {
        search?: string;
        status?: string;
        payment_status?: string;
        property_id?: string;
        sort?: string;
    };
    properties: Array<{ id: number; name: string; }>;
}

export default function BookingsIndex({ bookings, filters, properties }: BookingsIndexProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState(filters.payment_status || 'all');
    const [showCalendar, setShowCalendar] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings' },
    ];

    const handleSearch = () => {
        router.get('/admin/bookings', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleVerify = (booking: Booking) => {
        router.patch(`/admin/bookings/${booking.booking_number}/verify`, {
            notes: 'Booking verified and confirmed by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Force refresh data after successful verify
                router.reload({ only: ['bookings'] });
            },
            onError: (errors) => {
                console.error('Verify failed:', errors);
            }
        });
    };

    const handleConfirm = (booking: Booking) => {
        router.patch(`/admin/bookings/${booking.booking_number}/confirm`, {
            notes: 'Booking confirmed by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            }
        });
    };

    const handleReject = (booking: Booking) => {
        router.patch(`/admin/bookings/${booking.booking_number}/reject`, {
            notes: 'Booking rejected by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            }
        });
    };

    const handleCancel = (booking: Booking) => {
        if (confirm(`Are you sure you want to cancel booking "${booking.booking_number}"?`)) {
            router.patch(`/admin/bookings/${booking.booking_number}/cancel`, {
                cancellation_reason: 'Cancelled by admin: ' + auth.user.name,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['bookings'] });
                }
            });
        }
    };

    const handleCheckIn = (booking: Booking) => {
        router.patch(`/admin/bookings/${booking.booking_number}/checkin`, {
            notes: 'Booking checked in by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            }
        });
    };

    const handleCheckOut = (booking: Booking) => {
        router.patch(`/admin/bookings/${booking.booking_number}/checkout`, {
            notes: 'Booking checked out by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            }
        });
    };

    const getBookingStatusBadge = (status: Booking['booking_status']) => {
        const statusConfig = {
            pending_verification: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
            confirmed: { variant: 'default' as const, label: 'Confirmed', icon: CheckCircle },
            checked_in: { variant: 'default' as const, label: 'Checked In', icon: UserCheck },
            checked_out: { variant: 'outline' as const, label: 'Checked Out', icon: UserX },
            cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: XCircle },
            no_show: { variant: 'destructive' as const, label: 'No Show', icon: XCircle },
        };
        
        const config = statusConfig[status];
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getPaymentStatusBadge = (status: Booking['payment_status']) => {
        const statusConfig = {
            dp_pending: { variant: 'secondary' as const, label: 'DP Pending' },
            dp_received: { variant: 'default' as const, label: 'DP Received' },
            fully_paid: { variant: 'default' as const, label: 'Fully Paid' },
            overdue: { variant: 'destructive' as const, label: 'Overdue' },
            refunded: { variant: 'outline' as const, label: 'Refunded' },
        };
        
        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Check permissions for actions
    const canVerify = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCancel = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCheckIn = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bookings</h1>
                        <p className="text-muted-foreground">
                            Manage guest bookings and reservations
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowCalendar(true)}>
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Timeline Kalender
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl w-full">
                                <DialogHeader>
                                    <DialogTitle>Property Availability Timeline</DialogTitle>
                                </DialogHeader>
                                <AvailabilityCalendar bookings={bookings.data} properties={properties as any} />
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link href="/admin/bookings/calendar">
                                <Calendar className="h-4 w-4 mr-2" />
                                Calendar View
                            </Link>
                        </Button>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/admin/bookings/create">
                                <Plus className="h-4 w-4 mr-2" />
                                New Booking
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by guest name, booking number..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Booking Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending_verification">Pending</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                        <SelectItem value="checked_in">Checked In</SelectItem>
                                        <SelectItem value="checked_out">Checked Out</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Payment Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Payments</SelectItem>
                                        <SelectItem value="dp_pending">DP Pending</SelectItem>
                                        <SelectItem value="dp_received">DP Received</SelectItem>
                                        <SelectItem value="fully_paid">Fully Paid</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button onClick={handleSearch}>
                                    <Filter className="h-4 w-4 mr-2" />
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bookings Grid - Mobile */}
                <div className="block lg:hidden space-y-4">
                    {bookings.data.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
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
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Link>
                                            </DropdownMenuItem>
                                            
                                            {canVerify && booking.booking_status === 'pending_verification' && (
                                                <DropdownMenuItem onClick={() => handleVerify(booking)}>
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Verify
                                                </DropdownMenuItem>
                                            )}
                                            
                                            {canCheckIn && booking.booking_status === 'confirmed' && (
                                                <DropdownMenuItem onClick={() => handleCheckIn(booking)}>
                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                    Check In
                                                </DropdownMenuItem>
                                            )}
                                            
                                            {canCheckIn && booking.booking_status === 'checked_in' && (
                                                <DropdownMenuItem onClick={() => handleCheckOut(booking)}>
                                                    <UserX className="h-4 w-4 mr-2" />
                                                    Check Out
                                                </DropdownMenuItem>
                                            )}
                                            
                                            <DropdownMenuSeparator />
                                            
                                            {canCancel && ['pending_verification', 'confirmed'].includes(booking.booking_status) && (
                                                <DropdownMenuItem 
                                                    onClick={() => handleCancel(booking)}
                                                    className="text-destructive"
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Cancel
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{booking.property?.name}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <CalendarDays className="h-3 w-3" />
                                                <span className="text-xs">Check-in</span>
                                            </div>
                                            <p className="font-medium">{formatDate(booking.check_in)}</p>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <CalendarDays className="h-3 w-3" />
                                                <span className="text-xs">Check-out</span>
                                            </div>
                                            <p className="font-medium">{formatDate(booking.check_out)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                {booking.guest_count} guests
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 font-semibold">
                                           
                                            <span>{formatCurrency(booking.total_amount)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                                        <div className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            <span>{booking.guest_phone}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate">{booking.guest_email}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Bookings Table - Desktop */}
                <div className="hidden lg:block">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bookings List</CardTitle>
                            <CardDescription>
                                {bookings.total} total bookings
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Guest</TableHead>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Guests</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.data.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="font-medium">{booking.guest_name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {booking.booking_number}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {booking.guest_email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{booking.property?.name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="text-sm">
                                                        {formatDate(booking.check_in)} -
                                                    </div>
                                                    <div className="text-sm">
                                                        {formatDate(booking.check_out)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {booking.nights} nights
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {booking.guest_count} total
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {booking.guest_male}M/{booking.guest_female}F/{booking.guest_children}C
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {formatCurrency(booking.total_amount)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    DP: {formatCurrency(booking.dp_amount)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getBookingStatusBadge(booking.booking_status)}
                                            </TableCell>
                                            <TableCell>
                                                {getPaymentStatusBadge(booking.payment_status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        
                                                        {canVerify && booking.booking_status === 'pending_verification' && (
                                                            <DropdownMenuItem onClick={() => handleVerify(booking)}>
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Verify
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        {canCheckIn && booking.booking_status === 'confirmed' && (
                                                            <DropdownMenuItem onClick={() => handleCheckIn(booking)}>
                                                                <UserCheck className="h-4 w-4 mr-2" />
                                                                Check In
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        {canCheckIn && booking.booking_status === 'checked_in' && (
                                                            <DropdownMenuItem onClick={() => handleCheckOut(booking)}>
                                                                <UserX className="h-4 w-4 mr-2" />
                                                                Check Out
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        <DropdownMenuSeparator />
                                                        
                                                        {canCancel && ['pending_verification', 'confirmed'].includes(booking.booking_status) && (
                                                            <DropdownMenuItem 
                                                                onClick={() => handleCancel(booking)}
                                                                className="text-destructive"
                                                            >
                                                                <XCircle className="h-4 w-4 mr-2" />
                                                                Cancel
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Pagination */}
                {bookings.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            Showing {bookings.from} to {bookings.to} of {bookings.total} bookings
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {bookings.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {bookings.data.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                {filters.search || filters.status !== 'all' 
                                    ? 'Try adjusting your search criteria or filters'
                                    : 'No bookings have been made yet'
                                }
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
} 