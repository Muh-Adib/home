import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react'; // Add Link and router import
import GuestLayout from '@/layouts/guest-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Map } from '@/components/ui/map';
// Progress import removed as it wasn't exported from '@/components/ui/progress'
import {
    MapPin,
    Calendar,
    Users,
    CheckCircle,
    Clock,
    CreditCard,
    Wifi,
    Info,
    Phone,
    Copy,
    ExternalLink,
    ChevronRight,
    Home,
    MessageSquare,
    ShieldCheck,
    AlertTriangle,
    BedDouble
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ShowBookingProps {
    booking: any;
    show_wifi: boolean;
    wifi_password?: string;
    auth: any;
}

export default function Show({ booking, show_wifi, wifi_password }: ShowBookingProps) {
    const { property, payments } = booking;
    const [activeTab, setActiveTab] = useState('overview');

    const totalPaid = payments
        .filter((p: any) => p.payment_status === 'verified')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    
    const remainingAmount = Number(booking.total_amount) - totalPaid;
    const progress = Math.min(100, Math.round((totalPaid / Number(booking.total_amount)) * 100));

    const steps = [
        { 
            id: 'confirmed', 
            label: 'Booking Confirmed', 
            status: booking.booking_status === 'confirmed' || booking.booking_status === 'checked_in' ? 'complete' : 'current' 
        },
        { 
            id: 'payment', 
            label: 'Payment', 
            status: booking.payment_status === 'fully_paid' ? 'complete' : (booking.booking_status === 'confirmed' ? 'current' : 'pending')
        },
        { 
            id: 'checkin', 
            label: 'Check-in', 
            status: booking.booking_status === 'checked_in' ? 'complete' : 'pending' 
        },
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast could be added here
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Calculate days/nights
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));

    return (
        <GuestLayout>
            <Head title={`Booking #${booking.booking_number}`} />

            <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6">
                
                {/* 1. Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <Link href="/dashboard" className="text-slate-500 hover:text-slate-800 transition-colors">
                                <ChevronRight className="h-5 w-5 rotate-180" />
                            </Link>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                                Trip to {property.name}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm pl-8">
                             <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">#{booking.booking_number}</span>
                             <span>•</span>
                             <span>{nights} Nights</span>
                             <span>•</span>
                             <span>{booking.guest_count} Guests</span>
                        </div>
                    </div>
                     <Badge className={`
                        px-4 py-1.5 text-sm font-semibold rounded-full
                        ${booking.booking_status === 'confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                        ${booking.booking_status === 'pending_verification' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''}
                        ${booking.booking_status === 'checked_in' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}
                        ${booking.booking_status === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-100' : ''}
                    `}>
                        {booking.booking_status.replace('_', ' ')}
                    </Badge>
                </div>

                {/* Hero Image */}
                <div className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                     {property.cover_image ? (
                        <img 
                            src={`/storage/${property.cover_image}`} 
                            alt={property.name} 
                            className="w-full h-full object-cover"
                        />
                     ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Home className="h-12 w-12" />
                        </div>
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                     <div className="absolute bottom-4 left-4 text-white">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                            <MapPin className="h-4 w-4" />
                            {property.address}
                        </div>
                     </div>
                </div>

                {/* 2. Main Tabs */}
                <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 mb-6 h-12 p-1 bg-slate-100/80 rounded-xl">
                        <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                        <TabsTrigger value="guide" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Guide & Wifi</TabsTrigger>
                        <TabsTrigger value="payment" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Payment
                            {remainingAmount > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 block animate-pulse" />}
                        </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Dates Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-slate-200 shadow-sm">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                        <Calendar className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-500 font-medium">Check-in</div>
                                        <div className="text-lg font-bold text-slate-900">
                                            {format(checkIn, 'EEE, d MMM yyyy', { locale: id })}
                                        </div>
                                        <div className="text-xs text-slate-400">After 14:00</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 shadow-sm">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="p-3 bg-orange-50 rounded-full text-orange-600">
                                        <Calendar className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-500 font-medium">Check-out</div>
                                        <div className="text-lg font-bold text-slate-900">
                                             {format(checkOut, 'EEE, d MMM yyyy', { locale: id })}
                                        </div>
                                        <div className="text-xs text-slate-400">Before 12:00</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Property Details & Host */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">About the Property</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <BedDouble className="h-4 w-4" /> {property.bedroom_count || 2} Bedrooms
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" /> Max {property.capacity_max} Guests
                                            </div>
                                            {property.amenities && property.amenities.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {property.amenities.slice(0, 5).map((amenity: any) => (
                                                        <Badge key={amenity.id} variant="secondary" className="font-normal bg-slate-100">
                                                            {amenity.name}
                                                        </Badge>
                                                    ))}
                                                    {property.amenities.length > 5 && (
                                                        <Badge variant="outline" className="font-normal">+{property.amenities.length - 5} more</Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed">
                                            {property.description || "Enjoy a comfortable stay at our property. We provide all the essentials for a relaxing trip."}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Map Component */}
                                <Card className="border-slate-200 shadow-sm overflow-hidden">
                                     <CardContent className="p-0 h-64 md:h-80 relative">
                                        <Map 
                                            lat={Number(property.lat)} 
                                            lng={Number(property.lng)} 
                                            height="100%" 
                                            zoom={15}
                                            propertyName={property.name}
                                            address={property.address}
                                        />
                                         <div className="absolute bottom-4 right-4 z-[1000]">
                                             <Button variant="secondary" size="sm" className="bg-white/90 backdrop-blur shadow-md text-xs" onClick={() => window.open(`https://maps.google.com/?q=${property.lat},${property.lng}`, '_blank')}>
                                                 Open in Google Maps <ExternalLink className="ml-2 h-3 w-3" />
                                             </Button>
                                         </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Host Contact */}
                            <Card className="border-slate-200 shadow-sm h-fit">
                                <CardHeader>
                                    <CardTitle className="text-lg">Need Help?</CardTitle>
                                    <CardDescription>Contact our support team</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" asChild>
                                        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">
                                            <MessageSquare className="mr-2 h-4 w-4" /> Chat on WhatsApp
                                        </a>
                                    </Button>
                                    <div className="text-center text-xs text-slate-400">
                                        Available 09:00 - 21:00 WIB
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* GUIDE & WIFI TAB */}
                    <TabsContent value="guide" className="space-y-6">
                        
                        {/* WiFi Card - Only visible if checked in/allowed */}
                        {show_wifi ? (
                            <Card className="bg-slate-900 text-white border-0 shadow-lg overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <CardHeader className="relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <Wifi className="h-6 w-6 text-blue-300" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg text-white">WiFi Access</CardTitle>
                                            <CardDescription className="text-slate-300">Fast internet for your stay</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10 pb-8">
                                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                                        <div className="space-y-1">
                                            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Password</div>
                                            <div className="font-mono text-xl tracking-wider text-white">{wifi_password || 'Ask Host'}</div>
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(wifi_password || '')}>
                                            <Copy className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Alert className="bg-slate-50 border-slate-200">
                                <Wifi className="h-4 w-4 text-slate-400" />
                                <AlertTitle className="text-slate-700">WiFi Access</AlertTitle>
                                <AlertDescription className="text-slate-500">
                                    WiFi password will be available here after you check in.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Check-in Instructions */}
                        {booking.checkin_instructions ? (
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-600" /> Check-in Guide
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-slate max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: booking.checkin_instructions_formatted }} />
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <h3 className="font-medium text-slate-600">Instructions Locked</h3>
                                <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">
                                    Check-in instructions and house manual will be available 24 hours before your arrival.
                                </p>
                            </div>
                        )}

                        {/* House Rules Preview */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">House Rules</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-sm text-slate-600">
                                    <li className="flex gap-3">
                                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <span>No smoking inside the property.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                        <span>Quiet hours are from 22:00 to 07:00.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <Users className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                        <span>No parties or events allowed.</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PAYMENT TAB */}
                    <TabsContent value="payment" className="space-y-6">
                        {/* Summary Card */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg">Payment Summary</CardTitle>
                                    <Badge variant={remainingAmount <= 0 ? "default" : "destructive"} className={remainingAmount <= 0 ? "bg-green-600" : ""}>
                                        {remainingAmount <= 0 ? "PAID IN FULL" : "PAYMENT DUE"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between text-slate-600">
                                    <span>Total Price</span>
                                    <span className="font-medium text-slate-900">{formatCurrency(Number(booking.total_amount))}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>Paid Amount</span>
                                    <span className="font-medium">-{formatCurrency(totalPaid)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-end">
                                    <span className="font-bold text-slate-700">Remaining Balance</span>
                                    <span className="text-2xl font-bold text-slate-900">{formatCurrency(remainingAmount)}</span>
                                </div>

                                {remainingAmount > 0 && (
                                    <div className="pt-4">
                                        <Button className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" onClick={() => {
                                            router.post(route('payment-gateway.initiate', booking.booking_number), {
                                                amount: remainingAmount,
                                                type: 'remaining'
                                            });
                                        }}>
                                            Pay Now (Rp {formatCurrency(remainingAmount).replace('Rp', '').trim()})
                                        </Button>
                                        <p className="text-xs text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
                                            <ShieldCheck className="h-3 w-3" /> Secure payment via iPaymu
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Transaction History */}
                         <div className="space-y-4">
                            <h3 className="font-semibold text-slate-800">Transaction History</h3>
                            {payments.length > 0 ? (
                                <div className="space-y-3">
                                    {payments.map((payment: any) => (
                                        <div key={payment.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${payment.payment_status === 'verified' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <CreditCard className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">Payment #{payment.payment_number}</div>
                                                    <div className="text-xs text-slate-500">{format(new Date(payment.created_at), 'd MMM yyyy HH:mm')}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-900">{formatCurrency(Number(payment.amount))}</div>
                                                <Badge variant="secondary" className="text-[10px] h-5 px-2">
                                                    {payment.payment_status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 italic">
                                    No transaction history yet.
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </GuestLayout>
    );
}
