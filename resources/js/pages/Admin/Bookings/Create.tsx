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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from '@/components/ui/date-range';
import {
    CalendarDays,
    Users,
    DollarSign,
    CheckCircle,
    AlertCircle,
    Building2,
    Phone,
    Mail,
    Globe,
    IdCard,
    User,
    UserPlus,
    Bed,
    Clock,
    Calculator,
    RefreshCw,
    Info,
    Sparkles,
    Tag,
    Percent,
    ArrowLeft,
    CreditCard,
    Shield,
    Calendar,
    TrendingUp,
    Zap,
    Loader2,
    Plus,
    X,
    Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type BreadcrumbItem } from '@/types';
import AdminLayout from '@/layouts/admin-layout';
import ExtraServiceSelector, { type ServiceMaster as ExtraServiceMaster, type SelectedService } from '@/components/ExtraServiceSelector';
import GuestCountForm from '@/components/booking/GuestCountForm';
import { bookingsService } from '@/lib/api';
import RateBreakdownCard from '@/components/booking/RateBreakdownCard';

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
    amenities?: any[];
    media?: any[];
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
    property: {
        id: number;
        name: string;
        base_rate: number;
        capacity: number;
        capacity_max: number;
        cleaning_fee: number;
        extra_bed_rate: number;
        weekend_premium_percent: number;
    };
    date_range: {
        start: string;
        end: string;
    };
    booked_dates: string[];
    availability_data?: {
        rates: Record<string, any>;
    };
    seasonal_rates?: Record<string, any>;
    availability?: {
        available: boolean;
        booked_dates: string[];
        booked_periods: string[][];
    };
    rate_calculation?: any;
}

interface PaymentMethod {
    id: number;
    name: string;
    type: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
}

interface ServiceMaster {
    id: number;
    name: string;
    description?: string;
    service_type: string;
    service_type_label: string;
    unit_price: number;
    thumbnail_url?: string;
    is_active: boolean;
}

// SelectedService is imported from ExtraServiceSelector component

interface CreateBookingProps {
    properties: Property[];
    selectedProperty?: Property | null;
    prefilledData?: {
        property_id?: string;
        check_in_date?: string;
        check_out_date?: string;
    };
    availabilityData?: AvailabilityData;
    paymentMethods: PaymentMethod[];
    serviceMasters?: ServiceMaster[];
}

export default function CreateBooking({ properties, selectedProperty, prefilledData, availabilityData: initialAvailabilityData, paymentMethods, serviceMasters = [] }: CreateBookingProps) {
    const { t } = useTranslation();

    // State management
    const [currentProperty, setCurrentProperty] = useState<Property | null>(selectedProperty || null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [rateCalculationFull, setRateCalculationFull] = useState<any | null>(null); // Full rate calculation with daily_breakdown
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);
    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
    const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(initialAvailabilityData || null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

    // Payment form state
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

    // Rate override state
    const [manualRateOverride, setManualRateOverride] = useState(false);
    const [overrideAmount, setOverrideAmount] = useState(0);
    const [overrideReason, setOverrideReason] = useState('');

    // Extra services state
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

    // Payment proof file state
    const [paymentProof, setPaymentProof] = useState<File | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        property_id: prefilledData?.property_id || '',
        check_in_date: prefilledData?.check_in_date || '',
        check_out_date: prefilledData?.check_out_date || '',
        guest_male: 1,
        guest_female: 1,
        guest_children: 0,
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guest_country: 'Indonesia',
        guest_id_number: '',
        guest_gender: 'male' as 'male' | 'female',
        relationship_type: 'keluarga' as 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran',
        special_requests: '',
        internal_notes: '',
        booking_status: 'confirmed' as 'pending_verification' | 'confirmed',
        payment_status: 'fully_paid' as 'dp_pending' | 'dp_received' | 'fully_paid',
        dp_percentage: 100,
        auto_confirm: true,
        check_in_time: '15:00',
        source: 'direct' as 'direct' | 'phone' | 'walk_in' | 'ota',
        // Payment fields - add to form state
        payment_method_id: null as string | null,
        payment_amount: null as number | null,
        payment_date: null as string | null,
        reference_number: null as string | null,
        bank_name: null as string | null,
        account_number: null as string | null,
        account_name: null as string | null,
        payment_status_payment: 'verified' as 'pending' | 'verified' | null,
        verification_notes: null as string | null,
    });

    // Calculate total guests
    const totalGuests = useMemo(() => {
        if (!currentProperty) return 0;
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;
        let effectiveGuests = male + female + children;
        if (currentProperty.capacity < currentProperty.capacity_max) {
            effectiveGuests = male + female + Math.floor(children / 2);
        };
        return effectiveGuests;
    }, [currentProperty, data.guest_male, data.guest_female, data.guest_children]);

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

        // Load property date range data and availability
        if (property) {
            loadPropertyDateRange(property.id);
            //loadPropertyAvailabilityAndRatesAdmin(property.id);

            // Update capacity if needed
            if (totalGuests > property.capacity_max) {
                setData('guest_male', Math.floor(property.capacity_max / 2));
                setData('guest_female', Math.floor(property.capacity_max / 2));
                setData('guest_children', property.capacity_max % 2);
            }
        }
    };

    // Load property availability and rates data (same as customer booking show page)
    const loadPropertyAvailabilityAndRatesAdmin = async (propertyId: number) => {
        try {
            // Start date = 2 bulan yang telah berlalu
            const start = new Date();
            start.setMonth(start.getMonth() - 2);
            const startDate = start.toISOString().split('T')[0];

            // End date = 90 hari dari sekarang
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Use ADMIN endpoint with property_id
            const data = await bookingsService.getPropertyDateRange(propertyId, startDate, endDate);

            if (data && (data.success || data.data)) {
                const responseData = data.data || data;
                if (responseData.success || responseData) {
                    // Update availability data with comprehensive data from customer API
                    setAvailabilityData({
                        success: true,
                        property: {
                            id: data.property?.id || propertyId,
                            name: data.property?.name || '',
                            base_rate: data.property?.base_rate || 0,
                            capacity: data.property?.capacity || 0,
                            capacity_max: data.property?.capacity_max || 0,
                            cleaning_fee: data.property?.cleaning_fee || 0,
                            extra_bed_rate: data.property?.extra_bed_rate || 0,
                            weekend_premium_percent: data.property?.weekend_premium_percent || 0,
                        },
                        date_range: {
                            start: startDate,
                            end: endDate,
                        },
                        booked_dates: data.booked_dates || [],
                        availability_data: { rates: data.calculation || {} },
                        seasonal_rates: {},
                        availability: data.availability || {},
                        rate_calculation: { success: true, calculation: data.calculation, formatted: data.formatted },
                    });
                    setAvailabilityError(null);
                } else {
                    setAvailabilityError(data.error || 'Failed to load availability and rates data');
                }
            } else {
                setAvailabilityError('Failed to load availability and rates data');
            }
        } catch (error) {
            console.error('Error loading property availability and rates:', error);
            setAvailabilityError('Network error loading availability and rates data');
        }
    };

    // Load property date range data with better error handling
    const loadPropertyDateRange = async (propertyId: number) => {
        setIsLoadingAvailability(true);
        try {
            // Start date = 2 bulan yang telah berlalu
            const start = new Date();
            start.setMonth(start.getMonth() - 2);
            const startDate = start.toISOString().split('T')[0];

            // End date = 90 hari dari sekarang
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

            // Use bookingsService instead of direct fetch
            const data = await bookingsService.getPropertyDateRange(propertyId, startDate, endDate);

            if (data && (data.success || data.data)) {
                const responseData = data.data || data;
                if (responseData.success || responseData) {
                    setAvailabilityData(responseData);
                    setAvailabilityError(null);
                } else {
                    setAvailabilityError(responseData.error || 'Failed to load availability data');
                }
            } else {
                setAvailabilityError('Failed to load availability data');
            }
        } catch (error) {
            console.error('Error loading property date range:', error);
            setAvailabilityError('Network error loading availability data');
        } finally {
            setIsLoadingAvailability(false);
        }
    };

    // Check availability for selected dates with improved UX
    const checkAvailability = useCallback(async (propertyId: number, checkIn: string, checkOut: string) => {
        if (!checkIn || !checkOut) return;

        setAvailabilityStatus('checking');
        setAvailabilityError(null);

        try {
            // Use bookingsService instead of direct fetch
            // This fixes the double prefix issue as the service handles the URL
            const result = await bookingsService.checkAvailability({
                property_id: propertyId,
                check_in: checkIn,
                check_out: checkOut,
                guest_count: totalGuests
            });

            if (result) {
                // Use the result from backend - it already checks overlap correctly
                setAvailabilityStatus(result.available ? 'available' : 'unavailable');
                if (!result.available) {
                    setAvailabilityError(result.message || 'Property tidak tersedia untuk tanggal yang dipilih');
                    // Log for debugging
                    console.log('Availability check result:', {
                        property_id: propertyId,
                        check_in: checkIn,
                        check_out: checkOut,
                        available: result.available,
                        conflicts: result.conflicts || [],
                    });
                }
            } else {
                setAvailabilityStatus('unavailable');
                setAvailabilityError('Error checking availability');
            }
        } catch (error) {
            setAvailabilityStatus('unavailable');
            setAvailabilityError('Error checking availability');
        }
    }, [totalGuests]);

    // Calculate rate from backend data with improved error handling
    const calculateRateFromBackendData = useCallback(async (checkIn: string, checkOut: string) => {
        if (!currentProperty || !checkIn || !checkOut) {
            throw new Error('Property and dates are required');
        }

        try {
            // Use API helper with CSRF token handling
            let effectiveGuestCount = totalGuests;
            if (currentProperty.capacity < currentProperty.capacity_max) {
                effectiveGuestCount = totalGuests - Number(data.guest_children) + Math.floor(Number(data.guest_children) / 2);
            }

            const result = await bookingsService.calculateRate({
                property_id: currentProperty.id,
                check_in: checkIn,
                check_out: checkOut,
                guest_count: effectiveGuestCount,
            });
            console.log('Rate calculation response (calculateRateFromBackendData):', result);

            if (!result.success || !result.calculation) {
                throw new Error(result.error || result.message || 'Rate calculation failed - calculation data not found');
            }

            const calculation = result.calculation;
            console.log('Rate calculation data:', calculation);

            return {
                nights: calculation.nights || 0,
                base_amount: calculation.base_amount || 0,
                weekend_premium: calculation.weekend_premium || 0,
                seasonal_premium: calculation.seasonal_premium || 0,
                extra_bed_amount: calculation.extra_bed_amount || 0,
                cleaning_fee: calculation.cleaning_fee || 0,
                tax_amount: calculation.tax_amount || 0,
                total_amount: calculation.total_amount || 0,
                extra_beds: calculation.extra_beds || 0,
                formatted: {
                    total_amount: 'Rp ' + (calculation.total_amount || 0).toLocaleString('id-ID'),
                    per_night: 'Rp ' + Math.round((calculation.total_amount || 0) / (calculation.nights || 1)).toLocaleString('id-ID')
                }
            };
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to calculate rate');
        }
    }, [currentProperty, totalGuests]);

    // Handle date range change with improved UX
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
            setIsCalculatingRate(true);

            // Use the same API pattern as customer booking show page
            const checkAvailabilityAndRate = async () => {
                try {
                    // Check availability using ADMIN API
                    const availabilityData = await bookingsService.getAvailabilityAndRates({
                        property_id: currentProperty.id,
                        check_in: startDate,
                        check_out: endDate,
                        guest_count: totalGuests,
                    });

                    if (availabilityData && availabilityData.success) {
                        // Use the availability result from backend - it already checks overlap correctly
                        // Backend returns 'available' field that indicates if dates are available
                        const isAvailable = availabilityData.availability?.available ??
                            (availabilityData.booked_dates?.length === 0 && availabilityData.booked_periods?.length === 0);

                        setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');

                        if (!isAvailable) {
                            setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                            setIsCalculatingRate(false);
                            return;
                        }

                        // Calculate rate using ADMIN API
                        const rateData = await bookingsService.calculateRate({
                            property_id: currentProperty.id,
                            check_in: startDate,
                            check_out: endDate,
                            guest_count: totalGuests,
                        });

                        if (rateData && rateData.success && rateData.calculation) {
                            const calculation = rateData.calculation;
                            console.log('Setting rate calculation:', calculation);

                            setRateCalculation({
                                nights: calculation.nights || 0,
                                base_amount: calculation.base_amount || 0,
                                weekend_premium: calculation.weekend_premium || 0,
                                seasonal_premium: calculation.seasonal_premium || 0,
                                extra_bed_amount: calculation.extra_bed_amount || 0,
                                cleaning_fee: calculation.cleaning_fee || 0,
                                tax_amount: calculation.tax_amount || 0,
                                total_amount: calculation.total_amount || 0,
                                extra_beds: calculation.extra_beds || 0,
                                formatted: {
                                    total_amount: 'Rp ' + (calculation.total_amount || 0).toLocaleString('id-ID'),
                                    per_night: 'Rp ' + Math.round((calculation.total_amount || 0) / (calculation.nights || 1)).toLocaleString('id-ID')
                                }
                            });
                            // Store full calculation with daily_breakdown
                            setRateCalculationFull(rateData.calculation || rateData);
                            setRateError(null);
                        } else {
                            const errorMsg = rateData?.error || rateData?.message || 'Rate calculation failed - calculation data not found';
                            console.error('Rate calculation failed:', errorMsg, rateData);
                            setRateError(errorMsg);
                            setRateCalculation(null);
                            setRateCalculationFull(null);
                        }
                    } else {
                        const errorMsg = availabilityData?.error || availabilityData?.message || 'Failed to check availability';
                        console.error('Availability check failed:', errorMsg, availabilityData);
                        setAvailabilityError(errorMsg);
                        setRateCalculation(null);
                        setRateCalculationFull(null);
                    }
                } catch (error: any) {
                    console.error('Error in checkAvailabilityAndRate:', error);
                    setRateCalculation(null);
                    setRateCalculationFull(null);

                    // Extract error message from response
                    let errorMessage = 'Error calculating rate';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else if (error?.response?.data) {
                        const errorData = error.response.data;
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } else if (error?.message) {
                        errorMessage = error.message;
                    }

                    setRateError(errorMessage);
                    setAvailabilityError(errorMessage);
                } finally {
                    setIsCalculatingRate(false);
                }
            };

            // Execute with delay for better UX
            setTimeout(checkAvailabilityAndRate, 300);
        }
    }, [currentProperty, setData, totalGuests]);

    // Handle guest count changes with real-time recalculation
    const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
        const countField = genderType === 'children' ? 'guest_children' :
            genderType === 'male' ? 'guest_male' : 'guest_female';

        setData(countField, newCount);

        // Recalculate rate when guest count changes with debounce
        if (data.check_in_date && data.check_out_date && currentProperty && totalGuests > 0) {
            setIsCalculatingRate(true);
            setTimeout(async () => {
                try {
                    // Use ADMIN API for rate calculation with NEW guest count
                    const rateData = await bookingsService.calculateRate({
                        property_id: currentProperty.id,
                        check_in: data.check_in_date,
                        check_out: data.check_out_date,
                        guest_count: totalGuests,
                    });

                    if (rateData) {
                        console.log('Rate calculation response (guest change):', rateData);

                        if (rateData.success && rateData.calculation) {
                            const calculation = rateData.calculation;
                            console.log('Setting rate calculation (guest change):', calculation);

                            setRateCalculation({
                                nights: calculation.nights || 0,
                                base_amount: calculation.base_amount || 0,
                                weekend_premium: calculation.weekend_premium || 0,
                                seasonal_premium: calculation.seasonal_premium || 0,
                                extra_bed_amount: calculation.extra_bed_amount || 0,
                                cleaning_fee: calculation.cleaning_fee || 0,
                                tax_amount: calculation.tax_amount || 0,
                                total_amount: calculation.total_amount || 0,
                                extra_beds: calculation.extra_beds || 0,
                                formatted: {
                                    total_amount: 'Rp ' + (calculation.total_amount || 0).toLocaleString('id-ID'),
                                    per_night: 'Rp ' + Math.round((calculation.total_amount || 0) / (calculation.nights || 1)).toLocaleString('id-ID')
                                }
                            });
                            // Store full calculation with daily_breakdown
                            setRateCalculationFull(rateData.calculation || rateData);
                            setRateError(null);
                        } else {
                            const errorMsg = rateData.error || rateData.message || 'Rate calculation failed - calculation data not found';
                            console.error('Rate calculation failed (guest change):', errorMsg, rateData);
                            setRateError(errorMsg);
                            setRateCalculation(null);
                            setRateCalculationFull(null);
                        }
                    }
                } catch (error: any) {
                    console.error('Error calculating rate on guest count change:', error);
                    setRateCalculation(null);
                    setRateCalculationFull(null);

                    // Extract error message
                    let errorMessage = 'Error calculating rate';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else if (error?.response?.data) {
                        const errorData = error.response.data;
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } else if (error?.message) {
                        errorMessage = error.message;
                    }

                    setRateError(errorMessage);
                } finally {
                    setIsCalculatingRate(false);
                }
            }, 300);
        }
    };

    // Load initial availability data if selectedProperty exists
    useEffect(() => {
        if (selectedProperty && !availabilityData) {
            loadPropertyAvailabilityAndRatesAdmin(selectedProperty.id);
        }
    }, [selectedProperty]);

    // Calculate services total
    const servicesTotal = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.total_price, 0);
    }, [selectedServices]);

    // Calculate total booking amount (base + services)
    const totalBookingAmount = useMemo(() => {
        return (rateCalculation?.total_amount || 0) + servicesTotal;
    }, [rateCalculation, servicesTotal]);

    // Auto show/hide payment form based on booking status
    useEffect(() => {
        if (data.booking_status === 'confirmed' && data.payment_status !== 'dp_pending') {
            setShowPaymentForm(true);
            // Auto-calculate payment amount based on dp_percentage or total amount
            if (totalBookingAmount > 0 && (!paymentData.amount || paymentData.amount === 0)) {
                let calculatedAmount = 0;
                if (data.payment_status === 'fully_paid') {
                    calculatedAmount = totalBookingAmount;
                } else {
                    calculatedAmount = (totalBookingAmount * data.dp_percentage) / 100;
                }
                setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
                // Also update form state
                setData('payment_amount' as any, calculatedAmount);
            }
        } else {
            setShowPaymentForm(false);
        }
    }, [data.booking_status, data.payment_status, data.dp_percentage, totalBookingAmount]);

    // Sync paymentData to form state when paymentData changes - real-time sync
    useEffect(() => {
        if (showPaymentForm || (data.booking_status === 'confirmed' && data.payment_status !== 'dp_pending')) {
            // Sync all payment data to form state in real-time
            if (paymentData.payment_method_id) {
                setData('payment_method_id' as any, paymentData.payment_method_id);
            }
            if (paymentData.amount !== undefined && paymentData.amount !== null) {
                setData('payment_amount' as any, paymentData.amount);
            }
            if (paymentData.payment_date) {
                setData('payment_date' as any, paymentData.payment_date);
            }
            if (paymentData.reference_number !== undefined) {
                setData('reference_number' as any, paymentData.reference_number);
            }
            if (paymentData.bank_name !== undefined) {
                setData('bank_name' as any, paymentData.bank_name);
            }
            if (paymentData.account_number !== undefined) {
                setData('account_number' as any, paymentData.account_number);
            }
            if (paymentData.account_name !== undefined) {
                setData('account_name' as any, paymentData.account_name);
            }
            if (paymentData.verification_notes !== undefined) {
                setData('verification_notes' as any, paymentData.verification_notes);
            }
            if (paymentData.payment_status) {
                setData('payment_status_payment' as any, paymentData.payment_status);
            }
        }
    }, [
        paymentData.payment_method_id,
        paymentData.amount,
        paymentData.payment_date,
        paymentData.reference_number,
        paymentData.bank_name,
        paymentData.account_number,
        paymentData.account_name,
        paymentData.verification_notes,
        paymentData.payment_status,
        showPaymentForm,
        data.booking_status,
        data.payment_status
    ]);

    // Update payment amount when rate calculation or services change
    useEffect(() => {
        if (totalBookingAmount > 0 && showPaymentForm && data.dp_percentage) {
            const calculatedAmount = (totalBookingAmount * data.dp_percentage) / 100;
            setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
        }
    }, [totalBookingAmount, showPaymentForm, data.dp_percentage]);

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
        { title: 'Create Booking' },
    ];

    // Enhanced validation with better feedback
    // ✅ FIX: More flexible validation for admin - allow submit even if availability/rate check fails
    // Admin should be able to create booking manually even with warnings
    const canSubmit = data.property_id &&
        data.check_in_date &&
        data.check_out_date &&
        data.guest_name.trim() &&
        data.guest_email.trim() &&
        data.guest_phone.trim() &&
        data.guest_country &&
        totalGuests > 0 &&
        // Allow submit even if availabilityStatus is null or unavailable (admin can override)
        // Allow submit even if rateCalculation is null (will be calculated on backend)
        (!availabilityStatus || availabilityStatus === 'available' || availabilityStatus === 'unavailable') &&
        !isCalculatingRate; // Only block if currently calculating

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

        // Rate override validation
        if (manualRateOverride) {
            if (!overrideAmount || overrideAmount <= 0) messages.push('Override amount harus diisi dan lebih dari 0');
            if (!overrideReason || overrideReason.trim().length < 10) messages.push('Override reason harus diisi minimal 10 karakter');
        }

        // ✅ FIX: Show warnings instead of blocking for availability/rate issues
        // Admin can still submit, but will see warnings
        if (availabilityStatus === 'unavailable') {
            messages.push('⚠️ Warning: Property mungkin tidak tersedia untuk tanggal yang dipilih');
        }
        if (!rateCalculation && !isCalculatingRate && data.check_in_date && data.check_out_date) {
            messages.push('⚠️ Warning: Rate calculation belum tersedia, akan dihitung di backend');
        }

        // Info: availability/rate akan dicek ulang di backend. Submit tetap diizinkan.

        return messages;
    }, [data, totalGuests, rateCalculation, availabilityStatus, manualRateOverride, overrideAmount, overrideReason]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!canSubmit) {
            return;
        }

        // Check if payment is required
        const isPaymentRequired = data.booking_status === 'confirmed' && data.payment_status !== 'dp_pending';

        // Frontend validation: Check if payment data is required but missing
        if (isPaymentRequired) {
            if (!paymentData.payment_method_id || paymentData.payment_method_id === '') {
                setSyncFeedback('Please select a payment method');
                if (!showPaymentForm) {
                    setShowPaymentForm(true);
                }
                return;
            }
            if (!paymentData.amount || paymentData.amount <= 0) {
                setSyncFeedback('Please enter a valid payment amount');
                if (!showPaymentForm) {
                    setShowPaymentForm(true);
                }
                return;
            }
            // Check payment proof
            if ((data.payment_status === 'dp_received' || data.payment_status === 'fully_paid') && !paymentProof) {
                setSyncFeedback('Payment proof is required for DP or Fully Paid status');
                if (!showPaymentForm) {
                    setShowPaymentForm(true);
                }
                return;
            }
        }

        // Prepare payment data - ensure it's always included if payment is required
        let paymentFormData: Record<string, any> = {};
        if (showPaymentForm || isPaymentRequired) {
            // Ensure payment_method_id is string, not empty - get directly from paymentData
            const paymentMethodId = paymentData.payment_method_id && paymentData.payment_method_id !== ''
                ? String(paymentData.payment_method_id)
                : null;
            // Ensure payment_amount is number and > 0 - get directly from paymentData
            const paymentAmount = paymentData.amount && paymentData.amount > 0
                ? Number(paymentData.amount)
                : null;

            paymentFormData = {
                payment_method_id: paymentMethodId,
                payment_amount: paymentAmount,
                payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
                reference_number: paymentData.reference_number || null,
                bank_name: paymentData.bank_name || null,
                account_number: paymentData.account_number || null,
                account_name: paymentData.account_name || null,
                payment_status_payment: paymentData.payment_status || 'verified',
                verification_notes: paymentData.verification_notes || null,
            };

            console.log('Payment form data prepared:', {
                paymentMethodId,
                paymentAmount,
                rawPaymentData: paymentData,
                hasPaymentMethodId: !!paymentMethodId,
                hasPaymentAmount: !!paymentAmount,
            });
        }

        // Debug: Log payment data before submission
        console.log('Payment data before submission:', {
            showPaymentForm,
            isPaymentRequired,
            paymentData,
            paymentFormData,
        });

        // Prepare ALL form data including payment - merge everything together
        const allFormData: any = {
            ...data,
            guest_count: totalGuests,
            // Ensure payment_status is not null
            payment_status: data.payment_status || 'dp_pending',
            // Payment data - ALWAYS include if payment is required
            ...paymentFormData,
            // Rate override data
            rate_override: manualRateOverride,
            override_amount: manualRateOverride ? overrideAmount : null,
            override_reason: manualRateOverride ? overrideReason : null,
            // Extra services - send empty array instead of null if no services
            services: selectedServices.length > 0 ? selectedServices : [],
            // Payment proof file
            payment_proof: paymentProof,
        };

        console.log('Final form data before submission:', {
            payment_method_id: allFormData.payment_method_id,
            payment_amount: allFormData.payment_amount,
            booking_status: allFormData.booking_status,
            payment_status: allFormData.payment_status,
            hasPaymentData: !!(allFormData.payment_method_id && allFormData.payment_amount),
            hasPaymentProof: !!allFormData.payment_proof,
        });

        // Submit form using router.post which handles FormData automatically
        router.post(route('admin.booking-management.store'), allFormData, {
            preserveScroll: true,
            forceFormData: true, // Force FormData to ensure file upload works
            onSuccess: () => {
                // Redirect to bookings list
                router.visit(route('admin.booking-management.index'));
            },
            onError: (errors: any) => {
                console.error('Booking creation failed:', errors);

                // Show all validation errors
                if (errors.error) {
                    setSyncFeedback(Array.isArray(errors.error) ? errors.error.join(', ') : errors.error);
                } else if (errors.payment_method_id || errors.payment_amount || errors.payment_proof) {
                    // Auto-show payment form if payment errors
                    if (!showPaymentForm) {
                        setShowPaymentForm(true);
                    }
                    const errorMessages = [];
                    if (errors.payment_method_id) {
                        errorMessages.push(Array.isArray(errors.payment_method_id) ? errors.payment_method_id[0] : errors.payment_method_id);
                    }
                    if (errors.payment_amount) {
                        errorMessages.push(Array.isArray(errors.payment_amount) ? errors.payment_amount[0] : errors.payment_amount);
                    }
                    if (errors.payment_proof) {
                        errorMessages.push(Array.isArray(errors.payment_proof) ? errors.payment_proof[0] : errors.payment_proof);
                    }
                    setSyncFeedback(errorMessages.join(', ') || 'Please check payment information');
                } else {
                    // Show first error if any
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        setSyncFeedback(Array.isArray(firstError) ? firstError[0] : (firstError as string));
                    }
                }
            }
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Booking Create" subtitle="Create Booking">

            <div className="pb-32 lg:pb-0">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-brand-primary">Buat Booking Baru</h1>
                    <p className="text-muted-foreground mt-1">
                        Buat booking baru untuk tamu dengan ketersediaan dan harga real-time
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Informasi Booking
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {syncFeedback && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Submission Error</AlertTitle>
                                        <AlertDescription>{syncFeedback}</AlertDescription>
                                    </Alert>
                                )}
                                {/* Validation Alert */}
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
                                        <Label htmlFor="property_id">Pilih Properti *</Label>
                                        <Select
                                            value={data.property_id}
                                            onValueChange={handlePropertyChange}
                                        >
                                            <SelectTrigger className={errors.property_id ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Pilih properti" />
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

                                    {/* Date Range with Enhanced UX */}
                                    <div>
                                        <Label>Tanggal Check-in & Check-out *</Label>
                                        <DateRange
                                            startDate={data.check_in_date}
                                            endDate={data.check_out_date}
                                            onDateChange={handleDateRangeChange}
                                            bookedDates={availabilityData?.booked_dates || []}
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

                                        {/* Enhanced Availability Status */}
                                        {availabilityStatus && (
                                            <div className="mt-2">
                                                {availabilityStatus === 'checking' && (
                                                    <Alert>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <AlertDescription>
                                                            Mengecek ketersediaan...
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {availabilityStatus === 'available' && (
                                                    <Alert className="border-green-200 bg-green-50">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <AlertDescription className="text-green-800">
                                                            Properti tersedia untuk tanggal yang dipilih
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {availabilityStatus === 'unavailable' && (
                                                    <Alert variant="destructive">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            {availabilityError || 'Properti tidak tersedia untuk tanggal yang dipilih'}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}

                                        {/* Debug Information */}
                                        {process.env.NODE_ENV === 'development' && availabilityData && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                                <div className="font-semibold">Debug Info:</div>
                                                <div>Booked Dates: {availabilityData.booked_dates?.length || 0}</div>
                                                <div>Property ID: {availabilityData.property?.id}</div>
                                                <div>Date Range: {availabilityData.date_range?.start} - {availabilityData.date_range?.end}</div>
                                            </div>
                                        )}

                                        {/* Loading State for Availability */}
                                        {isLoadingAvailability && (
                                            <Alert className="mt-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <AlertDescription>
                                                    Loading availability data...
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    {/* Guest Count with Real-time Updates */}
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
                                        <h3 className="text-lg font-semibold mb-4">Informasi Tamu Utama</h3>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="guest_name">Nama Lengkap *</Label>
                                                <Input
                                                    id="guest_name"
                                                    type="text"
                                                    value={data.guest_name}
                                                    onChange={(e) => setData('guest_name', e.target.value)}
                                                    className={errors.guest_name ? 'border-red-500' : ''}
                                                    placeholder="Masukkan nama lengkap"
                                                />
                                                {errors.guest_name && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_name}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_gender">Jenis Kelamin *</Label>
                                                <Select
                                                    value={data.guest_gender}
                                                    onValueChange={(value: 'male' | 'female') => setData('guest_gender', value)}
                                                >
                                                    <SelectTrigger className={errors.guest_gender ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Pilih jenis kelamin" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="male">Laki-laki</SelectItem>
                                                        <SelectItem value="female">Perempuan</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.guest_gender && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_gender}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_phone">Nomor Telepon *</Label>
                                                <Input
                                                    id="guest_phone"
                                                    type="tel"
                                                    value={data.guest_phone}
                                                    onChange={(e) => setData('guest_phone', e.target.value)}
                                                    className={errors.guest_phone ? 'border-red-500' : ''}
                                                    placeholder="+62xxx"
                                                />
                                                {errors.guest_phone && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_phone}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <Label htmlFor="guest_email">Alamat Email *</Label>
                                                <Input
                                                    id="guest_email"
                                                    type="email"
                                                    value={data.guest_email}
                                                    onChange={(e) => setData('guest_email', e.target.value)}
                                                    className={errors.guest_email ? 'border-red-500' : ''}
                                                    placeholder="tamu@contoh.com"
                                                />
                                                {errors.guest_email && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_email}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_country">Negara *</Label>
                                                <Select
                                                    value={data.guest_country}
                                                    onValueChange={(value) => setData('guest_country', value)}
                                                >
                                                    <SelectTrigger className={errors.guest_country ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Pilih negara" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Indonesia">Indonesia</SelectItem>
                                                        <SelectItem value="Malaysia">Malaysia</SelectItem>
                                                        <SelectItem value="Singapore">Singapore</SelectItem>
                                                        <SelectItem value="Other">Lainnya</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.guest_country && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_country}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <Label htmlFor="guest_id_number">Nomor Identitas (Opsional)</Label>
                                                <Input
                                                    id="guest_id_number"
                                                    type="text"
                                                    value={data.guest_id_number}
                                                    onChange={(e) => setData('guest_id_number', e.target.value)}
                                                    placeholder="Nomor KTP/Paspor"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="relationship_type">Hubungan dengan Tamu *</Label>
                                                <Select
                                                    value={data.relationship_type}
                                                    onValueChange={(value: any) => setData('relationship_type', value)}
                                                >
                                                    <SelectTrigger className={errors.relationship_type ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Pilih hubungan" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="keluarga">Keluarga</SelectItem>
                                                        <SelectItem value="teman">Teman</SelectItem>
                                                        <SelectItem value="kolega">Kolega</SelectItem>
                                                        <SelectItem value="pasangan">Pasangan</SelectItem>
                                                        <SelectItem value="campuran">Campuran</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.relationship_type && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.relationship_type}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Booking Settings */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Pengaturan Booking</h3>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="booking_status">Status Booking *</Label>
                                                <Select value={data.booking_status} onValueChange={(value: any) => setData('booking_status', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending_verification">Menunggu Verifikasi</SelectItem>
                                                        <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="payment_status">Status Pembayaran *</Label>
                                                <Select value={data.payment_status} onValueChange={(value: any) => setData('payment_status', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="dp_pending">DP Pending</SelectItem>
                                                        <SelectItem value="dp_received">DP Diterima</SelectItem>
                                                        <SelectItem value="fully_paid">Lunas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="source">Sumber Booking</Label>
                                                <Select value={data.source} onValueChange={(value: any) => setData('source', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="direct">Langsung (Direct)</SelectItem>
                                                        <SelectItem value="phone">Telepon</SelectItem>
                                                        <SelectItem value="walk_in">Walk-in</SelectItem>
                                                        <SelectItem value="ota">OTA</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <Label htmlFor="dp_percentage">Down Payment Percentage</Label>
                                                <Select value={data.dp_percentage.toString()} onValueChange={(value: any) => setData('dp_percentage', parseInt(value))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="50">50%</SelectItem>
                                                        <SelectItem value="100">100% (Full Payment)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="check_in_time">Check-in Time</Label>
                                                <Select value={data.check_in_time} onValueChange={(value: any) => setData('check_in_time', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="14:00">2:00 PM</SelectItem>
                                                        <SelectItem value="15:00">3:00 PM</SelectItem>
                                                        <SelectItem value="16:00">4:00 PM</SelectItem>
                                                        <SelectItem value="17:00">5:00 PM</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rate Override Section */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Calculator className="h-5 w-5 text-brand-primary" />
                                            <h3 className="text-lg font-semibold">Penyesuaian Tarif (Rate Adjustment)</h3>
                                        </div>

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
                                                    Penyesuaian Tarif Manual
                                                </Label>
                                            </div>

                                            {manualRateOverride && (
                                                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                    {rateCalculation && (
                                                        <div className="text-sm text-gray-600">
                                                            <div className="flex justify-between">
                                                                <span>Tarif Awal:</span>
                                                                <span className="font-medium">{formatCurrency(rateCalculation.total_amount)}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <Label htmlFor="override_amount">Jumlah Penyesuaian (Baru) *</Label>
                                                        <Input
                                                            id="override_amount"
                                                            type="number"
                                                            min="0"
                                                            value={overrideAmount}
                                                            onChange={(e) => setOverrideAmount(parseFloat(e.target.value) || 0)}
                                                            placeholder="Masukkan jumlah manual"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="override_reason">Alasan Penyesuaian *</Label>
                                                        <Textarea
                                                            id="override_reason"
                                                            value={overrideReason}
                                                            onChange={(e) => setOverrideReason(e.target.value)}
                                                            rows={2}
                                                            placeholder="Contoh: Diskon khusus, Pelanggan lama, Promo..."
                                                        />
                                                    </div>

                                                    {rateCalculation && overrideAmount > 0 && (
                                                        <div className="text-sm">
                                                            <div className="flex justify-between">
                                                                <span>Adjustment:</span>
                                                                <span className={`font-medium ${overrideAmount < rateCalculation.total_amount ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {overrideAmount < rateCalculation.total_amount ? '-' : '+'}
                                                                    {formatCurrency(Math.abs(overrideAmount - rateCalculation.total_amount))}
                                                                    ({Math.round(((overrideAmount - rateCalculation.total_amount) / rateCalculation.total_amount) * 100)}%)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Payment Form Section */}
                                    {showPaymentForm && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <CreditCard className="h-5 w-5 text-green-600" />
                                                <h3 className="text-lg font-semibold">Informasi Pembayaran</h3>
                                                <Badge variant="secondary">Wajib untuk Booking Konfirmasi</Badge>
                                            </div>

                                            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="payment_method_id">Metode Pembayaran *</Label>
                                                        <Select
                                                            value={paymentData.payment_method_id}
                                                            onValueChange={(value) => {
                                                                console.log('Payment method selected:', value);
                                                                setPaymentData(prev => ({ ...prev, payment_method_id: value }));
                                                                // Also update form state immediately
                                                                setData('payment_method_id' as any, value);
                                                            }}
                                                        >
                                                            <SelectTrigger className={'payment_method_id' in errors ? 'border-red-500' : ''}>
                                                                <SelectValue placeholder="Pilih metode pembayaran" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {paymentMethods.map((method) => (
                                                                    <SelectItem key={method.id} value={method.id.toString()}>
                                                                        {method.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {'payment_method_id' in errors && (
                                                            <p className="text-sm text-red-500 mt-1">
                                                                {Array.isArray((errors as any).payment_method_id)
                                                                    ? (errors as any).payment_method_id[0]
                                                                    : (errors as any).payment_method_id}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="payment_amount">Jumlah Pembayaran *</Label>
                                                        <Input
                                                            id="payment_amount"
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={paymentData.amount}
                                                            onChange={(e) => {
                                                                const amount = parseFloat(e.target.value) || 0;
                                                                setPaymentData(prev => ({ ...prev, amount }));
                                                                // Also update form state immediately
                                                                setData('payment_amount' as any, amount);
                                                            }}
                                                            placeholder="Masukkan jumlah pembayaran"
                                                            className={'payment_amount' in errors ? 'border-red-500' : ''}
                                                        />
                                                        {'payment_amount' in errors && (
                                                            <p className="text-sm text-red-500 mt-1">
                                                                {Array.isArray((errors as any).payment_amount)
                                                                    ? (errors as any).payment_amount[0]
                                                                    : (errors as any).payment_amount}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="payment_date">Tanggal Pembayaran *</Label>
                                                        <Input
                                                            id="payment_date"
                                                            type="date"
                                                            value={paymentData.payment_date}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="reference_number">Nomor Referensi</Label>
                                                        <Input
                                                            id="reference_number"
                                                            value={paymentData.reference_number}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                                                            placeholder="Referensi transaksi"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-3 gap-4">
                                                    <div>
                                                        <Label htmlFor="bank_name">Nama Bank</Label>
                                                        <Input
                                                            id="bank_name"
                                                            value={paymentData.bank_name}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, bank_name: e.target.value }))}
                                                            placeholder="Nama bank"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="account_number">Nomor Rekening</Label>
                                                        <Input
                                                            id="account_number"
                                                            value={paymentData.account_number}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, account_number: e.target.value }))}
                                                            placeholder="Nomor rekening"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="account_name">Atas Nama</Label>
                                                        <Input
                                                            id="account_name"
                                                            value={paymentData.account_name}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, account_name: e.target.value }))}
                                                            placeholder="Nama pemilik rekening"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label htmlFor="verification_notes">Catatan Pembayaran</Label>
                                                    <Textarea
                                                        id="verification_notes"
                                                        value={paymentData.verification_notes}
                                                        onChange={(e) => setPaymentData(prev => ({ ...prev, verification_notes: e.target.value }))}
                                                        rows={2}
                                                        placeholder="Catatan tambahan pembayaran..."
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="payment_proof">
                                                        Bukti Pembayaran {(data.payment_status === 'dp_received' || data.payment_status === 'fully_paid') && <span className="text-red-500">*</span>}
                                                    </Label>
                                                    <Input
                                                        id="payment_proof"
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.pdf"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                // Validate file size (5MB)
                                                                if (file.size > 5 * 1024 * 1024) {
                                                                    setSyncFeedback('File size must be less than 5MB');
                                                                    e.target.value = '';
                                                                    return;
                                                                }
                                                                setPaymentProof(file);
                                                            }
                                                        }}
                                                        className={'payment_proof' in errors ? 'border-red-500' : ''}
                                                    />
                                                    {paymentProof && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Selected: {paymentProof.name} ({(paymentProof.size / 1024).toFixed(2)} KB)
                                                        </p>
                                                    )}
                                                    {'payment_proof' in errors && (
                                                        <p className="text-sm text-red-500 mt-1">
                                                            {Array.isArray((errors as any).payment_proof)
                                                                ? (errors as any).payment_proof[0]
                                                                : (errors as any).payment_proof}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Accepted formats: JPG, PNG, PDF. Max size: 5MB. Images will be converted to WebP.
                                                        {(data.payment_status === 'dp_received' || data.payment_status === 'fully_paid') &&
                                                            ' (Required for DP/Fully Paid)'}
                                                    </p>
                                                </div>

                                                <div className="text-sm text-gray-600">
                                                    <div className="flex justify-between">
                                                        <span>Base Amount:</span>
                                                        <span className="font-medium">{rateCalculation ? formatCurrency(rateCalculation.total_amount) : 'Rp 0'}</span>
                                                    </div>
                                                    {selectedServices.length > 0 && (
                                                        <div className="flex justify-between">
                                                            <span>Extra Services:</span>
                                                            <span className="font-medium">
                                                                {formatCurrency(selectedServices.reduce((sum, s) => sum + s.total_price, 0))}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-semibold pt-1 border-t">
                                                        <span>Total Booking Amount:</span>
                                                        <span className="font-medium">
                                                            {formatCurrency(
                                                                (rateCalculation?.total_amount || 0) +
                                                                selectedServices.reduce((sum, s) => sum + s.total_price, 0)
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Payment Amount:</span>
                                                        <span className="font-medium">{formatCurrency(paymentData.amount)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Remaining:</span>
                                                        <span className="font-medium">
                                                            {formatCurrency(
                                                                ((rateCalculation?.total_amount || 0) +
                                                                    selectedServices.reduce((sum, s) => sum + s.total_price, 0)) -
                                                                paymentData.amount
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <Separator />

                                    {/* Extra Services */}
                                    {serviceMasters && serviceMasters.length > 0 && (
                                        <div>
                                            <ExtraServiceSelector
                                                services={serviceMasters as ExtraServiceMaster[]}
                                                selectedServices={selectedServices}
                                                onServicesChange={setSelectedServices}
                                                nights={rateCalculation?.nights || 1}
                                            />
                                        </div>
                                    )}

                                    <Separator />

                                    {/* Special Requests */}
                                    <div>
                                        <Label htmlFor="special_requests">Permintaan Khusus (Opsional)</Label>
                                        <Textarea
                                            id="special_requests"
                                            value={data.special_requests}
                                            onChange={(e) => setData('special_requests', e.target.value)}
                                            rows={3}
                                            placeholder="Permintaan khusus atau catatan..."
                                        />
                                    </div>

                                    {/* Internal Notes */}
                                    <div>
                                        <Label htmlFor="internal_notes">Catatan Internal (Opsional)</Label>
                                        <Textarea
                                            id="internal_notes"
                                            value={data.internal_notes}
                                            onChange={(e) => setData('internal_notes', e.target.value)}
                                            rows={3}
                                            placeholder="Catatan internal untuk staf..."
                                        />
                                    </div>

                                    <div className="hidden lg:flex justify-end pt-4">
                                        <Button
                                            type="submit"
                                            disabled={!canSubmit || processing}
                                            className="px-8 bg-brand-primary text-white hover:bg-brand-primary-dark"
                                        >
                                            {processing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Creating Booking...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-4 w-4 mr-2" />
                                                    Buat Booking
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Enhanced Rate Calculation Sidebar */}
                    <div className="space-y-6 min-w-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Perhitungan Tarif
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">

                                {/* Enhanced Rate Calculation Display */}
                                <div className="space-y-3">
                                    {isCalculatingRate && (
                                        <Alert>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <AlertDescription>
                                                Menghitung tarif terbaik...
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {rateError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Kesalahan Perhitungan</AlertTitle>
                                            <AlertDescription>
                                                {rateError}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {rateCalculation && (
                                        <div className="space-y-4">
                                            {/* Enhanced Main Price Display */}
                                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                                <div className="text-3xl font-bold text-brand-primary">
                                                    {formatCurrency(totalBookingAmount)}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    untuk {rateCalculation.nights} malam • {formatCurrency(Math.round(totalBookingAmount / rateCalculation.nights))}/malam
                                                </div>
                                                {servicesTotal > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Base: {rateCalculation.formatted.total_amount} • Services: {formatCurrency(servicesTotal)}
                                                    </div>
                                                )}

                                                {(rateCalculation.seasonal_premium || 0) > 0 && (
                                                    <div className="text-xs text-green-600 mt-2 flex items-center justify-center">
                                                        <Sparkles className="h-3 w-3 mr-1" />
                                                        Tarif musiman spesial diterapkan
                                                    </div>
                                                )}

                                                {(rateCalculation.weekend_premium || 0) > 0 && (
                                                    <div className="text-xs text-amber-600 mt-1 flex items-center justify-center">
                                                        <Tag className="h-3 w-3 mr-1" />
                                                        Premium akhir pekan termasuk
                                                    </div>
                                                )}
                                            </div>

                                            {/* Enhanced Rate Breakdown */}
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Tarif Dasar ({rateCalculation.nights} malam)</span>
                                                    <span>{formatCurrency(rateCalculation.base_amount)}</span>
                                                </div>

                                                {rateCalculation.weekend_premium > 0 && (
                                                    <div className="flex justify-between text-amber-600">
                                                        <span>Premium Akhir Pekan</span>
                                                        <span>+{formatCurrency(rateCalculation.weekend_premium)}</span>
                                                    </div>
                                                )}

                                                {rateCalculation.seasonal_premium > 0 && (
                                                    <div className="flex justify-between text-green-600">
                                                        <span>Premium Musiman</span>
                                                        <span>+{formatCurrency(rateCalculation.seasonal_premium)}</span>
                                                    </div>
                                                )}

                                                {rateCalculation.extra_bed_amount > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Extra Bed ({rateCalculation.extra_beds})</span>
                                                        <span>+{formatCurrency(rateCalculation.extra_bed_amount)}</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between">
                                                    <span>Biaya Kebersihan</span>
                                                    <span>{formatCurrency(rateCalculation.cleaning_fee)}</span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span>Pajak (0%)</span>
                                                    <span>{formatCurrency(rateCalculation.tax_amount)}</span>
                                                </div>

                                                {servicesTotal > 0 && (
                                                    <div className="flex justify-between text-blue-600">
                                                        <span>Layanan Tambahan</span>
                                                        <span>+{formatCurrency(servicesTotal)}</span>
                                                    </div>
                                                )}

                                                <Separator />

                                                <div className="flex justify-between font-semibold text-base">
                                                    <span>Total</span>
                                                    <span>{formatCurrency(totalBookingAmount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* No Rate Calculation State */}
                                    {!rateCalculation && !isCalculatingRate && !rateError && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Calculator className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                            <p>Pilih tanggal untuk melihat perhitungan tarif</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rate Breakdown Per Malam */}
                        {rateCalculationFull && data.check_in_date && data.check_out_date && (
                            <RateBreakdownCard
                                rateCalculation={rateCalculationFull}
                                checkIn={data.check_in_date}
                                checkOut={data.check_out_date}
                            />
                        )}

                        {/* Booking Summary Card */}
                        {currentProperty && data.check_in_date && data.check_out_date && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Info className="h-5 w-5" />
                                        Ringkasan Booking
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Properti:</span>
                                            <span className="font-medium">{currentProperty.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Check-in:</span>
                                            <span>{formatDate(data.check_in_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Check-out:</span>
                                            <span>{formatDate(data.check_out_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Malam:</span>
                                            <span>{rateCalculation?.nights || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tamu Utama:</span>
                                            <span className="font-medium">{data.guest_name || 'Belum diatur'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Status:</span>
                                            <Badge variant={data.booking_status === 'confirmed' ? 'default' : 'secondary'}>
                                                {data.booking_status === 'confirmed' ? 'Dikonfirmasi' : 'Menunggu Verifikasi'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Pembayaran:</span>
                                            <Badge variant={
                                                data.payment_status === 'fully_paid' ? 'default' :
                                                    data.payment_status === 'dp_received' ? 'secondary' : 'destructive'
                                            }>
                                                {data.payment_status === 'fully_paid' ? 'Lunas' :
                                                    data.payment_status === 'dp_received' ? 'DP Diterima' : 'DP Pending'}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>


            {/* Mobile Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 lg:hidden safe-area-bottom">
                <div className="flex items-center justify-between p-4 gap-4 max-w-7xl mx-auto">
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Estimasi Total</span>
                        <span className="text-lg font-bold text-brand-primary truncate">
                            {formatCurrency(totalBookingAmount)}
                        </span>
                    </div>
                    <div className="w-1/3 min-w-[120px]">
                        <Button
                            onClick={() => handleSubmit()}
                            disabled={!canSubmit || processing}
                            className="w-full bg-brand-primary text-white hover:bg-brand-primary-dark shadow-sm rounded-lg h-12"
                        >
                            {processing ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <span className="text-sm font-semibold">Simpan</span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </AdminLayout >
    );
}