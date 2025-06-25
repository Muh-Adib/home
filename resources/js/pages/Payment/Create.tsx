import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    Loader2
} from 'lucide-react';
import FileUpload, { UploadedFile, FileUploadConfig } from '@/components/ui/file-upload';

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
    check_in_date: string;
    check_out_date: string;
    guest_count_male: number;
    guest_count_female: number;
    guest_count_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    total_amount: number;
    dp_amount: number;
    remaining_amount: number;
    dp_percentage: number;
    special_requests?: string;
    status: string;
}

interface PaymentCreateProps {
    booking: Booking;
    paymentMethods: PaymentMethod[];
    pendingAmount: number;
    paidAmount: number;
    bankOptions: string[];
}

export default function PaymentCreate({ booking, paymentMethods, pendingAmount, paidAmount, bankOptions }: PaymentCreateProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [showAccountDetails, setShowAccountDetails] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentProofFiles, setPaymentProofFiles] = useState<UploadedFile[]>([]);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        payment_method_id: '',
        amount: pendingAmount || booking.dp_amount,
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

    const totalGuests = booking.guest_count_male + booking.guest_count_female + booking.guest_count_children;

    return (
        <>
            <Head title={`Payment - ${booking.booking_number}`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <Link href={`/booking/${booking.booking_number}/confirmation`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Booking Confirmation
                        </Link>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Payment Form */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-blue-600" />
                                        Payment Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Payment Summary */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-lg font-semibold">Payment Summary</span>
                                                </div>
                                                
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Total Booking Amount:</span>
                                                        <span className="font-medium">Rp {booking.total_amount.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Already Paid:</span>
                                                        <span className="font-medium text-green-600">Rp {paidAmount.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t pt-2">
                                                        <span className="text-gray-600">Remaining Amount:</span>
                                                        <span className="text-xl font-bold text-blue-600">Rp {pendingAmount.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                
                                                {paidAmount > 0 && (
                                                    <div className="text-sm text-gray-600">
                                                        You can pay the full remaining amount or make a partial payment (minimum Rp 100,000)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment Amount Input */}
                                        <div>
                                            <Label htmlFor="amount">Payment Amount</Label>
                                            <div className="mt-2">
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    min="100000"
                                                    max={pendingAmount}
                                                    value={data.amount}
                                                    onChange={(e) => setData('amount', parseInt(e.target.value) || 0)}
                                                    placeholder="Enter payment amount"
                                                    className="text-lg font-medium"
                                                />
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Minimum: Rp 100,000 • Maximum: Rp {pendingAmount.toLocaleString()}
                                                </div>
                                                {errors.amount && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment Method Selection */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
                                            <div className="grid gap-3">
                                                {paymentMethods.map((method) => (
                                                    <div
                                                        key={method.id}
                                                        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                                                            selectedMethod?.id === method.id
                                                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                        onClick={() => handleMethodSelect(method)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-2xl">{method.icon}</span>
                                                                <div>
                                                                    <div className="font-medium">{method.name}</div>
                                                                    <div className="text-sm text-gray-600">{method.description}</div>
                                                                </div>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                                                selectedMethod?.id === method.id
                                                                    ? 'border-blue-500 bg-blue-500'
                                                                    : 'border-gray-300'
                                                            }`}>
                                                                {selectedMethod?.id === method.id && (
                                                                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {errors.payment_method_id && (
                                                <p className="text-sm text-red-600 mt-2">{errors.payment_method_id}</p>
                                            )}
                                        </div>

                                        {/* Payment Instructions */}
                                        {selectedMethod && showAccountDetails && (
                                            <Card className="border-l-4 border-l-blue-500">
                                                <CardHeader>
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Info className="h-5 w-5 text-blue-600" />
                                                        Payment Instructions
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {/* Account Details */}
                                                    {selectedMethod.account_number && (
                                                        <div className="bg-gray-50 p-4 rounded-lg">
                                                            <h4 className="font-medium mb-3">Transfer Details:</h4>
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-600">Bank:</span>
                                                                    <span className="font-medium">{selectedMethod.bank_name}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-600">Account Number:</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono font-medium">{selectedMethod.account_number}</span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0"
                                                                            onClick={() => copyToClipboard(selectedMethod.account_number!, 'account')}
                                                                        >
                                                                            <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                        {copiedField === 'account' && (
                                                                            <span className="text-xs text-green-600">Copied!</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-600">Account Name:</span>
                                                                    <span className="font-medium">{selectedMethod.account_name}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-600">Amount:</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono font-medium text-blue-600">
                                                                            Rp {data.amount.toLocaleString()}
                                                                        </span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0"
                                                                            onClick={() => copyToClipboard(data.amount.toString(), 'amount')}
                                                                        >
                                                                            <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                        {copiedField === 'amount' && (
                                                                            <span className="text-xs text-green-600">Copied!</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-600">Reference:</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono font-medium">{booking.booking_number}</span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0"
                                                                            onClick={() => copyToClipboard(booking.booking_number, 'booking')}
                                                                        >
                                                                            <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                        {copiedField === 'booking' && (
                                                                            <span className="text-xs text-green-600">Copied!</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Instructions */}
                                                    <div>
                                                        <h4 className="font-medium mb-2">Steps to Complete Payment:</h4>
                                                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                                                            {selectedMethod.instructions?.map((instruction, index) => (
                                                                <li key={index}>{instruction}</li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Sender Account Details */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Sender Account Details</h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <Label htmlFor="sender_account_name">Account Holder Name *</Label>
                                                    <Input
                                                        id="sender_account_name"
                                                        type="text"
                                                        value={data.sender_account_name}
                                                        onChange={(e) => setData('sender_account_name', e.target.value)}
                                                        placeholder="Name as shown on bank account"
                                                        required
                                                        className="mt-2"
                                                    />
                                                    {errors.sender_account_name && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.sender_account_name}</p>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <Label htmlFor="sender_account_number">Account Number *</Label>
                                                    <Input
                                                        id="sender_account_number"
                                                        type="text"
                                                        value={data.sender_account_number}
                                                        onChange={(e) => setData('sender_account_number', e.target.value)}
                                                        placeholder="Your account number"
                                                        required
                                                        className="mt-2"
                                                    />
                                                    {errors.sender_account_number && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.sender_account_number}</p>
                                                    )}
                                                </div>
                                                
                                                <div className="md:col-span-2">
                                                    <Label htmlFor="sender_bank_name">Bank/E-Wallet Name *</Label>
                                                    <Select
                                                        value={data.sender_bank_name}
                                                        onValueChange={(value) => setData('sender_bank_name', value)}
                                                    >
                                                        <SelectTrigger className="mt-2">
                                                            <SelectValue placeholder="Select your bank or e-wallet" />
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
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <Info className="h-4 w-4 inline mr-1" />
                                                Please provide sender account details for verification purposes
                                            </div>
                                        </div>

                                        {/* Payment Proof Upload */}
                                        <div>
                                            <FileUpload
                                                config={paymentProofConfig}
                                                onFilesChange={handlePaymentProofChange}
                                                label="Upload Payment Proof"
                                                description="Upload a clear screenshot or photo of your transfer receipt"
                                                error={errors.payment_proof}
                                            />
                                        </div>

                                        {/* Additional Notes */}
                                        <div>
                                            <Label htmlFor="notes">Additional Notes (Optional)</Label>
                                            <Textarea
                                                id="notes"
                                                value={data.notes}
                                                onChange={(e) => setData('notes', e.target.value)}
                                                rows={3}
                                                placeholder="Any additional information about the payment..."
                                                className="mt-2"
                                            />
                                        </div>

                                        {/* Submit Buttons */}
                                        <div className="flex gap-4 pt-4">
                                            <Link href={`/booking/${booking.booking_number}/confirmation`} className="flex-1">
                                                <Button variant="outline" className="w-full" disabled={processing}>
                                                    Cancel
                                                </Button>
                                            </Link>
                                            <Button 
                                                type="submit" 
                                                disabled={!selectedMethod || !data.payment_proof || processing || isSubmitting}
                                                className="flex-1"
                                            >
                                                {(processing || isSubmitting) ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        {isSubmitting ? 'Submitting...' : 'Processing...'}
                                                    </>
                                                ) : (
                                                    'Submit Payment'
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Booking Summary Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4 space-y-6">
                                {/* Booking Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Booking Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden">
                                                {booking.property.cover_image ? (
                                                    <img 
                                                        src={booking.property.cover_image} 
                                                        alt={booking.property.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <Building2 className="h-8 w-8 text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-semibold">{booking.property.name}</h3>
                                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-4 w-4 mr-1" />
                                                    {booking.property.address}
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-500" />
                                                    <span>{booking.check_in_date} - {booking.check_out_date}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-gray-500" />
                                                    <span>{totalGuests} guests ({booking.guest_count_male}M, {booking.guest_count_female}F, {booking.guest_count_children}C)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-500" />
                                                    <span>Booking: {booking.booking_number}</span>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Total Amount:</span>
                                                    <span>Rp {booking.total_amount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-green-600">
                                                    <span>Already Paid:</span>
                                                    <span>Rp {paidAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-blue-600 font-semibold">
                                                    <span>Remaining Balance:</span>
                                                    <span>Rp {pendingAmount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Guest Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Guest Information</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <span className="font-medium">Name: </span>
                                                <span>{booking.guest_name}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Email: </span>
                                                <span>{booking.guest_email}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Phone: </span>
                                                <span>{booking.guest_phone}</span>
                                            </div>
                                            {booking.special_requests && (
                                                <div>
                                                    <span className="font-medium">Special Requests: </span>
                                                    <span>{booking.special_requests}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Status Info */}
                                <Alert>
                                    <Shield className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Secure Payment</strong><br/>
                                        Your payment will be verified within 2-24 hours. 
                                        You will receive a confirmation email once verified.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 