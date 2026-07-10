import React, { useState, useEffect } from 'react';
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
    Download,
    Copy,
    Check
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
    check_in: string;
    check_out: string;
    guest_count: number;
    total_amount: number;
    booking_status: string;
    payment_status: string;
    payment_token_expires_at: string;
    nights?: number;
    dp_amount?: number;
    dp_percentage?: number;
    payments?: any[];
}

interface PaymentInfo {
    paidAmount: number;
    dpAmount: number;
    remainingAmount: number;
    requiredAmount: number;
    paymentType: 'dp' | 'remaining';
    isDpComplete: boolean;
    uniqueCode: number;
    expectedAmount: number;
}

interface BankAccount {
    id: number;
    bank_name: string;
    account_number: string;
    account_holder: string;
    label: string;
}

interface SecurePaymentProps {
    booking: Booking;
    paymentMethods: PaymentMethod[];
    paymentInfo: PaymentInfo;
    token: string;
    bankAccount?: BankAccount | null;
}

export default function SecurePayment({ booking, paymentMethods, paymentInfo, token, bankAccount }: SecurePaymentProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [showProofUpload, setShowProofUpload] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const hasPendingPayment = booking.payments?.some(p => p.payment_status === 'pending');
    const pendingPayment = booking.payments?.find(p => p.payment_status === 'pending');

    const { data, setData, post, processing, errors } = useForm({
        payment_method_id: '',
        amount: paymentInfo.requiredAmount - (paymentInfo.uniqueCode || 0), // Base amount before unique code
        proof_of_payment: null as File | null,
        payment_notes: '',
        unique_code: paymentInfo.uniqueCode || 0,
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

    const [timeLeft, setTimeLeft] = useState<{
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const expiryTime = new Date(booking.payment_token_expires_at).getTime();
            const now = new Date().getTime();
            let difference = expiryTime - now;

            // Maximum 2 hours countdown from when link is opened
            const maxTwoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
            if (difference > maxTwoHours) {
                difference = maxTwoHours;
            }

            if (difference <= 0) {
                setTimeLeft(null);
                return;
            }

            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
        };

        // Hitung waktu tersisa saat pertama kali komponen dimuat
        calculateTimeLeft();

        // Update setiap detik
        const timer = setInterval(() => {
            calculateTimeLeft();
        }, 1000);

        // Cleanup interval saat komponen unmount
        return () => clearInterval(timer);
    }, [booking.payment_token_expires_at]);

    const renderCountdown = () => {
        if (!timeLeft) return null;

        return (
            <div className="bg-brand-accent-20 border border-brand-accent-30 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-brand-accent-dark">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Waktu Pembayaran Tersisa:</span>
                </div>
                <div className="text-2xl font-bold text-brand-accent-dark mt-2">
                    {String(timeLeft.hours).padStart(2, '0')}:
                    {String(timeLeft.minutes).padStart(2, '0')}:
                    {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <p className="text-sm text-brand-accent-dark/80 mt-1">
                    Silakan selesaikan pembayaran sebelum waktu habis
                </p>
            </div>
        );
    };

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setData('payment_method_id', method.id.toString());
        setShowProofUpload(method.type === 'bank_transfer' || method.type === 'e_wallet');
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('booking.secure-payment.store', [booking.booking_number, token]));
    };

    const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    const compressedFile = new File([blob], file.name, {
                                        type: 'image/jpeg',
                                        lastModified: Date.now(),
                                    });
                                    resolve(compressedFile);
                                } else {
                                    resolve(file);
                                }
                            },
                            'image/jpeg',
                            quality
                        );
                    } else {
                        resolve(file);
                    }
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            compressImage(file).then(compressedFile => {
                setData('proof_of_payment', compressedFile);
            });
        }
    };

    const isTokenExpired = new Date(booking.payment_token_expires_at) < new Date();

    if (isTokenExpired) {
        return (
            <>
                <Head title={`Payment Expired - ${booking.booking_number}`} />
                
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <Card className="w-full max-w-md card-modern">
                        <CardContent className="text-center py-8">
                            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-destructive mb-2">Payment Link Expired</h2>
                            <p className="text-muted-foreground mb-4">
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

            <div className="min-h-screen bg-background">
                {/* Security Header */}
                <div className="bg-brand-primary text-white py-3">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-center gap-2">
                            <Shield className="h-5 w-5" />
                            <span className="text-sm font-medium">Secure Payment Environment</span>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    {/* Countdown Timer */}
                    {renderCountdown()}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Booking Summary */}
                        <Card className="card-modern">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-brand-primary">
                                    <Calendar className="h-5 w-5" />
                                    Booking Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Booking Number</p>
                                    <p className="font-semibold">{booking.booking_number}</p>
                                </div>

                                <div>
                                                            <p className="text-sm text-muted-foreground">Property</p>
                        <p className="font-semibold">{booking.property.name}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        <span>{booking.property.address}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Check-in</p>
                                        <p className="font-semibold">{formatDate(booking.check_in)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Check-out</p>
                                        <p className="font-semibold">{formatDate(booking.check_out)}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground">Guests</p>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span className="font-semibold">{booking.guest_count} guests</span>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-semibold">Total Amount</p>
                                        <p className="text-2xl font-bold text-brand-primary">
                                            {formatCurrency(booking.total_amount)}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-semibold">Payment Deadline</p>
                                        <p className="text-lg font-semibold text-brand-primary">
                                            {formatDateTime(booking.payment_token_expires_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Payment Progress */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>DP ({booking.dp_percentage}%)</span>
                                        <span>{formatCurrency(paymentInfo.dpAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Paid Amount</span>
                                        <span className={paymentInfo.paidAmount > 0 ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                                            {formatCurrency(paymentInfo.paidAmount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Remaining</span>
                                        <span className={paymentInfo.remainingAmount > 0 ? 'text-brand-accent-dark font-semibold' : 'text-green-600 font-semibold'}>
                                            {formatCurrency(paymentInfo.remainingAmount)}
                                        </span>
                                    </div>
                                    
                                    {/* Required Payment Amount */}
                                    <div className="border-t border-border pt-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-semibold text-slate-800">
                                                {paymentInfo.paymentType === 'dp' ? 'DP Required + Kode Unik' : 'Remaining Payment + Kode Unik'}
                                            </p>
                                            <p className="text-xl font-bold text-destructive">
                                                {formatCurrency(paymentInfo.requiredAmount)}
                                            </p>
                                        </div>

                                        <Alert className="bg-blue-50 border-blue-100 p-3">
                                            <Shield className="h-4 w-4 text-blue-600 shrink-0" />
                                            <AlertDescription className="text-xs text-blue-800 leading-relaxed">
                                                Harap transfer tepat sesuai nominal di atas (termasuk kode unik) agar sistem dapat memverifikasi pembayaran Anda secara otomatis.
                                            </AlertDescription>
                                        </Alert>
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
                        <Card className="card-modern">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-brand-primary">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Method
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {hasPendingPayment && pendingPayment ? (
                                    <div className="text-center py-8 px-4 space-y-4">
                                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-yellow-50 text-yellow-500 mb-2">
                                            <Clock className="h-10 w-10 animate-pulse text-yellow-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">Payment Awaiting Confirmation</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                                            We have received your payment proof of <strong>{formatCurrency(pendingPayment.expected_amount || pendingPayment.amount)}</strong> submitted on <strong>{formatDate(pendingPayment.created_at)}</strong>.
                                        </p>
                                        <div className="bg-muted border border-border rounded-xl p-4 text-left text-xs text-muted-foreground space-y-1.5 max-w-sm mx-auto">
                                            <div className="flex justify-between">
                                                <span>Payment Number:</span>
                                                <span className="font-semibold text-foreground">{pendingPayment.payment_number}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Method:</span>
                                                <span className="font-semibold text-foreground">{pendingPayment.payment_method?.toUpperCase().replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Status:</span>
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-[10px] font-bold border-none">
                                                    AWAITING VERIFICATION
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            We are currently verifying your payment. This page will automatically update once confirmed.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Payment Methods */}
                                    <div className="space-y-3">
                                        <Label>Select Payment Method</Label>
                                        {paymentMethods.map((method) => (
                                            <div
                                                key={method.id}
                                                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                                                    selectedMethod?.id === method.id
                                                        ? 'border-brand-primary bg-brand-primary-20 shadow-md'
                                                        : 'border-border hover:border-brand-primary-30 hover:bg-accent'
                                                }`}
                                                onClick={() => handleMethodSelect(method)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-medium">{method.name}</h4>
                                                        {method.type === 'bank_transfer' && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {method.bank_name ? `${method.bank_name} - ${method.account_number}` : (bankAccount ? `${bankAccount.bank_name} - ${bankAccount.account_number}` : '')}
                                                            </p>
                                                        )}
                                                        {method.type === 'e_wallet' && method.qr_code && (
                                                            <p className="text-sm text-muted-foreground">
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
                                            <p className="text-sm text-destructive">{errors.payment_method_id}</p>
                                        )}
                                    </div>

                                    {/* Payment Instructions */}
                                    {selectedMethod && (
                                        <div className="space-y-4">
                                            <div>
                                                <Label>Payment Instructions</Label>
                                                <div className="mt-2 p-4 bg-muted rounded-lg border border-border">
                                                    <ol className="space-y-2">
                                                        {selectedMethod.instructions?.map((instruction, index) => (
                                                            <li key={index} className="text-sm flex gap-2">
                                                                <span className="font-medium text-brand-primary">{index + 1}.</span>
                                                                <span className="text-foreground">{instruction}</span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </div>

                                            {/* QR Code for E-Wallet */}
                                            {selectedMethod.type === 'e_wallet' && selectedMethod.qr_code && (
                                                <div>
                                                    <Label>QR Code</Label>
                                                    <div className="mt-2 p-4 bg-card border border-border rounded-lg text-center">
                                                        <img
                                                            src={selectedMethod.qr_code}
                                                            alt="QR Code for payment"
                                                            className="mx-auto max-w-[200px]"
                                                        />
                                                        <p className="text-sm text-muted-foreground mt-2">
                                                            Scan this QR code with your e-wallet app
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bank Transfer Information */}
                                            {selectedMethod.type === 'bank_transfer' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <Label>Payment Amount</Label>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <Input
                                                                value={formatCurrency(paymentInfo.requiredAmount)}
                                                                readOnly
                                                                className="font-mono text-lg"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => copyToClipboard(paymentInfo.requiredAmount.toString(), 'amount')}
                                                                className="flex items-center gap-2"
                                                            >
                                                                {copiedField === 'amount' ? (
                                                                    <>
                                                                        <Check className="h-4 w-4" />
                                                                        Copied!
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="h-4 w-4" />
                                                                        Copy
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label>Bank Account Information</Label>
                                                        <div className="mt-2 space-y-2">
                                                            <div className="p-3 bg-muted rounded-lg border border-border">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Bank Name</p>
                                                                        <p className="font-medium text-foreground">{selectedMethod.bank_name || (bankAccount ? bankAccount.bank_name : '')}</p>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => copyToClipboard((selectedMethod.bank_name || (bankAccount ? bankAccount.bank_name : '')) || '', 'bank')}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        {copiedField === 'bank' ? (
                                                                            <>
                                                                                <Check className="h-4 w-4" />
                                                                                Copied!
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Copy className="h-4 w-4" />
                                                                                Copy
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-muted rounded-lg border border-border">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Account Number</p>
                                                                        <p className="font-mono font-medium text-foreground">{selectedMethod.account_number || (bankAccount ? bankAccount.account_number : '')}</p>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => copyToClipboard((selectedMethod.account_number || (bankAccount ? bankAccount.account_number : '')) || '', 'account')}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        {copiedField === 'account' ? (
                                                                            <>
                                                                                <Check className="h-4 w-4" />
                                                                                Copied!
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Copy className="h-4 w-4" />
                                                                                Copy
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-muted rounded-lg border border-border">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Account Name</p>
                                                                        <p className="font-medium text-foreground">{selectedMethod.account_name || (bankAccount ? bankAccount.account_holder : '')}</p>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => copyToClipboard((selectedMethod.account_name || (bankAccount ? bankAccount.account_holder : '')) || '', 'name')}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        {copiedField === 'name' ? (
                                                                            <>
                                                                                <Check className="h-4 w-4" />
                                                                                Copied!
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Copy className="h-4 w-4" />
                                                                                Copy
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
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
                                                            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-primary-20 file:text-brand-primary hover:file:bg-brand-primary-30"
                                                        />
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Please upload a clear image of your payment receipt
                                                        </p>
                                                    </div>
                                                    {errors.proof_of_payment && (
                                                        <p className="text-sm text-destructive mt-1">{errors.proof_of_payment}</p>
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
                                        className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white" 
                                        disabled={processing || !selectedMethod}
                                    >
                                        {processing ? 'Processing...' : 'Submit Payment'}
                                    </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Security Notice */}
                    <Card className="mt-8 card-modern">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Shield className="h-5 w-5 text-brand-primary" />
                                <p>
                                    This is a secure payment page. Your booking and payment information is protected with 
                                    industry-standard security measures. The payment link will expire on{' '}
                                    <strong className="text-foreground">{formatDateTime(booking.payment_token_expires_at)}</strong>.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
} 