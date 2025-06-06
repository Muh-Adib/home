import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Amenity, type Booking, type BreadcrumbItem, type PageProps } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { 
    Calendar,
    MapPin,
    Clock,
    Users,
    Phone,
    Mail,
    CheckCircle,
    AlertCircle,
    MessageSquare,
    Wifi,
    Car,
    Coffee,
    Utensils,
    Camera,
    Star,
    Download,
    Upload,
    Bell,
    Info,
    QrCode,
    Navigation,
    Shield,
    Heart,
    HelpCircle,
    Building2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface GuestDashboardProps {
    booking: Booking & {
        property: {
            id: number;
            name: string;
            address: string;
            description: string;
            amenities: Array<{
                id: number;
                name: string;
                icon: string;
            }>;
            images: Array<{
                id: number;
                url: string;
                alt_text?: string;
            }>;
            check_in_instructions: string;
            wifi_password: string;
            emergency_contact: string;
            house_rules: string;
        };
    };
    upcoming_bookings: Booking[];
    past_bookings: Booking[];
}

export default function GuestDashboard({ booking, upcoming_bookings, past_bookings }: GuestDashboardProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [showServiceRequestDialog, setShowServiceRequestDialog] = useState(false);

    const { data: serviceRequestData, setData: setServiceRequestData, post: postServiceRequest, processing, reset } = useForm({
        type: '',
        subject: '',
        description: '',
        priority: 'normal',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Guest Portal', href: '/guest' },
        { title: 'My Booking' },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getBookingStatusBadge = (status: Booking['booking_status']) => {
        const statusConfig = {
            pending_verification: { variant: 'secondary' as const, label: 'Pending Verification', icon: Clock },
            confirmed: { variant: 'default' as const, label: 'Confirmed', icon: CheckCircle },
            checked_in: { variant: 'default' as const, label: 'Checked In', icon: Users },
            checked_out: { variant: 'outline' as const, label: 'Checked Out', icon: CheckCircle },
            cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: AlertCircle },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getPaymentStatusBadge = (status: Booking['payment_status']) => {
        const statusConfig = {
            dp_pending: { variant: 'secondary' as const, label: 'DP Pending', icon: Clock },
            dp_paid: { variant: 'default' as const, label: 'DP Paid', icon: CheckCircle },
            full_paid: { variant: 'default' as const, label: 'Fully Paid', icon: CheckCircle },
            refunded: { variant: 'outline' as const, label: 'Refunded', icon: CheckCircle },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getDaysUntilCheckIn = () => {
        const checkInDate = new Date(booking.check_in);
        const today = new Date();
        const diffTime = checkInDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleServiceRequest = () => {
        postServiceRequest(`/guest/bookings/${booking.id}/service-requests`, {
            onSuccess: () => {
                setShowServiceRequestDialog(false);
                reset();
            },
        });
    };

    const daysUntilCheckIn = getDaysUntilCheckIn();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Booking</h1>
                        <p className="text-muted-foreground">
                            Welcome {booking.guest_name}! Here's your booking information
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowServiceRequestDialog(true)}
                            className="w-full sm:w-auto"
                        >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Service Request
                        </Button>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href={`/guest/bookings/${booking.id}/receipt`}>
                                <Download className="h-4 w-4 mr-2" />
                                Download Receipt
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Status Alert */}
                {daysUntilCheckIn > 0 && booking.booking_status === 'confirmed' && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Your check-in is in {daysUntilCheckIn} day{daysUntilCheckIn !== 1 ? 's' : ''}. 
                            Please review the check-in instructions below.
                        </AlertDescription>
                    </Alert>
                )}

                {booking.booking_status === 'pending_verification' && (
                    <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                            Your booking is pending verification by our staff. You will receive a confirmation shortly.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Booking Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Booking #{booking.booking_number}
                            </span>
                            {getBookingStatusBadge(booking.booking_status)}
                        </CardTitle>
                        <CardDescription>
                            {booking.property.name} • {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Property</Label>
                                <p className="font-medium">{booking.property.name}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {booking.property.address}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Guests</Label>
                                <p className="font-medium">{booking.guest_count} guests</p>
                                <p className="text-sm text-muted-foreground">
                                    {booking.guest_male}M, {booking.guest_female}F, {booking.guest_children}C
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                                {getPaymentStatusBadge(booking.payment_status)}
                                <p className="text-sm text-muted-foreground">
                                    Total: {formatCurrency(booking.total_amount)}
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                                <p className="font-medium">{booking.nights} nights</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Tabs */}
                <Tabs defaultValue="details" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="property">Property</TabsTrigger>
                        <TabsTrigger value="checkin">Check-in</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Booking Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Booking Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Check-in</Label>
                                            <p className="font-medium">{formatDate(booking.check_in)}</p>
                                            <p className="text-sm text-muted-foreground">After 3:00 PM</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Check-out</Label>
                                            <p className="font-medium">{formatDate(booking.check_out)}</p>
                                            <p className="text-sm text-muted-foreground">Before 11:00 AM</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Guest Information</Label>
                                        <div className="mt-1 space-y-1">
                                            <p className="font-medium">{booking.guest_name}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {booking.guest_email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-3 w-3" />
                                                {booking.guest_phone}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {booking.special_requests && (
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Special Requests</Label>
                                            <p className="mt-1 text-sm">{booking.special_requests}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Payment Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Room Rate ({booking.nights} nights)</span>
                                            <span className="text-sm">{formatCurrency(booking.total_rate)}</span>
                                        </div>
                                        {booking.cleaning_fee > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-sm">Cleaning Fee</span>
                                                <span className="text-sm">{formatCurrency(booking.cleaning_fee)}</span>
                                            </div>
                                        )}
                                        {booking.extra_bed_fee > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-sm">Extra Bed Fee</span>
                                                <span className="text-sm">{formatCurrency(booking.extra_bed_fee)}</span>
                                            </div>
                                        )}
                                        <hr />
                                        <div className="flex justify-between font-medium">
                                            <span>Total Amount</span>
                                            <span>{formatCurrency(booking.total_amount)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 pt-2 border-t">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Down Payment ({booking.dp_percentage}%)</span>
                                            <span className="text-sm">{formatCurrency(booking.dp_amount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Remaining Amount</span>
                                            <span className="text-sm">{formatCurrency(booking.remaining_amount)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="property" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Property Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        {booking.property.name}
                                    </CardTitle>
                                    <CardDescription>{booking.property.address}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm">{booking.property.description}</p>
                                    
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Amenities</Label>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {booking.property.amenities.map((amenity: Amenity) => (
                                                <Badge key={amenity.id} variant="secondary" className="text-xs">
                                                    {amenity.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Property Images */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Camera className="h-5 w-5" />
                                        Property Gallery
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-2">
                                        {booking.property.images.slice(0, 4).map((image) => (
                                            <img
                                                key={image.id}
                                                src={image.url}
                                                alt={image.alt_text || booking.property.name}
                                                className="w-full h-24 object-cover rounded-lg"
                                            />
                                        ))}
                                    </div>
                                    {booking.property.images.length > 4 && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            +{booking.property.images.length - 4} more photos
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="checkin" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Check-in Instructions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Info className="h-5 w-5" />
                                        Check-in Instructions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose max-w-none text-sm">
                                        {booking.property.check_in_instructions}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Important Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        Important Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">WiFi Password</Label>
                                        <p className="font-mono bg-gray-100 p-2 rounded text-sm mt-1">
                                            {booking.property.wifi_password}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Emergency Contact</Label>
                                        <p className="font-medium mt-1">{booking.property.emergency_contact}</p>
                                    </div>
                                    
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">House Rules</Label>
                                        <div className="text-sm mt-1">
                                            {booking.property.house_rules}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Upcoming Bookings */}
                            {upcoming_bookings.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Upcoming Bookings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {upcoming_bookings.map((upcomingBooking) => (
                                            <div key={upcomingBooking.id} className="border rounded-lg p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{upcomingBooking.property?.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatDate(upcomingBooking.check_in)} - {formatDate(upcomingBooking.check_out)}
                                                        </p>
                                                    </div>
                                                    {getBookingStatusBadge(upcomingBooking.booking_status)}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Past Bookings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Booking History</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {past_bookings.length > 0 ? (
                                        past_bookings.slice(0, 5).map((pastBooking) => (
                                            <div key={pastBooking.id} className="border rounded-lg p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{pastBooking.property?.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatDate(pastBooking.check_in)} - {formatDate(pastBooking.check_out)}
                                                        </p>
                                                    </div>
                                                    {getBookingStatusBadge(pastBooking.booking_status)}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-sm">No past bookings found.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Service Request Dialog */}
                <Dialog open={showServiceRequestDialog} onOpenChange={setShowServiceRequestDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Service Request</DialogTitle>
                            <DialogDescription>
                                Need assistance during your stay? Submit a service request and our team will help you.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="type">Request Type</Label>
                                <Select value={serviceRequestData.type} onValueChange={(value) => setServiceRequestData('type', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select request type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="maintenance">Maintenance Issue</SelectItem>
                                        <SelectItem value="housekeeping">Housekeeping</SelectItem>
                                        <SelectItem value="amenities">Amenities Request</SelectItem>
                                        <SelectItem value="information">Information</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="subject">Subject</Label>
                                <Input
                                    id="subject"
                                    value={serviceRequestData.subject}
                                    onChange={(e) => setServiceRequestData('subject', e.target.value)}
                                    placeholder="Brief description of your request"
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={serviceRequestData.description}
                                    onChange={(e) => setServiceRequestData('description', e.target.value)}
                                    placeholder="Please provide detailed information about your request"
                                />
                            </div>
                        </div>
                        
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowServiceRequestDialog(false)} disabled={processing}>
                                Cancel
                            </Button>
                            <Button onClick={handleServiceRequest} disabled={processing}>
                                {processing ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
} 