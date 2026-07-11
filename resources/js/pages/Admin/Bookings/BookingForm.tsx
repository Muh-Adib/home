import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
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
    Edit,
    Bed,
    Minus,
    Plus
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
    code: string;
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

interface BankAccount {
    id: number;
    bank_name: string;
    bank_code?: string;
    account_number: string;
    account_holder: string;
    label: string;
}

interface BookingFormProps {
    mode: 'create' | 'edit';
    initialData?: Partial<Booking>;
    properties: Property[];
    paymentMethods: PaymentMethod[];
    bankAccounts?: BankAccount[];
    serviceMasters: ServiceMaster[];
    bookingNumber?: string; // Required for edit mode
    staffUsers?: any[];
}

export default function BookingForm({
    mode,
    initialData,
    properties,
    paymentMethods,
    bankAccounts = [],
    serviceMasters = [],
    bookingNumber,
    staffUsers = []
}: BookingFormProps) {

    const page = usePage<any>();
    const { auth } = page.props;
    const currentUserId = auth.user.id;

    // Determine initial values based on mode
    const defaultValues = {
        property_id: initialData?.property_id?.toString() || '',
        check_in_date: initialData?.check_in ? initialData.check_in.split(' ')[0].split('T')[0] : '',
        check_out_date: initialData?.check_out ? initialData.check_out.split(' ')[0].split('T')[0] : '',
        guest_male: initialData?.guest_male ?? 1,
        guest_female: initialData?.guest_female ?? 1,
        guest_children: initialData?.guest_children ?? 0,
        guest_name: initialData?.guest_name || '',
        guest_email: initialData?.guest_email || '',
        guest_phone: initialData?.guest_phone || '',
        guest_phone_alternative: initialData?.guest_phone_alternative || '',
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
        discount_amount: initialData?.discount_amount || 0,
        followed_up_by: initialData?.followed_up_by?.toString() || currentUserId.toString(),

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
        force_capacity_override: false,

        // Services
        services: [] as any[],

        // Extra bed per night
        daily_extra_beds: (() => {
            const initialBeds: Record<string, number> = {};
            const dailyBreakdown = initialData?.rate_calculation?.breakdown?.daily_breakdown || initialData?.rate_calculation?.daily_breakdown;
            if (dailyBreakdown) {
                const items = Array.isArray(dailyBreakdown) ? dailyBreakdown : Object.values(dailyBreakdown);
                items.forEach((day: any) => {
                    if (day.date) {
                        initialBeds[day.date] = day.extra_bed_count ?? 0;
                    }
                });
            }
            return initialBeds;
        })() as Record<string, number>,
    };

    const { data, setData, post, patch, processing, errors } = useForm<any>(defaultValues);

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
    const [addInitialPayment, setAddInitialPayment] = useState(false);
    const [initialPaymentType, setInitialPaymentType] = useState<'dp' | 'full' | 'custom'>('full');
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

    const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    const compressedFile = new File([blob], file.name, {
                                        type: 'image/jpeg',
                                        lastModified: Date.now(),
                                    });
                                    resolve(compressedFile);
                                } else {
                                    resolve(file);
                                }
                            },
                            'image/jpeg',
                            quality
                        );
                    } else {
                        resolve(file);
                    }
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
    };

    // Extra services state
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

    // Initialize selected services from initialData
    useEffect(() => {
        if (initialData?.services && initialData.services.length > 0) {
            const initialServices = initialData.services.map((s: any) => ({
                id: s.id,
                service_master_id: s.service_master_id,
                service_name: s.service_name,
                service_type: s.service_type,
                quantity: s.quantity,
                unit_price: s.unit_price,
                discount_amount: s.discount_amount || 0,
                total_price: s.total_price,
                vendor_unit_price: s.vendor_unit_price || 0,
                vendor_total_price: s.vendor_total_price || 0,
                service_date: s.service_date ? s.service_date.split(' ')[0] : null,
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
        return Math.max(0, baseTotal - (data.discount_amount || 0)) + servicesTotal;
    }, [rateCalculation, manualRateOverride, overrideAmount, servicesTotal, data.discount_amount]);

    // Sync paymentData and statuses automatically based on addInitialPayment toggle (Create mode logic)
    useEffect(() => {
        if (mode === 'create') {
            if (addInitialPayment) {
                setShowPaymentForm(true);
                let calculatedAmount = paymentData.amount;
                let calculatedStatus: PaymentStatus = 'dp_pending';

                if (initialPaymentType === 'full') {
                    calculatedAmount = totalBookingAmount;
                    calculatedStatus = 'fully_paid';
                    if (paymentData.amount !== calculatedAmount) {
                        setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
                    }
                } else if (initialPaymentType === 'dp') {
                    const percent = data.dp_percentage === 100 ? 50 : data.dp_percentage;
                    calculatedAmount = (totalBookingAmount * percent) / 100;
                    calculatedStatus = 'dp_received';
                    if (paymentData.amount !== calculatedAmount) {
                        setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
                    }
                } else if (initialPaymentType === 'custom') {
                    calculatedAmount = paymentData.amount;
                    if (calculatedAmount >= totalBookingAmount) {
                        calculatedStatus = 'fully_paid';
                    } else if (calculatedAmount > 0) {
                        calculatedStatus = 'dp_received';
                    } else {
                        calculatedStatus = 'dp_pending';
                    }
                }

                setData((prev: any) => ({
                    ...prev,
                    booking_status: 'confirmed' as BookingStatus,
                    payment_status: calculatedStatus,
                    payment_amount: calculatedAmount,
                    dp_percentage: initialPaymentType === 'full' ? 100 : (prev.dp_percentage === 100 ? 50 : prev.dp_percentage),
                }));
            } else {
                setShowPaymentForm(false);
                setData((prev: any) => ({
                    ...prev,
                    booking_status: 'confirmed' as BookingStatus,
                    payment_status: 'dp_pending' as PaymentStatus,
                    payment_amount: null,
                    payment_method_id: null,
                }));
            }
        }
    }, [mode, addInitialPayment, initialPaymentType, totalBookingAmount, data.dp_percentage, paymentData.amount]);

    // Auto-select property's bank account for initial payment
    useEffect(() => {
        if (mode === 'create' && currentProperty && bankAccounts && bankAccounts.length > 0) {
            if (currentProperty.payment_method_id) {
                const matchingMethod = paymentMethods.find(m => m.id === currentProperty.payment_method_id);
                if (matchingMethod) {
                    const propertyBankAccount = bankAccounts.find(acc => acc.id === currentProperty.bank_account_id);
                    setPaymentData((prev: any) => ({
                        ...prev,
                        payment_method_id: matchingMethod.id.toString(),
                        bank_name: propertyBankAccount ? propertyBankAccount.bank_name : (matchingMethod.bank_name || ''),
                        account_number: propertyBankAccount ? propertyBankAccount.account_number : (matchingMethod.account_number || ''),
                        account_name: propertyBankAccount ? propertyBankAccount.account_holder : (matchingMethod.account_name || ''),
                    }));
                    return;
                }
            }

            // Fallback to legacy bank_code matching
            const propertyBankAccount = bankAccounts.find(acc => acc.id === currentProperty.bank_account_id);
            if (propertyBankAccount) {
                const matchingMethod = paymentMethods.find(m => m.type === 'bank_transfer' && m.code === propertyBankAccount.bank_code);
                if (matchingMethod) {
                    setPaymentData((prev: any) => ({
                        ...prev,
                        payment_method_id: matchingMethod.id.toString(),
                        bank_name: propertyBankAccount.bank_name,
                        account_number: propertyBankAccount.account_number,
                        account_name: propertyBankAccount.account_holder,
                    }));
                }
            }
        }
    }, [currentProperty, bankAccounts, paymentMethods, mode]);

    // Sync paymentData details to form state (for submission)
    useEffect(() => {
        if (mode === 'create' && showPaymentForm) {
            setData((prev: any) => ({
                ...prev,
                payment_method_id: paymentData.payment_method_id || null,
                payment_date: paymentData.payment_date || null,
                reference_number: paymentData.reference_number || null,
                bank_name: paymentData.bank_name || null,
                account_number: paymentData.account_number || null,
                account_name: paymentData.account_name || null,
                payment_status_payment: paymentData.payment_status || 'verified',
                verification_notes: paymentData.verification_notes || null,
            }));
        }
    }, [paymentData, showPaymentForm, mode]);

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
                setData((data: any) => ({
                    ...data,
                    guest_male: Math.floor(property.capacity_max / 2),
                    guest_female: Math.floor(property.capacity_max / 2),
                    guest_children: property.capacity_max % 2
                }));
            }
        }
    };

    const checkAvailabilityAndCalculateRate = useCallback(async (
        propertyId: number,
        checkIn: string,
        checkOut: string,
        dailyExtraBedsParam?: Record<string, number>
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
                guest_count: totalGuests
            };
            let isAvailable = false;

            if (mode === 'edit' && initialData?.id) {
                // For edit mode, exclude current booking
                const response = await fetch('/api/admin/booking-management/check-availability-exclude', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ ...availabilityPayload, exclude_booking_id: initialData.id }),
                });
                if (response.ok) {
                    const data = await response.json();
                    isAvailable = data.available;
                }
            } else {
                // For create, standard check
                const result = await apiPost<{ available: boolean }>('/api/admin/booking-management/check-availability', availabilityPayload);
                isAvailable = result?.available || false;
            }

            setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');

            if (!isAvailable) {
                setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
            }

            // 2. Calculate Rate
            const rateData = await apiPost<{ success: boolean; calculation?: any; message?: string }>(
                '/api/admin/booking-management/calculate-rate',
                {
                    property_id: propertyId,
                    check_in: checkIn,
                    check_out: checkOut,
                    guest_count: totalGuests,
                    daily_extra_beds: dailyExtraBedsParam !== undefined ? dailyExtraBedsParam : data.daily_extra_beds,
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
        setData((data: any) => ({ ...data, check_in_date: startDate, check_out_date: endDate }));

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

    // Helper to get dates of stay
    const getDatesOfStay = useCallback(() => {
        if (!data.check_in_date || !data.check_out_date) return [];
        const dates = [];
        const start = new Date(data.check_in_date);
        const end = new Date(data.check_out_date);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }, [data.check_in_date, data.check_out_date]);

    // Helper to change individual day extra bed count
    const handleDailyExtraBedChange = (date: string, count: number) => {
        setData('daily_extra_beds', {
            ...data.daily_extra_beds,
            [date]: count
        });
    };

    // Initial load for edit mode
    useEffect(() => {
        if (mode === 'edit' && currentProperty && data.check_in_date && data.check_out_date) {
            checkAvailabilityAndCalculateRate(currentProperty.id, data.check_in_date, data.check_out_date, data.daily_extra_beds);
            loadPropertyData(currentProperty.id);
        }
    }, []);

    // Sync daily extra beds when dates or guest count changes
    useEffect(() => {
        if (data.check_in_date && data.check_out_date && currentProperty) {
            const dates = getDatesOfStay();
            // Calculate standard default extra bed count
            const defaultCount = Math.max(0, totalGuests - (currentProperty.capacity || 0));
            const newDailyExtraBeds = { ...data.daily_extra_beds };
            let changed = false;

            // Remove dates no longer in the range
            Object.keys(newDailyExtraBeds).forEach(date => {
                if (!dates.includes(date)) {
                    delete newDailyExtraBeds[date];
                    changed = true;
                }
            });

            // Add new dates with default extra beds
            dates.forEach(date => {
                if (newDailyExtraBeds[date] === undefined) {
                    newDailyExtraBeds[date] = defaultCount;
                    changed = true;
                }
            });

            if (changed) {
                setData('daily_extra_beds', newDailyExtraBeds);
            }
        }
    }, [data.check_in_date, data.check_out_date, totalGuests, currentProperty]);

    // Trigger rate calc on guest count, dates, or daily extra beds change
    useEffect(() => {
        if (data.check_in_date && data.check_out_date && currentProperty && totalGuests > 0) {
            const timer = setTimeout(() => {
                checkAvailabilityAndCalculateRate(
                    currentProperty.id,
                    data.check_in_date,
                    data.check_out_date,
                    data.daily_extra_beds
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [totalGuests, currentProperty, data.check_in_date, data.check_out_date, data.daily_extra_beds, checkAvailabilityAndCalculateRate]);

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
            // Edit mode (Put)
            router.put(route('admin.bookings.update', bookingNumber), formData, submitOptions);
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
                            <div className="space-y-4">
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
                                
                                {totalGuests > currentProperty.capacity_max && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            id="force_capacity_override"
                                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded mt-0.5"
                                            checked={data.force_capacity_override}
                                            onChange={(e) => setData('force_capacity_override', e.target.checked)}
                                        />
                                        <label htmlFor="force_capacity_override" className="text-xs font-medium text-amber-800 dark:text-amber-300 cursor-pointer">
                                            Bypass Kapasitas Maksimal (Khusus Admin)
                                            <span className="block text-[10px] font-normal text-amber-600 dark:text-amber-400 mt-0.5">
                                                Gunakan opsi ini untuk memaksa pendaftaran booking meskipun melebihi kapasitas maksimal {currentProperty.capacity_max} orang.
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Daily Extra Bed Editor */}
                        {currentProperty && data.check_in_date && data.check_out_date && getDatesOfStay().length > 0 && (
                            <Card className="border border-slate-200 shadow-sm gap-0">
                                <CardHeader className="py-3 bg-slate-50/50">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Bed className="h-4 w-4 text-blue-600" /> Rincian Extra Bed per Malam (Opsional)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="text-xs text-muted-foreground">
                                        Sesuaikan jumlah extra bed untuk setiap malam secara spesifik jika diperlukan. Default otomatis dihitung berdasarkan jumlah tamu dan kapasitas properti.
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {getDatesOfStay().map((date) => {
                                            const dayExtraBedsCount = data.daily_extra_beds[date] ?? 0;
                                            const seasonalRate = availabilityData?.seasonal_rates?.[date];
                                            const extraBedRate = seasonalRate?.extra_bed_rate !== null && seasonalRate?.extra_bed_rate !== undefined
                                                ? Number(seasonalRate.extra_bed_rate)
                                                : Number(currentProperty.extra_bed_rate || 0);

                                            return (
                                                <div key={date} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800">
                                                            {new Date(date).toLocaleDateString('id-ID', {
                                                                weekday: 'short',
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Tarif extra bed: {formatCurrency(extraBedRate)} / unit
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0 rounded-full"
                                                            onClick={() => handleDailyExtraBedChange(date, Math.max(0, dayExtraBedsCount - 1))}
                                                            disabled={dayExtraBedsCount <= 0}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <div className="w-8 text-center font-semibold tabular-nums text-sm">
                                                            {dayExtraBedsCount}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0 rounded-full"
                                                            onClick={() => handleDailyExtraBedChange(date, dayExtraBedsCount + 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
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
                                <Label htmlFor="guest_phone_alternative">Alternative Phone</Label>
                                <Input id="guest_phone_alternative" type="tel" value={data.guest_phone_alternative} onChange={e => setData('guest_phone_alternative', e.target.value)} />
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

                        {/* Booking Status, Payment, & Source Fields */}
                        {mode === 'create' ? (
                            <div className="grid md:grid-cols-4 gap-4">
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
                                <div>
                                    <Label htmlFor="check_in_time">Waktu Check-in</Label>
                                    <Input
                                        id="check_in_time"
                                        type="time"
                                        value={data.check_in_time}
                                        onChange={e => setData('check_in_time', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="dp_percentage">Persentase Ketentuan DP (%)</Label>
                                    <Select
                                        value={data.dp_percentage?.toString()}
                                        onValueChange={(v) => {
                                            setData('dp_percentage', Number(v));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Persentase" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["30", "50", "70", "100"].map((percent) => (
                                                <SelectItem key={percent} value={percent}>
                                                    {percent}%
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="followed_up_by">Follow-Up Awal Oleh *</Label>
                                    <Select value={data.followed_up_by} onValueChange={v => setData('followed_up_by', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Staf" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staffUsers.map((user: any) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name} ({user.role.replace('_', ' ')})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid md:grid-cols-4 gap-4">
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
                                    <div>
                                        <Label htmlFor="check_in_time">Waktu Check-in</Label>
                                        <Input
                                            id="check_in_time"
                                            type="time"
                                            value={data.check_in_time}
                                            onChange={e => setData('check_in_time', e.target.value)}
                                        />
                                    </div>
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
                                        <Label htmlFor="followed_up_by">Follow-Up Awal Oleh *</Label>
                                        <Select value={data.followed_up_by} onValueChange={v => setData('followed_up_by', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Staf" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {staffUsers.map((user: any) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name} ({user.role.replace('_', ' ')})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="payment_status">Status Pembayaran *</Label>
                                        <Select
                                            value={data.payment_status}
                                            onValueChange={(v) => {
                                                let autoPercentage = data.dp_percentage;
                                                if (v === 'fully_paid') {
                                                    autoPercentage = 100;
                                                } else if (v === 'dp_pending' || v === 'dp_received') {
                                                    if (data.dp_percentage === 100 || data.dp_percentage === 0) {
                                                        autoPercentage = 50;
                                                    }
                                                }
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
                                                if (newPercent === 100) {
                                                    newStatus = 'fully_paid';
                                                } else if (newPercent < 100 && newStatus === 'fully_paid') {
                                                    newStatus = 'dp_received';
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
                                                {["0", "30", "50", "70", "100"].map((percent) => (
                                                    <SelectItem key={percent} value={percent}>
                                                        {percent}%
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Extra Services */}
                        <ExtraServiceSelector
                            services={serviceMasters}
                            selectedServices={selectedServices}
                            onServicesChange={setSelectedServices}
                            nights={rateCalculation?.nights || 1}
                            checkInDate={data.check_in_date}
                            checkOutDate={data.check_out_date}
                        />

                        <Separator />

                        <Separator />

                        {/* Payment Form (Only for Create Mode) */}
                        {mode === 'create' && (
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-blue-600" />
                                            Input Pembayaran Awal (Opsional)
                                        </CardTitle>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="add_initial_payment"
                                                checked={addInitialPayment}
                                                onChange={(e) => setAddInitialPayment(e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                            />
                                            <Label htmlFor="add_initial_payment" className="text-xs font-medium text-slate-700 cursor-pointer">
                                                Ada Pembayaran Masuk
                                            </Label>
                                        </div>
                                    </div>
                                </CardHeader>

                                {addInitialPayment && (
                                    <CardContent className="space-y-4 pt-0 border-t border-slate-100 mt-3">
                                        <div className="grid md:grid-cols-2 gap-4 pt-3">
                                            <div>
                                                 <Label htmlFor="initial_payment_type">Tipe Pembayaran Awal *</Label>
                                                 <Select
                                                     value={initialPaymentType}
                                                     onValueChange={v => setInitialPaymentType(v as 'dp' | 'full' | 'custom')}
                                                 >
                                                     <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                     <SelectContent>
                                                         <SelectItem value="full">Lunas (100% Pembayaran)</SelectItem>
                                                         <SelectItem value="dp">DP (Sesuai Ketentuan DP %)</SelectItem>
                                                         <SelectItem value="custom">Nominal Kustom (Manual)</SelectItem>
                                                     </SelectContent>
                                                 </Select>
                                             </div>
                                             <div>
                                                 <Label htmlFor="payment_amount">
                                                     {initialPaymentType === 'custom' ? 'Jumlah Pembayaran (Manual) *' : 'Jumlah Pembayaran (Otomatis) *'}
                                                 </Label>
                                                 {initialPaymentType === 'custom' ? (
                                                     <div className="relative">
                                                         <span className="absolute left-3 top-2 text-sm text-slate-500 font-semibold">Rp</span>
                                                         <Input
                                                             id="payment_amount"
                                                             type="number"
                                                             value={paymentData.amount || ''}
                                                             onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                                                             className="h-9 pl-9 font-semibold text-slate-700 focus:ring-blue-500"
                                                             placeholder="Masukkan nominal transfer"
                                                         />
                                                     </div>
                                                 ) : (
                                                     <Input
                                                         id="payment_amount"
                                                         type="text"
                                                         value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(paymentData.amount)}
                                                         disabled
                                                         className="h-9 bg-slate-50 font-semibold text-slate-700"
                                                     />
                                                 )}
                                             </div>
                                             <div>
                                                 <Label htmlFor="payment_method_id">Metode Pembayaran *</Label>
                                                 <Select
                                                     value={paymentData.payment_method_id}
                                                     onValueChange={v => {
                                                         const method = paymentMethods.find(m => m.id.toString() === v);
                                                         if (method && method.type === 'bank_transfer') {
                                                             const firstMatchingAccount = bankAccounts?.find(acc => acc.bank_code === method.code);
                                                             setPaymentData({
                                                                 ...paymentData,
                                                                 payment_method_id: v,
                                                                 bank_name: firstMatchingAccount?.bank_name || '',
                                                                 account_number: firstMatchingAccount?.account_number || '',
                                                                 account_name: firstMatchingAccount?.account_holder || '',
                                                             });
                                                         } else {
                                                             setPaymentData({
                                                                 ...paymentData,
                                                                 payment_method_id: v,
                                                                 bank_name: '',
                                                                 account_number: '',
                                                                 account_name: '',
                                                             });
                                                         }
                                                     }}
                                                 >
                                                     <SelectTrigger className="h-9"><SelectValue placeholder="Pilih metode pembayaran" /></SelectTrigger>
                                                     <SelectContent>
                                                         {paymentMethods.map(method => (
                                                             <SelectItem key={method.id} value={method.id.toString()}>
                                                                 {method.name}
                                                             </SelectItem>
                                                         ))}
                                                     </SelectContent>
                                                 </Select>
                                                 {errors.payment_method_id && (
                                                     <p className="text-xs text-red-500 mt-1">{errors.payment_method_id}</p>
                                                 )}
                                             </div>

                                             {paymentMethods.find(m => m.id.toString() === paymentData.payment_method_id)?.type === 'bank_transfer' && (
                                                 <div>
                                                     <Label htmlFor="bank_account_select">Rekening Bank Tujuan *</Label>
                                                     <Select
                                                         value={bankAccounts?.find(acc => acc.account_number === paymentData.account_number)?.id.toString() || ''}
                                                         onValueChange={accId => {
                                                             const acc = bankAccounts?.find(a => a.id.toString() === accId);
                                                             if (acc) {
                                                                 setPaymentData(prev => ({
                                                                     ...prev,
                                                                     bank_name: acc.bank_name,
                                                                     account_number: acc.account_number,
                                                                     account_name: acc.account_holder,
                                                                 }));
                                                             }
                                                         }}
                                                     >
                                                         <SelectTrigger className="h-9">
                                                             <SelectValue placeholder="Pilih rekening bank tujuan" />
                                                         </SelectTrigger>
                                                         <SelectContent>
                                                             {bankAccounts
                                                                 ?.filter(acc => acc.bank_code === paymentMethods.find(m => m.id.toString() === paymentData.payment_method_id)?.code)
                                                                 .map(acc => (
                                                                     <SelectItem key={acc.id} value={acc.id.toString()}>
                                                                         <span className="font-medium">{acc.label}</span>
                                                                         <span className="text-muted-foreground ml-2 font-mono text-xs">({acc.account_number})</span>
                                                                     </SelectItem>
                                                                 ))
                                                             }
                                                         </SelectContent>
                                                     </Select>
                                                 </div>
                                             )}
                                            <div>
                                                <Label htmlFor="payment_date">Tanggal Pembayaran</Label>
                                                <Input
                                                    id="payment_date"
                                                    type="date"
                                                    value={paymentData.payment_date}
                                                    onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="reference_number">Nomor Referensi</Label>
                                                <Input
                                                    id="reference_number"
                                                    value={paymentData.reference_number}
                                                    onChange={e => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                                                    placeholder="Nomor referensi transfer"
                                                    className="h-9"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="payment_proof">Bukti Pembayaran</Label>
                                                <Input
                                                    id="payment_proof"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            compressImage(file).then(compressedFile => {
                                                                setPaymentProof(compressedFile);
                                                            });
                                                        } else {
                                                            setPaymentProof(null);
                                                        }
                                                    }}
                                                    className="h-9"
                                                />
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
                                )}
                            </Card>
                        )}

                        <Separator />

                        {/* Rate Breakdown & Discount override */}
                        {rateCalculationFull && (
                            <div className="space-y-4">
                                <Card className="bg-slate-50 border-slate-200">
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="discount_amount" className="font-semibold text-slate-800">
                                                Nominal Diskon Booking (Keseluruhan)
                                            </Label>
                                            <p className="text-xs text-slate-500">
                                                Masukkan nominal diskon langsung untuk memotong harga sewa kamar ini
                                            </p>
                                        </div>
                                        <div className="w-full md:w-72">
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">Rp</span>
                                                <Input
                                                    id="discount_amount"
                                                    type="number"
                                                    min="0"
                                                    value={data.discount_amount || ''}
                                                    onChange={e => setData('discount_amount', parseInt(e.target.value) || 0)}
                                                    placeholder="0"
                                                    className={`pl-8 ${errors.discount_amount ? 'border-red-500' : ''}`}
                                                />
                                            </div>
                                            {errors.discount_amount && (
                                                <p className="text-xs text-red-500 mt-1">{errors.discount_amount}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <RateBreakdownCard
                                    rateCalculation={rateCalculationFull}
                                    checkIn={data.check_in_date}
                                    checkOut={data.check_out_date}
                                    discountAmount={data.discount_amount}
                                    services={selectedServices}
                                />
                            </div>
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
