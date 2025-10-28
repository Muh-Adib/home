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
}

export default function CreateBooking({ properties, selectedProperty, prefilledData, availabilityData: initialAvailabilityData, paymentMethods }: CreateBookingProps) {
    const { t } = useTranslation();
    
    // State management
    const [currentProperty, setCurrentProperty] = useState<Property | null>(selectedProperty || null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
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
    });

    // Calculate total guests
    const totalGuests = useMemo(() => {
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;
        return male + female + children;
    }, [data.guest_male, data.guest_female, data.guest_children]);

    // Calculate extra beds needed
    const extraBeds = useMemo(() => {
        if (!currentProperty) return 0;
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;
        const totalForExtraBeds = Math.ceil(male + female + Math.ceil((children - currentProperty.capacity) * 0.5));
        return Math.max(0, totalForExtraBeds - currentProperty.capacity);
    }, [currentProperty, data.guest_male, data.guest_female, data.guest_children]);

    // Handle property change
    const handlePropertyChange = (propertyId: string) => {
        const property = properties.find(p => p.id.toString() === propertyId);
        setCurrentProperty(property || null);
        setData('property_id', propertyId);
        
        // Reset calculations
        setRateCalculation(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);
        
        // Load property date range data and availability
        if (property) {
            loadPropertyDateRange(property.id);
            loadPropertyAvailabilityAndRatesAdmin(property.id);
            
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
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            // Use ADMIN endpoint with property_id
            const response = await fetch(`/admin/api/admin/booking-management/availability-and-rates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    property_id: propertyId,
                    check_in: startDate,
                    check_out: endDate,
                    guest_count: totalGuests,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
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
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            // Use the same API pattern as customer booking show page
            const response = await fetch(`/admin/api/admin/booking-management/property-date-range?property_id=${propertyId}&start_date=${startDate}&end_date=${endDate}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAvailabilityData(data);
                    setAvailabilityError(null);
                } else {
                    setAvailabilityError(data.error || 'Failed to load availability data');
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
            // Use the same API pattern as customer booking show page
            const response = await fetch('/admin/api/admin/booking-management/check-availability', {
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
                }),
            });
            
            if (response.ok) {
                const result = await response.json();
                setAvailabilityStatus(result.available ? 'available' : 'unavailable');
                if (!result.available) {
                    setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                }
            } else {
                setAvailabilityStatus('unavailable');
                setAvailabilityError('Error checking availability');
            }
        } catch (error) {
            setAvailabilityStatus('unavailable');
            setAvailabilityError('Error checking availability');
        }
    }, []);

    // Calculate rate from backend data with improved error handling
    const calculateRateFromBackendData = useCallback(async (checkIn: string, checkOut: string) => {
        if (!currentProperty || !checkIn || !checkOut) {
            throw new Error('Property and dates are required');
        }

        try {
            // Use the same API pattern as customer booking show page
            const response = await fetch('/admin/api/admin/booking-management/calculate-rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    property_id: currentProperty.id,
                    check_in: checkIn,
                    check_out: checkOut,
                    guest_count: totalGuests,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to calculate rate');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Rate calculation failed');
            }

            const calculation = result.calculation;
            
            return {
                nights: calculation.nights,
                base_amount: calculation.base_amount,
                weekend_premium: calculation.weekend_premium,
                seasonal_premium: calculation.seasonal_premium,
                extra_bed_amount: calculation.extra_bed_amount,
                cleaning_fee: calculation.cleaning_fee,
                tax_amount: calculation.tax_amount,
                total_amount: calculation.total_amount,
                extra_beds: calculation.extra_beds,
                formatted: {
                    total_amount: 'Rp ' + calculation.total_amount.toLocaleString('id-ID'),
                    per_night: 'Rp ' + Math.round(calculation.total_amount / calculation.nights).toLocaleString('id-ID')
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
                    const availabilityResponse = await fetch(`/admin/api/admin/booking-management/availability-and-rates`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            property_id: currentProperty.id,
                            check_in: startDate,
                            check_out: endDate,
                            guest_count: totalGuests,
                        }),
                    });
                    
                    if (availabilityResponse.ok) {
                        const availabilityData = await availabilityResponse.json();
                        
                        if (availabilityData.success) {
                            // Check if dates are available
                            const isAvailable = !availabilityData.booked_dates || availabilityData.booked_dates.length === 0;
                            setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
                            
                            if (!isAvailable) {
                                setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                                setIsCalculatingRate(false);
                                return;
                            }
                            
                            // Calculate rate using ADMIN API
                            const rateResponse = await fetch(`/admin/api/admin/booking-management/calculate-rate`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                    'X-Requested-With': 'XMLHttpRequest',
                                    'Accept': 'application/json',
                                },
                                body: JSON.stringify({
                                    property_id: currentProperty.id,
                                    check_in: startDate,
                                    check_out: endDate,
                                    guest_count: totalGuests,
                                }),
                            });
                            
                            if (rateResponse.ok) {
                                const rateData = await rateResponse.json();
                                
                                if (rateData.success) {
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
                    setRateError(null);
                                } else {
                                    setRateError(rateData.message || 'Rate calculation failed');
                                }
                            } else {
                                setRateError('Failed to calculate rate');
                            }
                        } else {
                            setAvailabilityError(availabilityData.message || 'Failed to check availability');
                        }
                    } else {
                        setAvailabilityError('Failed to check availability');
                    }
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
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
        if (data.check_in_date && data.check_out_date && currentProperty) {
            setTimeout(async () => {
                try {
                    // Use ADMIN API for rate calculation
                    const response = await fetch(`/admin/api/admin/booking-management/calculate-rate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            property_id: currentProperty.id,
                            check_in: data.check_in_date,
                            check_out: data.check_out_date,
                            guest_count: totalGuests,
                        }),
                    });
                    
                    if (response.ok) {
                        const rateData = await response.json();
                        
                        if (rateData.success) {
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
                    setRateError(null);
                        } else {
                            setRateError(rateData.message || 'Rate calculation failed');
                        }
                    } else {
                        setRateError('Failed to calculate rate');
                    }
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
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

    // Auto-generate guest list when counts change
    useEffect(() => {
        // This effect is no longer needed as guest details are removed.
        // Keeping it for now in case it's re-introduced later.
    }, [totalGuests, data.guest_male, data.guest_female, data.guest_children]);

    // Auto show/hide payment form based on booking status
    useEffect(() => {
        if (data.booking_status === 'confirmed' && data.payment_status !== 'dp_pending') {
            setShowPaymentForm(true);
            // Auto-calculate payment amount based on dp_percentage
            if (rateCalculation && !paymentData.amount) {
                const calculatedAmount = (rateCalculation.total_amount * data.dp_percentage) / 100;
                setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
            }
        } else {
            setShowPaymentForm(false);
        }
    }, [data.booking_status, data.payment_status, data.dp_percentage, rateCalculation]);

    // Update payment amount when rate calculation changes
    useEffect(() => {
        if (rateCalculation && showPaymentForm && data.dp_percentage) {
            const calculatedAmount = (rateCalculation.total_amount * data.dp_percentage) / 100;
            setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
        }
    }, [rateCalculation, showPaymentForm, data.dp_percentage]);

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
        { title: 'Dashboard', href: '/admin/dashboard' },
        { title: 'Bookings', href: '/admin/booking-management' },
        { title: 'Create Booking' },
    ];

    // Enhanced validation with better feedback
    const canSubmit = data.property_id && 
                     data.check_in_date && 
                     data.check_out_date && 
                     data.guest_name.trim() && 
                     data.guest_email.trim() && 
                     data.guest_phone.trim() && 
                     data.guest_country && 
                     totalGuests > 0 && 
                     availabilityStatus === 'available' && 
                     rateCalculation !== null;

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
        
        // Info: availability/rate akan dicek ulang di backend. Submit tetap diizinkan.
        
        return messages;
    }, [data, totalGuests, rateCalculation, availabilityStatus, manualRateOverride, overrideAmount, overrideReason]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!canSubmit) {
            return;
        }
        
        // Prepare form data with payment and rate override
        const formData = {
            ...data,
            guest_count: totalGuests,
            // Ensure payment_status is not null
            payment_status: data.payment_status || 'dp_pending',
            // Payment data (only if payment form is shown)
            ...(showPaymentForm && {
                payment_method_id: paymentData.payment_method_id,
                payment_amount: paymentData.amount,
                payment_date: paymentData.payment_date,
                reference_number: paymentData.reference_number,
                bank_name: paymentData.bank_name,
                account_number: paymentData.account_number,
                account_name: paymentData.account_name,
                payment_status: paymentData.payment_status,
                verification_notes: paymentData.verification_notes,
            }),
            // Rate override data
            rate_override: manualRateOverride,
            override_amount: manualRateOverride ? overrideAmount : null,
            override_reason: manualRateOverride ? overrideReason : null,
        };
        
        // Update form data before submission
        Object.keys(formData).forEach(key => {
            setData(key as any, formData[key as keyof typeof formData]);
        });
        
        post(route('admin.booking-management.store'), {
            onSuccess: () => {
                // Redirect to bookings list
                router.visit(route('admin.booking-management.index'));
            },
            onError: (errors: any) => {
                console.error('Booking creation failed:', errors);
                // Optionally surface server error
                if (errors.error) {
                    setSyncFeedback(errors.error);
                }
            }
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Booking Create" subtitle="Create Booking">
         
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-brand-primary">Create New Booking</h1>
                    <p className="text-muted-foreground mt-1">
                        Create a new booking for guests with real-time availability and pricing
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Booking Information
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

                                    {/* Date Range with Enhanced UX */}
                                    <div>
                                        <Label>Check-in & Check-out Dates *</Label>
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
                                                            Checking availability...
                                                        </AlertDescription>
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
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-brand-primary" />
                                            <h3 className="text-lg font-semibold">Guest Count</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="guest_count_male">Male Adults</Label>
                                                <Input
                                                    id="guest_count_male"
                                                    type="number"
                                                    min="0"
                                                    value={data.guest_male}
                                                    onChange={(e) => handleGenderCountChange('male', parseInt(e.target.value) || 0)}
                                                    className={errors.guest_male ? 'border-red-500' : ''}
                                                />
                                                {errors.guest_male && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_male}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="guest_count_female">Female Adults</Label>
                                                <Input
                                                    id="guest_count_female"
                                                    type="number"
                                                    min="0"
                                                    value={data.guest_female}
                                                    onChange={(e) => handleGenderCountChange('female', parseInt(e.target.value) || 0)}
                                                    className={errors.guest_female ? 'border-red-500' : ''}
                                                />
                                                {errors.guest_female && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_female}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="guest_count_children">Children</Label>
                                                <Input
                                                    id="guest_count_children"
                                                    type="number"
                                                    min="0"
                                                    value={data.guest_children}
                                                    onChange={(e) => handleGenderCountChange('children', parseInt(e.target.value) || 0)}
                                                    className={errors.guest_children ? 'border-red-500' : ''}
                                                />
                                                {errors.guest_children && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_children}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Enhanced Guest Count Summary */}
                                        <div className="bg-slate-50 p-4 sm:p-6 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium">Total Guests:</span>
                                                <Badge variant="secondary">
                                                    {totalGuests} guests
                                                </Badge>
                                            </div>
                                            {currentProperty && (
                                                <div className="text-sm text-gray-600">
                                                    Property Capacity: {currentProperty.capacity} - {currentProperty.capacity_max} guests
                                                </div>
                                            )}
                                            
                                            {extraBeds > 0 && currentProperty && currentProperty.extra_bed_rate && (
                                                <div className="mt-2 flex items-center gap-2 text-sm">
                                                    <Bed className="h-4 w-4 text-brand-primary" />
                                                    <span>Extra beds needed: {extraBeds}</span>
                                                    <span className="text-gray-600">
                                                        (+{formatCurrency(extraBeds * currentProperty.extra_bed_rate)}/night)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Primary Guest Info */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Primary Guest Information</h3>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="guest_name">Full Name *</Label>
                                                <Input
                                                    id="guest_name"
                                                    type="text"
                                                    value={data.guest_name}
                                                    onChange={(e) => setData('guest_name', e.target.value)}
                                                    className={errors.guest_name ? 'border-red-500' : ''}
                                                    placeholder="Enter full name"
                                                />
                                                {errors.guest_name && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_name}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_gender">Gender *</Label>
                                                <Select 
                                                    value={data.guest_gender} 
                                                    onValueChange={(value: 'male' | 'female') => setData('guest_gender', value)}
                                                >
                                                    <SelectTrigger className={errors.guest_gender ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="male">Male</SelectItem>
                                                        <SelectItem value="female">Female</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.guest_gender && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_gender}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_phone">Phone Number *</Label>
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
                                                <Label htmlFor="guest_email">Email Address *</Label>
                                                <Input
                                                    id="guest_email"
                                                    type="email"
                                                    value={data.guest_email}
                                                    onChange={(e) => setData('guest_email', e.target.value)}
                                                    className={errors.guest_email ? 'border-red-500' : ''}
                                                    placeholder="guest@example.com"
                                                />
                                                {errors.guest_email && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_email}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="guest_country">Country *</Label>
                                                <Select 
                                                    value={data.guest_country} 
                                                    onValueChange={(value) => setData('guest_country', value)}
                                                >
                                                    <SelectTrigger className={errors.guest_country ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select country" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Indonesia">Indonesia</SelectItem>
                                                        <SelectItem value="Malaysia">Malaysia</SelectItem>
                                                        <SelectItem value="Singapore">Singapore</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.guest_country && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_country}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <Label htmlFor="guest_id_number">ID Number (Optional)</Label>
                                                <Input
                                                    id="guest_id_number"
                                                    type="text"
                                                    value={data.guest_id_number}
                                                    onChange={(e) => setData('guest_id_number', e.target.value)}
                                                    placeholder="KTP/Passport number"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="relationship_type">Relationship Type *</Label>
                                                <Select 
                                                    value={data.relationship_type} 
                                                    onValueChange={(value: any) => setData('relationship_type', value)}
                                                >
                                                    <SelectTrigger className={errors.relationship_type ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select relationship" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="keluarga">Family</SelectItem>
                                                        <SelectItem value="teman">Friends</SelectItem>
                                                        <SelectItem value="kolega">Colleagues</SelectItem>
                                                        <SelectItem value="pasangan">Couple</SelectItem>
                                                        <SelectItem value="campuran">Mixed</SelectItem>
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
                                        <h3 className="text-lg font-semibold mb-4">Booking Settings</h3>
                                        <div className="grid md:grid-cols-3 gap-4">
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

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <Label htmlFor="dp_percentage">Down Payment Percentage</Label>
                                                <Select value={data.dp_percentage.toString()} onValueChange={(value: any) => setData('dp_percentage', parseInt(value))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="30">30%</SelectItem>
                                                        <SelectItem value="50">50%</SelectItem>
                                                        <SelectItem value="70">70%</SelectItem>
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
                                        <h3 className="text-lg font-semibold">Rate Adjustment</h3>
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
                                                    Manual Rate Adjustment
                                                </Label>
                                            </div>
                                            
                                            {manualRateOverride && (
                                                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                    {rateCalculation && (
                                                        <div className="text-sm text-gray-600">
                                                            <div className="flex justify-between">
                                                                <span>Original Calculated Rate:</span>
                                                                <span className="font-medium">{formatCurrency(rateCalculation.total_amount)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
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
                                                            placeholder="e.g., Early bird discount, Repeat customer, Special promotion..."
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
                                                <h3 className="text-lg font-semibold">Payment Information</h3>
                                                <Badge variant="secondary">Required for Confirmed Booking</Badge>
                                            </div>
                                            
                                            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="payment_method_id">Payment Method *</Label>
                                                        <Select 
                                                            value={paymentData.payment_method_id} 
                                                            onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method_id: value }))}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select payment method" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {paymentMethods.map((method) => (
                                                                    <SelectItem key={method.id} value={method.id.toString()}>
                                                                        {method.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    
                                                    <div>
                                                        <Label htmlFor="payment_amount">Payment Amount *</Label>
                                                        <Input
                                                            id="payment_amount"
                                                            type="number"
                                                            min="0"
                                                            value={paymentData.amount}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                                            placeholder="Enter payment amount"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="payment_date">Payment Date *</Label>
                                                        <Input
                                                            id="payment_date"
                                                            type="date"
                                                            value={paymentData.payment_date}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <Label htmlFor="reference_number">Reference Number</Label>
                                                        <Input
                                                            id="reference_number"
                                                            value={paymentData.reference_number}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                                                            placeholder="Transaction reference"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    <div>
                                                        <Label htmlFor="bank_name">Bank Name</Label>
                                                        <Input
                                                            id="bank_name"
                                                            value={paymentData.bank_name}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, bank_name: e.target.value }))}
                                                            placeholder="Bank name"
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <Label htmlFor="account_number">Account Number</Label>
                                                        <Input
                                                            id="account_number"
                                                            value={paymentData.account_number}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, account_number: e.target.value }))}
                                                            placeholder="Account number"
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <Label htmlFor="account_name">Account Name</Label>
                                                        <Input
                                                            id="account_name"
                                                            value={paymentData.account_name}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, account_name: e.target.value }))}
                                                            placeholder="Account holder name"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <Label htmlFor="verification_notes">Payment Notes</Label>
                                                    <Textarea
                                                        id="verification_notes"
                                                        value={paymentData.verification_notes}
                                                        onChange={(e) => setPaymentData(prev => ({ ...prev, verification_notes: e.target.value }))}
                                                        rows={2}
                                                        placeholder="Additional payment notes..."
                                                    />
                                                </div>
                                                
                                                <div className="text-sm text-gray-600">
                                                    <div className="flex justify-between">
                                                        <span>Total Booking Amount:</span>
                                                        <span className="font-medium">{rateCalculation ? formatCurrency(rateCalculation.total_amount) : 'Rp 0'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Payment Amount:</span>
                                                        <span className="font-medium">{formatCurrency(paymentData.amount)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Remaining:</span>
                                                        <span className="font-medium">{rateCalculation ? formatCurrency(rateCalculation.total_amount - paymentData.amount) : 'Rp 0'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <Separator />

                                    {/* Special Requests */}
                                    <div>
                                        <Label htmlFor="special_requests">Special Requests (Optional)</Label>
                                        <Textarea
                                            id="special_requests"
                                            value={data.special_requests}
                                            onChange={(e) => setData('special_requests', e.target.value)}
                                            rows={3}
                                            placeholder="Any special requests or notes..."
                                        />
                                    </div>

                                    {/* Internal Notes */}
                                    <div>
                                        <Label htmlFor="internal_notes">Internal Notes (Optional)</Label>
                                        <Textarea
                                            id="internal_notes"
                                            value={data.internal_notes}
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
                                                    Creating Booking...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-4 w-4 mr-2" />
                                                    Create Booking
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Enhanced Rate Calculation Sidebar */}
                    <div className="space-y-6">
                        {/* Guest Summary Card */}
                        {/* This section is no longer needed as guest details are removed. */}
                        {/* Keeping it for now in case it's re-introduced later. */}
                        {/*
                        <Card className="md:sticky md:top-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Guest Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Total Guests:</span>
                                        <Badge variant="secondary">{totalGuests}</Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Male Adults:</span>
                                        <span>{guestDetails.filter(g => g.gender === 'male' && g.age_category === 'adult').length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Female Adults:</span>
                                        <span>{guestDetails.filter(g => g.gender === 'female' && g.age_category === 'adult').length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Children:</span>
                                        <span>{guestDetails.filter(g => g.age_category === 'child').length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Infants:</span>
                                        <span>{guestDetails.filter(g => g.age_category === 'infant').length}</span>
                                    </div>
                                </div>
                                
                                {extraBeds > 0 && currentProperty && (
                                    <div className="pt-2 border-t">
                                        <div className="flex items-center gap-2 text-sm text-brand-primary">
                                            <Bed className="h-4 w-4" />
                                            <span>Extra beds needed: {extraBeds}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        */}

                        <Card className="md:sticky md:top-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Rate Calculation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                
                                {/* Enhanced Rate Calculation Display */}
                                <div className="space-y-3">
                                    {isCalculatingRate && (
                                        <Alert>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <AlertDescription>
                                                Calculating best rates...
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {rateError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Calculation Error</AlertTitle>
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
                                                    {rateCalculation.formatted.total_amount}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    for {rateCalculation.nights} nights • {rateCalculation.formatted.per_night}/night
                                                </div>
                                                
                                                {(rateCalculation.seasonal_premium || 0) > 0 && (
                                                    <div className="text-xs text-green-600 mt-2 flex items-center justify-center">
                                                        <Sparkles className="h-3 w-3 mr-1" />
                                                        Special seasonal rates applied
                                                    </div>
                                                )}
                                                
                                                {(rateCalculation.weekend_premium || 0) > 0 && (
                                                    <div className="text-xs text-amber-600 mt-1 flex items-center justify-center">
                                                        <Tag className="h-3 w-3 mr-1" />
                                                        Weekend premium included
                                                    </div>
                                                )}
                                            </div>

                                            {/* Enhanced Rate Breakdown */}
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
                                                
                                                {rateCalculation.seasonal_premium > 0 && (
                                                    <div className="flex justify-between text-green-600">
                                                        <span>Seasonal Premium</span>
                                                        <span>+{formatCurrency(rateCalculation.seasonal_premium)}</span>
                                                    </div>
                                                )}
                                                
                                                {rateCalculation.extra_bed_amount > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Extra Beds ({rateCalculation.extra_beds})</span>
                                                        <span>+{formatCurrency(rateCalculation.extra_bed_amount)}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex justify-between">
                                                    <span>Cleaning Fee</span>
                                                    <span>{formatCurrency(rateCalculation.cleaning_fee)}</span>
                                                </div>
                                                
                                                <div className="flex justify-between">
                                                    <span>Tax (0%)</span>
                                                    <span>{formatCurrency(rateCalculation.tax_amount)}</span>
                                                </div>
                                                
                                                <Separator />
                                                
                                                <div className="flex justify-between font-semibold text-base">
                                                    <span>Total</span>
                                                    <span>{formatCurrency(rateCalculation.total_amount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* No Rate Calculation State */}
                                    {!rateCalculation && !isCalculatingRate && !rateError && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Calculator className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                            <p>Select dates to see rate calculation</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Booking Summary Card */}
                        {currentProperty && data.check_in_date && data.check_out_date && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Info className="h-5 w-5" />
                                        Booking Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Property:</span>
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
                                            <span>Nights:</span>
                                            <span>{rateCalculation?.nights || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Primary Guest:</span>
                                            <span className="font-medium">{data.guest_name || 'Not set'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Status:</span>
                                            <Badge variant={data.booking_status === 'confirmed' ? 'default' : 'secondary'}>
                                                {data.booking_status === 'confirmed' ? 'Confirmed' : 'Pending Verification'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Payment:</span>
                                            <Badge variant={
                                                data.payment_status === 'fully_paid' ? 'default' : 
                                                data.payment_status === 'dp_received' ? 'secondary' : 'destructive'
                                            }>
                                                {data.payment_status === 'fully_paid' ? 'Fully Paid' : 
                                                 data.payment_status === 'dp_received' ? 'DP Received' : 'DP Pending'}
                                            </Badge>
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