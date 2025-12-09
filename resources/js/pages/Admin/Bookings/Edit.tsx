import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DateRange } from '@/components/ui/date-range';
import {
    Users,
    DollarSign,
    CheckCircle,
    AlertCircle,
    Building2,
    Edit,
    Bed,
    Calculator,
    Info,
    Sparkles,
    Tag,
    AlertTriangle,
    Loader2,
    Save,
    ArrowUpDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type BreadcrumbItem, type Booking, type Property } from '@/types';
import AdminLayout from '@/layouts/admin-layout';
import RateBreakdownCard from '@/components/booking/RateBreakdownCard';
import GuestCountForm from '@/components/booking/GuestCountForm';
import ExtraServiceSelector, { type ServiceMaster, type SelectedService } from '@/components/ExtraServiceSelector';
import { bookingsService } from '@/lib/api';

interface PaymentMethod {
    id: number;
    name: string;
    type: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
}

interface RateCalculation {
    nights: number;
    base_amount: number;
    weekend_premium: number;
    seasonal_premium: number;
    extra_bed_amount: number;
    cleaning_fee: number;
    tax_amount: number;
    total_amount: number;
    extra_beds: number;
    formatted: {
        total_amount: string;
        per_night: string;
    };
}

interface BookingEditProps {
    booking: Booking;
    properties: Property[];
    paymentMethods: PaymentMethod[];
    serviceMasters: ServiceMaster[];
}

export default function BookingEdit({ booking, properties, paymentMethods, serviceMasters = [] }: BookingEditProps) {
    const { t } = useTranslation();

    // State management
    const [currentProperty, setCurrentProperty] = useState<Property | null>(booking.property || null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [rateCalculationFull, setRateCalculationFull] = useState<any | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);
    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

    // Rate override state
    const [manualRateOverride, setManualRateOverride] = useState(false);
    const [overrideAmount, setOverrideAmount] = useState(booking.total_amount || 0);
    const [overrideReason, setOverrideReason] = useState('');

    // Extra services state
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

    const { data, setData, patch, processing, errors, reset } = useForm({
        property_id: booking.property_id?.toString() || '',
        check_in_date: booking.check_in ? new Date(booking.check_in).toISOString().split('T')[0] : '',
        check_out_date: booking.check_out ? new Date(booking.check_out).toISOString().split('T')[0] : '',
        guest_male: booking.guest_male ?? 1,
        guest_female: booking.guest_female ?? 1,
        guest_children: booking.guest_children ?? 0,
        guest_name: booking.guest_name || '',
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        guest_country: booking.guest_country || 'Indonesia',
        guest_id_number: booking.guest_id_number || '',
        guest_gender: booking.guest_gender || 'male',
        relationship_type: booking.relationship_type || 'keluarga',
        special_requests: booking.special_requests || '',
        internal_notes: booking.internal_notes || '',
        booking_status: booking.booking_status || 'pending_verification',
        payment_status: booking.payment_status || 'dp_pending',
        dp_percentage: booking.dp_percentage || 50,
        check_in_time: booking.check_in_time || '15:00',
        source: booking.source || 'direct',

        // Rate override fields
        rate_override: false,
        override_amount: null,
        override_reason: null,

        // Services
        services: [] as any[],
    });

    // Initialize selected services from booking
    useEffect(() => {
        if (booking.services && booking.services.length > 0) {
            const initialServices = booking.services.map((s: any) => ({
                service_master_id: s.service_master_id,
                service_name: s.service_name,
                service_type: s.service_type,
                quantity: s.quantity,
                unit_price: s.unit_price,
                total_price: s.total_price,
            }));
            setSelectedServices(initialServices);
        }
    }, [booking.services]);

    // Calculate total guests
    const totalGuests = useMemo(() => {
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;
        return male + female + Math.floor(children / 2);
    }, [data.guest_male, data.guest_female, data.guest_children]);

    // Calculate extra beds needed
    const extraBeds = useMemo(() => {
        if (!currentProperty) return 0;
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;
        // Children count logic based on capacity
        let effectiveGuests = male + female + children;
        if (currentProperty.capacity < currentProperty.capacity_max) {
            effectiveGuests = male + female + Math.floor(children / 2);
        }
        return Math.max(0, effectiveGuests - currentProperty.capacity);
    }, [currentProperty, data.guest_male, data.guest_female, data.guest_children]);

    // Calculate services total
    const servicesTotal = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.total_price, 0);
    }, [selectedServices]);

    // Detect changes for rate recalculation
    const hasChanges = useMemo(() => {
        return (
            data.property_id !== booking.property_id?.toString() ||
            data.check_in_date !== (booking.check_in ? new Date(booking.check_in).toISOString().split('T')[0] : '') ||
            data.check_out_date !== (booking.check_out ? new Date(booking.check_out).toISOString().split('T')[0] : '') ||
            totalGuests !== booking.guest_count
        );
    }, [data.property_id, data.check_in_date, data.check_out_date, totalGuests, booking]);

    // Handle property change
    const handlePropertyChange = (propertyId: string) => {
        const property = properties.find(p => p.id.toString() === propertyId);
        setCurrentProperty(property || null);
        setData('property_id', propertyId);

        // Reset calculations
        setRateCalculation(null);
        setRateCalculationFull(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);

        // Load property availability and rates
        if (property && data.check_in_date && data.check_out_date) {
            checkAvailabilityAndCalculateRate(property.id, data.check_in_date, data.check_out_date);
        }
    };

    // Check availability and calculate rate
    const checkAvailabilityAndCalculateRate = useCallback(async (propertyId: number, checkIn: string, checkOut: string) => {
        if (!checkIn || !checkOut) return;

        setAvailabilityStatus('checking');
        setAvailabilityError(null);
        setIsCalculatingRate(true);

        try {
            // Check availability (exclude current booking)
            const availabilityResponse = await fetch('/api/admin/booking-management/check-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    property_id: propertyId,
                    check_in: checkIn,
                    check_out: checkOut,
                    exclude_booking_id: booking.id, // Exclude current booking
                }),
            });

            if (availabilityResponse.ok) {
                const availabilityData = await availabilityResponse.json();
                setAvailabilityStatus(availabilityData.available ? 'available' : 'unavailable');

                if (!availabilityData.available) {
                    setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                    setIsCalculatingRate(false);
                    return;
                }

                // Calculate rate using bookingsService
                const rateData = await bookingsService.calculateRate({
                    property_id: propertyId,
                    check_in: checkIn,
                    check_out: checkOut,
                    guest_count: totalGuests,
                });

                if (rateData && rateData.success) {
                    const calculation = rateData.calculation || rateData;
                    setRateCalculation({
                        nights: calculation.nights,
                        base_amount: calculation.base_amount,
                        weekend_premium: calculation.weekend_premium || 0,
                        seasonal_premium: calculation.seasonal_premium || 0,
                        extra_bed_amount: calculation.extra_bed_amount || 0,
                        cleaning_fee: calculation.cleaning_fee || 0,
                        tax_amount: calculation.tax_amount || 0,
                        total_amount: calculation.total_amount,
                        extra_beds: calculation.extra_beds || 0,
                        formatted: {
                            total_amount: 'Rp ' + calculation.total_amount.toLocaleString('id-ID'),
                            per_night: 'Rp ' + Math.round(calculation.total_amount / calculation.nights).toLocaleString('id-ID')
                        }
                    });
                    // Store full calculation with daily_breakdown
                    setRateCalculationFull(rateData.calculation || rateData);
                    setRateError(null);
                } else {
                    setRateError(rateData?.message || 'Rate calculation failed');
                }
            } else {
                setAvailabilityStatus('unavailable');
                setAvailabilityError('Failed to check availability');
            }
        } catch (error) {
            setAvailabilityStatus('unavailable');
            setAvailabilityError('Error checking availability');
            setRateError(error instanceof Error ? error.message : 'Error calculating rate');
        } finally {
            setIsCalculatingRate(false);
        }
    }, [booking.id, totalGuests]);

    // Handle date range change
    const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
        setData('check_in_date', startDate);
        setData('check_out_date', endDate);

        // Clear previous calculations
        setRateCalculation(null);
        setRateCalculationFull(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);

        // Check availability and calculate rate if both dates are selected
        if (startDate && endDate && currentProperty) {
            checkAvailabilityAndCalculateRate(currentProperty.id, startDate, endDate);
        }
    }, [currentProperty, setData, checkAvailabilityAndCalculateRate]);

    // Handle guest count changes
    const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', value: string | number) => {
        const countField = genderType === 'children' ? 'guest_children' :
            genderType === 'male' ? 'guest_male' : 'guest_female';

        const newCount = value === '' || value === null || value === undefined ? 0 : Number(value) || 0;
        const validCount = Math.max(0, newCount);

        setData(countField, validCount);

        // Recalculate rate when guest count changes
        const male = genderType === 'male' ? validCount : (Number(data.guest_male) || 0);
        const female = genderType === 'female' ? validCount : (Number(data.guest_female) || 0);
        const children = genderType === 'children' ? validCount : (Number(data.guest_children) || 0);
        const newTotalGuests = male + female + children;

        if (data.check_in_date && data.check_out_date && currentProperty && newTotalGuests > 0) {
            setTimeout(async () => {
                try {
                    setIsCalculatingRate(true);
                    const rateData = await bookingsService.calculateRate({
                        property_id: currentProperty.id,
                        check_in: data.check_in_date,
                        check_out: data.check_out_date,
                        guest_count: newTotalGuests,
                    });

                    if (rateData && rateData.success) {
                        const calculation = rateData.calculation || rateData;
                        setRateCalculation({
                            nights: calculation.nights,
                            base_amount: calculation.base_amount,
                            weekend_premium: calculation.weekend_premium || 0,
                            seasonal_premium: calculation.seasonal_premium || 0,
                            extra_bed_amount: calculation.extra_bed_amount || 0,
                            cleaning_fee: calculation.cleaning_fee || 0,
                            tax_amount: calculation.tax_amount || 0,
                            total_amount: calculation.total_amount,
                            extra_beds: calculation.extra_beds || 0,
                            formatted: {
                                total_amount: 'Rp ' + (calculation.total_amount || 0).toLocaleString('id-ID'),
                                per_night: 'Rp ' + Math.round((calculation.total_amount || 0) / (calculation.nights || 1)).toLocaleString('id-ID')
                            }
                        });
                        setRateCalculationFull(rateData.calculation || rateData);
                        setRateError(null);
                    }
                } catch (error) {
                    console.error('Error recalculating rate on guest change:', error);
                } finally {
                    setIsCalculatingRate(false);
                }
            }, 300);
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: booking.booking_number, href: `/admin/booking-management/${booking.booking_number}` },
        { title: 'Edit' },
    ];

    // Enhanced validation
    const canSubmit = data.property_id &&
        data.check_in_date &&
        data.check_out_date &&
        data.guest_name.trim() &&
        data.guest_email.trim() &&
        data.guest_phone.trim() &&
        data.guest_country &&
        totalGuests > 0;

    // Validation messages
    const validationMessages = useMemo(() => {
        const messages: string[] = [];

        if (!data.property_id) messages.push('Property harus dipilih');
        if (!data.check_in_date) messages.push('Check-in date harus diisi');
        if (!data.check_out_date) messages.push('Check-out date harus diisi');
        if (!data.guest_name.trim()) messages.push('Nama tamu utama harus diisi');
        if (!data.guest_email.trim()) messages.push('Email tamu utama harus diisi');
        if (!data.guest_phone.trim()) messages.push('Nomor telepon tamu utama harus diisi');
        if (totalGuests === 0) messages.push('Jumlah tamu minimal 1');

        return messages;
    }, [data, totalGuests]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) {
            return;
        }

        // Prepare form data
        const formData: any = {
            property_id: String(data.property_id || ''),
            check_in_date: String(data.check_in_date || ''),
            check_out_date: String(data.check_out_date || ''),
            guest_male: Math.max(0, parseInt(String(data.guest_male || 0), 10)),
            guest_female: Math.max(0, parseInt(String(data.guest_female || 0), 10)),
            guest_children: Math.max(0, parseInt(String(data.guest_children || 0), 10)),
            guest_name: String(data.guest_name || '').trim(),
            guest_email: String(data.guest_email || '').trim(),
            guest_phone: String(data.guest_phone || '').trim(),
            guest_country: String(data.guest_country || 'Indonesia'),
            guest_id_number: data.guest_id_number ? String(data.guest_id_number).trim() : null,
            guest_gender: String(data.guest_gender || 'male'),
            relationship_type: String(data.relationship_type || 'keluarga'),
            special_requests: data.special_requests ? String(data.special_requests).trim() : null,
            internal_notes: data.internal_notes ? String(data.internal_notes).trim() : null,
            booking_status: String(data.booking_status || 'pending_verification'),
            payment_status: String(data.payment_status || 'dp_pending'),
            dp_percentage: (() => {
                const dp = parseInt(String(data.dp_percentage || 50), 10);
                return [30, 50, 70, 100].includes(dp) ? dp : 50;
            })(),
            check_in_time: String(data.check_in_time || '15:00'),
            source: String(data.source || 'direct'),
            services: selectedServices,
        };

        // Add rate override data if enabled
        if (manualRateOverride && overrideAmount > 0 && overrideReason.trim().length >= 10) {
            formData.rate_override = true;
            formData.override_amount = Number(overrideAmount) || 0;
            formData.override_reason = overrideReason.trim();
        } else {
            formData.rate_override = false;
            formData.override_amount = null;
            formData.override_reason = null;
        }

        router.patch(route('admin.booking-management.update', booking.booking_number), formData, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                // Only navigate away on success
                router.visit(route('admin.booking-management.show', booking.booking_number));
            },
            onError: (errors: any) => {
                console.error('Booking update failed:', errors);

                // Scroll to top to show error message
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Collect all error messages
                const errorMessages: string[] = [];

                if (errors.error) {
                    // Handle general error field
                    errorMessages.push(Array.isArray(errors.error) ? errors.error[0] : errors.error);
                } else {
                    // Handle validation errors for specific fields
                    Object.keys(errors).forEach(key => {
                        const error = errors[key];
                        const errorMsg = Array.isArray(error) ? error[0] : String(error);
                        // Format the error message with field name
                        const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        errorMessages.push(`${fieldName}: ${errorMsg}`);
                    });
                }

                // Set the feedback message
                if (errorMessages.length > 0) {
                    setSyncFeedback(errorMessages.join('\n'));
                } else {
                    setSyncFeedback('Failed to update booking. Please check all fields.');
                }
            }
        });
    };

    // Calculate payment impact
    const paymentImpact = useMemo(() => {
        if (!rateCalculation) return null;

        const originalAmount = booking.total_amount || 0;
        const newAmount = (manualRateOverride ? overrideAmount : rateCalculation.total_amount) + servicesTotal;
        const difference = newAmount - originalAmount;

        return {
            originalAmount,
            newAmount,
            difference,
            percentage: originalAmount > 0 ? (difference / originalAmount) * 100 : 0,
        };
    }, [rateCalculation, manualRateOverride, overrideAmount, booking.total_amount, servicesTotal]);

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Edit Booking" subtitle="Edit booking details">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-brand-primary">Edit Booking</h1>
                    <p className="text-muted-foreground mt-1">
                        Edit booking details for {booking.booking_number}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Edit className="h-5 w-5" />
                                    Booking Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {syncFeedback && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Update Error</AlertTitle>
                                        <AlertDescription>{syncFeedback}</AlertDescription>
                                    </Alert>
                                )}

                                {validationMessages.length > 0 && (
                                    <Alert variant="destructive" className="mb-6">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Validation Errors</AlertTitle>
                                        <AlertDescription>
                                            <ul className="list-disc list-inside space-y-1">
                                                {validationMessages.map((message, index) => (
                                                    <li key={index}>{message}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Property Selection */}
                                    <div>
                                        <Label htmlFor="property_id">Select Property *</Label>
                                        <Select
                                            value={data.property_id}
                                            onValueChange={handlePropertyChange}
                                        >
                                            <SelectTrigger className={errors.property_id ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Choose a property" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {properties.map((property) => (
                                                    <SelectItem key={property.id} value={property.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-4 w-4" />
                                                            {property.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.property_id && (
                                            <p className="text-sm text-red-600 mt-1">{errors.property_id}</p>
                                        )}
                                    </div>

                                    {/* Property Info Display */}
                                    {currentProperty && (
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                {currentProperty.cover_image && (
                                                    <img
                                                        src={currentProperty.cover_image}
                                                        alt={currentProperty.name}
                                                        className="w-16 h-16 rounded-lg object-cover"
                                                    />
                                                )}
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">{currentProperty.name}</h3>
                                                    <p className="text-sm text-gray-600">{currentProperty.address}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-3 w-3" />
                                                            <span>Capacity: {currentProperty.capacity} - {currentProperty.capacity_max}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <DollarSign className="h-3 w-3" />
                                                            <span>Base Rate: {currentProperty.formatted_base_rate}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Date Range */}
                                    <div>
                                        <Label>Check-in & Check-out Dates *</Label>
                                        <DateRange
                                            startDate={data.check_in_date}
                                            endDate={data.check_out_date}
                                            onDateChange={handleDateRangeChange}
                                            loading={isCalculatingRate || isLoadingAvailability}
                                            error={rateError}
                                            minDate={new Date().toISOString().split('T')[0]}
                                            size="lg"
                                            showNights={true}
                                            startLabel="Check-in"
                                            endLabel="Check-out"
                                            placeholder={{
                                                start: "Check-in",
                                                end: "Check-out"
                                            }}
                                            autoTrigger={true}
                                            triggerDelay={300}
                                            adminMode={true}
                                            showManualInput={true}
                                        />
                                        {(errors.check_in_date || errors.check_out_date) && (
                                            <p className="text-sm text-red-600 mt-1">
                                                {errors.check_in_date || errors.check_out_date}
                                            </p>
                                        )}

                                        {/* Availability Status */}
                                        {availabilityStatus && (
                                            <div className="mt-2">
                                                {availabilityStatus === 'checking' && (
                                                    <Alert>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <AlertDescription>Checking availability...</AlertDescription>
                                                    </Alert>
                                                )}
                                                {availabilityStatus === 'available' && (
                                                    <Alert className="border-green-200 bg-green-50">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <AlertDescription className="text-green-800">
                                                            Property is available for selected dates
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                {availabilityStatus === 'unavailable' && (
                                                    <Alert variant="destructive">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            {availabilityError || 'Property is not available for selected dates'}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Guest Count */}
                                    {currentProperty && (
                                        <GuestCountForm
                                            guestMale={data.guest_male}
                                            guestFemale={data.guest_female}
                                            guestChildren={data.guest_children}
                                            totalGuests={totalGuests}
                                            extraBeds={extraBeds}
                                            capacity={currentProperty.capacity}
                                            capacityMax={currentProperty.capacity_max}
                                            extraBedRate={currentProperty.extra_bed_rate || 0}
                                            errors={{
                                                guest_male: errors.guest_male,
                                                guest_female: errors.guest_female,
                                                guest_children: errors.guest_children,
                                            }}
                                            onGuestCountChange={handleGenderCountChange}
                                        />
                                    )}

                                    <Separator />

                                    {/* Primary Guest Info */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Primary Guest Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <Label htmlFor="guest_name">Full Name *</Label>
                                                <Input
                                                    id="guest_name"
                                                    value={data.guest_name}
                                                    onChange={(e) => setData('guest_name', e.target.value)}
                                                    className={errors.guest_name ? 'border-red-500' : ''}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_email">Email Address *</Label>
                                                <Input
                                                    id="guest_email"
                                                    type="email"
                                                    value={data.guest_email}
                                                    onChange={(e) => setData('guest_email', e.target.value)}
                                                    className={errors.guest_email ? 'border-red-500' : ''}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_phone">Phone Number *</Label>
                                                <Input
                                                    id="guest_phone"
                                                    type="tel"
                                                    value={data.guest_phone}
                                                    onChange={(e) => setData('guest_phone', e.target.value)}
                                                    className={errors.guest_phone ? 'border-red-500' : ''}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_gender">Gender *</Label>
                                                <Select
                                                    value={data.guest_gender}
                                                    onValueChange={(value: 'male' | 'female') => setData('guest_gender', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="male">Male</SelectItem>
                                                        <SelectItem value="female">Female</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_country">Country *</Label>
                                                <Select
                                                    value={data.guest_country}
                                                    onValueChange={(value) => setData('guest_country', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select country" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Indonesia">Indonesia</SelectItem>
                                                        <SelectItem value="Malaysia">Malaysia</SelectItem>
                                                        <SelectItem value="Singapore">Singapore</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Extra Services */}
                                    <div>
                                        <ExtraServiceSelector
                                            services={serviceMasters}
                                            selectedServices={selectedServices}
                                            onServicesChange={setSelectedServices}
                                            nights={rateCalculation?.nights || 1}
                                        />
                                    </div>

                                    <Separator />

                                    {/* Booking Settings */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Booking Settings</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="booking_status">Booking Status *</Label>
                                                <Select value={data.booking_status} onValueChange={(value: any) => setData('booking_status', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending_verification">Pending Verification</SelectItem>
                                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="payment_status">Payment Status *</Label>
                                                <Select value={data.payment_status} onValueChange={(value: any) => setData('payment_status', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="dp_pending">DP Pending</SelectItem>
                                                        <SelectItem value="dp_received">DP Received</SelectItem>
                                                        <SelectItem value="fully_paid">Fully Paid</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="source">Booking Source</Label>
                                                <Select value={data.source} onValueChange={(value: any) => setData('source', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="direct">Direct</SelectItem>
                                                        <SelectItem value="phone">Phone</SelectItem>
                                                        <SelectItem value="walk_in">Walk-in</SelectItem>
                                                        <SelectItem value="ota">OTA</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Internal Notes */}
                                    <div>
                                        <Label htmlFor="internal_notes">Internal Notes (Optional)</Label>
                                        <Textarea
                                            id="internal_notes"
                                            value={data.internal_notes || ''}
                                            onChange={(e) => setData('internal_notes', e.target.value)}
                                            rows={3}
                                            placeholder="Internal notes for staff..."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            type="submit"
                                            disabled={!canSubmit || processing}
                                            className="px-8"
                                        >
                                            {processing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Updating Booking...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Update Booking
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Rate Calculation Sidebar */}
                        <Card className="lg:sticky lg:top-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Rate Calculation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isCalculatingRate && (
                                    <Alert>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <AlertDescription>Calculating rates...</AlertDescription>
                                    </Alert>
                                )}

                                {rateCalculation && (
                                    <div className="space-y-4">
                                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                            <div className="text-3xl font-bold text-brand-primary">
                                                {formatCurrency((manualRateOverride ? overrideAmount : rateCalculation.total_amount) + servicesTotal)}
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                Total Amount
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Base Rate ({rateCalculation.nights} nights)</span>
                                                <span>{formatCurrency(rateCalculation.base_amount)}</span>
                                            </div>
                                            {rateCalculation.weekend_premium > 0 && (
                                                <div className="flex justify-between text-amber-600">
                                                    <span>Weekend Premium</span>
                                                    <span>+{formatCurrency(rateCalculation.weekend_premium)}</span>
                                                </div>
                                            )}
                                            {rateCalculation.extra_bed_amount > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Extra Beds ({rateCalculation.extra_beds})</span>
                                                    <span>+{formatCurrency(rateCalculation.extra_bed_amount)}</span>
                                                </div>
                                            )}
                                            {servicesTotal > 0 && (
                                                <div className="flex justify-between text-blue-600 font-medium">
                                                    <span>Extra Services</span>
                                                    <span>+{formatCurrency(servicesTotal)}</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between font-semibold text-base">
                                                <span>Total</span>
                                                <span>{formatCurrency((manualRateOverride ? overrideAmount : rateCalculation.total_amount) + servicesTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Rate Override Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Tag className="h-5 w-5" />
                                    Rate Adjustment
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="manual_rate_override"
                                            checked={manualRateOverride}
                                            onChange={(e) => setManualRateOverride(e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                        <Label htmlFor="manual_rate_override" className="text-sm font-medium">
                                            Manual Rate Adjustment
                                        </Label>
                                    </div>

                                    {manualRateOverride && (
                                        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <div>
                                                <Label htmlFor="override_amount">Override Amount *</Label>
                                                <Input
                                                    id="override_amount"
                                                    type="number"
                                                    min="0"
                                                    value={overrideAmount}
                                                    onChange={(e) => setOverrideAmount(parseFloat(e.target.value) || 0)}
                                                    placeholder="Enter custom amount"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="override_reason">Adjustment Reason *</Label>
                                                <Textarea
                                                    id="override_reason"
                                                    value={overrideReason}
                                                    onChange={(e) => setOverrideReason(e.target.value)}
                                                    rows={2}
                                                    placeholder="Reason for adjustment..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Impact Card */}
                        {paymentImpact && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                                        Payment Impact
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span>Original Amount:</span>
                                            <span className="font-medium">{formatCurrency(paymentImpact.originalAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>New Amount:</span>
                                            <span className="font-medium">{formatCurrency(paymentImpact.newAmount)}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span>Difference:</span>
                                            <span className={`font-semibold ${paymentImpact.difference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {paymentImpact.difference >= 0 ? '+' : ''}{formatCurrency(paymentImpact.difference)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}