import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import TextLink from '@/components/text-link';
import {
    ArrowLeft,
    Calendar,
    Building2,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types/property';
import { propertiesService } from '@/lib/api';

// Import komponen yang baru dibuat
import BookingDateDisplay from '@/components/booking/BookingDateDisplay';
import GuestCountForm from '@/components/booking/GuestCountForm';
import PrimaryGuestForm from '@/components/booking/PrimaryGuestForm';
import PaymentOptionsForm from '@/components/booking/PaymentOptionsForm';
import RateCalculationCard from '@/components/booking/RateCalculationCard';

interface BookingCreateProps {
    property: Property;
    initialFormData: BookingFormData;
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
}

interface BookingFormData {
    check_in: string;
    check_out: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number?: string;
    guest_gender: 'male' | 'female';
    relationship_type: 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran';
    special_requests?: string;
    booking_status: 'pending_verification' | 'confirmed';
    payment_status: 'dp_pending' | 'dp_received' | 'fully_paid';
    dp_percentage: number;
    auto_confirm: boolean;
    check_in_time: string;
    source: 'direct' | 'phone' | 'walk_in' | 'ota';
    [key: string]: any;
}

interface RateCalculation {
    seasonal_premium: number;
    nights: number;
    weekday_nights: number;
    weekend_nights: number;
    base_amount: number;
    total_base_amount: number;
    weekend_premium: number;
    extra_bed_amount: number;
    cleaning_fee: number;
    minimum_stay_discount: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    extra_beds: number;
    rate_breakdown: {
        seasonal_rates_applied: number;
        base_rate_per_night: number;
        weekend_premium_percent: number;
        peak_season_applied: number;
        long_weekend_applied: number;
    };
    daily_breakdown?: Record<string, {
        date: string;
        day_name: string;
        base_rate: number;
        final_rate: number;
        premiums: string[];
        seasonal_rate: {
            name: string;
            type: string;
            value: number;
            extra_bed_rate: number | null;
        } | null;
        extra_bed_rate: number;
    }>;
}

interface BookingErrors {
    check_in?: string;
    check_out?: string;
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
}

export default function BookingCreate({ property, initialFormData, auth }: BookingCreateProps) {
    const { t } = useTranslation();

    // State yang diperlukan
    const [totalGuests, setTotalGuests] = useState(initialFormData.guest_male + initialFormData.guest_female + initialFormData.guest_children);
    const [extraBeds, setExtraBeds] = useState(0);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);

    // Form handling
    const { data, setData, post, processing, errors } = useForm<BookingFormData>(initialFormData);
    const bookingErrors = errors as BookingErrors;

    // Calculate fake discount (17% markup from final rate)
    const calculateDiscountPrice = () => {
        if (!rateCalculation) return null;

        const finalRate = rateCalculation.total_amount;
        const originalPrice = finalRate * 1.17; // 17% markup
        const discountAmount = originalPrice - finalRate;
        const discountPercent = Math.round((discountAmount / originalPrice) * 100);

        return {
            original_price: originalPrice,
            final_price: finalRate,
            discount_amount: discountAmount,
            discount_percent: discountPercent,
            nights: rateCalculation.nights
        };
    };

    const discountInfo = calculateDiscountPrice();

    // Calculate effective extra bed rate from rate calculation (considering seasonal rates)
    const effectiveExtraBedRate = useMemo(() => {
        if (!rateCalculation || !rateCalculation.extra_beds || rateCalculation.extra_beds === 0) {
            return property.extra_bed_rate || 0;
        }

        // If daily_breakdown is available, calculate average extra_bed_rate across all nights
        if (rateCalculation.daily_breakdown && Object.keys(rateCalculation.daily_breakdown).length > 0) {
            const breakdown = rateCalculation.daily_breakdown;
            const dates = Object.keys(breakdown).sort();
            const totalExtraBedRate = dates.reduce((sum, date) => {
                const dayBreakdown = breakdown[date];
                return sum + (dayBreakdown.extra_bed_rate || 0);
            }, 0);
            const averageRate = totalExtraBedRate / dates.length;
            return averageRate > 0 ? averageRate : property.extra_bed_rate || 0;
        }

        // Fallback: calculate from total extra_bed_amount
        if (rateCalculation.extra_bed_amount && rateCalculation.nights > 0) {
            const ratePerNight = rateCalculation.extra_bed_amount / (rateCalculation.extra_beds * rateCalculation.nights);
            return ratePerNight > 0 ? ratePerNight : property.extra_bed_rate || 0;
        }

        return property.extra_bed_rate || 0;
    }, [rateCalculation, property.extra_bed_rate]);

    // Calculate total guests and effective guests whenever individual counts change
    useEffect(() => {
        const total = data.guest_male + data.guest_female + Math.floor(data.guest_children / 2);
        setTotalGuests(total);

        // Calculate effective guests for extra bed calculation
        // If capacity < capacity_max: Children count: 1->0, 2->1, 3->1, 4->2, etc. (floor(children / 2))
        // If capacity == capacity_max: Children count as 1
        let effectiveGuests = data.guest_male + data.guest_female + data.guest_children;

        if (property.capacity < property.capacity_max) {
            effectiveGuests = data.guest_male + data.guest_female + Math.floor(data.guest_children / 2);
        }

        // Calculate extra beds needed: max(0, effectiveGuests - capacity)
        const extraBedsNeeded = Math.max(0, effectiveGuests - property.capacity);
        setExtraBeds(extraBedsNeeded);
    }, [data.guest_male, data.guest_female, data.guest_children, property.capacity]);

    // Handle guest count changes
    const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
        if (genderType === 'children') {
            setData('guest_children', newCount);
        } else if (genderType === 'male') {
            setData('guest_male', newCount);
        } else {
            setData('guest_female', newCount);
        }

        // Note: Rate calculation effect will trigger automatically due to data dependency
    };

    // Calculate rate
    const calculateRate = useCallback(async () => {
        try {
            // Calculate effective guest count for rate calculation
            let effectiveGuestCount = data.guest_male + data.guest_female + data.guest_children;

            if (property.capacity < property.capacity_max) {
                effectiveGuestCount = data.guest_male + data.guest_female + Math.floor(data.guest_children / 2);
            }

            const result = await propertiesService.calculateRate(property.slug, {
                check_in: data.check_in,
                check_out: data.check_out,
                guest_count: effectiveGuestCount, // Send effective count to API
            });

            if (result.success) {
                setRateCalculation(result.calculation);
                setAvailabilityStatus('available');
            } else {
                setAvailabilityStatus('unavailable');
            }
        } catch (error) {
            console.error('Error calculating rate:', error);
            setAvailabilityStatus('unavailable');
        }
    }, [property.slug, data.check_in, data.check_out, data.guest_male, data.guest_female, data.guest_children]);

    // Calculate rate when dates or guest count change
    useEffect(() => {
        if (data.check_in && data.check_out && totalGuests > 0) {
            setAvailabilityStatus('checking');
            // Use setTimeout to ensure state is updated
            setTimeout(() => {
                calculateRate();
            }, 100);
        }
    }, [data.check_in, data.check_out, totalGuests, data.guest_male, data.guest_female, data.guest_children]);

    // Handle field changes
    const handleFieldChange = <K extends Extract<keyof BookingFormData, string>>(field: K, value: BookingFormData[K]) => {
        setData(field, value);
    };

    // Handle DP percentage change
    const handleDpPercentageChange = (percentage: number) => {
        setData('dp_percentage', percentage);
    };

    // Check-in time options
    const checkInTimeOptions = [
        { value: '14:00', label: '14:00' },
        { value: '15:00', label: '15:00' },
        { value: '16:00', label: '16:00' },
        { value: '17:00', label: '17:00' },
        { value: '18:00', label: '18:00' },
        { value: '19:00', label: '19:00' },
        { value: '20:00', label: '20:00' },
        { value: '21:00', label: '21:00' },
        { value: '22:00', label: '22:00' },
        { value: '23:00', label: '23:00' },
        { value: '00:00', label: '00:00' },
    ];

    // Form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) {
            console.warn('Form submission blocked - validation failed');
            return;
        }

        const submitData = {
            check_in: data.check_in,
            check_out: data.check_out,
            check_in_time: data.check_in_time || '15:00',
            guest_male: data.guest_male || 0,
            guest_female: data.guest_female || 0,
            guest_children: data.guest_children || 0,
            guest_count: totalGuests,
            guest_name: data.guest_name?.trim() || '',
            guest_email: data.guest_email?.trim() || '',
            guest_phone: data.guest_phone?.trim() || '',
            guest_country: data.guest_country || 'Indonesia',
            guest_id_number: data.guest_id_number || '',
            guest_gender: data.guest_gender || 'male',
            relationship_type: data.relationship_type || 'keluarga',
            special_requests: data.special_requests || '',
            dp_percentage: data.dp_percentage || 50,
        };

        post(`/properties/${property.slug}/book`, {
            ...submitData,
            onSuccess: () => {
                console.log('Booking created successfully');
            },
            onError: (errors: any) => {
                console.error('Booking creation failed:', errors);
            }
        });
    };

    // Validation
    const guestCountError = totalGuests > property.capacity_max;
    const canSubmit = data.check_in &&
        data.check_out &&
        !guestCountError &&
        data.guest_name.trim() &&
        data.guest_email.trim() &&
        data.guest_phone.trim() &&
        data.guest_country &&
        totalGuests > 1 &&
        availabilityStatus === 'available' &&
        rateCalculation !== null;

    return (
        <GuestLayout>
            <Head title={`${t('booking.book_your_stay')} ${property.name} - Property Management System`} />

            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <Link href={`/properties/${property.slug}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            {t('booking.back_to_property')}
                        </Link>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                    <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                        {/* Property Summary & Rate - Mobile: Top, Desktop: Right Sidebar */}
                        <div className="order-1 xl:order-2 xl:col-span-1">
                            <div className="xl:sticky xl:top-4 space-y-4 sm:space-y-6">
                                {/* Property Info */}
                                <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/30 card-modern">
                                    <CardHeader className="pb-4 bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border-b border-brand-primary/20">
                                        <CardTitle className="text-lg text-foreground">{t('booking.your_booking')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 sm:px-6">
                                        <div className="space-y-4">
                                            <div className="aspect-video bg-muted/50 rounded-lg overflow-hidden border border-border">
                                                {property.media.length > 0 && property.media[0].url ? (
                                                    <img
                                                        src={property.media[0].url}
                                                        alt={property.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/10 flex items-center justify-center">
                                                        <Building2 className="h-8 w-8 text-brand-primary/60" />
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="font-semibold text-brand-primary">{property.name}</h3>
                                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                    <MapPin className="h-4 w-4 mr-1 text-brand-primary" />
                                                    {property.address}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Rate Calculation */}
                                {rateCalculation && (
                                    <RateCalculationCard
                                        rateCalculation={rateCalculation}
                                        discountInfo={discountInfo || undefined}
                                        dpPercentage={data.dp_percentage}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Booking Form - Mobile: Below, Desktop: Left */}
                        <div className="order-2 xl:order-1 xl:col-span-2">
                            <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/30 card-modern">
                                <CardHeader className="pb-4 bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border-b border-brand-primary/20">
                                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                        <Calendar className="h-5 w-5 text-brand-primary" />
                                        {t('booking.book_your_stay')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    {errors.error && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{errors.error}</AlertDescription>
                                        </Alert>
                                    )}
                                    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

                                        {/* Date Display */}
                                        <BookingDateDisplay
                                            checkIn={data.check_in}
                                            checkOut={data.check_out}
                                            checkInTime={data.check_in_time}
                                            checkOutTime={property.check_out_time}
                                            nights={rateCalculation?.nights}
                                            errors={bookingErrors}
                                        />

                                        {/* Check-in Time Selection */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">{t('booking.check_in_time')}</Label>
                                            <Select
                                                value={data.check_in_time}
                                                onValueChange={(value: string) => handleFieldChange('check_in_time', value)}
                                            >
                                                <SelectTrigger className={`h-12 text-base ${bookingErrors.check_in_time ? 'border-red-500' : ''}`}>
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
                                        {data.check_in && data.check_out && (
                                            <div className="mt-4">
                                                {availabilityStatus === 'checking' && (
                                                    <Alert className="border-primary/20 bg-primary/10">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                        <AlertDescription className="text-primary">
                                                            {t('booking.checking_availability')}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {availabilityStatus === 'unavailable' && (
                                                    <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription className="text-red-600">
                                                            {t('booking.property_unavailable')}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {availabilityStatus === 'available' && rateCalculation && (
                                                    <Alert className="border-green-500/20 bg-green-500/10">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <AlertDescription className="text-green-600">
                                                            {t('booking.property_available', {
                                                                total: rateCalculation.total_amount.toLocaleString(),
                                                                nights: rateCalculation.nights
                                                            })}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}

                                        <Separator />

                                        {/* Guest Count Form */}
                                        <GuestCountForm
                                            guestMale={data.guest_male}
                                            guestFemale={data.guest_female}
                                            guestChildren={data.guest_children}
                                            totalGuests={totalGuests}
                                            extraBeds={extraBeds}
                                            capacity={property.capacity}
                                            capacityMax={property.capacity_max}
                                            extraBedRate={effectiveExtraBedRate}
                                            errors={bookingErrors}
                                            onGuestCountChange={handleGenderCountChange}
                                        />

                                        <Separator />

                                        {/* Primary Guest Form */}
                                        <PrimaryGuestForm
                                            guestName={data.guest_name}
                                            guestEmail={data.guest_email}
                                            guestPhone={data.guest_phone}
                                            guestGender={data.guest_gender}
                                            guestCountry={data.guest_country}
                                            relationshipType={data.relationship_type}
                                            errors={bookingErrors}
                                            onFieldChange={handleFieldChange}
                                        />

                                        <Separator />

                                        {/* Payment Options */}
                                        <PaymentOptionsForm
                                            dpPercentage={data.dp_percentage}
                                            onDpPercentageChange={handleDpPercentageChange}
                                        />

                                        {/* Special Requests */}
                                        <div className="space-y-3">
                                            <Label htmlFor="special_requests" className="text-base font-medium text-foreground">
                                                Special Requests (Optional)
                                            </Label>
                                            <Textarea
                                                id="special_requests"
                                                value={data.special_requests}
                                                onChange={(e) => handleFieldChange('special_requests', e.target.value)}
                                                rows={4}
                                                placeholder="Any special requests or requirements..."
                                                className="text-base resize-none"
                                            />
                                        </div>

                                        {/* Submit Buttons */}
                                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                            <Link href={`/properties/${property.slug}`} className="flex-1">
                                                <Button variant="outline" className="w-full h-12 text-base">
                                                    {t('common.cancel')}
                                                </Button>
                                            </Link>
                                            <Button
                                                type="submit"
                                                disabled={!canSubmit || processing}
                                                className="flex-1 h-12 text-base"
                                            >
                                                {processing ? t('booking.processing') : t('booking.continue_confirmation')}
                                            </Button>
                                        </div>

                                        {/* Terms and Privacy */}
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">
                                                {t('booking.terms_privacy')}{' '}
                                                <TextLink href="/tos" className="text-blue-600 hover:text-blue-700">
                                                    {t('auth.terms_of_service')}
                                                </TextLink>{' '}
                                                {t('auth.and')}{' '}
                                                <TextLink href="/privacy" className="text-blue-600 hover:text-blue-700">
                                                    {t('auth.privacy_policy')}
                                                </TextLink>
                                            </p>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                </div>
            </div>
        </GuestLayout>
    );
} 