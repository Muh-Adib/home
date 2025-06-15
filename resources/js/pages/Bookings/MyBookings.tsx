import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
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
    Star,
    MessageSquare
} from 'lucide-react';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    cover_image?: string;
}

interface Payment {
    id: number;
    payment_number: string;
    amount: number;
    payment_type: string;
    payment_status: string;
    payment_date: string;
    due_date?: string;
    paymentMethod?: {
        name: string;
        type: string;
    };
}

interface Booking {
    id: number;
    booking_number: string;
    property: Property;
    check_in: string;
    check_out: string;
    guest_count: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country?: string;
    guest_breakdown_male: number;
    guest_breakdown_female: number;
    guest_breakdown_children: number;
    total_amount: number;
    booking_status: string;
    payment_status: string;
    special_requests?: string;
    created_at: string;
    payment_link?: string;
    payments?: Payment[];
    nights: number;
    can_cancel: boolean;
    can_review: boolean;
}

interface MyBookingsProps {
    bookings: {
        data: Booking[];
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
        payment_status?: string;
    };
}

export default function MyBookings({ bookings, filters }: MyBookingsProps) {
    const [localFilters, setLocalFilters] = useState({
        search: filters.search || '',
        status: filters.status || '',
        payment_status: filters.payment_status || '',
    });

    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [showDetails, setShowDetails] = useState(false);

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
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending_verification': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'checked_in': return 'bg-blue-100 text-blue-800';
            case 'checked_out': return 'bg-purple-100 text-purple-800';
            case 'completed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'fully_paid': return 'bg-green-100 text-green-800';
            case 'dp_received': return 'bg-blue-100 text-blue-800';
            case 'dp_pending': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'refunded': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending_verification': return 'Menunggu Verifikasi';
            case 'confirmed': return 'Dikonfirmasi';
            case 'cancelled': return 'Dibatalkan';
            case 'checked_in': return 'Check-in';
            case 'checked_out': return 'Check-out';
            case 'completed': return 'Selesai';
            default: return status;
        }
    };

    const getPaymentStatusText = (status: string) => {
        switch (status) {
            case 'dp_pending': return 'Menunggu DP';
            case 'dp_received': return 'DP Diterima';
            case 'fully_paid': return 'Lunas';
            case 'overdue': return 'Terlambat';
            case 'refunded': return 'Dikembalikan';
            default: return status;
        }
    };

    const handleSearch = () => {
        const params: any = {};
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.status) params.status = localFilters.status;
        if (localFilters.payment_status) params.payment_status = localFilters.payment_status;

        router.get(route('my-bookings'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({
            search: '',
            status: '',
            payment_status: '',
        });
        router.get(route('my-bookings'));
    };

    const handleViewDetails = (booking: Booking) => {
        setSelectedBooking(booking);
        setShowDetails(true);
    };

    const getDaysUntilCheckIn = (checkInDate: string) => {
        const checkIn = new Date(checkInDate);
        const today = new Date();
        const diffTime = checkIn.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const canMakePayment = (booking: Booking) => {
        return booking.booking_status === 'confirmed' && 
               ['dp_pending', 'dp_received'].includes(booking.payment_status) &&
               booking.payment_link;
    };

    const getPaidAmount = (booking: Booking) => {
        if (!booking.payments) return 0;
        return booking.payments
            .filter(p => p.payment_status === 'verified')
            .reduce((sum, p) => sum + p.amount, 0);
    };

    const getRemainingAmount = (booking: Booking) => {
        return booking.total_amount - getPaidAmount(booking);
    };

    return (
        <>
            <Head title="My Bookings - Property Management System" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
                                <p className="text-gray-600 mt-1">
                                    {bookings.total} bookings total
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/dashboard">
                                    <Button variant="outline">
                                        <Home className="h-4 w-4 mr-2" />
                                        Dashboard
                                    </Button>
                                </Link>
                                <Link href="/">
                                    <Button variant="outline">
                                        Back to Home
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by booking number or property name..."
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
                                    <SelectValue placeholder="Booking Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending_verification">Menunggu Verifikasi</SelectItem>
                                    <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                                    <SelectItem value="checked_in">Check-in</SelectItem>
                                    <SelectItem value="checked_out">Check-out</SelectItem>
                                    <SelectItem value="completed">Selesai</SelectItem>
                                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={localFilters.payment_status || "all"} onValueChange={(value) => 
                                setLocalFilters(prev => ({ ...prev, payment_status: value === "all" ? "" : value }))
                            }>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Payment Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Payments</SelectItem>
                                    <SelectItem value="dp_pending">Menunggu DP</SelectItem>
                                    <SelectItem value="dp_received">DP Diterima</SelectItem>
                                    <SelectItem value="fully_paid">Lunas</SelectItem>
                                    <SelectItem value="overdue">Terlambat</SelectItem>
                                    <SelectItem value="refunded">Dikembalikan</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                                <Button onClick={handleSearch}>
                                    Search
                                </Button>
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bookings List */}
                <div className="container mx-auto px-4 py-8">
                    {bookings.data.length > 0 ? (
                        <div className="space-y-6">
                            {bookings.data.map((booking) => {
                                const daysUntilCheckIn = getDaysUntilCheckIn(booking.check_in);
                                const paidAmount = getPaidAmount(booking);
                                const remainingAmount = getRemainingAmount(booking);

                                return (
                                    <Card key={booking.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-semibold">
                                                            {booking.booking_number}
                                                        </h3>
                                                        <Badge className={getStatusColor(booking.booking_status)}>
                                                            {getStatusText(booking.booking_status)}
                                                        </Badge>
                                                        <Badge className={getPaymentStatusColor(booking.payment_status)}>
                                                            {getPaymentStatusText(booking.payment_status)}
                                                        </Badge>
                                                        {booking.booking_status === 'confirmed' && daysUntilCheckIn > 0 && daysUntilCheckIn <= 7 && (
                                                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                                                                {daysUntilCheckIn === 1 ? 'Check-in besok' : `${daysUntilCheckIn} hari lagi`}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Link href={`/properties/${booking.property.slug}`} className="text-blue-600 hover:underline">
                                                        <h4 className="font-medium text-lg text-blue-600">{booking.property.name}</h4>
                                                    </Link>
                                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                                        <MapPin className="h-4 w-4 mr-1" />
                                                        <span>{booking.property.address}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {formatCurrency(booking.total_amount)}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {booking.nights} nights
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">Check-in</p>
                                                        <p className="text-sm text-gray-600">{formatDate(booking.check_in)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">Check-out</p>
                                                        <p className="text-sm text-gray-600">{formatDate(booking.check_out)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">Guests</p>
                                                        <p className="text-sm text-gray-600">
                                                            {booking.guest_count} guests 
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                ({booking.guest_breakdown_male}M, {booking.guest_breakdown_female}F, {booking.guest_breakdown_children}C)
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">Payment</p>
                                                        <p className="text-sm text-gray-600">
                                                            {formatCurrency(paidAmount)} / {formatCurrency(booking.total_amount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Information */}
                                            {booking.payment_status !== 'fully_paid' && remainingAmount > 0 && (
                                                <Alert className="mb-4">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        Outstanding payment: {formatCurrency(remainingAmount)}
                                                        {booking.payment_status === 'dp_pending' && ' (Down Payment required)'}
                                                        {booking.payment_status === 'dp_received' && ' (Remaining payment)'}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex items-center justify-between pt-4 border-t">
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(booking)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </Button>
                                                    <Link href={`/properties/${booking.property.slug}`}>
                                                        <Button variant="outline" size="sm">
                                                            <Building2 className="h-4 w-4 mr-2" />
                                                            View Property
                                                        </Button>
                                                    </Link>
                                                    {booking.can_review && (
                                                        <Button variant="outline" size="sm">
                                                            <Star className="h-4 w-4 mr-2" />
                                                            Write Review
                                                        </Button>
                                                    )}
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    {canMakePayment(booking) && (
                                                        <Link href={booking.payment_link!}>
                                                            <Button size="sm">
                                                                <CreditCard className="h-4 w-4 mr-2" />
                                                                Make Payment
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    {booking.can_cancel && (
                                                        <Button variant="destructive" size="sm">
                                                            Cancel Booking
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {/* Pagination */}
                            {bookings.last_page > 1 && (
                                <div className="flex justify-center mt-8">
                                    <div className="flex items-center gap-2">
                                        {bookings.prev_page_url && (
                                            <Link href={bookings.prev_page_url}>
                                                <Button variant="outline">Previous</Button>
                                            </Link>
                                        )}

                                        <span className="px-4 py-2 text-sm text-gray-600">
                                            Page {bookings.current_page} of {bookings.last_page}
                                        </span>

                                        {bookings.next_page_url && (
                                            <Link href={bookings.next_page_url}>
                                                <Button variant="outline">Next</Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    No bookings found
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {filters.search || filters.status || filters.payment_status
                                        ? 'Try adjusting your search criteria or filters'
                                        : 'You haven\'t made any bookings yet'
                                    }
                                </p>
                                <div className="flex gap-2 justify-center">
                                    {(filters.search || filters.status || filters.payment_status) && (
                                        <Button onClick={clearFilters} variant="outline">
                                            Clear Filters
                                        </Button>
                                    )}
                                    <Link href="/properties">
                                        <Button>
                                            Browse Properties
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Booking Details Modal */}
                <Dialog open={showDetails} onOpenChange={setShowDetails}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Booking Details - {selectedBooking?.booking_number}
                            </DialogTitle>
                        </DialogHeader>
                        
                        {selectedBooking && (
                            <div className="space-y-6">
                                {/* Booking Status */}
                                <div className="flex items-center gap-3">
                                    <Badge className={getStatusColor(selectedBooking.booking_status)}>
                                        {getStatusText(selectedBooking.booking_status)}
                                    </Badge>
                                    <Badge className={getPaymentStatusColor(selectedBooking.payment_status)}>
                                        {getPaymentStatusText(selectedBooking.payment_status)}
                                    </Badge>
                                </div>

                                {/* Property Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5" />
                                            Property Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="font-medium text-lg">{selectedBooking.property.name}</p>
                                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {selectedBooking.property.address}
                                                </div>
                                            </div>
                                            <div className="text-right md:text-left">
                                                <Link href={`/properties/${selectedBooking.property.slug}`}>
                                                    <Button variant="outline" size="sm">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        View Property
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Booking Details */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Booking Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Check-in Date</p>
                                                    <p className="text-lg">{formatDate(selectedBooking.check_in)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Check-out Date</p>
                                                    <p className="text-lg">{formatDate(selectedBooking.check_out)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Duration</p>
                                                    <p className="text-lg">{selectedBooking.nights} nights</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Total Guests</p>
                                                    <p className="text-lg">{selectedBooking.guest_count} guests</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Guest Breakdown</p>
                                                    <p className="text-lg">
                                                        {selectedBooking.guest_breakdown_male} Male, {' '}
                                                        {selectedBooking.guest_breakdown_female} Female
                                                        {selectedBooking.guest_breakdown_children > 0 && 
                                                            `, ${selectedBooking.guest_breakdown_children} Children`
                                                        }
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Booking Date</p>
                                                    <p className="text-lg">{formatDateTime(selectedBooking.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Guest Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Guest Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Primary Guest</p>
                                                <p className="text-lg font-medium">{selectedBooking.guest_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Country</p>
                                                <p className="text-lg">{selectedBooking.guest_country || 'Indonesia'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Email</p>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-gray-500" />
                                                    <p className="text-lg">{selectedBooking.guest_email}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Phone</p>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-gray-500" />
                                                    <p className="text-lg">{selectedBooking.guest_phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {selectedBooking.special_requests && (
                                            <div className="mt-4">
                                                <p className="text-sm font-medium text-gray-600">Special Requests</p>
                                                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-sm">{selectedBooking.special_requests}</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Payment Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            Payment Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-lg">
                                                <span>Total Amount:</span>
                                                <span className="font-bold">{formatCurrency(selectedBooking.total_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Paid Amount:</span>
                                                <span className="text-green-600 font-medium">{formatCurrency(getPaidAmount(selectedBooking))}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Remaining Amount:</span>
                                                <span className="text-red-600 font-medium">{formatCurrency(getRemainingAmount(selectedBooking))}</span>
                                            </div>
                                            
                                            {canMakePayment(selectedBooking) && (
                                                <div className="pt-4 border-t">
                                                    <Link href={selectedBooking.payment_link!}>
                                                        <Button className="w-full">
                                                            <CreditCard className="h-4 w-4 mr-2" />
                                                            Make Payment
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )}
                                            
                                            {/* Payment History */}
                                            {selectedBooking.payments && selectedBooking.payments.length > 0 && (
                                                <div className="mt-6">
                                                    <h4 className="font-medium mb-3">Payment History</h4>
                                                    <div className="space-y-2">
                                                        {selectedBooking.payments.map((payment) => (
                                                            <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                                <div>
                                                                    <p className="text-sm font-medium">{payment.payment_number}</p>
                                                                    <p className="text-xs text-gray-600">
                                                                        {formatDate(payment.payment_date)} • {payment.paymentMethod?.name}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {payment.payment_status}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
} 