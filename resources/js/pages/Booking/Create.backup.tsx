import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
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
    CreditCard, 
    Building2,
    MapPin,
    Info,
    Calculator,
    AlertCircle,
    CheckCircle,
    Bed,
    Clock,
    UserPlus,
    User,
    Percent,
    Tag,
    LogIn,
    Mail,
    Key,
    Trash2
} from 'lucide-react';
import { DateRange } from '@/components/ui/date-range';
import { useTranslation } from 'react-i18next';
import { useRateCalculation, type RateCalculation } from '@/hooks/use-rate-calculation';

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
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    cover_image?: string;
}

interface GuestDetail {
    id: string;
    name: string;
    gender: 'male' | 'female';
    age_category: 'adult' | 'child' | 'infant';
    relationship_to_primary: string;
    phone?: string;
    email?: string;
}

interface BookingFormData {
    check_in_date: string;
    check_out_date: string;
    check_in_time: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number: string;
    guest_gender: 'male' | 'female';
    relationship_type: 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran';
    special_requests: string;
    dp_percentage: number;
    guests: GuestDetail[];
    [key: string]: any;
}

interface BookingErrors {
    check_in_date?: string;
    check_out_date?: string;
    check_in_time?: string;
    guest_male?: string;
    guest_female?: string;
    guest_children?: string;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    guest_country?: string;
    guest_id_number?: string;
    guest_gender?: string;
    relationship_type?: string;
    special_requests?: string;
    dp_percentage?: string;
    guest_count?: string;
    dates?: string;
    error?: string;
}

interface RelationshipOption {
    value: string;
    label: string;
}

interface RelationshipToOption {
    value: string;
    label: string;
}

interface CheckInTimeOption {
    value: string;
    label: string;
}

interface BookingCreateProps {
    property: Property;
    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            phone?: string;
            gender?: string;
            role: string;
        }
    };
    initialAvailabilityData: {
        success: boolean;
        property_id: string;
        date_range: {
            start: string;
            end: string;
        };
        guest_count: number;
        booked_dates: string[];
        booked_periods: string[][];
        rates: Record<string, {
            base_rate: number;
            weekend_premium: boolean;
            seasonal_premium: number;
            seasonal_rate_applied?: {
                name: string;
                rate_type: string;
                rate_value: number;
                description: string;
                min_stay_nights: number;
            }[];
            is_weekend: boolean;
        }>;
        property_info: {
            base_rate: number;
            capacity: number;
            capacity_max: number;
            cleaning_fee: number;
            extra_bed_rate: number;
            weekend_premium_percent: number;
        };
        max_selectable_date?: string;
        min_stay_weekday?: number;
        min_stay_weekend?: number;
        min_stay_peak?: number;
    };
}

// Helper function to get initial form data
const getInitialFormData = (auth: any, urlCheckIn: string, urlCheckOut: string, urlGuests: number): BookingFormData => {
    const user = auth?.user;
    
    return {
        check_in_date: urlCheckIn || '',
        check_out_date: urlCheckOut || '',
        check_in_time: '15:00',
        guest_male: (urlGuests > 0) ? Math.floor(urlGuests / 2) : 0,
        guest_female: (urlGuests > 0) ? Math.floor(urlGuests / 2) : 0,
        guest_children: (urlGuests > 0) ? (urlGuests % 2) : 0,
        guest_name: user?.name || '',
        guest_email: user?.email || '',
        guest_phone: user?.phone || '',
        guest_country: 'Indonesia',
        guest_id_number: '',
        guest_gender: (user?.gender as 'male' | 'female') || 'male',
        relationship_type: 'keluarga',
        special_requests: '',
        dp_percentage: 50,
        guests: [],
    };
};

export default function BookingCreate({ property, auth, initialAvailabilityData }: BookingCreateProps) {
    const { t } = useTranslation();
    const page = usePage();
    const searchParams = new URLSearchParams(window.location.search);
    
    // Get URL parameters
    const urlCheckIn = searchParams.get('check_in') || '';
    const urlCheckOut = searchParams.get('check_out') || '';
    const urlGuests = parseInt(searchParams.get('guests') || '2');

    // Form data initialization
    const { data, setData, post, processing, errors } = useForm<BookingFormData>(
        getInitialFormData(auth, urlCheckIn, urlCheckOut, urlGuests)
    );

    // Guest state
    const [totalGuests, setTotalGuests] = useState(urlGuests);
    const [extraBeds, setExtraBeds] = useState(0);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [showGuestDetails, setShowGuestDetails] = useState(false);
    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
    const [guestDetails, setGuestDetails] = useState<GuestDetail[]>([]);
    
    // Email state
    const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'exists' | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Validation state
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Options
    const relationshipOptions: RelationshipOption[] = [
        { value: 'keluarga', label: t('booking.relationship_type.family') },
        { value: 'teman', label: t('booking.relationship_type.friend') },
        { value: 'kolega', label: t('booking.relationship_type.colleague') },
        { value: 'pasangan', label: t('booking.relationship_type.couple') },
        { value: 'campuran', label: t('booking.relationship_type.mixed') }
    ];

    const relationshipToOptions: RelationshipToOption[] = [
        { value: 'self', label: t('booking.relationship_to.self') },
        { value: 'spouse', label: t('booking.relationship_to.spouse') },
        { value: 'child', label: t('booking.relationship_to.child') },
        { value: 'parent', label: t('booking.relationship_to.parent') },
        { value: 'sibling', label: t('booking.relationship_to.sibling') },
        { value: 'friend', label: t('booking.relationship_to.friend') },
        { value: 'colleague', label: t('booking.relationship_to.colleague') },
        { value: 'other', label: t('booking.relationship_to.other') }
    ];

    const checkInTimeOptions: CheckInTimeOption[] = [
        { value: '14:00', label: '14:00' },
        { value: '15:00', label: '15:00' },
        { value: '16:00', label: '16:00' },
        { value: '17:00', label: '17:00' },
        { value: '18:00', label: '18:00' },
    ];

    const countries = [
        'Indonesia', 'Singapore', 'Malaysia', 'Thailand', 'Philippines', 'Vietnam', 
        'Cambodia', 'Laos', 'Myanmar', 'Brunei', 'Australia', 'New Zealand', 
        'Japan', 'South Korea', 'China', 'India', 'United States', 'United Kingdom', 
        'Germany', 'France', 'Netherlands', 'Other'
    ];

    // Use rate calculation hook - same as show property
    const {
        rateCalculation,
        rateError,
        isCalculatingRate,
        calculateRate,
        hasSeasonalPremium,
        hasWeekendPremium,
        isRateReady
    } = useRateCalculation({
        availabilityData: initialAvailabilityData,
        guestCount: totalGuests
    });

    // Handle gender count changes with auto-sync
    const handleGenderCountChange = useCallback((type: 'male' | 'female' | 'children', value: number) => {
        const newData = { ...data };
        
        if (type === 'male') {
            newData.guest_male = value;
        } else if (type === 'female') {
            newData.guest_female = value;
        } else if (type === 'children') {
            newData.guest_children = value;
        }
        
        const newTotalGuests = newData.guest_male + newData.guest_female + newData.guest_children;
        
        setData(newData);
        setTotalGuests(newTotalGuests);
        
        // Show sync feedback
        setSyncFeedback(`Updated to ${newTotalGuests} guests`);
        setTimeout(() => setSyncFeedback(null), 2000);
        
        console.log('Guest count updated:', {
            type,
            value,
            newTotalGuests,
            breakdown: {
                male: newData.guest_male,
                female: newData.guest_female,
                children: newData.guest_children
            }
        });
    }, [data, setData]);

    // Update total guests when form data changes
    useEffect(() => {
        const total = data.guest_male + data.guest_female + data.guest_children;
        setTotalGuests(total);
        
        // Calculate extra beds
        const extraBedsCount = Math.max(0, total - property.capacity);
        setExtraBeds(extraBedsCount);
    }, [data.guest_male, data.guest_female, data.guest_children, property.capacity]);

    // Calculate rate when dates or guest count changes
    useEffect(() => {
        if (data.check_in_date && data.check_out_date && totalGuests > 0) {
            console.log('🔄 Calculating rate for:', {
                checkIn: data.check_in_date,
                checkOut: data.check_out_date,
                totalGuests,
                availabilityData: initialAvailabilityData
            });
            
            setAvailabilityStatus('checking');
            
            calculateRate(data.check_in_date, data.check_out_date)
                .then(calculation => {
                    if (calculation) {
                        console.log('✅ Rate calculated successfully:', calculation.formatted.total_amount);
                        setAvailabilityStatus('available');
                    } else {
                        console.log('❌ Rate calculation returned null');
                        setAvailabilityStatus('unavailable');
                    }
                })
                .catch(error => {
                    console.error('❌ Rate calculation error:', error);
                    setAvailabilityStatus('unavailable');
                });
        } else {
            console.log('⚠️ Cannot calculate rate:', {
                hasCheckIn: !!data.check_in_date,
                hasCheckOut: !!data.check_out_date,
                totalGuests,
                hasAvailabilityData: !!initialAvailabilityData
            });
        }
    }, [data.check_in_date, data.check_out_date, totalGuests, calculateRate, initialAvailabilityData]);

    // Email checking logic
    const checkEmailExists = useCallback(async (email: string) => {
        if (!email || email.length < 3) {
            setEmailStatus(null);
            return;
        }

        setIsCheckingEmail(true);
        setEmailStatus('checking');

        try {
            const response = await fetch('/api/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (result.exists) {
                setEmailStatus('exists');
                setShowLoginPrompt(true);
            } else {
                setEmailStatus('available');
                setShowLoginPrompt(false);
            }
        } catch (error) {
            console.error('Email check error:', error);
            setEmailStatus(null);
        } finally {
            setIsCheckingEmail(false);
        }
    }, []);

    // Debounced email checking
    useEffect(() => {
        if (emailCheckTimeout) {
            clearTimeout(emailCheckTimeout);
        }

        if (data.guest_email && data.guest_email.length >= 3) {
            const timeout = setTimeout(() => {
                checkEmailExists(data.guest_email);
            }, 500);

            setEmailCheckTimeout(timeout);
        } else {
            setEmailStatus(null);
            setShowLoginPrompt(false);
        }

        return () => {
            if (emailCheckTimeout) {
                clearTimeout(emailCheckTimeout);
            }
        };
    }, [data.guest_email, checkEmailExists, emailCheckTimeout]);

    // Guest details management
    const addGuestDetail = useCallback(() => {
        const newGuest: GuestDetail = {
            id: `guest_${Date.now()}`,
            name: '',
            gender: 'male',
            age_category: 'adult',
            relationship_to_primary: 'friend',
        };
        setGuestDetails(prev => [...prev, newGuest]);
    }, []);

    const updateGuestDetail = useCallback((id: string, field: keyof GuestDetail, value: any) => {
        setGuestDetails(prev => 
            prev.map(guest => 
                guest.id === id ? { ...guest, [field]: value } : guest
            )
        );
    }, []);

    const removeGuestDetail = useCallback((id: string) => {
        setGuestDetails(prev => prev.filter(guest => guest.id !== id));
    }, []);

    // Sync guest details with total guests - separate effect for better control
    useEffect(() => {
        if (totalGuests > 1) {
            const expectedGuestDetails = totalGuests - 1; // Exclude primary guest
            const currentGuestDetails = guestDetails.length;
            
            if (currentGuestDetails < expectedGuestDetails) {
                // Add missing guest details
                const missingGuests = expectedGuestDetails - currentGuestDetails;
                for (let i = 0; i < missingGuests; i++) {
                    addGuestDetail();
                }
            } else if (currentGuestDetails > expectedGuestDetails) {
                // Remove excess guest details
                setGuestDetails(prev => prev.slice(0, expectedGuestDetails));
            }
        } else {
            // Clear guest details if only 1 guest
            setGuestDetails([]);
        }
    }, [totalGuests, guestDetails.length, addGuestDetail]);

    // Form validation
    const validateForm = useCallback(() => {
        const errors: Record<string, string> = {};

        // Required fields validation
        if (!data.check_in_date) errors.check_in_date = t('booking.check_in_date_required');
        if (!data.check_out_date) errors.check_out_date = t('booking.check_out_date_required');
        if (!data.check_in_time) errors.check_in_time = t('booking.check_in_time_required');
        if (!data.guest_name?.trim()) errors.guest_name = t('booking.guest_name_required');
        if (!data.guest_email?.trim()) errors.guest_email = t('booking.guest_email_required');
        if (!data.guest_phone?.trim()) errors.guest_phone = t('booking.guest_phone_required');
        if (!data.guest_country) errors.guest_country = t('booking.guest_country_required');

        // Guest count validation
        if (totalGuests <= 0) errors.guest_count = t('booking.guest_count_required');
        if (totalGuests > property.capacity_max) {
            errors.guest_count = t('booking.guest_count_exceeds_capacity', { capacity: property.capacity_max });
        }

        // Date validation
        if (data.check_in_date && data.check_out_date) {
            const checkIn = new Date(data.check_in_date);
            const checkOut = new Date(data.check_out_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (checkIn < today) {
                errors.check_in_date = t('booking.check_in_date_past');
            }

            if (checkOut <= checkIn) {
                errors.check_out_date = t('booking.check_out_date_after_check_in');
            }

            // Minimum stay validation
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            const isWeekend = checkIn.getDay() === 0 || checkIn.getDay() === 6;
            const minStay = isWeekend ? property.min_stay_weekend : property.min_stay_weekday;

            if (nights < minStay) {
                errors.dates = t('booking.minimum_stay_required', { 
                    nights: minStay, 
                    type: isWeekend ? 'weekend' : 'weekday' 
                });
            }
        }

        // Rate calculation validation
        if (!rateCalculation) {
            errors.rate = t('booking.rate_calculation_required');
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [data, totalGuests, property, rateCalculation, t]);

    // Form submission handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            console.error('Form validation failed:', validationErrors);
            return;
        }

        // Validate required fields
        if (!data.check_in_date || !data.check_out_date || !data.check_in_time) {
            console.error('Required fields missing');
            return;
        }

        // Validate guest count
        if (totalGuests <= 0) {
            console.error('Invalid guest count');
            return;
        }

        // Validate rate calculation
        if (!rateCalculation) {
            console.error('Rate calculation not ready');
            return;
        }

        try {
            console.log('Form submission started', { 
                data, 
                canSubmit: true,
                totalGuests,
                hasRateCalculation: !!rateCalculation,
                guestDetails
            });

            // Update form data with additional information
            setData(prev => ({
                ...prev,
                guests: guestDetails,
                total_guests: totalGuests,
                extra_beds: extraBeds,
                rate_calculation: rateCalculation
            }));

            // Submit form using Inertia post
            post(route('bookings.store', property.slug));
        } catch (error) {
            console.error('Form submission error:', error);
        }
    };

    // Calculate minimum stay for initial dates validation
    const getMinimumStay = () => {
        const today = new Date();
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        return isWeekend ? property.min_stay_weekend : property.min_stay_weekday;
    };

    // Type assertion for errors to match BookingErrors interface
    const bookingErrors = errors as BookingErrors;

    // Validation states
    const guestCountError = totalGuests > property.capacity_max;
    const canSubmit = !!(
        data.check_in_date &&
        data.check_out_date && 
        data.check_in_time && 
        totalGuests > 0 && 
        totalGuests <= property.capacity_max &&
        data.guest_name?.trim() &&
        data.guest_email?.trim() &&
        data.guest_phone?.trim() &&
        data.guest_country &&
        rateCalculation && 
        availabilityStatus === 'available' &&
        Object.keys(validationErrors).length === 0
    );

    return (
        <AppLayout>
            <Head title={`${t('booking.book_your_stay')} ${property.name} - Homsjogja`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <Link href={`/properties/${property.slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4" />
                            {t('booking.back_to_property')}
                        </Link>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Booking Form */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-blue-600" />
                                        {t('booking.book_your_stay')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        

                                        {/* Dates */}
                                        <div>
                                            <Label>{t('booking.check_in_checkout_dates')}</Label>
                                            <DateRange
                                                startDate={data.check_in_date}
                                                endDate={data.check_out_date}
                                                onDateChange={(startDate, endDate) => {
                                                    setData(prev => ({ 
                                                        ...prev,
                                                        check_in_date: startDate, 
                                                        check_out_date: endDate 
                                                    }));
                                                }}
                                                minDate={new Date().toISOString().split('T')[0]}
                                                minStayWeekday={property.min_stay_weekday}
                                                minStayWeekend={property.min_stay_weekend}
                                                minStayPeak={property.min_stay_peak}
                                                showMinStayWarning={true}
                                                size="lg"
                                                showNights={true}
                                                startLabel="Check-in"
                                                endLabel="Check-out"
                                                bookedDates={initialAvailabilityData.booked_dates || []}
                                                loading={false}
                                                error={null}
                                                className={bookingErrors.check_in_date || bookingErrors.check_out_date ? 'border-red-500' : ''}
                                            />
                                            {(bookingErrors.check_in_date || bookingErrors.check_out_date) && (
                                                <p className="text-sm text-red-600 mt-1">
                                                    {bookingErrors.check_in_date || bookingErrors.check_out_date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label>{t('booking.check_in_time')}</Label>
                                            <Select value={data.check_in_time} onValueChange={(value: any) => setData((prev) => ({
                                                ...prev,
                                                check_in_time: value
                                            }))}>
                                                <SelectTrigger className={bookingErrors.check_in_time ? 'border-red-500' : ''}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {checkInTimeOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Availability Status */}
                                        {data.check_in_date && data.check_out_date && (
                                            <div className="mt-4">
                                                {availabilityStatus === 'checking' && (
                                                    <Alert>
                                                        <Clock className="h-4 w-4" />
                                                        <AlertDescription>
                                                            {t('booking.checking_availability')}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                
                                                {availabilityStatus === 'unavailable' && (
                                                    <Alert variant="destructive">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            {t('booking.property_unavailable')}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                
                                                {availabilityStatus === 'available' && rateCalculation && (
                                                    <Alert>
                                                        <CheckCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            {t('booking.property_available')} {t('booking.total')}: {rateCalculation.formatted.total_amount} {t('booking.for')} {rateCalculation.nights} {t('booking.nights')}.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}

                                        <Separator />

                                        {/* Guest Count */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <Users className="h-5 w-5 text-blue-600" />
                                                <h3 className="text-lg font-semibold">{t('booking.guest_count')}</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                <div>
                                                    <Label htmlFor="guest_male">{t('booking.male_adults')}</Label>
                                                    <Input
                                                        id="guest_male"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_male}
                                                        onChange={(e) => handleGenderCountChange('male', parseInt(e.target.value) || 0)}
                                                        className={bookingErrors.guest_male ? 'border-red-500' : ''}
                                                    />
                                                    {bookingErrors.guest_male && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_male}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_count_female">{t('booking.female_adults')}</Label>
                                                    <Input
                                                        id="guest_count_female"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_female}
                                                        onChange={(e) => handleGenderCountChange('female', parseInt(e.target.value) || 0)}
                                                        className={bookingErrors.guest_female ? 'border-red-500' : ''}
                                                    />
                                                    {bookingErrors.guest_female && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_female}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_count_children">{t('booking.children')}</Label>
                                                    <Input
                                                        id="guest_count_children"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_children}
                                                        onChange={(e) => handleGenderCountChange('children', parseInt(e.target.value) || 0)}
                                                        className={bookingErrors.guest_children ? 'border-red-500' : ''}
                                                    />
                                                    {bookingErrors.guest_children && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_children}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Guest Count Summary */}
                                            <div className="bg-slate-50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium">{t('booking.total_guests')}:</span>
                                                    <Badge variant={guestCountError ? "destructive" : "secondary"}>
                                                        {totalGuests} guests
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {t('booking.property_capacity')}: {property.capacity} - {property.capacity_max} {t('booking.guests')}
                                                </div>
                                                
                                                {extraBeds > 0 && (
                                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                                        <Bed className="h-4 w-4 text-blue-600" />
                                                        <span>{t('booking.extra_beds_needed')}: {extraBeds}</span>
                                                        <span className="text-gray-600">
                                                            (+Rp {(extraBeds * property.extra_bed_rate).toLocaleString()}/night)
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {guestCountError && (
                                                    <Alert className="mt-2">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            {t('booking.guest_count_exceeds_capacity', { capacity: property.capacity_max })}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {/* Sync Info */}
                                                <div className="mt-3 pt-3 border-t border-slate-200">
                                                    <div className="flex items-center gap-2 text-xs text-blue-600">
                                                        <Info className="h-3 w-3" />
                                                        <span>{t('booking.sync_info')}</span>
                                                    </div>
                                                    
                                                    {/* Sync Feedback */}
                                                    {syncFeedback && (
                                                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                                                            <CheckCircle className="h-3 w-3" />
                                                            <span>{syncFeedback}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Primary Guest Info */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">{t('booking.primary_guest')}</h3>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label htmlFor="guest_name">{t('booking.full_name')} *</Label>
                                                    <Input
                                                        id="guest_name"
                                                        type="text"
                                                        value={data.guest_name}
                                                        onChange={(e) => {
                                                            setData((prev) => ({
                                                                ...prev,
                                                                guest_name: e.target.value
                                                            }));
                                                        }}
                                                        className={bookingErrors.guest_name ? 'border-red-500' : ''}
                                                        placeholder={t('booking.enter_full_name')}
                                                    />
                                                    {bookingErrors.guest_name && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_name}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_gender">{t('booking.gender')} *</Label>
                                                    <Select 
                                                        value={data.guest_gender} 
                                                        onValueChange={(value: 'male' | 'female') => {
                                                            setData((prev) => ({
                                                                ...prev,
                                                                guest_gender: value
                                                            }));
                                                        }}
                                                    >
                                                        <SelectTrigger className={bookingErrors.guest_gender ? 'border-red-500' : ''}>
                                                            <SelectValue placeholder={t('booking.select_gender')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">{t('booking.male')}</SelectItem>
                                                            <SelectItem value="female">{t('booking.female')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {bookingErrors.guest_gender && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_gender}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_phone">{t('booking.phone_number')} *</Label>
                                                    <Input
                                                        id="guest_phone"
                                                        type="tel"
                                                        value={data.guest_phone}
                                                        onChange={(e) => {
                                                            setData((prev) => ({
                                                                ...prev,
                                                                guest_phone: e.target.value
                                                            }));
                                                        }}
                                                        className={bookingErrors.guest_phone ? 'border-red-500' : ''}
                                                        placeholder={t('booking.enter_phone')}
                                                    />
                                                    {bookingErrors.guest_phone && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_phone}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <Label htmlFor="guest_email">{t('booking.email_address')} *</Label>
                                                    <Input
                                                        id="guest_email"
                                                        type="email"
                                                        value={data.guest_email}
                                                        onChange={(e) => {
                                                            setData((prev) => ({
                                                                ...prev,
                                                                guest_email: e.target.value
                                                            }));
                                                        }}
                                                        className={bookingErrors.guest_email ? 'border-red-500' : ''}
                                                        placeholder={t('booking.enter_email')}
                                                    />
                                                    {bookingErrors.guest_email && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_email}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_country">{t('booking.country')} *</Label>
                                                    <Select value={data.guest_country} onValueChange={(value: any) => setData((prev) => ({
                                                        ...prev,
                                                        guest_country: value
                                                    }))}>
                                                        <SelectTrigger className={bookingErrors.guest_country ? 'border-red-500' : ''}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {countries.map(country => (
                                                                <SelectItem key={country} value={country}>
                                                                    {country}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {bookingErrors.guest_country && (
                                                        <p className="text-sm text-red-600 mt-1">{bookingErrors.guest_country}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Group Relationship */}
                                        <div>
                                            <Label htmlFor="relationship_type">{t('booking.group_relationship')} *</Label>
                                            <Select value={data.relationship_type} onValueChange={(value: any) => setData((prev) => ({
                                                ...prev,
                                                relationship_type: value
                                            }))}>
                                                <SelectTrigger className={bookingErrors.relationship_type ? 'border-red-500' : ''}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {relationshipOptions.map(option => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {bookingErrors.relationship_type && (
                                                <p className="text-sm text-red-600 mt-1">{bookingErrors.relationship_type}</p>
                                            )}
                                        </div>

                                        {/* Additional Guest Details */}
                                        {totalGuests > 1 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold">{t('booking.guest_details')}</h3>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowGuestDetails(!showGuestDetails)}
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                        {showGuestDetails ? t('booking.hide_details') : t('booking.add_guest_details')}
                                                    </Button>
                                                </div>

                                                {showGuestDetails && (
                                                    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                                                        <div className="grid gap-4">
                                                            {/* Guest 1 - Primary Guest */}
                                                            <div className="border-b pb-4">
                                                                <h4 className="font-medium mb-3">{t('booking.primary_guest')}</h4>
                                                                <div className="grid md:grid-cols-2 gap-3">
                                                                    <div>
                                                                        <Label className="text-sm">{t('booking.name')}</Label>
                                                                        <Input 
                                                                            value={data.guest_name} 
                                                                            disabled 
                                                                            className="bg-gray-100"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-sm">{t('booking.gender')}</Label>
                                                                        <Input 
                                                                            value={data.guest_gender === 'male' ? t('booking.male') : t('booking.female')} 
                                                                            disabled 
                                                                            className="bg-gray-100"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                                
                                                            {/* Additional Guests */}
                                                            {guestDetails.map((guest, index) => (
                                                                <div key={guest.id} className="border-b pb-4">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <h4 className="font-medium">{t('booking.guest')} {index + 2}</h4>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => removeGuestDetail(guest.id)}
                                                                            className="text-red-600 hover:text-red-700"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid md:grid-cols-2 gap-3">
                                                                        <div>
                                                                            <Label className="text-sm">{t('booking.name')}</Label>
                                                                            <Input
                                                                                value={guest.name}
                                                                                onChange={(e) => updateGuestDetail(guest.id, 'name', e.target.value)}
                                                                                placeholder={t('booking.enter_guest_name')}
                                                                                className="text-sm"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-sm">{t('booking.gender')}</Label>
                                                                            <Select 
                                                                                value={guest.gender} 
                                                                                onValueChange={(value: 'male' | 'female') => 
                                                                                    updateGuestDetail(guest.id, 'gender', value)
                                                                                }
                                                                            >
                                                                                <SelectTrigger className="text-sm">
                                                                                    <SelectValue placeholder={t('booking.select_gender')} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="male">{t('booking.male')}</SelectItem>
                                                                                    <SelectItem value="female">{t('booking.female')}</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-sm">{t('booking.age_category')}</Label>
                                                                            <Select 
                                                                                value={guest.age_category}
                                                                                onValueChange={(value: 'adult' | 'child' | 'infant') => 
                                                                                    updateGuestDetail(guest.id, 'age_category', value)
                                                                                }
                                                                            >
                                                                                <SelectTrigger className="text-sm">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="adult">{t('booking.adult')}</SelectItem>
                                                                                    <SelectItem value="child">{t('booking.child')}</SelectItem>
                                                                                    <SelectItem value="infant">{t('booking.infant')}</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-sm">{t('booking.relationship')}</Label>
                                                                            <Select 
                                                                                value={guest.relationship_to_primary} 
                                                                                onValueChange={(value) => 
                                                                                    updateGuestDetail(guest.id, 'relationship_to_primary', value)
                                                                                }
                                                                            >
                                                                                <SelectTrigger className="text-sm">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {relationshipToOptions.map(option => (
                                                                                        <SelectItem key={option.value} value={option.value}>
                                                                                            {option.label}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Guest Details Summary */}
                                                            <div className="bg-blue-50 p-3 rounded">
                                                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                                                    <Info className="h-4 w-4" />
                                                                    <span>
                                                                        {t('booking.guest_details_summary', { 
                                                                            total: totalGuests, 
                                                                            primary: 1, 
                                                                            additional: guestDetails.length 
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <Separator />

                                        {/* Down Payment Options */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <CreditCard className="h-5 w-5 text-blue-600" />
                                                <h3 className="text-lg font-semibold">{t('booking.payment_option')}</h3>
                                            </div>
                                            
                                            <div className="grid gap-3">
                                                <div className="space-y-3">
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="radio"
                                                            id="dp_30"
                                                            name="dp_percentage"
                                                            value="30"
                                                            checked={data.dp_percentage === 30}
                                                            onChange={(e) => setData(prev => ({
                                                                ...prev,
                                                                dp_percentage: parseInt(e.target.value)
                                                            }))}
                                                            className="text-blue-600"
                                                        />
                                                        <Label htmlFor="dp_30" className="text-sm font-medium">
                                                            30% DP - {rateCalculation ? `Rp ${Math.round(rateCalculation.total_amount * 0.3).toLocaleString('id-ID')}` : 'Calculating...'}
                                                        </Label>
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="radio"
                                                            id="dp_50"
                                                            name="dp_percentage"
                                                            value="50"
                                                            checked={data.dp_percentage === 50}
                                                            onChange={(e) => setData(prev => ({
                                                                ...prev,
                                                                dp_percentage: parseInt(e.target.value)
                                                            }))}
                                                            className="text-blue-600"
                                                        />
                                                        <Label htmlFor="dp_50" className="text-sm font-medium">
                                                            50% DP - {rateCalculation ? `Rp ${Math.round(rateCalculation.total_amount * 0.5).toLocaleString('id-ID')}` : 'Calculating...'}
                                                        </Label>
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="radio"
                                                            id="dp_100"
                                                            name="dp_percentage"
                                                            value="100"
                                                            checked={data.dp_percentage === 100}
                                                            onChange={(e) => setData(prev => ({
                                                                ...prev,
                                                                dp_percentage: parseInt(e.target.value)
                                                            }))}
                                                            className="text-blue-600"
                                                        />
                                                        <Label htmlFor="dp_100" className="text-sm font-medium">
                                                            100% Full Payment - {rateCalculation ? `Rp ${rateCalculation.formatted.total_amount}` : 'Calculating...'}
                                                        </Label>
                                                    </div>
                                                </div>
                                                
                                                <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
                                                    <Info className="h-4 w-4 inline mr-1" />
                                                    {t('booking.dp_info')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Special Requests */}
                                        <div>
                                            <Label htmlFor="special_requests">{t('booking.special_requests')} (Optional)</Label>
                                            <Textarea
                                                id="special_requests"
                                                value={data.special_requests}
                                                onChange={(e) => setData((prev) => ({
                                                    ...prev,
                                                    special_requests: e.target.value
                                                }))}
                                                rows={3}
                                                placeholder={t('booking.special_requests_placeholder')}
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <Link href={`/properties/${property.slug}`} className="flex-1">
                                                <Button variant="outline" className="w-full">{t('common.cancel')}</Button>
                                            </Link>
                                            <Button 
                                                type="submit" 
                                                disabled={!canSubmit || processing}
                                                className="flex-1"
                                            >
                                                {processing ? t('booking.processing') : t('booking.continue_confirmation')}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Property Summary & Rate */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4 space-y-6">
                                {/* Property Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{t('booking.your_booking')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden">
                                                {property.cover_image ? (
                                                    <img 
                                                        src={property.cover_image} 
                                                        alt={property.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <Building2 className="h-8 w-8 text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-semibold">{property.name}</h3>
                                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-4 w-4 mr-1" />
                                                    {property.address}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Rate Calculation */}
                                {rateCalculation ? (
                                    <Card className="shadow-xl border-0">
                                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2">
                                                    <Tag className="h-5 w-5" />
                                                    {t('booking.total_price')}
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="space-y-3 text-sm">
                                                    {/* Base Rate */}
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">{t('booking.base_rate')}</span>
                                                        <span className="font-medium">
                                                            Rp {rateCalculation.base_amount?.toLocaleString('id-ID') || '0'}
                                                        </span>
                                                    </div>

                                                    {/* Weekend Premium */}
                                                    {rateCalculation.weekend_premium > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">{t('booking.weekend_premium')}</span>
                                                            <span className="font-medium">
                                                                Rp {rateCalculation.weekend_premium.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Seasonal Premium */}
                                                    {rateCalculation.seasonal_premium > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">{t('booking.seasonal_premium')}</span>
                                                            <span className="font-medium">
                                                                Rp {rateCalculation.seasonal_premium.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Additional Fees */}
                                                    {rateCalculation.extra_bed_amount > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">{t('booking.extra_beds')} ({extraBeds})</span>
                                                            <span className="font-medium">
                                                                Rp {rateCalculation.extra_bed_amount.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">{t('booking.cleaning_fee')}</span>
                                                        <span className="font-medium">
                                                            Rp {rateCalculation.cleaning_fee.toLocaleString('id-ID')}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">{t('booking.taxes_fees')}</span>
                                                        <span className="font-medium">
                                                            Rp {rateCalculation.tax_amount.toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                    
                                                    <Separator />
                                                    
                                                    {/* Final Total */}
                                                    <div className="flex justify-between items-center text-lg font-bold">
                                                        <span>{t('booking.total')}</span>
                                                        <span className="text-blue-600">
                                                            {rateCalculation.formatted.total_amount}
                                                        </span>
                                                    </div>

                                                    <div className="text-center text-xs text-green-600 bg-green-50 p-2 rounded">
                                                        ✓ {t('booking.all_inclusive_price_no_hidden_fees')}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="shadow-xl border-0">
                                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <CardTitle className="flex items-center gap-2">
                                                <Tag className="h-5 w-5" />
                                                {t('booking.total_price')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-center py-8">
                                                <Calculator className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                                <p className="text-gray-500">{t('booking.select_dates_to_calculate')}</p>
                                                {isCalculatingRate && (
                                                    <div className="mt-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                                                        <p className="text-xs text-gray-400 mt-1">{t('booking.calculating_rate')}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 
