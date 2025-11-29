import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Booking, type Payment, type BreadcrumbItem, type PageProps, BookingGuest } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    MessageCircle,
    Trash2,
    Zap,
    Send,
    Link as LinkIcon,
    Loader2, X
} from 'lucide-react';
import RateBreakdownCard from '@/components/booking/RateBreakdownCard';

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
        rate_calculation?: any;
    };
    whatsappData?: WhatsAppData;
}

export default function ShowBooking({ booking, whatsappData, auth }: BookingShowProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false);
    const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);

    const { data: verifyData, setData: setVerifyData, patch: patchVerify, processing: verifyProcessing } = useForm({
        notes: '',
    });

    const { data: cancelData, setData: setCancelData, patch: patchCancel, processing: cancelProcessing } = useForm({
        cancellation_reason: '',
    });

    const { data: deleteData, setData: setDeleteData, delete: deleteBooking, processing: deleteProcessing } = useForm({
        deletion_reason: '',
        confirm_delete: false,
    });

    const { data: paymentLinkData, setData: setPaymentLinkData, post: postPaymentLink, processing: paymentLinkProcessing } = useForm({
        amount: '',
        type: 'dp',
        payment_method_id: '',
        expiry_hours: 24,
        channel: 'whatsapp' as 'whatsapp' | 'email' | 'both',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
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
    const canCheckIn = booking.payment_status === 'fully_paid';
    const canCheckOut = booking.booking_status === 'checked_in';
    const canDelete = auth?.user?.role === 'super_admin';
    const requiresExtraConfirmation = ['checked_in', 'confirmed', 'fully_paid'].includes(booking.booking_status) || booking.payment_status === 'fully_paid';

    const handleDelete = (e: React.FormEvent) => {
        e.preventDefault();
        if (requiresExtraConfirmation && !confirmDelete) {
            return;
        }
        deleteBooking(`/admin/booking-management/${booking.booking_number}`, {
            data: {
                deletion_reason: deleteData.deletion_reason,
                confirm_delete: requiresExtraConfirmation ? confirmDelete : true,
            },
            onSuccess: () => {
                router.visit('/admin/booking-management');
            },
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
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
                                    className="flex items-center"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="ml-2 hidden sm:inline">Chat Guest</span>
                                </a>
                            </Button>
                        )}

                        {/* Action Buttons */}
                        {canCheckOut && (
                            <Button onClick={handleCheckOut} disabled={verifyProcessing}>
                                <CheckCircle className="h-4 w-4" />
                                <span className="ml-2">Check Out</span>
                            </Button>
                        )}
                        {canCheckIn && (
                            <Button onClick={handleCheckIn} disabled={verifyProcessing}>
                                <User className="h-4 w-4" />
                                <span className="ml-2">Check In</span>
                            </Button>
                        )}
                        {canVerify && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="ml-2">Verify Booking</span>
                                    </Button>
                                </DialogTrigger>

                                <DialogContent
                                    className="
                                bg-white p-6 w-full max-w-full rounded-t-xl border-t
                          
                                /* MOBILE: bottom sheet */
                                translate-y-full transition-transform duration-300
                                data-[state=open]:translate-y-0
                          
                                /* DESKTOP: modal center */
                                sm:max-w-lg sm:rounded-xl sm:py-6
                                sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                                sm:translate-y-0
                              "
                                >

                                    <DialogHeader className="pr-10">
                                        <DialogTitle>Verify Booking</DialogTitle>
                                        <DialogDescription>
                                            Verifikasi Booking
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleVerify} className="space-y-4 flex flex-col h-full sm:h-auto">
                                        <div className="space-y-2 flex-1 overflow-auto sm:overflow-visible">
                                            <Label htmlFor="notes">Verification Notes</Label>
                                            <Textarea
                                                id="notes"
                                                value={verifyData.notes}
                                                onChange={(e) => setVerifyData('notes', e.target.value)}
                                                placeholder="Add verification notes..."
                                                rows={4}
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="submit"
                                                disabled={verifyProcessing}
                                                className="flex-1"
                                            >
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
                                        <span className="ml-2 hidden sm:inline">Cancel Booking</span>
                                    </Button>
                                </DialogTrigger>

                                <DialogContent
                                    className="
                                bg-white p-6 w-full max-w-full rounded-t-xl border-t
                          
                                /* MOBILE: bottom sheet */
                                translate-y-full transition-transform duration-300
                                data-[state=open]:translate-y-0
                          
                                /* DESKTOP: modal center */
                                sm:max-w-lg sm:rounded-xl sm:py-6
                                sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                                sm:translate-y-0
                              "
                                >

                                    <DialogHeader className="pr-10">
                                        <DialogTitle>Cancel Booking</DialogTitle>
                                        <DialogDescription>
                                            Konfirmasi untuk cancel booking ini.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleCancel} className="space-y-4 flex flex-col h-full sm:h-auto">
                                        <div className="space-y-2 flex-1 overflow-auto sm:overflow-visible">
                                            <Label htmlFor="cancellation_reason">Cancellation Reason *</Label>
                                            <Textarea
                                                id="cancellation_reason"
                                                value={cancelData.cancellation_reason}
                                                onChange={(e) => setCancelData('cancellation_reason', e.target.value)}
                                                placeholder="Reason for cancellation..."
                                                rows={4}
                                                required
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="submit"
                                                disabled={cancelProcessing}
                                                variant="destructive"
                                                className="flex-1"
                                            >
                                                {cancelProcessing ? 'Cancelling...' : 'Cancel Booking'}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>

                        )}
                        {canDelete && (
                            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="ml-2 hidden sm:inline">Delete Booking</span>
                                    </Button>
                                </DialogTrigger>

                                <DialogContent
                                    className="
                                bg-white p-6 w-full max-w-full rounded-t-xl border-t
                          
                                /* MOBILE: bottom sheet */
                                translate-y-full transition-transform duration-300
                                data-[state=open]:translate-y-0
                          
                                /* DESKTOP: modal center */
                                sm:max-w-lg sm:rounded-xl sm:py-6
                                sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                                sm:translate-y-0
                              "
                                >

                                    <DialogHeader>
                                        <DialogTitle>Hapus Booking</DialogTitle>
                                        <DialogDescription>
                                            Konfirmasi untuk menghapus booking ini.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleDelete} className="space-y-4 flex flex-col h-full sm:h-auto">

                                        <div className="space-y-4 flex-1 overflow-auto sm:overflow-visible">

                                            <p className="text-sm text-muted-foreground">
                                                Apakah Anda yakin ingin menghapus booking <strong>#{booking.booking_number}</strong>? Aksi ini tidak dapat dibatalkan.
                                            </p>

                                            {requiresExtraConfirmation && (
                                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                    <p className="text-sm text-yellow-800 flex items-center">
                                                        <AlertCircle className="h-4 w-4 mr-2" />
                                                        Booking ini memiliki status khusus. Pastikan Anda yakin.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="deletion_reason">Alasan (Opsional)</Label>
                                                <Textarea
                                                    id="deletion_reason"
                                                    value={deleteData.deletion_reason}
                                                    onChange={(e) => setDeleteData('deletion_reason', e.target.value)}
                                                    placeholder="Masukkan alasan..."
                                                    rows={4}
                                                />
                                            </div>

                                            {requiresExtraConfirmation && (
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="confirm_delete"
                                                        checked={confirmDelete}
                                                        onChange={(e) => setConfirmDelete(e.target.checked)}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <Label htmlFor="confirm_delete" className="text-sm">
                                                        Saya mengonfirmasi penghapusan ini.
                                                    </Label>
                                                </div>
                                            )}

                                        </div>

                                        {/* Buttons */}
                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowDeleteDialog(false);
                                                    setConfirmDelete(false);
                                                    setDeleteData('deletion_reason', '');
                                                }}
                                                className="flex-1"
                                            >
                                                Batal
                                            </Button>

                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                disabled={deleteProcessing || (requiresExtraConfirmation && !confirmDelete)}
                                                className="flex-1"
                                            >
                                                {deleteProcessing ? "Menghapus..." : "Hapus"}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="details" className="space-y-6">
                    <TabsList
                        className="w-full overflow-x-auto flex gap-2 p-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
                        <TabsTrigger value="details" className="whitespace-nowrap text-xs sm:text-sm px-3 py-2">
                            Booking Details
                        </TabsTrigger>

                        <TabsTrigger value="guests" className="whitespace-nowrap text-xs sm:text-sm px-3 py-2">
                            Guest Information
                        </TabsTrigger>

                        <TabsTrigger value="payments" className="whitespace-nowrap text-xs sm:text-sm px-3 py-2">
                            Payments
                        </TabsTrigger>

                        <TabsTrigger value="workflow" className="whitespace-nowrap text-xs sm:text-sm px-3 py-2">
                            Workflow
                        </TabsTrigger>
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

                            {/* Rate Breakdown Per Malam */}
                            <div className="lg:col-span-2">
                                <RateBreakdownCard
                                    rateCalculation={booking.rate_calculation}
                                    checkIn={booking.check_in}
                                    checkOut={booking.check_out}
                                />
                            </div>

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
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <div>
                                <h3 className="text-lg font-semibold">Payment History</h3>
                                <p className="text-sm text-muted-foreground">
                                    Total: {formatCurrency(booking.total_amount)} •
                                    Paid: {formatCurrency(booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0))} •
                                    Remaining: {formatCurrency(booking.total_amount - booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0))}
                                </p>
                            </div>
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {/* Send Payment Link Dialog */}
                                <Dialog open={showPaymentLinkDialog} onOpenChange={setShowPaymentLinkDialog}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark w-full sm:w-auto">
                                            <Zap className="h-4 w-4" />
                                            <span className="hidden sm:inline">Send Payment Link</span>
                                            <span className="sm:hidden">Send Link</span>
                                        </Button>
                                    </DialogTrigger>
                                    {/* Content */}
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Kirim Link Pembayaran</DialogTitle>
                                            <DialogDescription>
                                                Generate dan kirim link pembayaran iPaymu ke guest
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            const paidAmount = booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0);
                                            const pendingAmount = booking.total_amount - paidAmount;

                                            if (parseFloat(paymentLinkData.amount) > pendingAmount) {
                                                alert(`Jumlah tidak boleh melebihi sisa tagihan: ${formatCurrency(pendingAmount)}`);
                                                return;
                                            }

                                            postPaymentLink(`/admin/bookings/${booking.booking_number}/payment-gateway/send-link`, {
                                                onSuccess: (page) => {
                                                    if (page.props.flash?.payment_url) {
                                                        setPaymentLinkUrl(page.props.flash.payment_url as string);
                                                    }
                                                },
                                                onError: (errors) => {
                                                    console.error('Error generating payment link:', errors);
                                                }
                                            });
                                        }} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="amount">Jumlah Pembayaran *</Label>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    min="1"
                                                    value={paymentLinkData.amount}
                                                    onChange={(e) => {
                                                        const paidAmount = booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0);
                                                        const pendingAmount = booking.total_amount - paidAmount;
                                                        const amount = Math.min(parseFloat(e.target.value) || 0, pendingAmount);
                                                        setPaymentLinkData('amount', amount.toString());
                                                    }}
                                                    placeholder="Masukkan jumlah"
                                                    required
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Sisa tagihan: {formatCurrency(booking.total_amount - booking.payments.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0))}
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="type">Tipe Pembayaran</Label>
                                                <Select
                                                    value={paymentLinkData.type}
                                                    onValueChange={(value) => setPaymentLinkData('type', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="dp">Down Payment (DP)</SelectItem>
                                                        <SelectItem value="remaining">Remaining Payment</SelectItem>
                                                        <SelectItem value="full">Full Payment</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="expiry_hours">Waktu Kedaluwarsa (Jam)</Label>
                                                <Input
                                                    id="expiry_hours"
                                                    type="number"
                                                    min={1}
                                                    max={168}
                                                    value={paymentLinkData.expiry_hours}
                                                    onChange={(e) => setPaymentLinkData('expiry_hours', parseInt(e.target.value) || 24)}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Link akan berlaku selama {paymentLinkData.expiry_hours} jam
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="channel">Channel Pengiriman *</Label>
                                                <Select
                                                    value={paymentLinkData.channel}
                                                    onValueChange={(value: 'whatsapp' | 'email' | 'both') => setPaymentLinkData('channel', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                                        <SelectItem value="email">Email</SelectItem>
                                                        <SelectItem value="both">WhatsApp & Email</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {paymentLinkUrl && (
                                                <Alert className="bg-green-50 border-green-200">
                                                    <LinkIcon className="h-4 w-4 text-green-600" />
                                                    <AlertDescription className="text-green-800">
                                                        <div className="space-y-2">
                                                            <p className="font-medium">Link pembayaran berhasil dibuat!</p>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={paymentLinkUrl}
                                                                    readOnly
                                                                    className="font-mono text-sm"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(paymentLinkUrl);
                                                                    }}
                                                                >
                                                                    Copy
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            <DialogFooter>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowPaymentLinkDialog(false);
                                                        setPaymentLinkUrl(null);
                                                    }}
                                                >
                                                    Tutup
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={paymentLinkProcessing}
                                                    className="bg-brand-primary hover:bg-brand-primary-dark"
                                                >
                                                    {paymentLinkProcessing ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Memproses...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="mr-2 h-4 w-4" />
                                                            Kirim Link
                                                        </>
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                                {/* Create Payment Button */}
                                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                                    <Link href={`/admin/payments/booking/${booking.booking_number}/create`}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        <span className="hidden sm:inline">Create Payment</span>
                                        <span className="sm:hidden">Create</span>
                                    </Link>
                                </Button>

                                {/* Additional Payment */}
                                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                                    <Link href={`/admin/payments/booking/${booking.booking_number}/additional`}>
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        <span className="hidden sm:inline">Additional Payment</span>
                                        <span className="sm:hidden">Extra</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Payment List */}
                        <div className="space-y-4">
                            {booking.payments.map(payment => (
                                <Card key={payment.id}>
                                    <CardContent className="p-4 space-y-4">

                                        {/* Header Info */}
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="font-semibold">{payment.payment_number}</h4>
                                                    {getPaymentStatusBadge(payment.payment_status)}
                                                    <Badge variant="outline">{payment.payment_type}</Badge>
                                                </div>

                                                <p className="text-sm text-muted-foreground">
                                                    {payment.paymentMethod?.name}
                                                </p>

                                                <p className="text-xs text-gray-500">
                                                    Tanggal Pembayaran: <strong>{new Date(payment.payment_date).toLocaleDateString()}</strong>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Amount (centered style) */}
                                        <div className="text-center py-2">
                                            <p className="text-2xl font-bold text-brand-primary">
                                                {formatCurrency(payment.amount)}
                                            </p>
                                        </div>

                                        {/* Action Buttons - positioned bottom-right */}
                                        <div className="flex justify-end gap-2 pt-2 border-t">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/payments/${payment.payment_number}`}>
                                                    <Eye className="h-4 w-4 sm:mr-2" />
                                                    <span className="hidden sm:inline">View</span>
                                                </Link>
                                            </Button>

                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/payments/${payment.payment_number}/edit`}>
                                                    <Edit className="h-4 w-4 sm:mr-2" />
                                                    <span className="hidden sm:inline">Edit</span>
                                                </Link>
                                            </Button>
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
        </AdminLayout>
    );
} 
