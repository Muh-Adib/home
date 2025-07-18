import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    ArrowLeft, 
    Calendar, 
    Users, 
    Building2,
    MapPin,
    Info,
    AlertCircle,
    CheckCircle,
    User,
    UserPlus,
    Mail,
    Phone,
    MessageCircle,
    RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/formatCurrency';

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
    
    const [showLoginNotice, setShowLoginNotice] = useState(false);
    const [emailCheckDebounce, setEmailCheckDebounce] = useState<NodeJS.Timeout | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [foundUser, setFoundUser] = useState<ExistingUser | null>(existingUser || null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        guest_name: sessionData?.guest_name || existingUser?.name || '',
        guest_email: sessionData?.guest_email || existingUser?.email || '',
        guest_phone: sessionData?.guest_phone || existingUser?.phone || '',
        guest_whatsapp: sessionData?.guest_whatsapp || existingUser?.phone || '',
        special_requests: sessionData?.special_requests || '',
        male_count: sessionData?.male_count || 1,
        female_count: sessionData?.female_count || 1,
        children_count: sessionData?.children_count || 0,
    });

    // Email validation and user checking
    const checkEmailExists = async (email: string) => {
        if (!email || !email.includes('@')) return;
        
        setIsCheckingEmail(true);
        try {
            const response = await fetch(route('booking.check-email'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': page.props.csrf_token,
                },
                body: JSON.stringify({ email }),
            });
            
            const result = await response.json();
            if (result.exists) {
                setFoundUser(result.user);
                setShowLoginNotice(true);
                // Pre-fill form with user data
                setData(prev => ({
                    ...prev,
                    guest_name: result.user.name,
                    guest_phone: result.user.phone,
                    guest_whatsapp: result.user.phone,
                }));
            } else {
                setFoundUser(null);
                setShowLoginNotice(false);
            }
        } catch (error) {
            console.error('Error checking email:', error);
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleEmailChange = (email: string) => {
        setData('guest_email', email);
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
            ...data,
            booking_data: bookingData,
        }, {
            onSuccess: () => {
                router.visit(route('login'), {
                    data: { 
                        email: data.guest_email,
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
        setShowLoginNotice(false);
        setFoundUser(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        post(route('booking.store'), {
            preserveScroll: true,
            onSuccess: (page) => {
                // Redirect will be handled by backend
            },
            onError: (errors) => {
                console.error('Booking creation errors:', errors);
            }
        });
    };

    // Calculate guest breakdown validation
    const totalGuests = data.male_count + data.female_count + data.children_count;
    const guestCountValid = totalGuests === bookingData.guest_count;

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

                        {/* Guest Information Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Guest Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <Label htmlFor="guest_name">
                                                Full Name <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="guest_name"
                                                type="text"
                                                value={data.guest_name}
                                                onChange={(e) => setData('guest_name', e.target.value)}
                                                placeholder="Enter your full name"
                                                className={errors.guest_name ? 'border-red-500' : ''}
                                                required
                                            />
                                            {errors.guest_name && (
                                                <p className="text-sm text-red-500">{errors.guest_name}</p>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-2">
                                            <Label htmlFor="guest_email">
                                                Email Address <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="guest_email"
                                                    type="email"
                                                    value={data.guest_email}
                                                    onChange={(e) => handleEmailChange(e.target.value)}
                                                    placeholder="your@email.com"
                                                    className={errors.guest_email ? 'border-red-500' : ''}
                                                    required
                                                />
                                                {isCheckingEmail && (
                                                    <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                                )}
                                            </div>
                                            {errors.guest_email && (
                                                <p className="text-sm text-red-500">{errors.guest_email}</p>
                                            )}
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-2">
                                            <Label htmlFor="guest_phone">
                                                Phone Number <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="guest_phone"
                                                type="tel"
                                                value={data.guest_phone}
                                                onChange={(e) => setData('guest_phone', e.target.value)}
                                                placeholder="+62 812-3456-7890"
                                                className={errors.guest_phone ? 'border-red-500' : ''}
                                                required
                                            />
                                            {errors.guest_phone && (
                                                <p className="text-sm text-red-500">{errors.guest_phone}</p>
                                            )}
                                        </div>

                                        {/* WhatsApp */}
                                        <div className="space-y-2">
                                            <Label htmlFor="guest_whatsapp">
                                                WhatsApp Number
                                            </Label>
                                            <Input
                                                id="guest_whatsapp"
                                                type="tel"
                                                value={data.guest_whatsapp}
                                                onChange={(e) => setData('guest_whatsapp', e.target.value)}
                                                placeholder="+62 812-3456-7890"
                                                className={errors.guest_whatsapp ? 'border-red-500' : ''}
                                            />
                                            {errors.guest_whatsapp && (
                                                <p className="text-sm text-red-500">{errors.guest_whatsapp}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                For booking confirmations and updates
                                            </p>
                                        </div>
                                    </div>

                                    {/* Guest Breakdown */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-base font-medium">
                                                Guest Details <span className="text-red-500">*</span>
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Breakdown for {bookingData.guest_count} guests
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="male_count">Male Adults</Label>
                                                <Select 
                                                    value={data.male_count.toString()} 
                                                    onValueChange={(value) => setData('male_count', parseInt(value))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from({ length: bookingData.guest_count + 1 }, (_, i) => (
                                                            <SelectItem key={i} value={i.toString()}>
                                                                {i}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="female_count">Female Adults</Label>
                                                <Select 
                                                    value={data.female_count.toString()} 
                                                    onValueChange={(value) => setData('female_count', parseInt(value))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from({ length: bookingData.guest_count + 1 }, (_, i) => (
                                                            <SelectItem key={i} value={i.toString()}>
                                                                {i}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="children_count">Children</Label>
                                                <Select 
                                                    value={data.children_count.toString()} 
                                                    onValueChange={(value) => setData('children_count', parseInt(value))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from({ length: bookingData.guest_count + 1 }, (_, i) => (
                                                            <SelectItem key={i} value={i.toString()}>
                                                                {i}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {!guestCountValid && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Guest breakdown must total {bookingData.guest_count} guests. 
                                                    Current total: {totalGuests}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

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
                                            disabled={processing || !guestCountValid}
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