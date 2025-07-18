import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { type Booking, type Payment, type BreadcrumbItem, type PageProps, BookingGuest } from '@/types';
import { 
    Calendar, 
    ArrowLeft,
    Users,
    DollarSign,
    MapPin,
    Phone,
    Mail,
    CheckCircle,
    XCircle,
    Clock,
    Building2,
    CreditCard,
    FileText,
    User,
    AlertCircle,
    Download,
    Edit,
    Plus,
    Eye,
    MessageCircle
} from 'lucide-react';

interface WhatsAppData {
    phone: string;
    message: string;
    whatsapp_url: string;
    can_send: boolean;
}

interface BookingShowProps extends PageProps {
    booking: Booking & {
        property: {
            id: number;
            name: string;
            slug: string;
            address: string;
        };
        guests: BookingGuest[];
        payments: Payment[];
        workflow: Array<{
            id: number;
            status: string;
            notes: string;
            created_at: string;
            processor?: {
                id: number;
                name: string;
            };
        }>;
        verifiedBy?: {
            id: number;
            name: string;
        };
        cancelledBy?: {
            id: number;
            name: string;
        };
    };
    whatsappData?: WhatsAppData;
}

export default function ShowBooking({ booking, whatsappData }: BookingShowProps) {
    const { data: verifyData, setData: setVerifyData, patch: patchVerify, processing: verifyProcessing } = useForm({
        notes: '',
    });

    const { data: cancelData, setData: setCancelData, patch: patchCancel, processing: cancelProcessing } = useForm({
        cancellation_reason: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/admin/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: booking.booking_number, href: `/admin/bookings/${booking.booking_number}` },
    ];

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        patchVerify(`/admin/bookings/${booking.booking_number}/verify`);
    };

    const handleCancel = (e: React.FormEvent) => {
        e.preventDefault();
        patchCancel(`/admin/bookings/${booking.booking_number}/cancel`);
    };

    const handleCheckIn = () => {
        patchVerify(`/admin/bookings/${booking.booking_number}/checkin`);
    };

    const handleCheckOut = () => {
        patchVerify(`/admin/bookings/${booking.booking_number}/checkout`);
    };

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case 'checked_in':
                return <Badge className="bg-blue-100 text-blue-700"><User className="h-3 w-3 mr-1" />Checked In</Badge>;
            case 'checked_out':
                return <Badge className="bg-gray-100 text-gray-700"><CheckCircle className="h-3 w-3 mr-1" />Checked Out</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getPaymentStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <Badge className="bg-green-100 text-green-700">Verified</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
            case 'failed':
                return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const calculateDays = () => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    };

    const canVerify = booking.booking_status === 'pending_verification';
    const canCancel = ['pending', 'confirmed'].includes(booking.booking_status);
    const canCheckIn = booking.booking_status === 'confirmed';
    const canCheckOut = booking.booking_status === 'checked_in';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${booking.booking_number} - Booking Details`} />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{booking.booking_number}</h1>
                            {getStatusBadge(booking.booking_status)}
                        </div>
                        <p className="text-muted-foreground">
                            {booking.guest_name} • {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                        </p>
                    </div>
                    
                    <div className="flex gap-3">
                        {/* WhatsApp Button */}
                        {whatsappData && whatsappData.can_send && (
                            <Button 
                                asChild
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                            >
                                <a 
                                    href={whatsappData.whatsapp_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Chat Guest
                                </a>
                            </Button>
                        )}
                        
                        {/* Action Buttons */}
                        {canCheckOut && (
                            <Button onClick={handleCheckOut} disabled={verifyProcessing}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Check Out
                            </Button>
                        )}
                        {canCheckIn && (
                            <Button onClick={handleCheckIn} disabled={verifyProcessing}>
                                <User className="h-4 w-4 mr-2" />
                                Check In
                            </Button>
                        )}
                        {canVerify && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Verify Booking
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Verify Booking</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleVerify} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="notes">Verification Notes</Label>
                                            <Textarea
                                                id="notes"
                                                value={verifyData.notes}
                                                onChange={(e) => setVerifyData('notes', e.target.value)}
                                                placeholder="Add verification notes..."
                                                rows={3}
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button type="submit" disabled={verifyProcessing} className="flex-1">
                                                {verifyProcessing ? 'Verifying...' : 'Verify Booking'}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                        {canCancel && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="destructive">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Cancel Booking</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleCancel} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="cancellation_reason">Cancellation Reason *</Label>
                                            <Textarea
                                                id="cancellation_reason"
                                                value={cancelData.cancellation_reason}
                                                onChange={(e) => setCancelData('cancellation_reason', e.target.value)}
                                                placeholder="Reason for cancellation..."
                                                rows={3}
                                                required
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button type="submit" disabled={cancelProcessing} variant="destructive" className="flex-1">
                                                {cancelProcessing ? 'Cancelling...' : 'Cancel Booking'}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                        <Button variant="outline" asChild>
                            <Link href="/admin/bookings">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="details" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="details">Booking Details</TabsTrigger>
                        <TabsTrigger value="guests">Guest Information</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                        <TabsTrigger value="workflow">Workflow</TabsTrigger>
                    </TabsList>

                    {/* Booking Details */}
                    <TabsContent value="details" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Property Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Property Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Property Name</Label>
                                        <p className="text-sm">{booking.property.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                                        <p className="text-sm flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {booking.property.address}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/properties/${booking.property.slug}`} target="_blank">
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Property
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Stay Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Stay Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Check-in Date</Label>
                                            <p className="text-sm">{new Date(booking.check_in).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Check-out Date</Label>
                                            <p className="text-sm">{new Date(booking.check_out).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                                            <p className="text-sm">{calculateDays()} nights</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Booking Date</Label>
                                            <p className="text-sm">{new Date(booking.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Financial Summary */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Financial Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Room Rate</Label>
                                            <p className="text-sm">{formatCurrency(booking.base_amount)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Extra Bed</Label>
                                            <p className="text-sm">{formatCurrency(booking.extra_bed_amount)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Tax Amount</Label>
                                            <p className="text-sm">{formatCurrency(booking.tax_amount)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                                            <p className="text-lg font-bold">{formatCurrency(booking.total_amount)}</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">DP Percentage</Label>
                                            <p className="text-sm">{booking.dp_percentage}%</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">DP Amount</Label>
                                            <p className="text-sm">{formatCurrency(booking.dp_amount)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Guest List */}
                            {booking.guests && booking.guests.length > 0 && (
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Guest List
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {booking.guests.map((guest, index) => (
                                            <div key={guest.id || index} className="p-4 border rounded-lg">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                                                        <p className="text-sm font-medium">{String(guest.full_name || '')}</p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                                        <p className="text-sm flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {String(guest.email || 'Not specified')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                                                        <p className="text-sm flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {String(guest.phone || 'Not specified')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Relationship</Label>
                                                        <p className="text-sm">{String(guest.relationship_to_primary || '')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* Guest Information */}
                    <TabsContent value="guests" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Primary Guest */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Primary Guest
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                                            <p className="text-sm">{booking.guest_name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                            <p className="text-sm flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                {booking.guest_email}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                                            <p className="text-sm flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {booking.guest_phone}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                                            <p className="text-sm">{booking.guest_country || 'Not specified'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Guest Breakdown */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Guest Breakdown
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Male Adults</Label>
                                            <p className="text-2xl font-bold">{booking.guest_male}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Female Adults</Label>
                                            <p className="text-2xl font-bold">{booking.guest_female}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Children</Label>
                                            <p className="text-2xl font-bold">{booking.guest_children}</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Total Guests</Label>
                                        <p className="text-lg font-bold">{booking.guest_male + booking.guest_female + booking.guest_children}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Guest List */}
                            {booking.guests && booking.guests.length > 0 && (
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Detailed Guest List
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {booking.guests.map((guest, index) => (
                                            <div key={guest.id || index} className="p-4 border rounded-lg">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                                                        <p className="text-sm font-medium">{String(guest.full_name || '')}</p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                                        <p className="text-sm flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {String(guest.email || 'Not specified')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                                                        <p className="text-sm flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {String(guest.phone || 'Not specified')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-muted-foreground">Relationship</Label>
                                                        <p className="text-sm">{String(guest.relationship_to_primary || '')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Special Requests */}
                            {booking.special_requests && (
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            Special Requests
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm whitespace-pre-wrap">{booking.special_requests}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* Payments */}
                    <TabsContent value="payments" className="space-y-6">
                        {/* Payment Actions Header */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold">Payment History</h3>
                                <p className="text-sm text-muted-foreground">
                                    Total: {formatCurrency(booking.total_amount)} • 
                                    Paid: {formatCurrency(booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0))} • 
                                    Remaining: {formatCurrency(booking.total_amount - booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0))}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={`/admin/payments/booking/${booking.booking_number}/create`}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Payment
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={`/admin/payments/booking/${booking.booking_number}/additional`}>
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Additional Payment
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {booking.payments.map((payment) => (
                                <Card key={payment.id}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-medium">{payment.payment_number}</h4>
                                                    {getPaymentStatusBadge(payment.payment_status)}
                                                    <Badge variant="outline">{payment.payment_type}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {payment.paymentMethod?.name} • {new Date(payment.payment_date).toLocaleDateString()}
                                                </p>
                                                {payment.verification_notes && (
                                                    <p className="text-sm">{payment.verification_notes}</p>
                                                )}
                                                {payment.reference_number && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Ref: {payment.reference_number}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-lg">{formatCurrency(payment.amount)}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/admin/payments/${payment.payment_number}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View
                                                        </Link>
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/admin/payments/${payment.payment_number}/edit`}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {booking.payments.length === 0 && (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-8">
                                        <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-medium mb-2">No payments submitted yet</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Create the first payment for this booking
                                        </p>
                                        <Button asChild>
                                            <Link href={`/admin/payments/booking/${booking.booking_number}/create`}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Payment
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* Workflow */}
                    <TabsContent value="workflow" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Workflow History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {booking.workflow.map((step, index) => (
                                        <div key={step.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(step.status)}
                                                    <span className="text-sm text-muted-foreground">
                                                        by {step.processor?.name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(step.created_at).toLocaleString()}
                                                </p>
                                                {step.notes && (
                                                    <p className="text-sm">{step.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
} 
