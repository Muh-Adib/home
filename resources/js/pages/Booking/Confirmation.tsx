import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin, 
    Building2,
    Clock,
    CreditCard,
    Phone,
    Mail,
    ArrowRight,
    Download,
    Info
} from 'lucide-react';

interface Booking {
    id: string;
    booking_number: string;
    check_in: string;
    check_in_time: string;
    check_out: string;
    nights: number;
    guest_count: number;
    guest_name: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_email: string;
    guest_phone?: string;
    guest_country?: string;
    guest_id_number?: string;
    guest_gender?: string;
    relationship_type?: string;
    special_requests?: string;
    booking_status: string;
    payment_status: string;
    payment_link: string;
    total_amount: number;
    dp_dateline: string;
    dp_amount: number;
    remaining_amount: number;
    dp_percentage: number;
    created_at: string;
    property: {
        id: number;
        name: string;
        slug: string;
        address: string;
        cover_image?: string;
        owner: {
            name?: string;
            phone?: string;
        };
    };
}

interface BookingConfirmationProps {
    booking: Booking;
}

export default function BookingConfirmation({ booking }: BookingConfirmationProps) {
    const statusColors = {
        pending_verification: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
        pending_verification: 'Pending Verification',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const nights = Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24));

    return (
        <>
            <Head title={`Booking Confirmation - ${booking.booking_number}`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="text-center">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-3xl font-bold text-gray-900">Booking Submitted!</h1>
                            <p className="text-gray-600 mt-2">
                                Your booking request has been submitted successfully.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Status Alert */}
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>What's next?</strong> Our staff will verify your booking details and contact you within 24 hours. 
                                You'll receive payment instructions once your booking is verified.
                            </AlertDescription>
                        </Alert>

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Booking Details */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Booking Info */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>Booking Details</CardTitle>
                                            <Badge className={statusColors[booking.booking_status as keyof typeof statusColors]}>
                                                {statusLabels[booking.booking_status as keyof typeof statusLabels]}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">Booking Code</Label>
                                                <p className="text-lg font-mono font-semibold">{booking.booking_number}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">Booking Date</Label>
                                                <p>{formatDate(booking.created_at)}</p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium">Check-in</p>
                                                    <p className="text-sm text-gray-600">{formatDate(booking.check_in)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium">Check-out</p>
                                                    <p className="text-sm text-gray-600">{formatDate(booking.check_out)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium">Duration</p>
                                                <p className="text-sm text-gray-600">{nights} nights</p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="flex items-center gap-3">
                                            <Users className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium">Guests</p>
                                                <p className="text-sm text-gray-600">
                                                    {booking.guest_count} guests total: 
                                                    {booking.guest_male} male, 
                                                    {booking.guest_female} female
                                                    {booking.guest_children > 0 && `, ${booking.guest_children} children`}
                                                </p>
                                            </div>
                                        </div>

                                        {booking.special_requests && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <p className="text-sm font-medium mb-2">Special Requests</p>
                                                    <p className="text-sm text-gray-600 bg-slate-50 p-3 rounded-lg">
                                                        {booking.special_requests}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Guest Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Primary Guest Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                                                <p>{booking.guest_name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-600" />
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">Phone</Label>
                                                    <p>{booking.guest_phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <Label className="text-sm font-medium text-gray-600">Email</Label>
                                                <p>{booking.guest_email}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Property Owner Contact */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Property Owner</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Users className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{booking.property.owner?.name || 'N/A'}</p>
                                                {booking.property.owner?.phone && (
                                                    <p className="text-sm text-gray-600">{booking.property.owner?.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Property & Payment Summary */}
                            <div className="space-y-6">
                                {/* Property */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Property</CardTitle>
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
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Summary */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            Payment Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between font-semibold">
                                                <span>Total Amount</span>
                                                <span>Rp {(booking.total_amount || 0).toLocaleString()}</span>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div className="flex justify-between text-blue-600 font-semibold">
                                                <span>Down Payment ({booking.dp_percentage}%)</span>
                                                <span>Rp {(booking.dp_amount || 0).toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="flex justify-between text-gray-600">
                                                <span>Remaining Balance</span>
                                                <span>Rp {(booking.remaining_amount || 0).toLocaleString()}</span>
                                            </div>

                                            <div className="bg-yellow-50 p-3 rounded-lg mt-4">
                                                <p className="text-sm text-yellow-800">
                                                    <strong>Payment Instructions:</strong> You will receive payment details after your booking is verified by our staff.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Actions */}
                                <div className="space-y-3">
                                    {booking.payment_status === 'dp_pending' && (
                                        <Link href={booking.payment_link} className="block">
                                            <Button className="w-full" size="lg">
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                Make Payment
                                                <span className="text-xs ml-2">(Rp {booking.dp_amount.toLocaleString()})</span>
                                            </Button>
                                        </Link>
                                    )}
                                    
                                    {booking.payment_status === 'pending' && (
                                        <Alert>
                                            <Clock className="h-4 w-4" />
                                            <AlertDescription>
                                                Your booking is being verified by our staff. You will be notified once verification is complete.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    {booking.payment_status === 'paid' && (
                                        <Button className="w-full" variant="outline" disabled>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Payment Completed
                                        </Button>
                                    )}
                                    
                                    <Button className="w-full" variant="outline" disabled>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download Booking Voucher
                                        <span className="text-xs ml-2">(Available after payment)</span>
                                    </Button>
                                    
                                    <Link href="/properties" className="block">
                                        <Button variant="outline" className="w-full">
                                            Browse More Properties
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                    
                                    <Link href="/" className="block">
                                        <Button variant="ghost" className="w-full">
                                            Back to Home
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
    return <label className={className}>{children}</label>;
} 