import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    CheckCircle, 
    Clock,
    CreditCard,
    FileText,
    Building2,
    MapPin,
    Calendar,
    Users,
    ArrowRight,
    Home,
    MessageCircle
} from 'lucide-react';

interface Payment {
    id: number;
    payment_method_name: string;
    amount: number;
    status: string;
    payment_proof?: string;
    notes?: string;
    created_at: string;
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
    status: string;
}

interface PaymentSuccessProps {
    payment: Payment;
    booking: Booking;
}

export default function PaymentSuccess({ payment, booking }: PaymentSuccessProps) {
    const totalGuests = booking.guest_count_male + booking.guest_count_female + booking.guest_count_children;

    const nextSteps = [
        {
            icon: Clock,
            title: "Verification Process",
            description: "Our team will verify your payment within 2-24 hours",
            timeframe: "2-24 hours"
        },
        {
            icon: MessageCircle,
            title: "Email Confirmation",
            description: "You'll receive an email confirmation once payment is verified",
            timeframe: "After verification"
        },
        {
            icon: FileText,
            title: "Booking Confirmation",
            description: "Final booking details and instructions will be sent",
            timeframe: "After verification"
        },
        {
            icon: Calendar,
            title: "Check-in Preparation",
            description: "Contact details and check-in instructions will be provided",
            timeframe: "1-2 days before arrival"
        }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Verification</Badge>;
            case 'verified':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <>
            <Head title={`Payment Submitted - ${booking.booking_number}`} />
            
            <div className="min-h-screen bg-slate-50">
                <div className="container mx-auto px-4 py-8">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Submitted Successfully!</h1>
                        <p className="text-gray-600">Your payment has been received and is being processed</p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Payment Details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Payment Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-green-600" />
                                        Payment Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Payment Method:</span>
                                            <span>{payment.payment_method_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Amount Paid:</span>
                                            <span className="text-xl font-bold text-green-600">
                                                Rp {payment.amount.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Status:</span>
                                            {getStatusBadge(payment.status)}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Submitted:</span>
                                            <span>{new Date(payment.created_at).toLocaleString()}</span>
                                        </div>
                                        {payment.notes && (
                                            <div>
                                                <span className="font-medium">Notes:</span>
                                                <p className="text-gray-600 mt-1">{payment.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Next Steps */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ArrowRight className="h-5 w-5 text-blue-600" />
                                        What Happens Next?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {nextSteps.map((step, index) => (
                                            <div key={index} className="flex gap-4">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <step.icon className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold">{step.title}</h4>
                                                    <p className="text-gray-600 text-sm">{step.description}</p>
                                                    <span className="text-xs text-blue-600 font-medium">{step.timeframe}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Important Information */}
                            <Alert>
                                <Clock className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Important:</strong> Keep this confirmation for your records. 
                                    If you have any questions, please contact us with your booking number: <strong>{booking.booking_number}</strong>
                                </AlertDescription>
                            </Alert>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/" className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        <Home className="h-4 w-4 mr-2" />
                                        Back to Home
                                    </Button>
                                </Link>
                                <Link href={`/properties/${booking.property.slug}`} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        <Building2 className="h-4 w-4 mr-2" />
                                        View Property
                                    </Button>
                                </Link>
                                <Link href={`/booking/${booking.id}/confirmation`} className="flex-1">
                                    <Button className="w-full">
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Booking Details
                                    </Button>
                                </Link>
                            </div>
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
                                                    <FileText className="h-4 w-4 text-gray-500" />
                                                    <span>Booking: {booking.booking_number}</span>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Total Amount:</span>
                                                    <span>Rp {booking.total_amount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-green-600 font-semibold">
                                                    <span>Paid ({booking.dp_percentage}%):</span>
                                                    <span>Rp {booking.dp_amount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-600">
                                                    <span>Remaining Balance:</span>
                                                    <span>Rp {booking.remaining_amount.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <div className="text-sm font-medium text-green-800">
                                                    Payment Status: {getStatusBadge(payment.status)}
                                                </div>
                                                <div className="text-xs text-green-600 mt-1">
                                                    Submitted on {new Date(payment.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Contact Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Need Help?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <span className="font-medium">Customer Service</span>
                                                <p className="text-gray-600">Available 24/7 to assist you</p>
                                            </div>
                                            <div>
                                                <span className="font-medium">WhatsApp:</span>
                                                <p className="text-blue-600">+62 812-3456-7890</p>
                                            </div>
                                            <div>
                                                <span className="font-medium">Email:</span>
                                                <p className="text-blue-600">support@propertyms.com</p>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Please mention booking number: {booking.booking_number}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 