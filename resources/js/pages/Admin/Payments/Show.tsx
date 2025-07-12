import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { type PageProps } from '@/types';
import {
    ArrowLeft,
    Download,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    CreditCard,
    Building2,
    User,
    Calendar,
    FileText,
    AlertCircle,
    MapPin,
    Phone,
    Mail,
    DollarSign,
    ExternalLink,
    Image as ImageIcon,
    File,
    AlertTriangle
} from 'lucide-react';

interface PaymentDetail {
    id: number;
    payment_number: string;
    amount: number;
    payment_type: string;
    payment_method: {
        name: string;
        code: string;
        type: string;
        icon: string;
        description: string;
        account_number: string;
        account_name: string;
        bank_name: string;
        qr_code: string;
        instructions: string;
        is_active: boolean; 
    };
    payment_status: string;
    payment_date: string;
    notes?: string;
    attachment_path?: string;
    attachment_filename?: string;
    attachment_full_path?: string;
    attachment_size?: number;
    attachment_type?: string;
    attachment_exists?: boolean;
    verification_notes?: string;
    verified_at?: string;
    verified_by?: number;
    created_at: string;
    // Sender account fields
    sender_account_name?: string;
    sender_account_number?: string;
    sender_bank_name?: string;
    booking: {
        id: number;
        booking_number: string;
        guest_name: string;
        guest_email: string;
        guest_phone: string;
        check_in: string;
        check_out: string;
        nights: number;
        total_amount: number;
        dp_amount: number;
        remaining_amount: number;
        paid_amount: number;
        special_requests?: string;
        property: {
            id: number;
            name: string;
            address: string;
            cover_image?: string;
        };
    };
    verifier?: {
        id: number;
        name: string;
        email: string;
    };
}

interface PaymentShowProps extends PageProps {
    payment: PaymentDetail;
}

export default function PaymentShow() {
    const page = usePage<PageProps>();
    const { payment } = page.props as unknown as PaymentShowProps;
    const [showImagePreview, setShowImagePreview] = useState(false);

    const { data: verifyData, setData: setVerifyData, patch: patchVerify, processing: verifyProcessing } = useForm({
        verification_notes: '',
    });

    const { data: rejectData, setData: setRejectData, patch: patchReject, processing: rejectProcessing } = useForm({
        rejection_reason: '',
    });

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        patchVerify(`/admin/payments/${payment.payment_number}/verify`, {
            onSuccess: () => {
                setVerifyData('verification_notes', '');
            }
        });
    };

    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();
        patchReject(`/admin/payments/${payment.payment_number}/reject`, {
            onSuccess: () => {
                setRejectData('rejection_reason', '');
            }
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending Verification</Badge>;
            case 'failed':
                return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'dp':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700">Down Payment</Badge>;
            case 'full':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700">Full Payment</Badge>;
            case 'remaining':
                return <Badge variant="outline" className="bg-orange-50 text-orange-700">Remaining Payment</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString()}`;
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const isImageFile = (filename?: string) => {
        if (!filename) return false;
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    };

    return (
        <>
            <Head title={`Payment ${payment.payment_number} - Admin Dashboard`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/admin/payments">
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back to Payments
                                    </Link>
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
                                    <p className="text-gray-600">{payment.payment_number}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {payment.attachment_path && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={payment.attachment_path} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Proof
                                        </a>
                                    </Button>
                                )}
                                {getStatusBadge(payment.payment_status)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Payment Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Payment Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Payment Number</span>
                                                    <div className="text-lg font-semibold">{payment.payment_number}</div>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Amount</span>
                                                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(payment.amount)}</div>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Payment Type</span>
                                                    <div>{getTypeBadge(payment.payment_type)}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Payment Method</span>
                                                    <div className="font-medium">{payment.payment_method.name}</div>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Payment Date</span>
                                                    <div className="font-medium">{formatDate(payment.payment_date)}</div>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Status</span>
                                                    <div>{getStatusBadge(payment.payment_status)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {payment.notes && (
                                        <>
                                            <Separator className="my-4" />
                                            <div>
                                                <span className="text-sm font-medium text-gray-500">Customer Notes</span>
                                                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                                    {payment.notes}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Sender Account Information */}
                            {(payment.sender_account_name || payment.sender_account_number || payment.sender_bank_name) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5" />
                                            Sender Account Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                {payment.sender_account_name && (
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-500">Account Holder Name</span>
                                                        <div className="font-medium text-gray-900">{payment.sender_account_name}</div>
                                                    </div>
                                                )}
                                                {payment.sender_account_number && (
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-500">Account Number</span>
                                                        <div className="font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                                                            {payment.sender_account_number}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {payment.sender_bank_name && (
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-500">Bank/E-wallet</span>
                                                        <div className="font-medium text-gray-900">{payment.sender_bank_name}</div>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Transfer To</span>
                                                    <div className="text-sm text-gray-600">
                                                        <div className="font-medium">{payment.payment_method.account_name}</div>
                                                        <div className="font-mono bg-gray-50 px-2 py-1 rounded mt-1">
                                                            {payment.payment_method.account_number}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">{payment.payment_method.bank_name}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Payment Proof */}
                            {payment.attachment_path && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            Bukti Pembayaran
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {/* File Info */}
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    {payment.attachment_type === 'image' && <ImageIcon className="h-8 w-8 text-blue-600" />}
                                                    {payment.attachment_type === 'pdf' && <FileText className="h-8 w-8 text-red-600" />}
                                                    {!payment.attachment_type || (payment.attachment_type !== 'image' && payment.attachment_type !== 'pdf') && <File className="h-8 w-8 text-gray-600" />}
                                                    <div>
                                                        <div className="font-medium">{payment.attachment_filename || 'Unknown file'}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {payment.attachment_type?.toUpperCase() || 'FILE'} • {payment.attachment_size ? Math.round(payment.attachment_size / 1024) + ' KB' : 'Unknown size'}
                                                        </div>
                                                        {!payment.attachment_exists && (
                                                            <div className="text-sm text-red-500 flex items-center gap-1 mt-1">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                File tidak ditemukan
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {payment.attachment_exists && (
                                                        <>
                                                            <FilePreviewModal
                                                                filePath={payment.attachment_full_path || payment.attachment_path}
                                                                fileName={payment.attachment_filename}
                                                                fileSize={payment.attachment_size}
                                                                fileType={payment.attachment_type}
                                                                fileExists={payment.attachment_exists}
                                                            >
                                                                <Button variant="outline" size="sm">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                                    Preview
                                                    </Button>
                                                            </FilePreviewModal>
                                                    <Button variant="outline" size="sm" asChild>
                                                                <a href={payment.attachment_full_path || payment.attachment_path} download={payment.attachment_filename}>
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Download
                                                        </a>
                                                    </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quick Preview for Images */}
                                            {payment.attachment_exists && payment.attachment_type === 'image' && (
                                                <div className="border rounded-lg overflow-hidden">
                                                    <div className="relative group">
                                                    <img
                                                            src={payment.attachment_full_path || payment.attachment_path}
                                                            alt="Payment proof preview"
                                                        className="w-full h-auto max-h-96 object-contain bg-gray-50"
                                                        />
                                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                                            <FilePreviewModal
                                                                filePath={payment.attachment_full_path || payment.attachment_path}
                                                                fileName={payment.attachment_filename}
                                                                fileSize={payment.attachment_size}
                                                                fileType={payment.attachment_type}
                                                                fileExists={payment.attachment_exists}
                                                            >
                                                                <Button 
                                                                    variant="secondary" 
                                                                    size="sm" 
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                                >
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    View Full Size
                                                                </Button>
                                                            </FilePreviewModal>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-white border-t">
                                                        <p className="text-sm text-gray-600">
                                                            Klik "Preview" atau "View Full Size" untuk melihat dengan kontrol zoom dan rotasi
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quick Info for PDF */}
                                            {payment.attachment_exists && payment.attachment_type === 'pdf' && (
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-6 w-6 text-red-600" />
                                                        <div>
                                                            <p className="font-medium text-red-900">PDF Document</p>
                                                            <p className="text-sm text-red-700">
                                                                Klik "Preview" untuk melihat dokumen dalam modal
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error State */}
                                            {!payment.attachment_exists && (
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                                        <div>
                                                            <p className="font-medium text-red-900">File Tidak Ditemukan</p>
                                                            <p className="text-sm text-red-700">
                                                                File bukti pembayaran tidak dapat ditemukan di server. 
                                                                Hubungi administrator sistem.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Verification History */}
                            {(payment.verification_notes || payment.verified_at) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5" />
                                            Verification History
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {payment.verified_at && (
                                                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                                    <div>
                                                        <div className="font-medium text-green-900">Payment Verified</div>
                                                        <div className="text-sm text-green-700">
                                                            Verified by {payment.verifier?.name} on {formatDate(payment.verified_at)}
                                                        </div>
                                                        {payment.verification_notes && (
                                                            <div className="mt-2 text-sm text-green-800">
                                                                {payment.verification_notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Verification Actions */}
                            {payment.payment_status === 'pending' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5" />
                                            Verification Actions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {/* Verify Form */}
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-green-700">Verify Payment</h3>
                                                <form onSubmit={handleVerify} className="space-y-4">
                                                    <div>
                                                        <Label htmlFor="verification_notes">Verification Notes (Optional)</Label>
                                                        <Textarea
                                                            id="verification_notes"
                                                            value={verifyData.verification_notes}
                                                            onChange={(e) => setVerifyData('verification_notes', e.target.value)}
                                                            placeholder="Add any notes about the verification..."
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <Button type="submit" disabled={verifyProcessing} className="w-full">
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        {verifyProcessing ? 'Verifying...' : 'Verify Payment'}
                                                    </Button>
                                                </form>
                                            </div>

                                            {/* Reject Form */}
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-red-700">Reject Payment</h3>
                                                <form onSubmit={handleReject} className="space-y-4">
                                                    <div>
                                                        <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                                                        <Textarea
                                                            id="rejection_reason"
                                                            value={rejectData.rejection_reason}
                                                            onChange={(e) => setRejectData('rejection_reason', e.target.value)}
                                                            placeholder="Please explain why this payment is being rejected..."
                                                            rows={3}
                                                            required
                                                        />
                                                    </div>
                                                    <Button type="submit" disabled={rejectProcessing} variant="destructive" className="w-full">
                                                        <XCircle className="h-4 w-4 mr-2" />
                                                        {rejectProcessing ? 'Rejecting...' : 'Reject Payment'}
                                                    </Button>
                                                </form>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Booking Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Booking Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-500">Booking Number</span>
                                            <div className="font-medium">{payment.booking.booking_number}</div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <span className="text-sm font-medium text-gray-500">Property</span>
                                            <div className="font-medium">{payment.booking.property.name}</div>
                                            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                <MapPin className="h-3 w-3" />
                                                {payment.booking.property.address}
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-sm font-medium text-gray-500">Check-in</span>
                                                <div className="font-medium">{new Date(payment.booking.check_in).toLocaleDateString()}</div>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-500">Check-out</span>
                                                <div className="font-medium">{new Date(payment.booking.check_out).toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        <div>
                                            <span className="text-sm font-medium text-gray-500">Duration</span>
                                            <div className="font-medium">{payment.booking.nights} nights</div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Total Amount:</span>
                                                <span className="font-medium">{formatCurrency(payment.booking.total_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Paid Amount:</span>
                                                <span className="font-medium text-green-600">{formatCurrency(payment.booking.paid_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Remaining:</span>
                                                <span className="font-medium text-orange-600">{formatCurrency(payment.booking.remaining_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">DP Amount:</span>
                                                <span className="font-medium text-blue-600">{formatCurrency(payment.booking.dp_amount)}</span>
                                            </div>
                                        </div>

                                        <Button variant="outline" size="sm" asChild className="w-full">
                                            <Link href={`/admin/bookings/${payment.booking.booking_number}`}>
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Booking
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Guest Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Guest Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-sm font-medium text-gray-500">Name</span>
                                            <div className="font-medium">{payment.booking.guest_name}</div>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500">Email</span>
                                            <div className="font-medium flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                                {payment.booking.guest_email}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500">Phone</span>
                                            <div className="font-medium flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                                {payment.booking.guest_phone}
                                            </div>
                                        </div>

                                        {payment.booking.special_requests && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">Special Requests</span>
                                                    <div className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">
                                                        {payment.booking.special_requests}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <Button variant="outline" asChild className="w-full">
                                            <Link href={`/admin/bookings/${payment.booking.booking_number}`}>
                                                <Building2 className="h-4 w-4 mr-2" />
                                                View Booking
                                            </Link>
                                        </Button>
                                        <Button variant="outline" asChild className="w-full">
                                            <Link href={`/admin/payments?search=${payment.booking.booking_number}`}>
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                All Payments for Booking
                                            </Link>
                                        </Button>
                                        {payment.attachment_path && (
                                            <Button variant="outline" asChild className="w-full">
                                                <a href={payment.attachment_path} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download Proof
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 