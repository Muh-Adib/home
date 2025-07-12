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
import {
    ArrowLeft,
    CreditCard,
    Upload,
    Building2,
    Smartphone,
    Banknote,
    DollarSign,
    Info,
    Plus,
    X,
    Save,
    Calendar,
    Receipt,
    User,
    FileText,
    Download,
    Eye
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface Payment {
    id: number;
    payment_number: string;
    booking_id: number;
    payment_method_id?: number;
    amount: number;
    payment_type: 'dp' | 'remaining' | 'full' | 'refund' | 'penalty';
    payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'e_wallet' | 'other';
    payment_date: string;
    due_date?: string;
    reference_number?: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    payment_status: 'pending' | 'verified' | 'failed' | 'cancelled';
    verification_notes?: string;
    attachment_path?: string;
    processed_by?: number;
    verified_by?: number;
    verified_at?: string;
    gateway_transaction_id?: string;
    gateway_response?: any;
    created_at: string;
    updated_at: string;
    booking: {
        id: number;
        booking_number: string;
        guest_name: string;
        guest_email: string;
        property: {
            id: number;
            name: string;
        };
        total_amount: number;
        dp_amount: number;
        remaining_amount: number;
        payment_status: string;
        check_in: string;
        check_out: string;
    };
    paymentMethod?: {
        id: number;
        name: string;
        code: string;
        type: string;
        icon?: string;
        description?: string;
        account_number?: string;
        account_name?: string;
        bank_name?: string;
        instructions: string[];
        is_active: boolean;
    };
    processor?: {
        id: number;
        name: string;
        email: string;
    };
    verifier?: {
        id: number;
        name: string;
        email: string;
    };
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

interface PaymentEditProps {
    payment: Payment;
    paymentMethods: PaymentMethod[];
    users: User[];
}

export default function PaymentEdit({ payment, paymentMethods, users }: PaymentEditProps) {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(
        payment.paymentMethod
            ? { ...payment.paymentMethod, type: payment.paymentMethod.type as 'bank_transfer' | 'e_wallet' | 'credit_card' | 'cash' }
            : null
    );

    const { data, setData, put, processing, errors } = useForm({
        payment_method_id: payment.payment_method_id?.toString() || '',
        amount: payment.amount.toString(),
        payment_type: payment.payment_type,
        payment_date: payment.payment_date.split('T')[0],
        due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
        reference_number: payment.reference_number || '',
        bank_name: payment.bank_name || '',
        account_number: payment.account_number || '',
        account_name: payment.account_name || '',
        payment_status: payment.payment_status,
        verification_notes: payment.verification_notes || '',
        attachment: null as File | null,
        processed_by: payment.processed_by?.toString() || '',
        verified_by: payment.verified_by?.toString() || '',
        gateway_transaction_id: payment.gateway_transaction_id || '',
        keep_existing_attachment: true,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments', href: '/admin/payments' },
        { title: payment.payment_number, href: `/admin/payments/${payment.payment_number}` },
        { title: 'Edit', href: '#' },
    ];

    // Update payment method details when payment method changes
    useEffect(() => {
        if (data.payment_method_id) {
            const method = paymentMethods.find(m => m.id.toString() === data.payment_method_id.toString());
            setSelectedPaymentMethod(method || null);
            
            if (method && !data.bank_name) {
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
        
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (key === 'attachment' && data.attachment) {
                formData.append(key, data.attachment);
            } else if (key !== 'attachment') {
                formData.append(key, String(data[key as keyof typeof data]));
            }
        });

        put(`/admin/payments/${payment.payment_number}`, {
            data: formData,
            forceFormData: true,
        });
    };

    const getPaymentTypeIcon = (type: string) => {
        switch (type) {
            case 'dp': return <DollarSign className="h-4 w-4" />;
            case 'remaining': return <Receipt className="h-4 w-4" />;
            case 'full': return <CreditCard className="h-4 w-4" />;
            case 'refund': return <ArrowLeft className="h-4 w-4" />;
            case 'penalty': return <X className="h-4 w-4" />;
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${payment.payment_number} - Payments`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/payments">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Payments
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Edit Payment</h1>
                            <p className="text-gray-600 mt-1">
                                Update payment transaction details
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.payment_status)}`}>
                            {payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Booking Information (Read-only) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Booking Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p><strong>Booking:</strong> {payment.booking.booking_number}</p>
                                                <p><strong>Guest:</strong> {payment.booking.guest_name}</p>
                                                <p><strong>Email:</strong> {payment.booking.guest_email}</p>
                                                <p><strong>Property:</strong> {payment.booking.property.name}</p>
                                            </div>
                                            <div>
                                                <p><strong>Check-in:</strong> {new Date(payment.booking.check_in).toLocaleDateString()}</p>
                                                <p><strong>Check-out:</strong> {new Date(payment.booking.check_out).toLocaleDateString()}</p>
                                                <p><strong>Status:</strong> <span className="capitalize">{payment.booking.payment_status.replace('_', ' ')}</span></p>
                                                <p><strong>Total Amount:</strong> {formatCurrency(payment.booking.total_amount)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Payment Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="payment_method_id">Payment Method *</Label>
                                            <Select 
                                                value={data.payment_method_id.toString()} 
                                                onValueChange={(value) => setData('payment_method_id', value)}
                                            >
                                                <SelectTrigger className={errors.payment_method_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Select payment method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {paymentMethods.filter(method => method.is_active).map((method) => (
                                                        <SelectItem key={method.id} value={method.id.toString()}>
                                                            <div className="flex items-center gap-2">
                                                                {getMethodIcon(method.type)}
                                                                <span>{method.name}</span>
                                                                {method.icon && <span>{method.icon}</span>}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.payment_method_id && <p className="text-sm text-red-500 mt-1">{errors.payment_method_id}</p>}
                                        </div>

                                        <div>
                                            <Label htmlFor="payment_type">Payment Type *</Label>
                                            <Select 
                                                value={data.payment_type} 
                                                onValueChange={(value) => setData('payment_type', value as any)}
                                            >
                                                <SelectTrigger className={errors.payment_type ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Select payment type" />
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
                                            {errors.payment_type && <p className="text-sm text-red-500 mt-1">{errors.payment_type}</p>}
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="amount">Amount *</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                placeholder="0.00"
                                                className={errors.amount ? 'border-red-500' : ''}
                                            />
                                            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
                                        </div>

                                        <div>
                                            <Label htmlFor="payment_date">Payment Date *</Label>
                                            <Input
                                                id="payment_date"
                                                type="date"
                                                value={data.payment_date}
                                                onChange={(e) => setData('payment_date', e.target.value)}
                                                className={errors.payment_date ? 'border-red-500' : ''}
                                            />
                                            {errors.payment_date && <p className="text-sm text-red-500 mt-1">{errors.payment_date}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="due_date">Due Date (Optional)</Label>
                                        <Input
                                            id="due_date"
                                            type="date"
                                            value={data.due_date}
                                            onChange={(e) => setData('due_date', e.target.value)}
                                            className={errors.due_date ? 'border-red-500' : ''}
                                        />
                                        {errors.due_date && <p className="text-sm text-red-500 mt-1">{errors.due_date}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Bank/Payment Details */}
                            {(selectedPaymentMethod?.type === 'bank_transfer' || payment.payment_method === 'bank_transfer') && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5" />
                                            Bank Transfer Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="reference_number">Reference Number</Label>
                                                <Input
                                                    id="reference_number"
                                                    value={data.reference_number}
                                                    onChange={(e) => setData('reference_number', e.target.value)}
                                                    placeholder="Bank reference number"
                                                    className={errors.reference_number ? 'border-red-500' : ''}
                                                />
                                                {errors.reference_number && <p className="text-sm text-red-500 mt-1">{errors.reference_number}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="bank_name">Bank Name</Label>
                                                <Input
                                                    id="bank_name"
                                                    value={data.bank_name}
                                                    onChange={(e) => setData('bank_name', e.target.value)}
                                                    placeholder="Bank name"
                                                    className={errors.bank_name ? 'border-red-500' : ''}
                                                />
                                                {errors.bank_name && <p className="text-sm text-red-500 mt-1">{errors.bank_name}</p>}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="account_number">Account Number</Label>
                                                <Input
                                                    id="account_number"
                                                    value={data.account_number}
                                                    onChange={(e) => setData('account_number', e.target.value)}
                                                    placeholder="Account number"
                                                    className={errors.account_number ? 'border-red-500' : ''}
                                                />
                                                {errors.account_number && <p className="text-sm text-red-500 mt-1">{errors.account_number}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="account_name">Account Name</Label>
                                                <Input
                                                    id="account_name"
                                                    value={data.account_name}
                                                    onChange={(e) => setData('account_name', e.target.value)}
                                                    placeholder="Account holder name"
                                                    className={errors.account_name ? 'border-red-500' : ''}
                                                />
                                                {errors.account_name && <p className="text-sm text-red-500 mt-1">{errors.account_name}</p>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Payment Proof */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="h-5 w-5" />
                                        Payment Proof
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {payment.attachment_path && (
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-5 w-5 text-gray-500" />
                                                    <span className="text-sm font-medium">Current attachment</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(`/storage/${payment.attachment_path}`, '_blank')}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const link = document.createElement('a');
                                                            link.href = `/storage/${payment.attachment_path}`;
                                                            link.download = `payment-${payment.payment_number}`;
                                                            link.click();
                                                        }}
                                                    >
                                                        <Download className="h-4 w-4 mr-1" />
                                                        Download
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <Label htmlFor="attachment">Upload New Payment Proof (Optional)</Label>
                                        <Input
                                            id="attachment"
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => {
                                                setData('attachment', e.target.files?.[0] || null);
                                                setData('keep_existing_attachment', false);
                                            }}
                                            className={errors.attachment ? 'border-red-500' : ''}
                                        />
                                        {errors.attachment && <p className="text-sm text-red-500 mt-1">{errors.attachment}</p>}
                                        <p className="text-sm text-gray-500 mt-1">
                                            Upload new payment receipt to replace existing one
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="verification_notes">Notes</Label>
                                        <Textarea
                                            id="verification_notes"
                                            value={data.verification_notes}
                                            onChange={(e) => setData('verification_notes', e.target.value)}
                                            placeholder="Additional notes about this payment"
                                            className={errors.verification_notes ? 'border-red-500' : ''}
                                            rows={3}
                                        />
                                        {errors.verification_notes && <p className="text-sm text-red-500 mt-1">{errors.verification_notes}</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Payment Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm space-y-2">
                                        <p><strong>Payment Number:</strong> {payment.payment_number}</p>
                                        <p><strong>Created:</strong> {new Date(payment.created_at).toLocaleDateString()}</p>
                                        <p><strong>Last Updated:</strong> {new Date(payment.updated_at).toLocaleDateString()}</p>
                                        {payment.verified_at && (
                                            <p><strong>Verified:</strong> {new Date(payment.verified_at).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Status & Processing */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="payment_status">Status *</Label>
                                        <Select 
                                            value={data.payment_status} 
                                            onValueChange={(value) => setData('payment_status', value as any)}
                                        >
                                            <SelectTrigger className={errors.payment_status ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="verified">Verified</SelectItem>
                                                <SelectItem value="failed">Failed</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.payment_status && <p className="text-sm text-red-500 mt-1">{errors.payment_status}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="processed_by">Processed By</Label>
                                        <Select 
                                            value={data.processed_by.toString()} 
                                            onValueChange={(value) => setData('processed_by', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select processor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {payment.processor && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Current: {payment.processor.name}
                                            </p>
                                        )}
                                    </div>

                                    {data.payment_status === 'verified' && (
                                        <div>
                                            <Label htmlFor="verified_by">Verified By</Label>
                                            <Select 
                                                value={data.verified_by.toString()} 
                                                onValueChange={(value) => setData('verified_by', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select verifier" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((user) => (
                                                        <SelectItem key={user.id} value={user.id.toString()}>
                                                            {user.name} ({user.email})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {payment.verifier && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Current: {payment.verifier.name}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Gateway Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Gateway Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="gateway_transaction_id">Transaction ID</Label>
                                        <Input
                                            id="gateway_transaction_id"
                                            value={data.gateway_transaction_id}
                                            onChange={(e) => setData('gateway_transaction_id', e.target.value)}
                                            placeholder="Gateway transaction ID"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                            For payments processed through payment gateways
                                        </p>
                                    </div>

                                    {payment.gateway_response && (
                                        <div>
                                            <Label>Gateway Response</Label>
                                            <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                                                <pre>{JSON.stringify(payment.gateway_response, null, 2)}</pre>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <Button 
                                            type="submit" 
                                            className="w-full"
                                            disabled={processing}
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {processing ? 'Updating...' : 'Update Payment'}
                                        </Button>
                                        
                                        <Link href="/admin/payments" className="block">
                                            <Button variant="outline" className="w-full">
                                                Cancel
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Method Instructions */}
                            {selectedPaymentMethod && selectedPaymentMethod.instructions.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Payment Instructions</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {selectedPaymentMethod.instructions.map((instruction, index) => (
                                                <div key={index} className="flex items-start gap-2 text-sm">
                                                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-gray-700">{instruction}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 