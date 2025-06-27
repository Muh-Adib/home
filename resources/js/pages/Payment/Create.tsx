import React, { useState } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    CreditCard, 
    Building2,
    MapPin,
    Calendar,
    Users,
    Clock,
    Info,
    Copy,
    Shield,
    Loader2,
    CheckCircle,
    Smartphone,
    Banknote,
    University
} from 'lucide-react';
import FileUpload, { UploadedFile, FileUploadConfig } from '@/components/ui/file-upload';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { useTranslation } from 'react-i18next';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'cash' | 'credit_card';
    icon?: string;
    description?: string;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    qr_code?: string;
    instructions?: string[];
    is_active: boolean;
    sort_order: number;
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
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guests: Guest[];
    total_amount: number;
    dp_amount: number;
    remaining_amount: number;
    dp_percentage: number;
    special_requests?: string;
    booking_status: string;
    payment_status: string;
}

interface Guest {
    id: number;
    name: string;
    email: string;
    phone: string;
}

interface PaymentCreateProps {
    booking: Booking;
    paymentMethods: PaymentMethod[];
    pendingAmount: number;
    paidAmount: number;
    bankOptions: string[];
}

export default function PaymentCreate({ booking, paymentMethods, pendingAmount, paidAmount, bankOptions }: PaymentCreateProps) {
    const page = usePage<PageProps>();
    const { t } = useTranslation();
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [showAccountDetails, setShowAccountDetails] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentProofFiles, setPaymentProofFiles] = useState<UploadedFile[]>([]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' },
        { title: t('nav.my_bookings'), href: route('my-bookings') || '/my-bookings' },
        { title: t('payment.create_payment'), href: route('payments.create', booking.booking_number) }
    ];

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        payment_method_id: '',
        amount: booking.payment_status === 'dp_pending' ? ((pendingAmount)*booking.dp_percentage/100) : pendingAmount,
        payment_proof: null as File | null,
        notes: '',
        sender_account_name: '',
        sender_account_number: '',
        sender_bank_name: '',
    });

    // FileUpload configuration for payment proof
    const paymentProofConfig: FileUploadConfig = {
        maxFiles: 1,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        acceptedFileTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        acceptedExtensions: ['.jpg', '.jpeg', '.png'],
        showPreview: true,
        allowMultiple: false,
        showProgress: true,
        dragAndDrop: true,
        showFileDetails: false,
        showMetadataForm: false,
        required: true
    };

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setData('payment_method_id', method.id.toString());
        setShowAccountDetails(method.type === 'bank_transfer' || method.type === 'e_wallet');
        clearErrors('payment_method_id');
    };

    // Handle payment proof files change
    const handlePaymentProofChange = (files: UploadedFile[]) => {
        setPaymentProofFiles(files);
        if (files.length > 0) {
            setData('payment_proof', files[0].file);
            clearErrors('payment_proof');
        } else {
            setData('payment_proof', null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prevent double submission
        if (isSubmitting || processing) {
            return;
        }

        // Client-side validation
        if (!data.payment_method_id) {
            alert('Harap pilih metode pembayaran');
            return;
        }

        if (!data.payment_proof) {
            alert('Harap upload bukti pembayaran');
            return;
        }

        if (data.amount < 100000) {
            alert('Jumlah pembayaran minimum adalah Rp 100.000');
            return;
        }

        if (data.amount > pendingAmount) {
            alert(`Jumlah pembayaran tidak boleh melebihi sisa tagihan: Rp ${pendingAmount.toLocaleString()}`);
            return;
        }

        if (!data.sender_account_name.trim()) {
            alert('Harap isi nama pemilik rekening pengirim');
            return;
        }

        if (!data.sender_account_number.trim()) {
            alert('Harap isi nomor rekening pengirim');
            return;
        }

        if (!data.sender_bank_name.trim()) {
            alert('Harap isi nama bank/e-wallet pengirim');
            return;
        }

        setIsSubmitting(true);

        // Debug: Log form data
        console.log('Submitting payment with data:', {
            payment_method_id: data.payment_method_id,
            amount: data.amount,
            payment_proof: data.payment_proof ? {
                name: data.payment_proof.name,
                size: data.payment_proof.size,
                type: data.payment_proof.type
            } : null,
            notes: data.notes,
            sender_account_name: data.sender_account_name,
            sender_account_number: data.sender_account_number,
            sender_bank_name: data.sender_bank_name
        });

        // Submit dengan Inertia form handling
        post(`/booking/${booking.booking_number}/payment`, {
            forceFormData: true,
            onSuccess: (page) => {
                console.log('Payment submission successful:', page);
                setIsSubmitting(false);
                
                // Redirect to my-bookings
                router.visit('/my-bookings', {
                    onSuccess: () => {
                        console.log('Redirected to my-bookings successfully');
                    }
                });
            },
            onError: (errors) => {
                console.error('Payment submission failed:', errors);
                setIsSubmitting(false);
                
                // Show specific error message if available
                if (errors.error) {
                    alert(`Error: ${errors.error}`);
                } else if (errors.payment_method_id) {
                    alert(`Error metode pembayaran: ${errors.payment_method_id}`);
                } else if (errors.amount) {
                    alert(`Error jumlah: ${errors.amount}`);
                } else if (errors.payment_proof) {
                    alert(`Error bukti pembayaran: ${errors.payment_proof}`);
                } else if (Object.keys(errors).length > 0) {
                    const firstError = Object.values(errors)[0] as string;
                    alert(`Error: ${firstError}`);
                } else {
                    alert('Terjadi kesalahan saat mengirim pembayaran. Silakan coba lagi.');
                }
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };



    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('payment.create_payment')} - ${booking.booking_number}`} />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {t('payment.create_payment')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t('payment.create_subtitle', { booking: booking.booking_number })}
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
                        <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-purple-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                    {t('payment.payment_summary')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">{t('payment.total_booking')}:</span>
                                        <span className="font-medium">Rp {(booking.total_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">{t('payment.already_paid')}:</span>
                                        <span className="font-medium text-green-600">Rp {paidAmount.toLocaleString()}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">{t('payment.remaining_amount')}:</span>
                                        <span className="text-2xl font-bold text-blue-600">Rp {pendingAmount.toLocaleString()}</span>
                                    </div>

                                    {booking.payment_status === 'dp_pending' && (<div className="flex justify-between items-center">
                                        <span className="text-gray-600">{t('payment.type.down_payment')}:</span>
                                        <span className="text-2xl font-bold text-blue-600">Rp {((pendingAmount)*booking.dp_percentage/100).toLocaleString()}</span>
                                    </div>)}
                                    
                                    {paidAmount > 0 && (
                                        <Alert className="bg-blue-50 border-blue-200">
                                            <Info className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-800">
                                                {t('payment.partial_payment_note')}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Form Card */}
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-green-600" />
                                    {t('payment.payment_details')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Payment Amount Input */}
                                    <div>
                                        <Label htmlFor="amount" className="text-base font-medium">
                                            {t('payment.payment_amount')}
                                        </Label>
                                        <div className="mt-2">
                                            <Input
                                                id="amount"
                                                type="number"
                                                step={booking.payment_status === 'dp_pending' ? ((pendingAmount)*booking.dp_percentage/100) : pendingAmount}
                                                min={booking.payment_status === 'dp_pending' ? ((pendingAmount)*booking.dp_percentage/100) : pendingAmount}
                                                max={pendingAmount}
                                                value={data.amount}
                                                onChange={(e) => setData('amount', parseInt(e.target.value) || 0)}
                                                placeholder={t('payment.enter_amount')}
                                                className="text-lg font-medium h-12"
                                            />
                                            
                                            <div className="text-xs text-gray-600 mt-2 flex justify-between">
                                                <span>{t('payment.minimum')}: Rp 100,000</span>
                                                <span>{t('payment.maximum')}: Rp {pendingAmount.toLocaleString()}</span>
                                            </div>
                                            {errors.amount && (
                                                <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Method Selection */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Banknote className="h-5 w-5 text-blue-600" />
                                            {t('payment.select_method')}
                                        </h3>
                                        <div className="grid gap-3">
                                            {paymentMethods.map((method) => {
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

                                                return (
                                                    <div
                                                        key={method.id}
                                                        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                                                            selectedMethod?.id === method.id
                                                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md'
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                                                        }`}
                                                        onClick={() => handleMethodSelect(method)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                {method.icon ? (
                                                                    <span className="text-2xl">{method.icon}</span>
                                                                ) : (
                                                                    getMethodIcon(method.type)
                                                                )}
                                                                <div>
                                                                    <div className="font-medium text-lg">{method.name}</div>
                                                                    <div className="text-sm text-gray-600">{method.description}</div>
                                                                    <Badge variant="secondary" className="mt-1 text-xs">
                                                                        {method.type.replace('_', ' ').toUpperCase()}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                                                selectedMethod?.id === method.id
                                                                    ? 'border-blue-500 bg-blue-500'
                                                                    : 'border-gray-300'
                                                            }`}>
                                                                {selectedMethod?.id === method.id && (
                                                                    <CheckCircle className="h-4 w-4 text-white" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {errors.payment_method_id && (
                                            <p className="text-sm text-red-600 mt-2">{errors.payment_method_id}</p>
                                        )}
                                    </div>

                                    {/* Payment Instructions */}
                                    {selectedMethod && showAccountDetails && (
                                        <Card className="border-l-4 border-l-blue-500 shadow-md">
                                            <CardHeader className="bg-blue-50/50">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Info className="h-5 w-5 text-blue-600" />
                                                    {t('payment.payment_instructions')}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-6">
                                                {/* Account Details */}
                                                {selectedMethod.account_number && (
                                                    <div className="bg-gray-50 p-4 rounded-lg border">
                                                        <h4 className="font-medium mb-3 text-lg">{t('payment.transfer_details')}:</h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center p-2 bg-white rounded border">
                                                                <span className="text-gray-600 font-medium">{t('payment.bank')}:</span>
                                                                <span className="font-semibold">{selectedMethod.bank_name}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center p-2 bg-white rounded border">
                                                                <span className="text-gray-600 font-medium">{t('payment.account_number')}:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-bold text-blue-600">{selectedMethod.account_number}</span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 hover:bg-blue-100"
                                                                        onClick={() => copyToClipboard(selectedMethod.account_number!, 'account')}
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                    {copiedField === 'account' && (
                                                                        <span className="text-xs text-green-600 font-medium">{t('payment.copied')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center p-2 bg-white rounded border">
                                                                <span className="text-gray-600 font-medium">{t('payment.account_name')}:</span>
                                                                <span className="font-semibold">{selectedMethod.account_name}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
                                                                <span className="text-gray-600 font-medium">{t('payment.amount')}:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-bold text-blue-600 text-lg">
                                                                        Rp {data.amount.toLocaleString()}
                                                                    </span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 hover:bg-blue-100"
                                                                        onClick={() => copyToClipboard(data.amount.toString(), 'amount')}
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                    {copiedField === 'amount' && (
                                                                        <span className="text-xs text-green-600 font-medium">{t('payment.copied')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center p-2 bg-white rounded border">
                                                                <span className="text-gray-600 font-medium">{t('payment.reference')}:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-bold">{booking.booking_number}</span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 hover:bg-blue-100"
                                                                        onClick={() => copyToClipboard(booking.booking_number, 'booking')}
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                    {copiedField === 'booking' && (
                                                                        <span className="text-xs text-green-600 font-medium">{t('payment.copied')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Instructions */}
                                                        {selectedMethod.instructions && selectedMethod.instructions.length > 0 && (
                                                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                                <h5 className="font-medium text-yellow-800 mb-2">{t('payment.instructions')}:</h5>
                                                                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                                                                    {selectedMethod.instructions.map((instruction, index) => (
                                                                        <li key={index}>{instruction}</li>
                                                                    ))}
                                                                </ol>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Sender Information */}
                                    {showAccountDetails && (
                                        <Card className="shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-lg">{t('payment.sender_information')}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="sender_account_name">{t('payment.sender_name')}</Label>
                                                        <Input
                                                            id="sender_account_name"
                                                            value={data.sender_account_name}
                                                            onChange={(e) => setData('sender_account_name', e.target.value)}
                                                            placeholder={t('payment.sender_name_placeholder')}
                                                            required
                                                        />
                                                        {errors.sender_account_name && (
                                                            <p className="text-sm text-red-600 mt-1">{errors.sender_account_name}</p>
                                                        )}
                                                    </div>
                                                    
                                                    <div>
                                                        <Label htmlFor="sender_account_number">{t('payment.sender_account')}</Label>
                                                        <Input
                                                            id="sender_account_number"
                                                            value={data.sender_account_number}
                                                            onChange={(e) => setData('sender_account_number', e.target.value)}
                                                            placeholder={t('payment.sender_account_placeholder')}
                                                            required
                                                        />
                                                        {errors.sender_account_number && (
                                                            <p className="text-sm text-red-600 mt-1">{errors.sender_account_number}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <Label htmlFor="sender_bank_name">{t('payment.sender_bank')}</Label>
                                                    <Select value={data.sender_bank_name} onValueChange={(value) => setData('sender_bank_name', value)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('payment.select_bank')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {bankOptions.map((bank) => (
                                                                <SelectItem key={bank} value={bank}>
                                                                    {bank}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.sender_bank_name && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.sender_bank_name}</p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Payment Proof Upload */}
                                    <Card className="shadow-md">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{t('payment.upload_proof')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <FileUpload
                                                config={paymentProofConfig}
                                                onFilesChange={handlePaymentProofChange}
                                                label={t('payment.proof_label')}
                                                description={t('payment.proof_description')}
                                                className="w-full"
                                                error={errors.payment_proof}
                                            />
                                            {errors.payment_proof && (
                                                <p className="text-sm text-red-600 mt-2">{errors.payment_proof}</p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Notes */}
                                    <div>
                                        <Label htmlFor="notes">{t('payment.details.notes')} ({t('common.optional')})</Label>
                                        <Textarea
                                            id="notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            placeholder={t('payment.notes_placeholder')}
                                            rows={3}
                                            className="mt-2"
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            disabled={processing || isSubmitting || !selectedMethod || !data.payment_proof}
                                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                        >
                                            {(processing || isSubmitting) ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    {t('payment.processing')}
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="mr-2 h-5 w-5" />
                                                    {t('payment.submit_payment')}
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
                        <Card className="sticky top-6 shadow-lg border-0">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    {t('booking.booking_summary')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {/* Property Info */}
                                    <div>
                                        <h4 className="font-semibold text-lg mb-2">{booking.property.name}</h4>
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                                            <span>{booking.property.address}</span>
                                        </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    {/* Booking Details */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{t('booking.check_in')}:</span>
                                            <span>{new Date(booking.check_in).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{t('booking.check_out')}:</span>
                                            <span>{new Date(booking.check_out).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{t('booking.guests')}:</span>
                                            <span>{booking.guest_count}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{t('payment.booking_number')}:</span>
                                            <span className="font-mono">{booking.booking_number}</span>
                                        </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    {/* Guest Info */}
                                    <div>
                                        <h5 className="font-medium mb-2">{t('booking.primary_guest')}</h5>
                                        <div className="text-sm space-y-1">
                                            <p><span className="font-medium">{t('booking.full_name')}:</span> {booking.guest_name}</p>
                                            <p><span className="font-medium">{t('booking.email_address')}:</span> {booking.guest_email}</p>
                                            <p><span className="font-medium">{t('booking.phone_number')}:</span> {booking.guest_phone}</p>
                                        </div>
                                    </div>

                                    {booking.special_requests && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h5 className="font-medium mb-2">{t('booking.special_requests')}</h5>
                                                <p className="text-sm text-gray-600">{booking.special_requests}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 