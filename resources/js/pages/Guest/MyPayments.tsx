import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    CreditCard,
    Download,
    Search,
    Filter,
    Eye,
    ExternalLink,
    Phone,
    Mail,
    Building2,
    CheckCircle,
    AlertCircle,
    Home,
    DollarSign,
    Receipt,
    FileText,
    Info,
    Calendar,
    Clock,
    User,
    MapPin
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { useTranslation } from 'react-i18next';
import { PageProps, BreadcrumbItem } from '@/types';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    cover_image?: string;
}

interface Booking {
    id: number;
    booking_number: string;
    property: Property;
    check_in: string;
    check_out: string;
    guest_name: string;
    total_amount: number;
    booking_status: string;
}

interface PaymentMethod {
    id: number;
    name: string;
    type: string;
    account_number?: string;
    account_name?: string;
}

interface Payment {
    id: number;
    payment_number: string;
    booking: Booking;
    amount: number;
    payment_type: string;
    payment_status: string;
    payment_date: string;
    due_date?: string;
    payment_method?: PaymentMethod;
    verification_notes?: string;
    verified_by?: string;
    verified_at?: string;
    payment_proof?: string;
    admin_notes?: string;
    created_at: string;
}

interface MyPaymentsProps {
    payments: {
        data: Payment[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        prev_page_url?: string;
        next_page_url?: string;
    };
    filters: {
        search?: string;
        status?: string;
        type?: string;
    };
}

export default function MyPayments({ payments, filters }: MyPaymentsProps) {
    const page = usePage<PageProps>();
    const { t } = useTranslation();
    const [localFilters, setLocalFilters] = useState({
        search: filters.search || '',
        status: filters.status || '',
        type: filters.type || '',
    });

    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') },
        { title: t('nav.my_payments'), href: route('my-payments') }
    ];

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            case 'refunded': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'down_payment': return 'bg-blue-100 text-blue-800';
            case 'full_payment': return 'bg-green-100 text-green-800';
            case 'remaining_payment': return 'bg-orange-100 text-orange-800';
            case 'additional_payment': return 'bg-purple-100 text-purple-800';
            case 'refund': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleSearch = () => {
        const params: any = {};
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.status) params.status = localFilters.status;
        if (localFilters.type) params.type = localFilters.type;

        router.get(route('my-payments'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({
            search: '',
            status: '',
            type: '',
        });
        router.get(route('my-payments'));
    };

    const handleViewDetails = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowDetails(true);
    };

    const isOverdue = (payment: Payment) => {
        if (!payment.due_date || payment.payment_status === 'verified') return false;
        return new Date(payment.due_date) < new Date();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
                            <Head title={`${t('payment.title')} - Homsjogja`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{t('payment.title')}</h1>
                                <p className="text-gray-600 mt-1">
                                    {payments.total} {t('payment.payment_history').toLowerCase()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link href={route('my-bookings')}>
                                    <Button variant="outline">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        {t('nav.my_bookings')}
                                    </Button>
                                </Link>
                                <Link href={route('dashboard')}>
                                    <Button variant="outline">
                                        <Home className="h-4 w-4 mr-2" />
                                        {t('nav.dashboard')}
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={t('payment.filter.search_placeholder')}
                                    value={localFilters.search}
                                    onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="pl-10"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>

                            <Select value={localFilters.status || "all"} onValueChange={(value) => 
                                setLocalFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))
                            }>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder={t('payment.filter.payment_status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('payment.all_status')}</SelectItem>
                                    <SelectItem value="pending">{t('payment.status.pending')}</SelectItem>
                                    <SelectItem value="verified">{t('payment.status.verified')}</SelectItem>
                                    <SelectItem value="failed">{t('payment.status.failed')}</SelectItem>
                                    <SelectItem value="cancelled">{t('payment.status.cancelled')}</SelectItem>
                                    <SelectItem value="refunded">{t('payment.status.refunded')}</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={localFilters.type || "all"} onValueChange={(value) => 
                                setLocalFilters(prev => ({ ...prev, type: value === "all" ? "" : value }))
                            }>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder={t('payment.filter.payment_type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('payment.all_types')}</SelectItem>
                                    <SelectItem value="down_payment">{t('payment.type.down_payment')}</SelectItem>
                                    <SelectItem value="full_payment">{t('payment.type.full_payment')}</SelectItem>
                                    <SelectItem value="remaining_payment">{t('payment.type.remaining_payment')}</SelectItem>
                                    <SelectItem value="additional_payment">{t('payment.type.additional_payment')}</SelectItem>
                                    <SelectItem value="refund">{t('payment.type.refund')}</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                                <Button onClick={handleSearch}>
                                    {t('common.search')}
                                </Button>
                                <Button variant="outline" onClick={clearFilters}>
                                    {t('payment.clear_filters')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payments List */}
                <div className="container mx-auto px-4 py-8">
                    {payments.data.length > 0 ? (
                        <div className="space-y-6">
                            {payments.data.map((payment) => (
                                <Card key={payment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold">
                                                        {payment.payment_number}
                                                    </h3>
                                                    <Badge className={getStatusColor(payment.payment_status)}>
                                                        {t(`payment.status.${payment.payment_status}`)}
                                                    </Badge>
                                                    <Badge className={getTypeColor(payment.payment_type)}>
                                                        {t(`payment.type.${payment.payment_type}`)}
                                                    </Badge>
                                                    {isOverdue(payment) && (
                                                        <Badge variant="destructive">
                                                            {t('payment.status.overdue')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Link href={`/my-bookings?search=${payment.booking.booking_number}`} className="text-blue-600 hover:underline">
                                                    <h4 className="font-medium text-lg text-blue-600">
                                                        {payment.booking.booking_number}
                                                    </h4>
                                                </Link>
                                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                                    <Building2 className="h-4 w-4 mr-1" />
                                                    <span>{payment.booking.property.name}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {formatCurrency(payment.amount)}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {formatDate(payment.payment_date)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <div>
                                                    <p className="text-sm font-medium">{t('payment.payment_date')}</p>
                                                    <p className="text-sm text-gray-600">{formatDate(payment.payment_date)}</p>
                                                </div>
                                            </div>
                                            {payment.due_date && (
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">{t('payment.due_date')}</p>
                                                        <p className="text-sm text-gray-600">{formatDate(payment.due_date)}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-gray-500" />
                                                <div>
                                                    <p className="text-sm font-medium">{t('payment.payment_method')}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {payment.payment_method?.name || 'Manual'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <div>
                                                    <p className="text-sm font-medium">{t('common.total')}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {formatCurrency(payment.booking.total_amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Alerts */}
                                        {payment.payment_status === 'pending' && (
                                            <Alert className="mb-4">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Payment is being verified. This may take up to 24 hours.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {payment.payment_status === 'failed' && (
                                            <Alert variant="destructive" className="mb-4">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Payment failed. Please contact support or make a new payment.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {payment.verified_at && (
                                            <Alert className="mb-4">
                                                <CheckCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Verified on {formatDateTime(payment.verified_at)}
                                                    {payment.verified_by && ` by ${payment.verified_by}`}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(payment)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    {t('payment.view_details')}
                                                </Button>
                                                <Link href={`/properties/${payment.booking.property.slug}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Building2 className="h-4 w-4 mr-2" />
                                                        {t('nav.properties')}
                                                    </Button>
                                                </Link>
                                                {payment.payment_status === 'verified' && (
                                                    <Button variant="outline" size="sm">
                                                        <Download className="h-4 w-4 mr-2" />
                                                        {t('payment.download_receipt')}
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                {payment.payment_status === 'failed' && (
                                                    <Button size="sm">
                                                        <CreditCard className="h-4 w-4 mr-2" />
                                                        {t('payment.make_payment')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Pagination */}
                            {payments.last_page > 1 && (
                                <div className="flex justify-center mt-8">
                                    <div className="flex items-center gap-2">
                                        {payments.prev_page_url && (
                                            <Link href={payments.prev_page_url}>
                                                <Button variant="outline">{t('common.back')}</Button>
                                            </Link>
                                        )}

                                        <span className="px-4 py-2 text-sm text-gray-600">
                                            Page {payments.current_page} of {payments.last_page}
                                        </span>

                                        {payments.next_page_url && (
                                            <Link href={payments.next_page_url}>
                                                <Button variant="outline">{t('common.next')}</Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    {t('payment.no_payments')}
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {filters.search || filters.status || filters.type
                                        ? 'Try adjusting your search criteria or filters'
                                        : t('payment.no_payments_message')
                                    }
                                </p>
                                <div className="flex gap-2 justify-center">
                                    {(filters.search || filters.status || filters.type) && (
                                        <Button onClick={clearFilters} variant="outline">
                                            {t('payment.clear_filters')}
                                        </Button>
                                    )}
                                    <Link href="/properties">
                                        <Button>
                                            {t('payment.browse_properties')}
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Payment Details Modal */}
                <Dialog open={showDetails} onOpenChange={setShowDetails}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {t('payment.details.payment_details')} - {selectedPayment?.payment_number}
                            </DialogTitle>
                        </DialogHeader>
                        
                        {selectedPayment && (
                            <div className="space-y-6">
                                {/* Payment Status */}
                                <div className="flex items-center gap-3">
                                    <Badge className={getStatusColor(selectedPayment.payment_status)}>
                                        {t(`payment.status.${selectedPayment.payment_status}`)}
                                    </Badge>
                                    <Badge className={getTypeColor(selectedPayment.payment_type)}>
                                        {t(`payment.type.${selectedPayment.payment_type}`)}
                                    </Badge>
                                    {isOverdue(selectedPayment) && (
                                        <Badge variant="destructive">
                                            {t('payment.status.overdue')}
                                        </Badge>
                                    )}
                                </div>

                                {/* Booking Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            {t('payment.details.booking_information')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">{t('payment.booking_number')}</p>
                                                <p className="text-lg">{selectedPayment.booking.booking_number}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">{t('payment.property')}</p>
                                                <p className="text-lg">{selectedPayment.booking.property.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">{t('booking.check_in')}</p>
                                                <p className="text-lg">{formatDate(selectedPayment.booking.check_in)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">{t('booking.check_out')}</p>
                                                <p className="text-lg">{formatDate(selectedPayment.booking.check_out)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Booking Status</p>
                                                <p className="text-lg">{t(`booking_status.${selectedPayment.booking.booking_status}`)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">{t('pricing.total_price')}</p>
                                                <p className="text-lg font-bold">{formatCurrency(selectedPayment.booking.total_amount)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            {t('payment.details.payment_information')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">{t('payment.payment_number')}</p>
                                                    <p className="text-lg">{selectedPayment.payment_number}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">{t('payment.amount')}</p>
                                                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedPayment.amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">{t('payment.payment_type')}</p>
                                                    <p className="text-lg">{t(`payment.type.${selectedPayment.payment_type}`)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">{t('payment.payment_date')}</p>
                                                    <p className="text-lg">{formatDateTime(selectedPayment.payment_date)}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                {selectedPayment.due_date && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600">{t('payment.due_date')}</p>
                                                        <p className="text-lg">{formatDate(selectedPayment.due_date)}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">{t('payment.payment_method')}</p>
                                                    <p className="text-lg">{selectedPayment.payment_method?.name || 'Manual Transfer'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">{t('payment.details.verification_status')}</p>
                                                    <p className="text-lg">{t(`payment.status.${selectedPayment.payment_status}`)}</p>
                                                </div>
                                                {selectedPayment.verified_at && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600">{t('payment.details.verified_at')}</p>
                                                        <p className="text-lg">{formatDateTime(selectedPayment.verified_at)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedPayment.verification_notes && (
                                            <div className="mt-6">
                                                <p className="text-sm font-medium text-gray-600">{t('payment.details.notes')}</p>
                                                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-sm">{selectedPayment.verification_notes}</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedPayment.admin_notes && (
                                            <div className="mt-4">
                                                <p className="text-sm font-medium text-gray-600">{t('payment.details.admin_notes')}</p>
                                                <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                                                    <p className="text-sm">{selectedPayment.admin_notes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Payment Proof */}
                                {selectedPayment.payment_proof && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <FileText className="h-5 w-5" />
                                                {t('payment.details.payment_proof')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-gray-600">{t('payment.details.uploaded_proof')}</p>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Proof
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
} 