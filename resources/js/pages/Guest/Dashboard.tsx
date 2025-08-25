import React from 'react';
import GuestLayout from '@/layouts/guest-layout';
import { formatCurrency } from '@/lib/utils';
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
        <GuestLayout title="Guest Dashboard" subtitle="Welcome to your personal booking portal">
            <Head title={`${t('nav.dashboard')} - Homsjogja`} />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Welcome Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                        Selamat datang, {auth.user.name}! 👋
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Kelola booking dan aktivitas Anda dengan mudah
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-all duration-300 border-2 border-blue-100 hover:border-blue-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">Booking Aktif</CardTitle>
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-700">{stats?.upcoming_bookings || 0}</div>
                            <p className="text-sm text-blue-600">Booking yang akan datang</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-all duration-300 border-2 border-green-100 hover:border-green-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-700">Total Booking</CardTitle>
                            <BookOpen className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-700">{stats?.total_bookings || 0}</div>
                            <p className="text-sm text-green-600">Semua booking Anda</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-all duration-300 border-2 border-purple-100 hover:border-purple-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-purple-700">Total Pengeluaran</CardTitle>
                            <DollarSign className="h-5 w-5 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-700">{formatCurrency(stats?.total_spent || 0)}</div>
                            <p className="text-sm text-purple-600">Total pengeluaran Anda</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2 text-blue-700">
                            <Zap className="h-6 w-6" />
                            Aksi Cepat
                        </CardTitle>
                        <CardDescription className="text-blue-600">Kelola booking dan pembayaran Anda</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Button asChild className="h-auto p-6 flex flex-col items-center gap-4 bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg">
                                <Link href={route('my-bookings') || '/my-bookings'}>
                                    <BookOpen className="h-10 w-10 text-blue-600" />
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-blue-700">My Bookings</div>
                                        <div className="text-sm text-blue-600 mt-1">Lihat semua reservasi</div>
                                    </div>
                                </Link>
                            </Button>
                            
                            <Button asChild className="h-auto p-6 flex flex-col items-center gap-4 bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-300 transition-all duration-300 shadow-md hover:shadow-lg">
                                <Link href={route('my-payments') || '/my-payments'}>
                                    <CreditCard className="h-10 w-10 text-green-600" />
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-green-700">Riwayat Pembayaran</div>
                                        <div className="text-sm text-green-600 mt-1">Lacak pembayaran Anda</div>
                                    </div>
                                </Link>
                            </Button>
                            
                            <Button asChild className="h-auto p-6 flex flex-col items-center gap-4 bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-300 transition-all duration-300 shadow-md hover:shadow-lg">
                                <Link href={route('properties.index') || '/properties'}>
                                    <Building2 className="h-10 w-10 text-purple-600" />
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-purple-700">Cari Properti</div>
                                        <div className="text-sm text-purple-600 mt-1">Temukan penginapan berikutnya</div>
                                    </div>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Bookings */}
                    <Card className="h-fit border-2 border-blue-100">
                        <CardHeader className="flex flex-row items-center justify-between bg-blue-50">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-blue-700">
                                    <Calendar className="h-5 w-5" />
                                    Booking Mendatang
                                </CardTitle>
                                <CardDescription className="text-blue-600">Reservasi yang sudah dikonfirmasi</CardDescription>
                            </div>
                            <Link href={route('my-bookings') || '/my-bookings'}>
                                <Button variant="outline" size="sm" className="flex items-center gap-1 border-blue-200 text-blue-700 hover:bg-blue-100">
                                    <Eye className="h-4 w-4" />
                                    Lihat Semua
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            {upcoming_bookings.length > 0 ? (
                                upcoming_bookings.slice(0, 3).map((booking) => {
                                    const daysUntil = getDaysUntilCheckIn(booking.check_in);
                                    return (
                                        <div key={booking.id} className="border-2 border-blue-100 rounded-xl p-4 space-y-3 hover:bg-blue-50/50 transition-all duration-300">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-2 flex-1">
                                                    <h4 className="font-bold text-lg text-blue-900">{booking.property?.name}</h4>
                                                    <div className="flex items-center gap-1 text-sm text-blue-700">
                                                        <MapPin className="h-4 w-4" />
                                                        {booking.property?.address}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-blue-600">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                                                    </div>
                                                </div>
                                                {getBookingStatusBadge(booking.booking_status)}
                                            </div>
                                            
                                            {daysUntil > 0 && daysUntil <= 7 && (
                                                <Alert className="bg-blue-100 border-blue-300">
                                                    <Info className="h-4 w-4 text-blue-700" />
                                                    <AlertDescription className="text-blue-800 font-medium">
                                                        Check-in {daysUntil === 1 ? 'besok' : `dalam ${daysUntil} hari`}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                            
                                            <div className="flex justify-between items-center text-sm pt-3 border-t border-blue-200">
                                                <span className="text-blue-700 font-medium">
                                                    {booking.guest_count} tamu • {booking.nights} malam
                                                </span>
                                                <div className="text-right">
                                                    <div className="font-bold text-xl text-blue-900">
                                                        {formatCurrency(booking.total_amount)}
                                                    </div>
                                                    <div className="text-xs text-blue-600">
                                                        Total pembayaran
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-blue-600">
                                    <Calendar className="h-20 w-20 mx-auto mb-4 opacity-40" />
                                    <p className="text-xl font-bold mb-2">Belum ada booking mendatang</p>
                                    <p className="text-sm mb-6">Siap untuk petualangan berikutnya?</p>
                                    <Link href={route('properties.index') || '/properties'}>
                                        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
                                            <Building2 className="h-5 w-5 mr-2" />
                                            Jelajahi Properti
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Payments */}
                    <Card className="h-fit border-2 border-green-100">
                        <CardHeader className="flex flex-row items-center justify-between bg-green-50">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <CreditCard className="h-5 w-5" />
                                    Pembayaran Terbaru
                                </CardTitle>
                                <CardDescription className="text-green-600">Riwayat pembayaran Anda</CardDescription>
                            </div>
                            <Link href={route('my-payments') || '/my-payments'}>
                                <Button variant="outline" size="sm" className="flex items-center gap-1 border-green-200 text-green-700 hover:bg-green-100">
                                    <Eye className="h-4 w-4" />
                                    Lihat Semua
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            {recent_payments.length > 0 ? (
                                recent_payments.slice(0, 3).map((payment) => (
                                    <div key={payment.id} className="border-2 border-green-100 rounded-xl p-4 hover:bg-green-50/50 transition-all duration-300">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2 flex-1">
                                                <h4 className="font-bold text-lg text-green-900">{payment.payment_number}</h4>
                                                <p className="text-sm text-green-700 font-medium">
                                                    {payment.booking.property.name}
                                                </p>
                                                <p className="text-xs text-green-600">
                                                    {formatDate(payment.payment_date)}
                                                </p>
                                            </div>
                                            <div className="text-right space-y-2">
                                                {getPaymentStatusBadge(payment.payment_status)}
                                                <p className="font-bold text-xl text-green-900">
                                                    {formatCurrency(payment.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-green-600">
                                    <CreditCard className="h-20 w-20 mx-auto mb-4 opacity-40" />
                                    <p className="text-xl font-bold mb-2">Belum ada riwayat pembayaran</p>
                                    <p className="text-sm">Pembayaran Anda akan muncul di sini</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                        </div>


                    </div>
        </GuestLayout>
    );
} 