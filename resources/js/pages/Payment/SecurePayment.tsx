import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Calendar,
    MapPin,
    Users,
    CreditCard,
    Shield,
    Clock,
    CheckCircle,
    AlertTriangle,
    Upload,
    Download
} from 'lucide-react';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'cash' | 'credit_card';
    icon?: string;
    description?: string; 
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    qr_code?: string;
    instructions?: string[];
    is_active: boolean;
    sort_order: number;
}

interface Booking {
    id: number;
    booking_number: string;
    property: {
        name: string;
        address: string;
        cover_image?: string;
    };
    check_in_date: string;
    check_out_date: string;
    guest_count: number;
    total_amount: number;
    booking_status: string;
    payment_status: string;
    payment_token_expires_at: string;
}

interface SecurePaymentProps {
    booking: Booking;
    paymentMethods: PaymentMethod[];
    token: string;
}

export default function SecurePayment({ booking, paymentMethods, token }: SecurePaymentProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [showProofUpload, setShowProofUpload] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        payment_method_id: '',
        amount: booking.total_amount,
        proof_of_payment: null as File | null,
        payment_notes: '',
    });

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setData('payment_method_id', method.id.toString());
        setShowProofUpload(method.type === 'bank_transfer' || method.type === 'e_wallet');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('booking.secure-payment.store', [booking.booking_number, token]));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('proof_of_payment', file);
        }
    };

    const isTokenExpired = new Date(booking.payment_token_expires_at) < new Date();

    if (isTokenExpired) {
        return (
            <>
                <Head title={`Payment Expired - ${booking.booking_number}`} />
                
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <Card className="w-full max-w-md">
                        <CardContent className="text-center py-8">
                            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-red-700 mb-2">Payment Link Expired</h2>
                            <p className="text-gray-600 mb-4">
                                This payment link has expired. Please contact our support team for assistance.
                            </p>
                            <Button variant="outline" onClick={() => window.history.back()}>
                                Go Back
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`Secure Payment - ${booking.booking_number}`} />

            <div className="min-h-screen bg-slate-50">
                {/* Security Header */}
                <div className="bg-green-600 text-white py-3">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-center gap-2">
                            <Shield className="h-5 w-5" />
                            <span className="text-sm font-medium">Secure Payment Environment</span>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Booking Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Booking Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">Booking Number</p>
                                    <p className="font-semibold">{booking.booking_number}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Property</p>
                                    <p className="font-semibold">{booking.property.name}</p>
                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        <span>{booking.property.address}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Check-in</p>
                                        <p className="font-semibold">{formatDate(booking.check_in_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Check-out</p>
                                        <p className="font-semibold">{formatDate(booking.check_out_date)}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Guests</p>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span className="font-semibold">{booking.guest_count} guests</span>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-semibold">Total Amount</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {formatCurrency(booking.total_amount)}
                                        </p>
                                    </div>
                                </div>

                                {/* Payment Deadline */}
                                <Alert>
                                    <Clock className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Payment Deadline:</strong><br />
                                        {formatDateTime(booking.payment_token_expires_at)}
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Payment Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Method
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Payment Methods */}
                                    <div className="space-y-3">
                                        <Label>Select Payment Method</Label>
                                        {paymentMethods.map((method) => (
                                            <div
                                                key={method.id}
                                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                                    selectedMethod?.id === method.id
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                onClick={() => handleMethodSelect(method)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-medium">{method.name}</h4>
                                                        {method.type === 'bank_transfer' && (
                                                            <p className="text-sm text-gray-600">
                                                                {method.bank_name} - {method.account_number}
                                                            </p>
                                                        )}
                                                        {method.type === 'e_wallet' && method.qr_code && (
                                                            <p className="text-sm text-gray-600">
                                                                {method.qr_code}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="secondary">
                                                        {method.type.replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {errors.payment_method_id && (
                                            <p className="text-sm text-red-600">{errors.payment_method_id}</p>
                                        )}
                                    </div>

                                    {/* Payment Instructions */}
                                    {selectedMethod && (
                                        <div className="space-y-4">
                                            <div>
                                                <Label>Payment Instructions</Label>
                                                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                                                    <ol className="space-y-2">
                                                        {selectedMethod.instructions?.map((instruction, index) => (
                                                            <li key={index} className="text-sm flex gap-2">
                                                                <span className="font-medium">{index + 1}.</span>
                                                                <span>{instruction}</span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </div>

                                            {/* QR Code for E-Wallet */}
                                            {selectedMethod.type === 'e_wallet' && selectedMethod.qr_code && (
                                                <div>
                                                    <Label>QR Code</Label>
                                                    <div className="mt-2 p-4 bg-white border rounded-lg text-center">
                                                        <img
                                                            src={selectedMethod.qr_code}
                                                            alt="QR Code for payment"
                                                            className="mx-auto max-w-[200px]"
                                                        />
                                                        <p className="text-sm text-gray-600 mt-2">
                                                            Scan this QR code with your e-wallet app
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Proof of Payment Upload */}
                                            {showProofUpload && (
                                                <div>
                                                    <Label htmlFor="proof_of_payment">Upload Proof of Payment *</Label>
                                                    <div className="mt-2">
                                                        <input
                                                            id="proof_of_payment"
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileUpload}
                                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Please upload a clear image of your payment receipt
                                                        </p>
                                                    </div>
                                                    {errors.proof_of_payment && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.proof_of_payment}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Payment Notes */}
                                            <div>
                                                <Label htmlFor="payment_notes">Additional Notes (Optional)</Label>
                                                <Textarea
                                                    id="payment_notes"
                                                    value={data.payment_notes}
                                                    onChange={(e) => setData('payment_notes', e.target.value)}
                                                    placeholder="Any additional information about your payment..."
                                                    rows={3}
                                                    className="mt-2"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <Button 
                                        type="submit" 
                                        className="w-full" 
                                        disabled={processing || !selectedMethod}
                                    >
                                        {processing ? 'Processing...' : 'Submit Payment'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Security Notice */}
                    <Card className="mt-8">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Shield className="h-5 w-5 text-green-600" />
                                <p>
                                    This is a secure payment page. Your booking and payment information is protected with 
                                    industry-standard security measures. The payment link will expire on{' '}
                                    <strong>{formatDateTime(booking.payment_token_expires_at)}</strong>.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
} 