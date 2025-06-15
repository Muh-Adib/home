import React, { useState, useRef } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
    ArrowLeft, 
    CreditCard, 
    Upload,
    Building2,
    MapPin,
    Calendar,
    Users,
    Clock,
    CheckCircle,
    Info,
    Copy,
    Shield,
    Loader2,
    X,
    AlertTriangle
} from 'lucide-react';

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
}

export default function PaymentCreate({ booking, paymentMethods }: PaymentCreateProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [showAccountDetails, setShowAccountDetails] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        payment_method_id: '',
        amount: booking.dp_amount,
        payment_proof: null as File | null,
        notes: '',
    });

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setData('payment_method_id', method.id.toString());
        setShowAccountDetails(method.type === 'bank_transfer' || method.type === 'e_wallet');
        clearErrors('payment_method_id');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('Harap pilih file gambar yang valid (JPEG, PNG, JPG)');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert('Ukuran file harus kurang dari 10MB');
            return;
        }

        setData('payment_proof', file);
        clearErrors('payment_proof');
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Simulate upload progress
        simulateUploadProgress();
    };

    const simulateUploadProgress = () => {
        setIsUploading(true);
        setUploadProgress(0);

        const interval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsUploading(false);
                    return 100;
                }
                return prev + Math.random() * 15;
            });
        }, 200);
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
            notes: data.notes
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

    const removeFile = () => {
        setData('payment_proof', null);
        setPreviewUrl(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
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
                                        {/* Payment Amount */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-semibold">Down Payment Amount</span>
                                                <span className="text-2xl font-bold text-blue-600">
                                                    Rp {booking.dp_amount.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-2">
                                                {booking.dp_percentage}% of total booking amount (Rp {booking.total_amount.toLocaleString()})
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
                                                                            Rp {booking.dp_amount.toLocaleString()}
                                                                        </span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0"
                                                                            onClick={() => copyToClipboard(booking.dp_amount.toString(), 'amount')}
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

                                        {/* Enhanced Payment Proof Upload */}
                                        <div>
                                            <Label htmlFor="payment_proof" className="text-base font-medium">
                                                Upload Payment Proof *
                                            </Label>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Upload a clear screenshot or photo of your transfer receipt
                                            </p>
                                            
                                            <div className="space-y-4">
                                                {/* Upload Area with Drag & Drop */}
                                                <div
                                                    className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
                                                        isDragActive
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : data.payment_proof
                                                            ? 'border-green-500 bg-green-50'
                                                            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                                    }`}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={handleDrop}
                                                >
                                                    <input
                                                        ref={fileInputRef}
                                                        id="payment_proof"
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/jpeg,image/png,image/jpg"
                                                        onChange={handleFileChange}
                                                    />
                                                    
                                                    {!data.payment_proof ? (
                                                        <label
                                                            htmlFor="payment_proof"
                                                            className="flex flex-col items-center justify-center w-full h-40 cursor-pointer p-6"
                                                        >
                                                            <div className="flex flex-col items-center justify-center">
                                                                <Upload className={`w-10 h-10 mb-3 transition-colors ${
                                                                    isDragActive ? 'text-blue-500' : 'text-gray-400'
                                                                }`} />
                                                                <p className="mb-2 text-sm text-gray-600">
                                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    JPEG, PNG, JPG (Max 10MB)
                                                                </p>
                                                            </div>
                                                        </label>
                                                    ) : (
                                                        <div className="p-4">
                                                            <div className="flex items-start gap-4">
                                                                {/* Thumbnail Preview */}
                                                                <div className="flex-shrink-0">
                                                                    {previewUrl && (
                                                                        <div className="relative">
                                                                            <img
                                                                                src={previewUrl}
                                                                                alt="Payment proof preview"
                                                                                className="w-20 h-20 object-cover rounded-lg border-2 border-green-500 shadow-sm"
                                                                            />
                                                                            <div className="absolute -top-2 -right-2">
                                                                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* File Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                                {data.payment_proof.name}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">
                                                                                {(data.payment_proof.size / 1024 / 1024).toFixed(2)} MB
                                                                            </p>
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={removeFile}
                                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                    
                                                                    {/* Upload Progress Bar */}
                                                                    {isUploading && (
                                                                        <div className="mt-2">
                                                                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                                Uploading... {Math.round(uploadProgress)}%
                                                                            </div>
                                                                            <Progress value={uploadProgress} className="h-1" />
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {!isUploading && uploadProgress === 100 && (
                                                                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                                                                            <CheckCircle className="w-3 h-3" />
                                                                            Upload complete
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {errors.payment_proof && (
                                                    <p className="text-sm text-red-600">{errors.payment_proof}</p>
                                                )}
                                            </div>
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
                                            <Link href={`/booking/${booking.id}/confirmation`} className="flex-1">
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

                        {/* Booking Summary */}
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
                                                <div className="flex justify-between text-blue-600 font-semibold">
                                                    <span>Down Payment ({booking.dp_percentage}%):</span>
                                                    <span>Rp {booking.dp_amount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-600">
                                                    <span>Remaining Balance:</span>
                                                    <span>Rp {booking.remaining_amount.toLocaleString()}</span>
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