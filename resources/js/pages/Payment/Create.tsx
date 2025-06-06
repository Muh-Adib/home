import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    AlertCircle,
    Info,
    Copy,
    Eye,
    EyeOff
} from 'lucide-react';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: string;
    icon: string;
    description: string;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    instructions: string[];
    is_active: boolean;
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

    const { data, setData, post, processing, errors } = useForm({
        payment_method: '',
        amount: booking.dp_amount,
        payment_proof: null as File | null,
        notes: '',
    });

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setData('payment_method', method.code);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setData('payment_proof', e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/booking/${booking.booking_number}/payment`);
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
                        <Link href={`/booking/${booking.id}/confirmation`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
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
                                                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                                            selectedMethod?.id === method.id
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300'
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
                                                            <input
                                                                type="radio"
                                                                name="payment_method"
                                                                value={method.code}
                                                                checked={selectedMethod?.id === method.id}
                                                                onChange={() => handleMethodSelect(method)}
                                                                className="text-blue-600"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {errors.payment_method && (
                                                <p className="text-sm text-red-600 mt-2">{errors.payment_method}</p>
                                            )}
                                        </div>

                                        {/* Payment Instructions */}
                                        {selectedMethod && (
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-lg">Payment Instructions</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {/* Account Details */}
                                                    {(selectedMethod.account_number || selectedMethod.bank_name) && (
                                                        <div className="space-y-3 mb-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">Payment Details</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setShowAccountDetails(!showAccountDetails)}
                                                                >
                                                                    {showAccountDetails ? (
                                                                        <>
                                                                            <EyeOff className="h-4 w-4 mr-2" />
                                                                            Hide
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Eye className="h-4 w-4 mr-2" />
                                                                            Show
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                            
                                                            {showAccountDetails && (
                                                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                                                    {selectedMethod.bank_name && (
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-medium">Bank:</span>
                                                                            <span className="text-sm">{selectedMethod.bank_name}</span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {selectedMethod.account_number && (
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-medium">Account Number:</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-mono">{selectedMethod.account_number}</span>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => copyToClipboard(selectedMethod.account_number!, 'account')}
                                                                                >
                                                                                    <Copy className="h-3 w-3" />
                                                                                </Button>
                                                                                {copiedField === 'account' && (
                                                                                    <span className="text-xs text-green-600">Copied!</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {selectedMethod.account_name && (
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-medium">Account Name:</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm">{selectedMethod.account_name}</span>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => copyToClipboard(selectedMethod.account_name!, 'name')}
                                                                                >
                                                                                    <Copy className="h-3 w-3" />
                                                                                </Button>
                                                                                {copiedField === 'name' && (
                                                                                    <span className="text-xs text-green-600">Copied!</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-sm font-medium">Amount:</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-bold text-blue-600">
                                                                                Rp {booking.dp_amount.toLocaleString()}
                                                                            </span>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
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
                                                                        <span className="text-sm font-medium">Reference:</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-mono">{booking.booking_number}</span>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
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
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Instructions */}
                                                    <div>
                                                        <h4 className="font-medium mb-2">Steps to Complete Payment:</h4>
                                                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                                                            {selectedMethod.instructions.map((instruction, index) => (
                                                                <li key={index}>{instruction}</li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Payment Proof Upload */}
                                        <div>
                                            <Label htmlFor="payment_proof">Upload Payment Proof *</Label>
                                            <div className="mt-2">
                                                <div className="flex items-center justify-center w-full">
                                                    <label htmlFor="payment_proof" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <Upload className="w-8 h-8 mb-2 text-gray-500" />
                                                            <p className="mb-2 text-sm text-gray-500">
                                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                                            </p>
                                                            <p className="text-xs text-gray-500">PNG, JPG or PDF (MAX. 10MB)</p>
                                                        </div>
                                                        <input 
                                                            id="payment_proof" 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept="image/*,application/pdf"
                                                            onChange={handleFileChange}
                                                        />
                                                    </label>
                                                </div>
                                                {data.payment_proof && (
                                                    <div className="mt-2 text-sm text-gray-600">
                                                        Selected: {data.payment_proof.name}
                                                    </div>
                                                )}
                                                {errors.payment_proof && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.payment_proof}</p>
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
                                            />
                                        </div>

                                        {/* Submit */}
                                        <div className="flex gap-4 pt-4">
                                            <Link href={`/booking/${booking.id}/confirmation`} className="flex-1">
                                                <Button variant="outline" className="w-full">Cancel</Button>
                                            </Link>
                                            <Button 
                                                type="submit" 
                                                disabled={!selectedMethod || !data.payment_proof || processing}
                                                className="flex-1"
                                            >
                                                {processing ? 'Submitting...' : 'Submit Payment'}
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
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
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