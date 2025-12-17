import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    ArrowLeft,
    CreditCard,
    Building2,
    MapPin,
    Calendar,
    Users,
    Clock,
    Info,
    Shield,
    Loader2,
    CheckCircle,
    Smartphone,
    Banknote,
    University,
    Zap,
    AlertCircle
} from 'lucide-react';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { useTranslation } from 'react-i18next';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'cash' | 'credit_card';
    icon?: string;
    description?: string;
    fee_percentage?: number;
    fee_fixed?: number;
    fee_type?: 'percentage' | 'fixed';
    fee_amount: number;
    total_with_fee: number;
    is_ipaymu: boolean;
}

interface Booking {
    id: number;
    booking_number: string;
    property: {
        id: number;
        name: string;
        slug: string;
        address: string;
        cover_image?: string;
    };
    check_in: string;
    check_out: string;
    guest_count: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    total_amount: number;
    payment_status: string;
}

interface PaymentCreateProps {
    booking: Booking;
    paymentMethods: PaymentMethod[];
    pendingAmount: number;
    paidAmount: number;
    paymentType: string;
    nights: number;
    defaultExpiryHours: number;
}

export default function PaymentCreate({
    booking,
    paymentMethods,
    pendingAmount,
    paidAmount,
    paymentType,
    nights,
    defaultExpiryHours
}: PaymentCreateProps) {
    const page = usePage<PageProps>();
    const { t } = useTranslation();
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [expiryHours, setExpiryHours] = useState<number>(defaultExpiryHours);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' },
        { title: t('nav.my_bookings'), href: route('my-bookings') || '/my-bookings' },
        { title: t('payment.create_payment'), href: route('payments.create', booking.booking_number) }
    ];

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        amount: pendingAmount,
        type: paymentType,
        payment_method_id: '',
        expiry_hours: defaultExpiryHours,
    });

    // Filter hanya iPaymu payment methods
    const ipaymuMethods = paymentMethods.filter(m => m.is_ipaymu || m.code === 'ipaymu');

    // Auto select first method jika ada
    useEffect(() => {
        if (ipaymuMethods.length > 0 && !selectedMethod) {
            const firstMethod = ipaymuMethods[0];
            setSelectedMethod(firstMethod);
            setData('payment_method_id', firstMethod.id.toString());
        }
    }, [ipaymuMethods]);

    // Update amount dengan fee saat method berubah
    useEffect(() => {
        if (selectedMethod) {
            const baseAmount = pendingAmount;
            const totalWithFee = selectedMethod.total_with_fee;
            // Amount yang dikirim adalah base amount, fee akan dihitung di backend
            setData('amount', baseAmount);
        }
    }, [selectedMethod, pendingAmount]);

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setData('payment_method_id', method.id.toString());
        clearErrors('payment_method_id');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting || processing) {
            return;
        }

        if (!selectedMethod) {
            alert('Harap pilih metode pembayaran');
            return;
        }

        if (data.amount < 100000) {
            alert('Jumlah pembayaran minimum adalah Rp 100.000');
            return;
        }

        if (data.amount > pendingAmount) {
            alert(`Jumlah pembayaran tidak boleh melebihi sisa tagihan: Rp ${pendingAmount.toLocaleString("id-ID")}`);
            return;
        }

        setIsSubmitting(true);

        // Submit ke payment gateway initiate
        post(`/bookings/${booking.booking_number}/payment-gateway/initiate`, {
            onSuccess: () => {
                setIsSubmitting(false);
                // Redirect akan dilakukan oleh backend ke iPaymu
            },
            onError: (errors) => {
                setIsSubmitting(false);
                if (errors.error) {
                    alert(`Error: ${errors.error}`);
                } else {
                    alert('Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.');
                }
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    const getMethodIcon = (type: string) => {
        switch (type) {
            case 'bank_transfer':
                return <University className="h-6 w-6 text-blue-600" />;
            case 'e_wallet':
                return <Smartphone className="h-6 w-6 text-green-600" />;
            case 'credit_card':
                return <CreditCard className="h-6 w-6 text-purple-600" />;
            default:
                return <Banknote className="h-6 w-6 text-gray-600" />;
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
        <GuestLayout>
            <Head title={`${t('payment.create_payment')} - ${booking.booking_number}`} />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {t('payment.create_payment')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Pembayaran untuk booking {booking.booking_number}
                        </p>
                    </div>

                    <Link href={route('my-bookings') || '/my-bookings'}>
                        <Button variant="outline" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t('common.back')}
                        </Button>
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Payment Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Payment Summary Card */}
                        <Card className="card-modern shadow-lg border-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                    Ringkasan Pembayaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Total Booking:</span>
                                        <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Sudah Dibayar:</span>
                                        <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Sisa Tagihan:</span>
                                        <span className="text-2xl font-bold text-blue-600">{formatCurrency(pendingAmount)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Method Selection Card */}
                        <Card className="card-modern shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-green-600" />
                                    Pilih Metode Pembayaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Payment Method Selection */}
                                    <div>
                                        <Label className="text-base font-medium mb-4 block">
                                            Metode Pembayaran *
                                        </Label>
                                        <RadioGroup
                                            value={selectedMethod?.id.toString()}
                                            onValueChange={(value) => {
                                                const method = ipaymuMethods.find(m => m.id.toString() === value);
                                                if (method) handleMethodSelect(method);
                                            }}
                                            className="space-y-3"
                                        >
                                            {ipaymuMethods.map((method) => (
                                                <div
                                                    key={method.id}
                                                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover-lift ${selectedMethod?.id === method.id
                                                            ? 'border-brand-primary bg-brand-primary-20 ring-2 ring-brand-primary-30 shadow-md'
                                                            : 'border-border hover:border-brand-primary/50 hover:bg-muted/50'
                                                        }`}
                                                    onClick={() => handleMethodSelect(method)}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <RadioGroupItem
                                                                value={method.id.toString()}
                                                                id={`method-${method.id}`}
                                                                className="mt-1"
                                                            />
                                                            <label
                                                                htmlFor={`method-${method.id}`}
                                                                className="flex-1 cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    {method.icon ? (
                                                                        <span className="text-2xl">{method.icon}</span>
                                                                    ) : (
                                                                        getMethodIcon(method.type)
                                                                    )}
                                                                    <div>
                                                                        <div className="font-medium text-lg">{method.name}</div>
                                                                        {method.description && (
                                                                            <div className="text-sm text-muted-foreground">{method.description}</div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Fee Information */}
                                                                {method.fee_amount > 0 && (
                                                                    <div className="ml-9 mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                                                                        <div className="flex justify-between items-center text-sm">
                                                                            <span className="text-muted-foreground">Biaya Transaksi:</span>
                                                                            <span className="font-medium text-orange-600">
                                                                                {method.fee_type === 'percentage'
                                                                                    ? `${method.fee_percentage}%`
                                                                                    : formatCurrency(method.fee_fixed || 0)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center mt-1">
                                                                            <span className="text-muted-foreground">Jumlah Pembayaran:</span>
                                                                            <span className="font-semibold text-lg text-brand-primary">
                                                                                {formatCurrency(method.total_with_fee)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </label>
                                                        </div>
                                                        {selectedMethod?.id === method.id && (
                                                            <CheckCircle className="h-5 w-5 text-brand-primary flex-shrink-0 mt-1" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                        {errors.payment_method_id && (
                                            <p className="text-sm text-destructive mt-2">{errors.payment_method_id}</p>
                                        )}
                                    </div>

                                    {/* Expiry Time Setting */}
                                    <div>
                                        <Label htmlFor="expiry_hours" className="text-base font-medium">
                                            Waktu Kedaluwarsa Link Pembayaran
                                        </Label>
                                        <div className="mt-2 space-y-2">
                                            <Input
                                                id="expiry_hours"
                                                type="number"
                                                min={1}
                                                max={168}
                                                value={expiryHours}
                                                onChange={(e) => {
                                                    const hours = parseInt(e.target.value) || defaultExpiryHours;
                                                    setExpiryHours(hours);
                                                    setData('expiry_hours', hours);
                                                }}
                                                className="w-full"
                                            />
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    Link pembayaran akan berlaku selama {expiryHours} jam ({expiryHours / 24} hari)
                                                </span>
                                            </div>
                                            {errors.expiry_hours && (
                                                <p className="text-sm text-destructive">{errors.expiry_hours}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Amount Info */}
                                    {selectedMethod && (
                                        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                                            <Info className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-800 dark:text-blue-200">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>Jumlah Tagihan:</span>
                                                        <span className="font-medium">{formatCurrency(pendingAmount)}</span>
                                                    </div>
                                                    {selectedMethod.fee_amount > 0 && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span>Biaya Transaksi:</span>
                                                                <span className="font-medium text-orange-600">
                                                                    {formatCurrency(selectedMethod.fee_amount)}
                                                                </span>
                                                            </div>
                                                            <Separator className="my-2" />
                                                            <div className="flex justify-between font-semibold text-lg">
                                                                <span>Total Pembayaran:</span>
                                                                <span className="text-brand-primary">
                                                                    {formatCurrency(selectedMethod.total_with_fee)}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Info Alert */}
                                    <Alert>
                                        <Shield className="h-4 w-4" />
                                        <AlertDescription>
                                            Anda akan diarahkan ke halaman pembayaran iPaymu yang aman.
                                            Setelah pembayaran berhasil, Anda akan kembali ke halaman ini.
                                        </AlertDescription>
                                    </Alert>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            disabled={processing || isSubmitting || !selectedMethod}
                                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-brand-primary to-brand-primary-dark hover:from-brand-primary-dark hover:to-brand-primary shadow-lg hover:shadow-xl transition-all"
                                        >
                                            {(processing || isSubmitting) ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="mr-2 h-5 w-5" />
                                                    Lanjutkan ke Pembayaran
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Booking Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="card-modern sticky top-6 shadow-lg border-0">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    Detail Booking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {/* Property Info */}
                                    <div>
                                        <h4 className="font-semibold text-lg mb-2">{booking.property.name}</h4>
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                                            <span>{booking.property.address}</span>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Booking Details */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Check-in:</span>
                                            <span>{new Date(booking.check_in).toLocaleDateString('id-ID')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Check-out:</span>
                                            <span>{new Date(booking.check_out).toLocaleDateString('id-ID')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Durasi:</span>
                                            <span>{nights} malam</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Booking Number:</span>
                                            <span className="font-mono">{booking.booking_number}</span>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Payment Summary */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total:</span>
                                            <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Sudah Dibayar:</span>
                                            <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span className="font-semibold">Sisa Tagihan:</span>
                                            <span className="text-xl font-bold text-brand-primary">
                                                {formatCurrency(pendingAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
