import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    ArrowLeft, 
    Calendar, 
    Users, 
    Building2,
    MapPin,
    Info,
    CheckCircle,
    RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/formatCurrency';
import { GuestDetailsForm } from '@/components/booking/GuestDetailsForm';
import { useEmailUserDetection } from '@/hooks/use-email-user-detection';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    capacity: number;
    capacity_max: number;
    base_rate: number;
    formatted_base_rate: string;
    weekend_premium_percent: number;
    cleaning_fee: number;
    extra_bed_rate: number;
    media: Array<{
        id: number;
        file_path: string;
        file_name: string;
        file_type: string;
        alt_text?: string;
    }>;
}

interface BookingData {
    property_id: number;
    check_in: string;
    check_out: string;
    guest_count: number;
    total_amount: number;
    nights: number;
    weekend_nights: number;
    extra_beds: number;
    base_total: number;
    weekend_premium_total: number;
    cleaning_fee: number;
    extra_bed_total: number;
}

interface ExistingUser {
    id: number;
    name: string;
    email: string;
    phone: string;
}

interface CreateOptimizedBookingProps {
    property: Property;
    bookingData: BookingData;
    sessionData?: {
        guest_name?: string;
        guest_email?: string;
        guest_phone?: string;
        guest_whatsapp?: string;
        special_requests?: string;
        male_count?: number;
        female_count?: number;
        children_count?: number;
    };
    existingUser?: ExistingUser;
}

export default function CreateOptimizedBooking({ 
    property, 
    bookingData,
    sessionData,
    existingUser
}: CreateOptimizedBookingProps) {
    const { t } = useTranslation();
    const page = usePage();
    
    const [emailCheckDebounce, setEmailCheckDebounce] = useState<NodeJS.Timeout | null>(null);
    const [guestFormData, setGuestFormData] = useState<any>({});
    
    // Use email user detection hook
    const { 
        isChecking: isCheckingEmail, 
        foundUser, 
        showLoginNotice, 
        checkEmailExists,
        dismissLoginNotice 
    } = useEmailUserDetection();

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        special_requests: sessionData?.special_requests || '',
    });

    // Initialize with existing user if provided
    useEffect(() => {
        if (existingUser) {
            // Set initial found user state if passed from backend
            checkEmailExists(existingUser.email);
        }
    }, [existingUser, checkEmailExists]);

    // Handle email change with debouncing
    const handleEmailChange = (email: string) => {
        clearErrors('guest_email');
        
        // Debounce email checking
        if (emailCheckDebounce) {
            clearTimeout(emailCheckDebounce);
        }
        
        const timeout = setTimeout(() => {
            checkEmailExists(email);
        }, 1000);
        setEmailCheckDebounce(timeout);
    };

    const proceedWithLogin = () => {
        // Save current form data to session before redirecting to login
        router.post(route('booking.save-session'), {
            ...guestFormData,
            ...data,
            booking_data: bookingData,
        }, {
            onSuccess: () => {
                router.visit(route('login'), {
                    data: { 
                        email: guestFormData.guest_email,
                        redirect_to: route('booking.create', { 
                            property: property.slug,
                            ...bookingData 
                        })
                    }
                });
            }
        });
    };

    const proceedAsGuest = () => {
        dismissLoginNotice();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submitData = {
            ...guestFormData,
            ...data
        };
        
        post(route('booking.store'), {
            data: submitData,
            preserveScroll: true,
            onSuccess: (page) => {
                // Redirect will be handled by backend
            },
            onError: (errors) => {
                console.error('Booking creation errors:', errors);
            }
        });
    };

    useEffect(() => {
        return () => {
            if (emailCheckDebounce) {
                clearTimeout(emailCheckDebounce);
            }
        };
    }, [emailCheckDebounce]);

    return (
        <GuestLayout>
            <Head title={`Book ${property.name}`} />
            
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href={route('property.show', property.slug)}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Property
                    </Link>
                    
                    <h1 className="text-2xl md:text-3xl font-bold">Complete Your Booking</h1>
                    <p className="text-muted-foreground mt-1">
                        Just a few more details to secure your reservation
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Existing User Login Notice */}
                        {showLoginNotice && foundUser && (
                            <Alert className="border-blue-200 bg-blue-50">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="font-medium">Welcome back, {foundUser.name}!</p>
                                            <p className="text-sm">Login to access your booking history and faster checkout.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={proceedWithLogin}>
                                                Login & Continue
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={proceedAsGuest}>
                                                Continue as Guest
                                            </Button>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Guest Details Form Component */}
                        <GuestDetailsForm
                            expectedGuestCount={bookingData.guest_count}
                            initialMaleCount={sessionData?.male_count || 1}
                            initialFemaleCount={sessionData?.female_count || 1}
                            initialChildrenCount={sessionData?.children_count || 0}
                            initialPrimaryGuest={{
                                name: sessionData?.guest_name || existingUser?.name || '',
                                email: sessionData?.guest_email || existingUser?.email || '',
                                phone: sessionData?.guest_phone || existingUser?.phone || '',
                                whatsapp: sessionData?.guest_whatsapp || existingUser?.phone || '',
                            }}
                            errors={errors}
                            disabled={processing}
                            onDataChange={setGuestFormData}
                            isCheckingEmail={isCheckingEmail}
                            onEmailChange={handleEmailChange}
                            showLoginNotice={showLoginNotice}
                        />

                        {/* Special Requests & Submit */}
                        <Card>
                            <CardContent className="space-y-4 pt-6">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Special Requests */}
                                    <div className="space-y-2">
                                        <Label htmlFor="special_requests">Special Requests</Label>
                                        <Textarea
                                            id="special_requests"
                                            value={data.special_requests}
                                            onChange={(e) => setData('special_requests', e.target.value)}
                                            placeholder="Any special requirements or requests..."
                                            rows={3}
                                            className={errors.special_requests ? 'border-red-500' : ''}
                                        />
                                        {errors.special_requests && (
                                            <p className="text-sm text-red-500">{errors.special_requests}</p>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <Button 
                                            type="submit" 
                                            size="lg" 
                                            className="w-full"
                                            disabled={processing || !guestFormData.guest_name || !guestFormData.guest_email}
                                        >
                                            {processing ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Creating Booking...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Create Booking
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
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Booking Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Property Info */}
                                <div>
                                    <h3 className="font-semibold">{property.name}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {property.address}
                                    </p>
                                </div>

                                <Separator />

                                {/* Booking Details */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            {new Date(bookingData.check_in).toLocaleDateString()} - {new Date(bookingData.check_out).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span>{bookingData.guest_count} guests • {bookingData.nights} nights</span>
                                    </div>
                                </div>

                                <Separator />

                                {/* Price Breakdown */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Base rate ({bookingData.nights} nights)</span>
                                        <span>{formatCurrency(bookingData.base_total)}</span>
                                    </div>
                                    
                                    {bookingData.weekend_premium_total > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span>Weekend premium ({bookingData.weekend_nights} nights)</span>
                                            <span>{formatCurrency(bookingData.weekend_premium_total)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between text-sm">
                                        <span>Cleaning fee</span>
                                        <span>{formatCurrency(bookingData.cleaning_fee)}</span>
                                    </div>
                                    
                                    {bookingData.extra_bed_total > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span>Extra beds ({bookingData.extra_beds})</span>
                                            <span>{formatCurrency(bookingData.extra_bed_total)}</span>
                                        </div>
                                    )}
                                    
                                    <Separator />
                                    
                                    <div className="flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span>{formatCurrency(bookingData.total_amount)}</span>
                                    </div>
                                </div>

                                {/* Notice */}
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        Payment will be processed after booking confirmation. You will receive payment instructions via email and WhatsApp.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}