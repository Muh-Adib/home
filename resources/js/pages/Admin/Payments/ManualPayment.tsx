import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type Booking, type PaymentMethod, type BreadcrumbItem, type PageProps } from '@/types';
import { 
    ArrowLeft,
    CreditCard,
    Building2,
    DollarSign
} from 'lucide-react';

interface ManualPaymentProps extends PageProps {
    booking?: Booking & {
        property: {
            id: number;
            name: string;
        };
        paid_amount: number;
        remaining_amount: number;
    };
    bookings: Array<Booking & {
        property: {
            id: number;
            name: string;
        };
        paid_amount: number;
        remaining_amount: number;
    }>;
    paymentMethods: PaymentMethod[];
}

export default function ManualPayment({ booking, bookings, paymentMethods }: ManualPaymentProps) {
    const [selectedBooking, setSelectedBooking] = useState<typeof booking>(booking);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        booking_id: booking?.id || '',
        payment_method_id: '',
        amount: '',
        payment_type: 'dp',
        payment_status: 'verified',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        verification_notes: '',
        attachment: null as File | null,
        auto_confirm: false,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/admin/dashboard' },
        { title: 'Payments', href: '/admin/payments' },
        { title: 'Manual Payment', href: '/admin/payments/manual-payment' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/payments/manual-payment');
    };

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manual Payment Entry" />
            
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manual Payment Entry</h1>
                        <p className="text-muted-foreground">Create payment record for completed transactions</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/admin/payments">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Payments
                        </Link>
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Select Booking
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="booking_id">Booking *</Label>
                                        <Select value={data.booking_id} onValueChange={(value) => setData('booking_id', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select booking..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bookings.map((booking) => (
                                                    <SelectItem key={booking.id} value={booking.id.toString()}>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{booking.booking_number}</span>
                                                            <span className="text-sm text-muted-foreground">
                                                                {booking.guest_name} • {booking.property.name}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.booking_id && (
                                            <p className="text-sm text-red-600">{errors.booking_id}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Payment Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="payment_method_id">Payment Method *</Label>
                                            <Select value={data.payment_method_id} onValueChange={(value) => setData('payment_method_id', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select payment method..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {paymentMethods.map((method) => (
                                                        <SelectItem key={method.id} value={method.id.toString()}>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline">{method.type}</Badge>
                                                                {method.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.payment_method_id && (
                                                <p className="text-sm text-red-600">{errors.payment_method_id}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Amount *</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.01"
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                placeholder="0.00"
                                            />
                                            {errors.amount && (
                                                <p className="text-sm text-red-600">{errors.amount}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="payment_date">Payment Date *</Label>
                                            <Input
                                                id="payment_date"
                                                type="date"
                                                value={data.payment_date}
                                                onChange={(e) => setData('payment_date', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="reference_number">Reference Number</Label>
                                            <Input
                                                id="reference_number"
                                                value={data.reference_number}
                                                onChange={(e) => setData('reference_number', e.target.value)}
                                                placeholder="Transaction reference..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="verification_notes">Verification Notes</Label>
                                        <Textarea
                                            id="verification_notes"
                                            value={data.verification_notes}
                                            onChange={(e) => setData('verification_notes', e.target.value)}
                                            placeholder="Add verification notes..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="attachment">Payment Proof</Label>
                                        <Input
                                            id="attachment"
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => setData('attachment', e.target.files?.[0] || null)}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Upload payment proof (JPG, PNG, PDF - Max 5MB)
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            {selectedBooking && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Booking Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Booking Number</Label>
                                            <p className="font-medium">{selectedBooking.booking_number}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Guest</Label>
                                            <p className="text-sm">{selectedBooking.guest_name}</p>
                                        </div>
                                        <Separator />
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm">Total Amount:</span>
                                                <span className="font-medium">{formatCurrency(selectedBooking.total_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm">Paid Amount:</span>
                                                <span className="text-green-600">{formatCurrency(selectedBooking.paid_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Remaining:</span>
                                                <span className="font-bold text-orange-600">{formatCurrency(selectedBooking.remaining_amount)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <Button type="submit" disabled={processing || !selectedBooking} className="w-full">
                                            {processing ? 'Creating Payment...' : 'Create Payment'}
                                        </Button>
                                        <Button variant="outline" asChild className="w-full">
                                            <Link href="/admin/payments">Cancel</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 
