import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    CreditCard,
    Upload,
    Building2,
    Smartphone,
    Banknote,
    DollarSign,
    Info,
    Save,
    Calendar,
    Receipt,
    User,
    FileText,
    MapPin,
    Users,
    Clock
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface Booking {
    id: number;
    booking_number: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    property: {
        id: number;
        name: string;
        address: string;
    };
    total_amount: number;
    dp_amount: number;
    paid_amount: number;
    remaining_amount: number;
    payment_status: string;
    booking_status: string;
    check_in: string;
    check_out: string;
    guest_count: number;
    guests?: Array<{
        id: number;
        full_name: string;
        email: string;
        phone: string;
        relationship_to_primary: string;
    }>;
}

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'credit_card' | 'cash';
    icon?: string;
    description?: string;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    qr_code?: string;
    instructions: string[];
    is_active: boolean;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface CreateForBookingProps {
    booking: Booking;
    paymentMethods: PaymentMethod[];
    users: User[];
}

export default function CreateForBooking({ booking, paymentMethods, users }: CreateForBookingProps) {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        payment_method_id: '',
        amount: '',
        payment_type: 'dp' as 'dp' | 'remaining' | 'full' | 'refund' | 'penalty',
        payment_date: new Date().toISOString().split('T')[0],
        due_date: '',
        reference_number: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        payment_status: 'pending' as 'pending' | 'verified',
        verification_notes: '',
        attachment: null as File | null,
        processed_by: '',
        verified_by: '',
        gateway_transaction_id: '',
        auto_confirm: false as boolean,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: booking.booking_number, href: `/admin/bookings/${booking.booking_number}` },
        { title: 'Create Payment', href: '#' },
    ];

    // Auto-set payment amount based on booking status
    useEffect(() => {
        if (booking.payment_status === 'dp_pending') {
            setData(prev => ({
                ...prev,
                payment_type: 'dp',
                amount: booking.dp_amount.toString()
            }));
        } else if (booking.payment_status === 'dp_received') {
            setData(prev => ({
                ...prev,
                payment_type: 'remaining',
                amount: booking.remaining_amount.toString()
            }));
        }
    }, [booking]);

    // Update payment method details when payment method changes
    useEffect(() => {
        if (data.payment_method_id) {
            const method = paymentMethods.find(m => m.id.toString() === data.payment_method_id.toString());
            setSelectedPaymentMethod(method || null);
            
            if (method) {
                setData(prev => ({
                    ...prev,
                    bank_name: method.bank_name || '',
                    account_number: method.account_number || '',
                    account_name: method.account_name || ''
                }));
            }
        }
    }, [data.payment_method_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/payments/booking/${booking.booking_number}/create`);
    };

    const getPaymentTypeIcon = (type: string) => {
        switch (type) {
            case 'dp': return <DollarSign className="h-4 w-4" />;
            case 'remaining': return <Receipt className="h-4 w-4" />;
            case 'full': return <CreditCard className="h-4 w-4" />;
            case 'refund': return <ArrowLeft className="h-4 w-4" />;
            case 'penalty': return <FileText className="h-4 w-4" />;
            default: return <DollarSign className="h-4 w-4" />;
        }
    };

    const getMethodIcon = (type: string) => {
        switch (type) {
            case 'bank_transfer': return <Building2 className="h-5 w-5" />;
            case 'e_wallet': return <Smartphone className="h-5 w-5" />;
            case 'credit_card': return <CreditCard className="h-5 w-5" />;
            case 'cash': return <Banknote className="h-5 w-5" />;
            default: return <DollarSign className="h-5 w-5" />;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getPaymentStatusBadge = (status: string) => {
        const statusConfig = {
            dp_pending: { label: 'DP Pending', variant: 'destructive' as const },
            dp_received: { label: 'DP Received', variant: 'secondary' as const },
            fully_paid: { label: 'Fully Paid', variant: 'default' as const },
            refunded: { label: 'Refunded', variant: 'outline' as const },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getBookingStatusBadge = (status: string) => {
        const statusConfig = {
            pending_verification: { label: 'Pending Verification', variant: 'secondary' as const },
            confirmed: { label: 'Confirmed', variant: 'default' as const },
            checked_in: { label: 'Checked In', variant: 'default' as const },
            checked_out: { label: 'Checked Out', variant: 'outline' as const },
            cancelled: { label: 'Cancelled', variant: 'destructive' as const },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Create Payment - ${booking.booking_number} - Admin`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Create Payment</h1>
                        <p className="text-muted-foreground">
                            Create payment for booking {booking.booking_number}
                        </p>
                    </div>
                    <Link href={`/admin/bookings/${booking.booking_number}`}>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Booking
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Booking Information */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5" />
                                    Booking Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Booking Number</Label>
                                    <p className="font-mono text-sm">{booking.booking_number}</p>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Guest</Label>
                                    <p className="font-medium">{booking.guest_name}</p>
                                    <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                                    <p className="text-sm text-muted-foreground">{booking.guest_phone}</p>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Property</Label>
                                    <p className="font-medium">{booking.property.name}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {booking.property.address}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Check-in</Label>
                                        <p className="text-sm flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(booking.check_in).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Check-out</Label>
                                        <p className="text-sm flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(booking.check_out).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Guests</Label>
                                    <p className="text-sm flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {booking.guest_count} guests
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                    <div className="flex flex-col gap-2">
                                        {getBookingStatusBadge(booking.booking_status)}
                                        {getPaymentStatusBadge(booking.payment_status)}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <div className="flex justify-between">
                                        <span className="text-sm">Total Amount:</span>
                                        <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm">Paid Amount:</span>
                                        <span className="font-medium text-green-600">{formatCurrency(booking.paid_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm">Remaining:</span>
                                        <span className="font-medium text-orange-600">{formatCurrency(booking.remaining_amount)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Payment Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Payment Method */}
                                    <div className="space-y-2">
                                        <Label htmlFor="payment_method_id">Payment Method *</Label>
                                        <Select
                                            value={data.payment_method_id}
                                            onValueChange={(value) => setData('payment_method_id', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map((method) => (
                                                    <SelectItem key={method.id} value={method.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            {getMethodIcon(method.type)}
                                                            <span>{method.name}</span>
                                                            <Badge variant="outline">{method.type}</Badge>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.payment_method_id && (
                                            <p className="text-sm text-destructive">{errors.payment_method_id}</p>
                                        )}
                                    </div>

                                    {/* Payment Type & Amount */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="payment_type">Payment Type *</Label>
                                            <Select
                                                value={data.payment_type}
                                                onValueChange={(value) => setData('payment_type', value as any)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="dp">
                                                        <div className="flex items-center gap-2">
                                                            {getPaymentTypeIcon('dp')}
                                                            Down Payment (DP)
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="remaining">
                                                        <div className="flex items-center gap-2">
                                                            {getPaymentTypeIcon('remaining')}
                                                            Remaining Payment
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="full">
                                                        <div className="flex items-center gap-2">
                                                            {getPaymentTypeIcon('full')}
                                                            Full Payment
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="refund">
                                                        <div className="flex items-center gap-2">
                                                            {getPaymentTypeIcon('refund')}
                                                            Refund
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="penalty">
                                                        <div className="flex items-center gap-2">
                                                            {getPaymentTypeIcon('penalty')}
                                                            Penalty
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.payment_type && (
                                                <p className="text-sm text-destructive">{errors.payment_type}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Amount *</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                max={booking.remaining_amount}
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                placeholder="Enter amount"
                                            />
                                            {errors.amount && (
                                                <p className="text-sm text-destructive">{errors.amount}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Maximum: {formatCurrency(booking.remaining_amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Payment Date & Due Date */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="payment_date">Payment Date *</Label>
                                            <Input
                                                id="payment_date"
                                                type="date"
                                                value={data.payment_date}
                                                onChange={(e) => setData('payment_date', e.target.value)}
                                            />
                                            {errors.payment_date && (
                                                <p className="text-sm text-destructive">{errors.payment_date}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="due_date">Due Date</Label>
                                            <Input
                                                id="due_date"
                                                type="date"
                                                value={data.due_date}
                                                onChange={(e) => setData('due_date', e.target.value)}
                                            />
                                            {errors.due_date && (
                                                <p className="text-sm text-destructive">{errors.due_date}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Status */}
                                    <div className="space-y-2">
                                        <Label htmlFor="payment_status">Payment Status *</Label>
                                        <Select
                                            value={data.payment_status}
                                            onValueChange={(value) => setData('payment_status', value as any)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="verified">Verified</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.payment_status && (
                                            <p className="text-sm text-destructive">{errors.payment_status}</p>
                                        )}
                                    </div>

                                    {/* Reference Number */}
                                    <div className="space-y-2">
                                        <Label htmlFor="reference_number">Reference Number</Label>
                                        <Input
                                            id="reference_number"
                                            value={data.reference_number}
                                            onChange={(e) => setData('reference_number', e.target.value)}
                                            placeholder="Enter reference number"
                                        />
                                        {errors.reference_number && (
                                            <p className="text-sm text-destructive">{errors.reference_number}</p>
                                        )}
                                    </div>

                                    {/* Bank Details (if bank transfer) */}
                                    {selectedPaymentMethod?.type === 'bank_transfer' && (
                                        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                                            <h4 className="font-medium">Bank Transfer Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="bank_name">Bank Name</Label>
                                                    <Input
                                                        id="bank_name"
                                                        value={data.bank_name}
                                                        onChange={(e) => setData('bank_name', e.target.value)}
                                                        placeholder="Bank name"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="account_number">Account Number</Label>
                                                    <Input
                                                        id="account_number"
                                                        value={data.account_number}
                                                        onChange={(e) => setData('account_number', e.target.value)}
                                                        placeholder="Account number"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="account_name">Account Name</Label>
                                                    <Input
                                                        id="account_name"
                                                        value={data.account_name}
                                                        onChange={(e) => setData('account_name', e.target.value)}
                                                        placeholder="Account holder name"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Verification Notes */}
                                    <div className="space-y-2">
                                        <Label htmlFor="verification_notes">Notes</Label>
                                        <Textarea
                                            id="verification_notes"
                                            value={data.verification_notes}
                                            onChange={(e) => setData('verification_notes', e.target.value)}
                                            placeholder="Add notes about this payment..."
                                            rows={3}
                                        />
                                        {errors.verification_notes && (
                                            <p className="text-sm text-destructive">{errors.verification_notes}</p>
                                        )}
                                    </div>

                                    {/* File Attachment */}
                                    <div className="space-y-2">
                                        <Label htmlFor="attachment">Attachment</Label>
                                        <Input
                                            id="attachment"
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            onChange={(e) => setData('attachment', e.target.files?.[0] || null)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Supported formats: JPG, PNG, PDF (max 5MB)
                                        </p>
                                        {errors.attachment && (
                                            <p className="text-sm text-destructive">{errors.attachment}</p>
                                        )}
                                    </div>

                                    {/* Auto Confirm */}
                                    {data.payment_status === 'verified' && booking.booking_status === 'pending_verification' && (
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="auto_confirm"
                                                checked={data.auto_confirm}
                                                onCheckedChange={(checked:boolean) => setData('auto_confirm', checked)}
                                            />
                                            <Label htmlFor="auto_confirm">
                                                Auto-confirm booking when fully paid
                                            </Label>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <div className="flex justify-end space-x-2">
                                        <Link href={`/admin/bookings/${booking.booking_number}`}>
                                            <Button type="button" variant="outline">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={processing}>
                                            <Save className="mr-2 h-4 w-4" />
                                            {processing ? 'Creating...' : 'Create Payment'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 