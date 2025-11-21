import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
    BookingTimeline, 
    BookingStats, 
    BookingFilters, 
    BookingCard, 
    ViewModeToggle 
} from '@/components/booking';
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
    BarChart3,
    Grid3X3,
    List,
    TrendingUp,
    TrendingDown,
    Activity,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Download,
    Settings
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BookingsIndexProps {
    bookings: PaginatedData<Booking>;
    filters: {
        search?: string;
        status?: string;
        payment_status?: string;
        property_id?: string;
        sort?: string;
        date_from?: string;
        date_to?: string;
    };
    properties: Property[];
    statistics?: {
        total_bookings: number;
        confirmed_bookings: number;
        pending_bookings: number;
        cancelled_bookings: number;
        total_revenue: number;
        pending_revenue: number;
        check_ins_today: number;
        check_outs_today: number;
    };
}

export default function BookingsIndex({ bookings, filters, properties, statistics }: BookingsIndexProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [viewMode, setViewMode] = useState<'card' | 'table' | 'timeline'>('card');
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings' },
    ];

    // Check permissions for actions
    const canVerify = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCancel = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCheckIn = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canEdit = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role); // Only super admin can edit bookings

    // Action handlers
    const handleVerify = useCallback((booking: Booking) => {
        setLoadingActions(prev => ({ ...prev, [`verify-${booking.id}`]: true }));
        router.patch(`/admin/bookings/${booking.booking_number}/verify`, {
            notes: 'Booking verified and confirmed by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            },
            onError: (errors) => {
                console.error('Verify failed:', errors);
            },
            onFinish: () => {
                setLoadingActions(prev => ({ ...prev, [`verify-${booking.id}`]: false }));
            }
        });
    }, [auth.user.name]);

    const handleReject = useCallback((booking: Booking) => {
        setLoadingActions(prev => ({ ...prev, [`reject-${booking.id}`]: true }));
        router.patch(`/admin/bookings/${booking.booking_number}/reject`, {
            notes: 'Booking rejected by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            },
            onFinish: () => {
                setLoadingActions(prev => ({ ...prev, [`reject-${booking.id}`]: false }));
            }
        });
    }, [auth.user.name]);

    const handleCancel = useCallback((booking: Booking) => {
        if (confirm(`Are you sure you want to cancel booking "${booking.booking_number}"?`)) {
            setLoadingActions(prev => ({ ...prev, [`cancel-${booking.id}`]: true }));
            router.patch(`/admin/bookings/${booking.booking_number}/cancel`, {
                cancellation_reason: 'Cancelled by admin: ' + auth.user.name,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['bookings'] });
                },
                onFinish: () => {
                    setLoadingActions(prev => ({ ...prev, [`cancel-${booking.id}`]: false }));
                }
            });
        }
    }, [auth.user.name]);

    const handleCheckIn = useCallback((booking: Booking) => {
        setLoadingActions(prev => ({ ...prev, [`checkin-${booking.id}`]: true }));
        router.patch(`/admin/bookings/${booking.booking_number}/checkin`, {
            notes: 'Booking checked in by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            },
            onFinish: () => {
                setLoadingActions(prev => ({ ...prev, [`checkin-${booking.id}`]: false }));
            }
        });
    }, [auth.user.name]);

    const handleCheckOut = useCallback((booking: Booking) => {
        setLoadingActions(prev => ({ ...prev, [`checkout-${booking.id}`]: true }));
        router.patch(`/admin/bookings/${booking.booking_number}/checkout`, {
            notes: 'Booking checked out by ' + auth.user.name,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['bookings'] });
            },
            onFinish: () => {
                setLoadingActions(prev => ({ ...prev, [`checkout-${booking.id}`]: false }));
            }
        });
    }, [auth.user.name]);

    const handleFiltersChange = useCallback((newFilters: any) => {
        router.get('/admin/bookings', newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        router.reload({
            only: ['bookings', 'statistics'],
            onFinish: () => setIsRefreshing(false),
        });
    }, []);

    const handleExport = useCallback(() => {
        // Export functionality can be implemented here
        alert('Export functionality will be implemented');
    }, []);

    // Utility functions
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
        const statusConfig: Record<string, { variant: 'secondary' | 'default' | 'destructive' | 'outline', label: string }> = {
            dp_pending: { variant: 'secondary', label: 'DP Pending' },
            dp_paid: { variant: 'default', label: 'DP Paid' },
            fully_paid: { variant: 'default', label: 'Fully Paid' },
        };
        
        const config = statusConfig[status] || { variant: 'outline' as const, label: status };
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
        <AdminLayout breadcrumbs={breadcrumbs} title="Booking Management" subtitle="Manage all property bookings">
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
                        <p className="text-gray-600 mt-1">
                            Manage guest bookings, reservations, and calendar timeline
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <ViewModeToggle 
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                        <Button variant="outline" asChild size="sm">
                            <Link href="/admin/bookings/create">
                                <Plus className="h-4 w-4 mr-2" />
                                New Booking
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Statistics */}
                {statistics && (
                    <BookingStats statistics={statistics} />
                )}

                {/* Filters */}
                <BookingFilters 
                    filters={filters}
                    properties={properties}
                    totalBookings={bookings.total}
                    onFiltersChange={handleFiltersChange}
                />

                {/* Content based on view mode */}
                {viewMode === 'timeline' ? (
                    /* Timeline View */
                    <div className="space-y-4">
                        <BookingTimeline
                            properties={properties}
                            bookings={bookings.data}
                            days={14}
                            canVerify={canVerify}
                            canCancel={canCancel}
                            canCheckIn={canCheckIn}
                            onRefresh={handleRefresh}
                        />
                    </div>
                ) : viewMode === 'card' ? (
                    /* Card View */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {bookings.data.map((booking) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                onVerify={handleVerify}
                                onReject={handleReject}
                                onCancel={handleCancel}
                                onCheckIn={handleCheckIn}
                                onCheckOut={handleCheckOut}
                                loadingActions={loadingActions}
                                canVerify={canVerify}
                                canCancel={canCancel}
                                canCheckIn={canCheckIn}
                            />
                        ))}
                    </div>
                ) : (
                    /* Table View */
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Guest</TableHead>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.data.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{booking.guest_name}</div>
                                                    <div className="text-sm text-muted-foreground">{booking.booking_number}</div>
                                                    <div className="text-xs text-muted-foreground">{booking.guest_email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{booking.property?.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</div>
                                                    <div className="text-muted-foreground">
                                                        {booking.guest_count} guests • {booking.nights} nights
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getBookingStatusBadge(booking.booking_status)}
                                            </TableCell>
                                            <TableCell>
                                                {getPaymentStatusBadge(booking.payment_status)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-right">
                                                    <div className="font-semibold">{formatCurrency(booking.total_amount)}</div>
                                                    <div className="text-xs text-muted-foreground">DP: {formatCurrency(booking.dp_amount)}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button asChild size="sm" variant="outline">
                                                        <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>

                                                    {canVerify && booking.booking_status === 'pending_verification' && (
                                                        <Button 
                                                            onClick={() => handleVerify(booking)}
                                                            size="sm"
                                                            variant="default"
                                                            disabled={loadingActions[`verify-${booking.id}`]}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/admin/bookings/${booking.booking_number}`}>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    View Details
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            
                                                            {canEdit && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/bookings/${booking.booking_number}/edit`}>
                                                                        <Edit className="h-4 w-4 mr-2" />
                                                                        Edit Booking
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            
                                                            {canVerify && booking.booking_status === 'pending_verification' && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleVerify(booking)}>
                                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                                        Verify
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleReject(booking)}>
                                                                        <XCircle className="h-4 w-4 mr-2" />
                                                                        Reject
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            
                                                            {canCheckIn && booking.payment_status === 'fully_paid' && (
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
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {bookings.last_page > 1 && viewMode !== 'timeline' && (
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
                            <Button asChild>
                                <Link href="/admin/bookings/create">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Booking
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
} 