import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type Booking, type BreadcrumbItem, type PageProps } from '@/types';
import { Link, usePage, Head } from '@inertiajs/react';
import { 
    Calendar,
    MapPin,
    Clock,
    Users,
    CheckCircle,
    AlertCircle,
    Info,
    Building2,
    CreditCard,
    BookOpen,
    DollarSign,
    Eye,
    Star,
    ArrowRight,
    Activity,
    Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GuestDashboardProps {
    upcoming_bookings: Booking[];
    past_bookings: Booking[];
    recent_payments: Array<{
        id: number;
        payment_number: string;
        amount: number;
        payment_status: string;
        payment_date: string;
        booking: {
            booking_number: string;
        property: {
                name: string;
            };
        };
    }>;
    stats: {
        total_bookings: number;
        total_spent: number;
        upcoming_bookings: number;
        completed_bookings: number;
    };
}

export default function GuestDashboard({ upcoming_bookings = [], past_bookings = [], recent_payments = [], stats }: GuestDashboardProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' },
        { title: t('nav.dashboard'), href: route('dashboard') }
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getBookingStatusBadge = (status: Booking['booking_status']) => {
        const statusConfig = {
            pending_verification: { variant: 'secondary' as const, label: t('booking_status.pending_verification'), icon: Clock },
            confirmed: { variant: 'default' as const, label: t('booking_status.confirmed'), icon: CheckCircle },
            checked_in: { variant: 'default' as const, label: t('booking_status.checked_in'), icon: Users },
            checked_out: { variant: 'outline' as const, label: t('booking_status.checked_out'), icon: CheckCircle },
            cancelled: { variant: 'destructive' as const, label: t('booking_status.cancelled'), icon: AlertCircle },
            completed: { variant: 'default' as const, label: t('booking_status.completed'), icon: CheckCircle },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_verification;
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getPaymentStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { variant: 'secondary' as const, label: t('payment.status.pending'), icon: Clock },
            verified: { variant: 'default' as const, label: t('payment.status.verified'), icon: CheckCircle },
            failed: { variant: 'destructive' as const, label: t('payment.status.failed'), icon: AlertCircle },
            cancelled: { variant: 'outline' as const, label: t('payment.status.cancelled'), icon: AlertCircle },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getDaysUntilCheckIn = (checkInDate: string) => {
        const checkIn = new Date(checkInDate);
        const today = new Date();
        const diffTime = checkIn.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
                            <Head title={`${t('nav.dashboard')} - Homsjogja`} />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Welcome Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Welcome back, {auth.user.name}!
                        </h1>
                        <p className="text-muted-foreground">
                            Here's an overview of your bookings and activity
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button asChild className="w-full sm:w-auto">
                            <Link href={route('properties.index') || '/properties'}>
                                <Building2 className="h-4 w-4 mr-2" />
                                Browse Properties
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_bookings || 0}</div>
                            <p className="text-xs text-muted-foreground">All time bookings</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Upcoming Stays</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.upcoming_bookings || 0}</div>
                            <p className="text-xs text-muted-foreground">Confirmed bookings</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Stays</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.completed_bookings || 0}</div>
                            <p className="text-xs text-muted-foreground">Successful stays</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats?.total_spent || 0)}</div>
                            <p className="text-xs text-muted-foreground">All time spending</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-blue-600" />
                            Quick Actions
                        </CardTitle>
                        <CardDescription>Manage your bookings and payments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                                <Link href={route('my-bookings') || '/my-bookings'}>
                                    <BookOpen className="h-8 w-8 text-blue-600" />
                                    <div className="text-center">
                                        <div className="font-medium text-base">My Bookings</div>
                                        <div className="text-xs text-muted-foreground mt-1">View all your reservations</div>
                                </div>
                                </Link>
                            </Button>
                            
                            <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-green-50 hover:border-green-200 transition-colors">
                                <Link href={route('my-payments') || '/my-payments'}>
                                    <CreditCard className="h-8 w-8 text-green-600" />
                                    <div className="text-center">
                                        <div className="font-medium text-base">Payment History</div>
                                        <div className="text-xs text-muted-foreground mt-1">Track your payments</div>
                            </div>
                                </Link>
                            </Button>
                            
                            <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-purple-50 hover:border-purple-200 transition-colors">
                                <Link href={route('properties.index') || '/properties'}>
                                    <Building2 className="h-8 w-8 text-purple-600" />
                                    <div className="text-center">
                                        <div className="font-medium text-base">Browse Properties</div>
                                        <div className="text-xs text-muted-foreground mt-1">Find your next stay</div>
                            </div>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Bookings */}
                    <Card className="h-fit">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    Upcoming Bookings
                                </CardTitle>
                                <CardDescription>Your confirmed reservations</CardDescription>
                            </div>
                            <Link href={route('my-bookings') || '/my-bookings'}>
                                <Button variant="outline" size="sm" className="flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    View All
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                                </CardHeader>
                                <CardContent className="space-y-4">
                            {upcoming_bookings.length > 0 ? (
                                upcoming_bookings.slice(0, 3).map((booking) => {
                                    const daysUntil = getDaysUntilCheckIn(booking.check_in);
                                    return (
                                        <div key={booking.id} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1 flex-1">
                                                    <h4 className="font-medium text-base">{booking.property?.name}</h4>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        {booking.property?.address}
                                        </div>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                                        </div>
                                    </div>
                                                {getBookingStatusBadge(booking.booking_status)}
                                            </div>
                                            
                                            {daysUntil > 0 && daysUntil <= 7 && (
                                                <Alert className="bg-blue-50 border-blue-200">
                                                    <Info className="h-4 w-4 text-blue-600" />
                                                    <AlertDescription className="text-blue-800">
                                                        Check-in {daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                            
                                            <div className="flex justify-between items-center text-sm pt-2 border-t">
                                                <span className="text-muted-foreground">
                                                    {booking.guest_count} guests • {booking.nights} nights
                                                </span>
                                                <span className="font-medium text-lg">
                                                    {formatCurrency(booking.total_amount)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-2">No upcoming bookings</p>
                                    <p className="text-sm mb-4">Ready for your next adventure?</p>
                                    <Link href={route('properties.index') || '/properties'}>
                                        <Button className="mt-2">
                                            <Building2 className="h-4 w-4 mr-2" />
                                            Explore Properties
                                        </Button>
                                    </Link>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                    {/* Recent Payments */}
                    <Card className="h-fit">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    Recent Payments
                                </CardTitle>
                                <CardDescription>Your payment history</CardDescription>
                            </div>
                            <Link href={route('my-payments') || '/my-payments'}>
                                <Button variant="outline" size="sm" className="flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    View All
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                                </CardHeader>
                                <CardContent className="space-y-4">
                            {recent_payments.length > 0 ? (
                                recent_payments.slice(0, 5).map((payment) => (
                                    <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="space-y-1 flex-1">
                                                <h4 className="font-medium">{payment.payment_number}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {payment.booking.property.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(payment.payment_date)}
                                                </p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                {getPaymentStatusBadge(payment.payment_status)}
                                                <p className="font-medium text-lg">
                                                    {formatCurrency(payment.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-2">No payment history</p>
                                    <p className="text-sm">Your payments will appear here</p>
                                    </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                {/* Recent Stays */}
                {past_bookings.length > 0 && (
                            <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                    <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-purple-600" />
                                    Recent Stays
                                    </CardTitle>
                                <CardDescription>Your completed bookings</CardDescription>
                            </div>
                            <Link href={route('my-bookings', { status: 'completed' }) || '/my-bookings?status=completed'}>
                                <Button variant="outline" size="sm" className="flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    View All
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                                </CardHeader>
                                <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {past_bookings.slice(0, 6).map((booking) => (
                                    <div key={booking.id} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start">
                                            <div className="space-y-1 flex-1">
                                                <h4 className="font-medium">{booking.property?.name}</h4>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                                                </div>
                                            </div>
                                            {getBookingStatusBadge(booking.booking_status)}
                            </div>
                            
                                        <div className="flex justify-between items-center text-sm pt-2 border-t">
                                            <span className="text-muted-foreground">
                                                {booking.guest_count} guests • {booking.nights} nights
                                            </span>
                                            <span className="font-medium">
                                                {formatCurrency(booking.total_amount)}
                                            </span>
                            </div>
                            
                                        {booking.booking_status === 'checked_out' && (
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Star className="h-4 w-4 mr-2" />
                                                Write Review
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
} 