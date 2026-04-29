import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
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
    Calculator,
    CreditCard,
    Loader2,
    Save,
    UserPlus,
    Edit
} from 'lucide-react';
import { PaymentStatus, type Booking, type BookingStatus, type Property } from '@/types';
import GuestCountForm from '@/components/booking/GuestCountForm';
import PropertySelector from '@/components/booking/PropertySelector';
import ExtraServiceSelector, { type ServiceMaster, type SelectedService } from '@/components/ExtraServiceSelector';
import RateBreakdownCard from '@/components/booking/RateBreakdownCard';
import { apiGet, apiPost } from '@/lib/api';

// Types
export interface PaymentMethod {
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

interface AvailabilityData {
    success: boolean;
    property?: {
        id: number;
        name: string;
        base_rate: number;
        capacity: number;
        capacity_max: number;
        cleaning_fee: number;
        extra_bed_rate: number;
        weekend_premium_percent: number;
    };
    date_range?: {
        start: string;
        end: string;
    };
    booked_dates: string[];
    booked_periods?: string[][];
    availability_data?: {
        rates: Record<string, any>;
    };
    seasonal_rates?: Record<string, any>;
    availability?: {
        available: boolean;
        booked_dates?: string[];
        booked_periods?: string[][];
    };
    rate_calculation?: any;
    error?: string;
}

interface BookingFormProps {
    mode: 'create' | 'edit';
    initialData?: Partial<Booking>;
    properties: Property[];
    paymentMethods: PaymentMethod[];
    serviceMasters: ServiceMaster[];
    bookingNumber?: string; // Required for edit mode
}

export default function BookingForm({
    mode,
    initialData,
    properties,
    paymentMethods,
    serviceMasters = [],
    bookingNumber
}: BookingFormProps) {

    // Determine initial values based on mode
    const defaultValues = {
        property_id: initialData?.property_id?.toString() || '',
        check_in_date: initialData?.check_in ? new Date(initialData.check_in).toISOString().split('T')[0] : '',
        check_out_date: initialData?.check_out ? new Date(initialData.check_out).toISOString().split('T')[0] : '',
        guest_male: initialData?.guest_male ?? 1,
        guest_female: initialData?.guest_female ?? 1,
        guest_children: initialData?.guest_children ?? 0,
        guest_name: initialData?.guest_name || '',
        guest_email: initialData?.guest_email || '',
        guest_phone: initialData?.guest_phone || '',
        guest_country: initialData?.guest_country || 'Indonesia',
        guest_id_number: initialData?.guest_id_number || '',
        guest_gender: initialData?.guest_gender || 'male',
        relationship_type: initialData?.relationship_type || 'keluarga',
        special_requests: initialData?.special_requests || '',
        internal_notes: initialData?.internal_notes || '',
        booking_status: initialData?.booking_status || (mode === 'create' ? 'confirmed' : 'pending_verification'),
        payment_status: initialData?.payment_status || (mode === 'create' ? 'fully_paid' : 'dp_pending'),
        dp_percentage: initialData?.dp_percentage || (mode === 'create' ? 100 : 50),
        check_in_time: initialData?.check_in_time || '15:00',
        source: initialData?.source || 'direct',

        // Payment fields (mostly for create mode or update on edit)
        payment_method_id: null as string | null,
        payment_amount: null as number | null,
        payment_date: null as string | null,
        reference_number: null as string | null,
        bank_name: null as string | null,
        account_number: null as string | null,
        account_name: null as string | null,
        payment_status_payment: 'verified' as 'pending' | 'verified' | null,
        verification_notes: null as string | null,

        // Rate override fields
        rate_override: false,
        override_amount: null as number | null,
        override_reason: null as string | null,

        // OTA Override
        force_ota_override: false,

        // Services
        services: [] as any[],
    };

    const { data, setData, post, patch, processing, errors } = useForm<typeof defaultValues & { can_override?: string; error?: string }>(defaultValues);

    // State management
    const [currentProperty, setCurrentProperty] = useState<Property | null>(
        initialData?.property || properties.find(p => p.id.toString() === data.property_id) || null
    );

    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [rateCalculationFull, setRateCalculationFull] = useState<any | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);

    const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

    // Rate override state
    const [manualRateOverride, setManualRateOverride] = useState(false);
    const [overrideAmount, setOverrideAmount] = useState(initialData?.total_amount || 0);
    const [overrideReason, setOverrideReason] = useState('');

    // Payment state
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentData, setPaymentData] = useState({
        payment_method_id: '',
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        payment_status: 'verified' as 'pending' | 'verified',
        verification_notes: '',
    });
    const [paymentProof, setPaymentProof] = useState<File | null>(null);

    // Extra services state
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

    // Initialize selected services from initialData
    useEffect(() => {
        if (initialData?.services && initialData.services.length > 0) {
            const initialServices = initialData.services.map((s: any) => ({
                service_master_id: s.service_master_id,
                service_name: s.service_name,
                service_type: s.service_type,
                quantity: s.quantity,
                unit_price: s.unit_price,
                total_price: s.total_price,
            }));
            setSelectedServices(initialServices);
        }
    }, [initialData]);

    // Calculate total guests
    const totalGuests = useMemo(() => {
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;

        let effectiveGuests = male + female + children;
        if (currentProperty && currentProperty.capacity < currentProperty.capacity_max) {
            effectiveGuests = male + female + Math.floor(children / 2);
        }
        return effectiveGuests;
    }, [data.guest_male, data.guest_female, data.guest_children, currentProperty]);

    // Calculate extra beds needed
    const extraBeds = useMemo(() => {
        if (!currentProperty) return 0;
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;

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

    // Calculate total booking amount
    const totalBookingAmount = useMemo(() => {
        const baseTotal = manualRateOverride ? overrideAmount : (rateCalculation?.total_amount || 0);
        return baseTotal + servicesTotal;
    }, [rateCalculation, manualRateOverride, overrideAmount, servicesTotal]);

    // Auto show/hide payment form based on booking status (Create mode logic)
    useEffect(() => {
        if (mode === 'create') {
            if (data.booking_status === 'confirmed' && data.payment_status !== 'dp_pending') {
                setShowPaymentForm(true);
                // Auto-calculate payment amount
                if (totalBookingAmount > 0 && (!paymentData.amount || paymentData.amount === 0)) {
                    let calculatedAmount = 0;
                    if (data.payment_status === 'fully_paid') {
                        calculatedAmount = totalBookingAmount;
                    } else {
                        calculatedAmount = (totalBookingAmount * data.dp_percentage) / 100;
                    }
                    setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
                    setData('payment_amount', calculatedAmount);
                }
            } else {
                setShowPaymentForm(false);
            }
        }
    }, [mode, data.booking_status, data.payment_status, data.dp_percentage, totalBookingAmount]);

    // Sync paymentData to form state
    useEffect(() => {
        if (showPaymentForm || (data.booking_status === 'confirmed' && data.payment_status !== 'dp_pending')) {
            if (paymentData.payment_method_id) setData('payment_method_id', paymentData.payment_method_id);
            if (paymentData.amount !== undefined) setData('payment_amount', paymentData.amount);
            if (paymentData.payment_date) setData('payment_date', paymentData.payment_date);
            if (paymentData.reference_number) setData('reference_number', paymentData.reference_number);
            if (paymentData.bank_name) setData('bank_name', paymentData.bank_name);
            if (paymentData.account_number) setData('account_number', paymentData.account_number);
            if (paymentData.account_name) setData('account_name', paymentData.account_name);
            if (paymentData.verification_notes) setData('verification_notes', paymentData.verification_notes);
            if (paymentData.payment_status) setData('payment_status_payment', paymentData.payment_status);
        }
    }, [paymentData, showPaymentForm, data.booking_status, data.payment_status]);

    // Load property availability data
    const loadPropertyData = async (propertyId: number) => {
        setIsLoadingAvailability(true);
        try {
            const start = new Date();
            start.setMonth(start.getMonth() - 2);
            const startDate = start.toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const response = await apiGet<{ success: boolean; data?: { booked_dates?: string[]; booked_periods?: string[][] }; booked_dates?: string[]; booked_periods?: string[][] }>(
                '/api/admin/booking-management/property-date-range',
                { property_id: String(propertyId), start: startDate, end: endDate }
            );

            if (response && (response.success || response.data)) {
                const resData = response.data || response;
                setAvailabilityData({
                    success: true,
                    booked_dates: resData.booked_dates || [],
                    booked_periods: resData.booked_periods || [],
                });
            }
        } catch (error) {
            console.error('Error loading property data:', error);
            // Non-blocking error
        } finally {
            setIsLoadingAvailability(false);
        }
    };

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

        if (property) {
            loadPropertyData(property.id);
            // Update max capacity defaults if passing max
            if (totalGuests > property.capacity_max) {
                setData(data => ({
                    ...data,
                    guest_male: Math.floor(property.capacity_max / 2),
                    guest_female: Math.floor(property.capacity_max / 2),
                    guest_children: property.capacity_max % 2
                }));
            }
        }
    };

    // Check availability and rate
    const checkAvailabilityAndCalculateRate = useCallback(async (
        propertyId: number,
        checkIn: string,
        checkOut: string,
    ) => {
        if (!checkIn || !checkOut) return;

        setAvailabilityStatus('checking');
        setAvailabilityError(null);
        setIsCalculatingRate(true);

        try {
            // 1. Check Availability
            const availabilityPayload = {
                property_id: propertyId,
                check_in: checkIn,
                check_out: checkOut,
                exclude_booking_id: mode === 'edit' && bookingNumber ? initialData?.id : undefined
            };

            // Note: Using the specific endpoint for check-availability if needed, 
            // or reusing the service. Create and Edit had slightly different implementations.
            // We'll use the service method which should handle both if param is supported, 
            // or fall back to raw fetch if needed for exclude_booking_id support

            let isAvailable = false;

            if (mode === 'edit') {
                // For edit, we need to exclude the current booking
                const response = await fetch('/api/admin/booking-management/check-availability', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(availabilityPayload),
                });
                if (response.ok) {
                    const data = await response.json();
                    isAvailable = data.available;
                }
            } else {
                // For create, standard check
                const result = await apiPost<{ available: boolean }>('/api/admin/booking-management/check-availability', {
                    property_id: propertyId,
                    check_in: checkIn,
                    check_out: checkOut,
                    guest_count: totalGuests
                });
                isAvailable = result?.available || false;
            }

            setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');

            if (!isAvailable) {
                setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                if (mode === 'create') {
                    // Create mode might stop here, but Edit might continue.
                    // Making it consistent: show error but calculate rate anyway for potential override
                }
            }

            // 2. Calculate Rate
            const rateData = await apiPost<{ success: boolean; calculation?: any; message?: string }>(
                '/api/admin/booking-management/calculate-rate',
                {
                    property_id: propertyId,
                    check_in: checkIn,
                    check_out: checkOut,
                    guest_count: totalGuests,
                }
            );

            if (rateData && rateData.success && rateData.calculation) {
                const calculation = rateData.calculation;
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
                setRateCalculationFull(calculation);
                setRateError(null);
            } else {
                setRateError(rateData?.message || 'Rate calculation failed');
            }

        } catch (error) {
            console.error('Error checking availability/rate:', error);
            setAvailabilityStatus('unavailable');
            setAvailabilityError('Error checking availability');
            setRateError('Error calculating rate');
        } finally {
            setIsCalculatingRate(false);
        }
    }, [mode, bookingNumber, totalGuests, initialData?.id]);

    // Handle date changes
    const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
        setData(data => ({ ...data, check_in_date: startDate, check_out_date: endDate }));

        // Clear previous calculations
        setRateCalculation(null);
        setRateCalculationFull(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);

        if (startDate && endDate && currentProperty) {
            // Debounce is handled in checkAvailabilityAndCalculateRate calls or simple timeout here if needed
            // But DateRange component usually handles debounced input so we can call directly?
            // Adding small delay to be safe
            setTimeout(() => {
                checkAvailabilityAndCalculateRate(currentProperty.id, startDate, endDate);
            }, 300);
        }
    }, [currentProperty, checkAvailabilityAndCalculateRate]);

    // Initial load for edit mode
    useEffect(() => {
        if (mode === 'edit' && currentProperty && data.check_in_date && data.check_out_date) {
            // If editing, we verify availability (with exclude) and calculate rate
            // But usually we trust existing booking unless dates change. 
            // Only calculate if explicitly needed? 
            // Edit.tsx does it on mount/prop change if property exists
            checkAvailabilityAndCalculateRate(currentProperty.id, data.check_in_date, data.check_out_date);
            loadPropertyData(currentProperty.id);
        }
    }, []); // Run once on mount if data available? Or depend on initialData? 
    // Actually better to not auto-trigger on mount for Edit to avoid layout shifts unless necessary, 
    // BUT we need RateCalculation for the breakdown display.

    // Trigger rate calc on guest count change
    useEffect(() => {
        if (data.check_in_date && data.check_out_date && currentProperty && totalGuests > 0) {
            // Only if not initial render? 
            // We'll trust the callback logic.
            const timer = setTimeout(() => {
                checkAvailabilityAndCalculateRate(currentProperty.id, data.check_in_date, data.check_out_date);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [totalGuests, currentProperty]);

    // Form validation
    const canSubmit = data.property_id && data.check_in_date && data.check_out_date &&
        data.guest_name.trim() && data.guest_email.trim() &&
        totalGuests > 0 && !isCalculatingRate;

    const validationMessages = useMemo(() => {
        const messages: string[] = [];
        if (!data.property_id) messages.push('Property harus dipilih');
        if (!data.check_in_date) messages.push('Check-in date harus diisi');
        if (!data.check_out_date) messages.push('Check-out date harus diisi');
        if (!data.guest_name.trim()) messages.push('Nama tamu utama harus diisi');
        // ... more validations
        return messages;
    }, [data, totalGuests]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        // Prepare submission data
        const formData: any = {
            ...data,
            guest_count: totalGuests,
            booking_status: data.booking_status,
            payment_status: data.payment_status,
            services: selectedServices,

            // Rate override
            rate_override: manualRateOverride,
            override_amount: manualRateOverride ? overrideAmount : null,
            override_reason: manualRateOverride ? overrideReason : null,
        };

        const submitOptions = {
            preserveScroll: true,
            forceFormData: mode === 'create', // Needed for file upload in create
            onSuccess: () => {
                const targetRoute = mode === 'create'
                    ? route('admin.bookings.index')
                    : route('admin.bookings.show', bookingNumber);
                router.visit(targetRoute);
            },
            onError: (errors: any) => {
                console.error('Booking submission failed:', errors);
                // Handle errors...
                const errorMsg = errors.error || Object.values(errors)[0] || 'Submission failed';
                setSyncFeedback(Array.isArray(errorMsg) ? errorMsg[0] : String(errorMsg));

                // Handle OTA Override option
                if (errors.can_override) {
                    setSyncFeedback(null); // Clear generic error
                    // We could auto-show a dialog here, or just let the alert below handle it
                    setAvailabilityError("Tanggal dipilih diblokir oleh OTA (Airbnb/Booking.com).");
                    setAvailabilityStatus('unavailable');
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        if (mode === 'create') {
            // Append payment proof if exists
            formData.payment_proof = paymentProof;
            // Add payment fields if form visible
            if (showPaymentForm) {
                // Ensure payment fields are present
            }
            router.post(route('admin.bookings.store'), formData, submitOptions);
        } else {
            // Edit mode (Patch)
            router.patch(route('admin.bookings.update', bookingNumber), formData, submitOptions);
        }
    };

    return (
        <div className="space-y-6">
            {/* Main content same as before, simplified for brevity in this tool call, 
                 but will contain the full UI structure */}

            {/* Header/Title would be passed in or handled by parent layout, 
                this component handles the Form content */}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {mode === 'create' ? <UserPlus className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                        Informasi Booking
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {syncFeedback && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{syncFeedback}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Property Selection */}
                        <PropertySelector
                            properties={properties}
                            selectedPropertyId={data.property_id}
                            onPropertyChange={handlePropertyChange}
                            currentProperty={currentProperty}
                            error={errors.property_id}
                        />

                        {/* Date Selection */}
                        <div>
                            <Label>Tanggal Check-in & Check-out *</Label>
                            <DateRange
                                startDate={data.check_in_date}
                                endDate={data.check_out_date}
                                onDateChange={handleDateRangeChange}
                                bookedDates={availabilityData?.booked_dates || []}
                                loading={isCalculatingRate || isLoadingAvailability}
                                error={rateError}
                                showNights={true}
                                adminMode={true}
                            />
                            {/* Availability Alerts */}
                            {availabilityStatus && (
                                <div className="mt-2">
                                    {availabilityStatus === 'checking' && (
                                        <Alert><Loader2 className="animate-spin h-4 w-4" /><AlertDescription>Checking...</AlertDescription></Alert>
                                    )}
                                    {availabilityStatus === 'available' && (
                                        <Alert className="bg-green-50 border-green-200 text-green-800"><CheckCircle className="h-4 w-4" /><AlertDescription>Available</AlertDescription></Alert>
                                    )}
                                    {availabilityStatus === 'unavailable' && (
                                        <div className="space-y-2">
                                            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{availabilityError || 'Unavailable'}</AlertDescription></Alert>

                                            {/* OTA Override Option */}
                                            {(errors.can_override || (availabilityError && availabilityError.includes('OTA')) || (availabilityStatus === 'unavailable' && errors.error && errors.error.includes('OTA'))) && (
                                                <div className="flex items-center space-x-2 p-3 border border-amber-200 bg-amber-50 rounded-md">
                                                    <input
                                                        type="checkbox"
                                                        id="force_ota_override"
                                                        className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                                        checked={data.force_ota_override}
                                                        onChange={(e) => setData('force_ota_override', e.target.checked)}
                                                    />
                                                    <label htmlFor="force_ota_override" className="text-sm font-medium text-amber-800 cursor-pointer">
                                                        Paksa Booking (Timpa Booking OTA)
                                                        <span className="block text-xs font-normal text-amber-700">booking OTA akan diabaikan (double booking). Pastikan Anda sudah membatalkan booking di OTA terkait.</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
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
                                onGuestCountChange={(type, count) => {
                                    const field = type === 'children' ? 'guest_children' : type === 'male' ? 'guest_male' : 'guest_female';
                                    setData(field, count);
                                }}
                            />
                        )}

                        <Separator />

                        {/* Guest Info Fields */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="guest_name">Nama Lengkap *</Label>
                                <Input id="guest_name" value={data.guest_name} onChange={e => setData('guest_name', e.target.value)} />
                                {errors.guest_name && <p className="text-red-500 text-sm">{errors.guest_name}</p>}
                            </div>
                            <div>
                                <Label htmlFor="guest_email">Email *</Label>
                                <Input id="guest_email" type="email" value={data.guest_email} onChange={e => setData('guest_email', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="guest_phone">Phone *</Label>
                                <Input id="guest_phone" type="tel" value={data.guest_phone} onChange={e => setData('guest_phone', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="guest_country">Country *</Label>
                                <Select value={data.guest_country} onValueChange={v => setData('guest_country', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Indonesia">Indonesia</SelectItem>
                                        <SelectItem value="Malaysia">Malaysia</SelectItem>
                                        <SelectItem value="Singapore">Singapore</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="guest_id_number">Nomor ID/KTP</Label>
                                <Input id="guest_id_number" value={data.guest_id_number} onChange={e => setData('guest_id_number', e.target.value)} placeholder="Nomor KTP/Passport" />
                            </div>
                            <div>
                                <Label htmlFor="guest_gender">Jenis Kelamin *</Label>
                                <Select value={data.guest_gender} onValueChange={v => setData('guest_gender', v)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Laki-laki</SelectItem>
                                        <SelectItem value="female">Perempuan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="relationship_type">Tipe Hubungan</Label>
                                <Select value={data.relationship_type} onValueChange={v => setData('relationship_type', v)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih tipe hubungan" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="keluarga">Keluarga</SelectItem>
                                        <SelectItem value="teman">Teman</SelectItem>
                                        <SelectItem value="kolega">Kolega</SelectItem>
                                        <SelectItem value="pasangan">Pasangan</SelectItem>
                                        <SelectItem value="campuran">Campuran</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="special_requests">Permintaan Khusus</Label>
                                <Textarea
                                    id="special_requests"
                                    value={data.special_requests}
                                    onChange={e => setData('special_requests', e.target.value)}
                                    placeholder="Permintaan khusus dari tamu..."
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="internal_notes">Catatan Internal</Label>
                                <Textarea
                                    id="internal_notes"
                                    value={data.internal_notes}
                                    onChange={e => setData('internal_notes', e.target.value)}
                                    placeholder="Catatan internal (tidak terlihat oleh tamu)..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Booking Status & Payment */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="booking_status">Status Booking *</Label>
                                <Select value={data.booking_status} onValueChange={v => setData('booking_status', v as BookingStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending_verification">Menunggu Verifikasi</SelectItem>
                                        <SelectItem value="confirmed">Terkonfirmasi</SelectItem>
                                        <SelectItem value="checked_in">Checked In</SelectItem>
                                        <SelectItem value="checked_out">Checked Out</SelectItem>
                                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="payment_status">Status Pembayaran *</Label>
                                <Select
                                    value={data.payment_status}
                                    onValueChange={(v) => {
                                        // 1. Tentukan persentase otomatis berdasarkan status
                                        let autoPercentage = data.dp_percentage; // default nilai saat ini

                                        if (v === 'fully_paid') {
                                            autoPercentage = 100;
                                        } else if (v === 'dp_pending' || v === 'dp_received') {
                                            // Opsional: Jika status DP, paksa ke 50 jika sebelumnya 100 atau 0
                                            if (data.dp_percentage === 100 || data.dp_percentage === 0) {
                                                autoPercentage = 50;
                                            }
                                        }

                                        // 2. Update sekaligus status dan persentasenya
                                        setData({
                                            ...data,
                                            payment_status: v as PaymentStatus,
                                            dp_percentage: autoPercentage
                                        });
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dp_pending">DP Pending</SelectItem>
                                        <SelectItem value="dp_received">DP Diterima</SelectItem>
                                        <SelectItem value="fully_paid">Lunas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="dp_percentage">Persentase DP (%)</Label>
                                <Select
                                    value={data.dp_percentage?.toString()}
                                    onValueChange={(v) => {
                                        const newPercent = Number(v);
                                        let newStatus = data.payment_status;

                                        // Logika sebaliknya: Jika user pilih 100%, status otomatis Lunas
                                        if (newPercent === 100) {
                                            newStatus = 'fully_paid';
                                        } else if (newPercent < 100 && newStatus === 'fully_paid') {
                                            newStatus = 'dp_received'; // Turunkan status jika persen dikurangi
                                        }

                                        setData({
                                            ...data,
                                            dp_percentage: newPercent,
                                            payment_status: newStatus
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Persentase" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["0", "50", "100"].map((percent) => (
                                            <SelectItem key={percent} value={percent}>
                                                {percent}%
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="source">Sumber Booking</Label>
                                <Select value={data.source} onValueChange={v => setData('source', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="direct">Direct</SelectItem>
                                        <SelectItem value="phone">Telepon</SelectItem>
                                        <SelectItem value="walk_in">Walk-in</SelectItem>
                                        <SelectItem value="ota">OTA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="check_in_time">Waktu Check-in</Label>
                                <Input
                                    id="check_in_time"
                                    type="time"
                                    value={data.check_in_time}
                                    onChange={e => setData('check_in_time', e.target.value)}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Payment Form - Show when status is confirmed and not DP pending */}
                        {mode === 'create' && showPaymentForm && (
                            <Card className="bg-blue-50 border-blue-200">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Informasi Pembayaran
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="payment_method_id">Metode Pembayaran *</Label>
                                            <Select
                                                value={paymentData.payment_method_id}
                                                onValueChange={v => setPaymentData({ ...paymentData, payment_method_id: v })}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Pilih metode pembayaran" /></SelectTrigger>
                                                <SelectContent>
                                                    {paymentMethods.map(method => (
                                                        <SelectItem key={method.id} value={method.id.toString()}>
                                                            {method.name} {method.bank_name ? `- ${method.bank_name}` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="payment_amount">Jumlah Pembayaran *</Label>
                                            <Input
                                                id="payment_amount"
                                                type="number"
                                                step={1000}
                                                value={paymentData.amount}
                                                onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                                                placeholder="Jumlah pembayaran"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Total: {formatCurrency(totalBookingAmount)}
                                            </p>
                                        </div>
                                        <div>
                                            <Label htmlFor="payment_date">Tanggal Pembayaran</Label>
                                            <Input
                                                id="payment_date"
                                                type="date"
                                                value={paymentData.payment_date}
                                                onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="reference_number">Nomor Referensi</Label>
                                            <Input
                                                id="reference_number"
                                                value={paymentData.reference_number}
                                                onChange={e => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                                                placeholder="Nomor referensi transfer"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="payment_proof">Bukti Pembayaran</Label>
                                            <Input
                                                id="payment_proof"
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setPaymentProof(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="payment_status_select">Status Verifikasi</Label>
                                            <Select
                                                value={paymentData.payment_status}
                                                onValueChange={v => setPaymentData({ ...paymentData, payment_status: v as 'pending' | 'verified' })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="verified">Verified</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="verification_notes">Catatan Verifikasi</Label>
                                        <Textarea
                                            id="verification_notes"
                                            value={paymentData.verification_notes}
                                            onChange={e => setPaymentData({ ...paymentData, verification_notes: e.target.value })}
                                            placeholder="Catatan untuk verifikasi pembayaran..."
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Separator />


                        {/* Extra Services */}
                        <ExtraServiceSelector
                            services={serviceMasters}
                            selectedServices={selectedServices}
                            onServicesChange={setSelectedServices}
                            nights={rateCalculation?.nights || 1}
                        />

                        {/* Rate Breakdown (if calculated) */}
                        {rateCalculationFull && (
                            <RateBreakdownCard
                                rateCalculation={rateCalculationFull}
                                checkIn={data.check_in_date}
                                checkOut={data.check_out_date}
                            />
                        )}

                        <div className="flex justify-end gap-4 mt-8">
                            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                            <Button type="submit" disabled={processing || !canSubmit}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === 'create' ? 'Create Booking' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
