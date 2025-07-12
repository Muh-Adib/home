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
    Key
} from 'lucide-react';
import { DateRange, getDefaultDateRange } from '@/components/ui/date-range';
import { useTranslation } from 'react-i18next';
import { useAvailability } from '@/hooks/use-availability';
import { useRateCalculation } from '@/hooks/use-rate-calculation';

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
    };
}

interface GuestDetail {
    id?: number;
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
    guest_id_number?: string;
    guest_gender: 'male' | 'female';
    relationship_type: 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran';
    special_requests?: string;
    dp_percentage: number;
    guests: GuestDetail[];
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
    guests?: string;
}

interface AvailabilityData {
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
}

interface UseAvailabilityOptions {
    propertySlug: string;
    autoFetch?: boolean;
    dateRange?: {
        startDate?: string;
        endDate?: string;
    };
}

interface UseRateCalculationOptions {
    availabilityData: AvailabilityData;
    guestCount: number;
}

interface UseAvailabilityResult {
    data: AvailabilityData | null;
    loading: boolean;
    error: string | null;
    refetch: (startDate?: string, endDate?: string) => Promise<void>;
    isDateBooked: (date: Date) => boolean;
    rangeContainsBookedDates: (from: Date, to: Date) => boolean;
}

interface UseRateCalculationResult {
    rateCalculation: RateCalculation | null;
    rateError: string | null;
    isCalculatingRate: boolean;
    calculateRate: (startDate: string, endDate: string) => Promise<RateCalculation | null>;
    hasSeasonalPremium: boolean;
    hasWeekendPremium: boolean;
    isRateReady: boolean;
}

interface CheckInTimeOption {
    value: string;
    label: string;
}

const checkInTimeOptions: CheckInTimeOption[] = [
    { value: '15:00', label: '15:00' },
    { value: '16:00', label: '16:00' },
    { value: '17:00', label: '17:00' },
    { value: '18:00', label: '18:00' },
    { value: '19:00', label: '19:00' },
    { value: '20:00', label: '20:00' },
];

interface RelationshipOption {
    value: string;
    label: string;
}


// Auto-fill form data based on user login status and URL params
const getInitialFormData = (auth: BookingCreateProps['auth'], urlCheckIn: string, urlCheckOut: string, urlGuests: number): BookingFormData => {
    // Auto-fill with user data if logged in
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
    const [showGuestDetails, setShowGuestDetails] = useState(false);
    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
    
    // Availability state
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    
    // Email state
    const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'exists' | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

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

    // Use availability hook
    const {
        data: availabilityData,
        loading: availabilityLoading,
        error: availabilityError,
        refetch: refetchAvailability,
        isDateBooked,
        rangeContainsBookedDates
    } = useAvailability({
        propertySlug: property.slug,
        autoFetch: true,
        dateRange: {
            startDate: urlCheckIn,
            endDate: urlCheckOut
        }
    } as UseAvailabilityOptions) as UseAvailabilityResult;

    // Use rate calculation hook
    const {
        rateCalculation,
        rateError,
        isCalculatingRate,
        calculateRate,
        hasSeasonalPremium,
        hasWeekendPremium,
        isRateReady
    } = useRateCalculation({
        availabilityData: availabilityData || initialAvailabilityData,
        guestCount: totalGuests
    } as UseRateCalculationOptions) as UseRateCalculationResult;

    // Calculate rate when dates or guest count changes
    useEffect(() => {
        if (data.check_in_date && data.check_out_date && totalGuests > 0) {
            calculateRate(data.check_in_date, data.check_out_date)
                .then(calculation => {
                    if (calculation) {
                        setAvailabilityStatus('available');
                    }
                })
                .catch(error => {
                    setAvailabilityStatus('unavailable');
                    console.error('Rate calculation error:', error);
                });
        }
    }, [data.check_in_date, data.check_out_date, totalGuests, calculateRate]);

    // Update URL and recalculate rate when dates change
    useEffect(() => {
        if (data.check_in_date && data.check_out_date) {
            setAvailabilityStatus('checking');
            calculateRate(data.check_in_date, data.check_out_date);
            searchParams.set('check_in', data.check_in_date);
            searchParams.set('check_out', data.check_out_date);
            searchParams.set('guests', totalGuests.toString());
            window.history.pushState({}, '', window.location.pathname + '?' + searchParams.toString());
            console.log('🔄 data.check_in_date:', data.check_in_date);
        }
    }, [data.check_in_date, data.check_out_date, calculateRate]);

    // Form submission handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
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
                availabilityStatus,
                hasRateCalculation: !!rateCalculation 
            });

            // Submit form
            post(route('bookings.store', property.slug), {
                onSuccess: () => {
                    console.log('Booking created successfully');
                },
                onError: (error) => {
                    console.error('Booking creation failed:', error);
                }
            });
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

    // Calculate fake discount (20% markup from final rate)
    const calculateDiscountPrice = () => {
        if (!rateCalculation) return null;
        
        const finalRate = rateCalculation.total_amount;
        const originalPrice = finalRate * 1.2; // 20% markup
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

    // Calculate total guests whenever individual counts change
    useEffect(() => {
        const total = data.guest_male + data.guest_female + data.guest_children;
        setTotalGuests(total);

        const totalForExtraBeds = Math.ceil(data.guest_male + data.guest_female + (data.guest_children * 0.5));
        
        // Calculate extra beds needed
        const extraBedsNeeded = Math.max(0, totalForExtraBeds - property.capacity);
        setExtraBeds(extraBedsNeeded);

        // Auto-generate guest list based on counts
        generateGuestList();

        // Auto-show guest details when total guests > 1
        setShowGuestDetails(total > 1);
    }, [data.guest_male, data.guest_female, data.guest_children, data.guest_gender, property.capacity]);

    const generateGuestList = () => {
        // Gunakan fungsi sinkronisasi yang sudah dibuat
        synchronizeGuestDetails();
    };

    const updateGuest = (index: number, field: keyof GuestDetail, value: string) => {
        const newGuests = [...data.guests];
        newGuests[index] = { ...newGuests[index], [field]: value };
        setData((prev) => ({
            ...prev,
            guests: newGuests
        }));
        
        // Jika mengubah gender, sinkronkan dengan gender count
        if (field === 'gender') {
            synchronizeGenderCounts(newGuests);
        }
    };

    // Fungsi untuk sinkronisasi gender count berdasarkan guest details
    const synchronizeGenderCounts = (guestList: GuestDetail[]) => {
        let maleCount = 0;
        let femaleCount = 0;
        let childrenCount = 0;

        guestList.forEach((guest) => {
            if (guest.age_category === 'child') {
                childrenCount++;
            } else if (guest.gender === 'male') {
                maleCount++;
            } else if (guest.gender === 'female') {
                femaleCount++;
            }
        });

        // Update data dengan count yang baru
        setData(prev => ({
            ...prev,
            guest_count_male: maleCount,
            guest_count_female: femaleCount,
            guest_count_children: childrenCount,
        }));

        // Tampilkan feedback sinkronisasi
        setSyncFeedback('Gender count berhasil disinkronkan dari rincian tamu');
        setTimeout(() => setSyncFeedback(null), 2000);
    };

    // Fungsi untuk menangani perubahan gender count dengan mempertahankan data guest yang ada
    const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
        // Update count terlebih dahulu
        const countField = genderType === 'children' ? 'guest_count_children' : 
                          genderType === 'male' ? 'guest_count_male' : 'guest_count_female';
        
        setData((prev) => ({
            ...prev,
            [countField]: newCount
        }));
        
        // Tunggu sebentar agar state ter-update, lalu sinkronkan guest details
        setTimeout(() => {
            synchronizeGuestDetailsWithPreservation(genderType, newCount);
        }, 0);
    };

    // Fungsi untuk sinkronisasi guest details dengan mempertahankan data yang sudah diisi
    const synchronizeGuestDetailsWithPreservation = (changedGenderType: 'male' | 'female' | 'children', newCount: number) => {
        const currentGuests = [...data.guests];
        const newGuests: GuestDetail[] = [];
        
        // Selalu tambahkan primary guest sebagai yang pertama
        const primaryGuest = currentGuests.find(g => g.relationship_to_primary === 'self') || {
            name: data.guest_name || '',
            gender: data.guest_gender,
            age_category: 'adult' as const,
            relationship_to_primary: 'self',
            phone: data.guest_phone,
            email: data.guest_email,
        };
        newGuests.push(primaryGuest);

        // Hitung kebutuhan guest berdasarkan count terbaru
        const updatedCounts = {
            male: changedGenderType === 'male' ? newCount : data.guest_male,
            female: changedGenderType === 'female' ? newCount : data.guest_female,
            children: changedGenderType === 'children' ? newCount : data.guest_children,
        };

        // Pisahkan guest yang ada berdasarkan kategori (kecuali primary)
        const existingMales = currentGuests.filter(g => 
            g.relationship_to_primary !== 'self' && g.gender === 'male' && g.age_category === 'adult'
        );
        const existingFemales = currentGuests.filter(g => 
            g.relationship_to_primary !== 'self' && g.gender === 'female' && g.age_category === 'adult'
        );
        const existingChildren = currentGuests.filter(g => 
            g.age_category === 'child'
        );

        // Hitung kebutuhan male adults (dikurangi primary jika male)
        const neededMales = updatedCounts.male - (data.guest_gender === 'male' ? 1 : 0);
        for (let i = 0; i < neededMales; i++) {
            if (i < existingMales.length) {
                // Gunakan data yang sudah ada
                newGuests.push(existingMales[i]);
            } else {
                // Buat guest baru
                newGuests.push({
                    name: '',
                    gender: 'male',
                    age_category: 'adult',
                    relationship_to_primary: '',
                });
            }
        }

        // Hitung kebutuhan female adults (dikurangi primary jika female)
        const neededFemales = updatedCounts.female - (data.guest_gender === 'female' ? 1 : 0);
        for (let i = 0; i < neededFemales; i++) {
            if (i < existingFemales.length) {
                // Gunakan data yang sudah ada
                newGuests.push(existingFemales[i]);
            } else {
                // Buat guest baru
                newGuests.push({
                    name: '',
                    gender: 'female',
                    age_category: 'adult',
                    relationship_to_primary: '',
                });
            }   
        }

        // Tambahkan children
        for (let i = 0; i < updatedCounts.children; i++) {
            if (i < existingChildren.length) {
                // Gunakan data yang sudah ada
                newGuests.push(existingChildren[i]);
            } else {
                // Buat child baru
                newGuests.push({
                    name: '',
                    gender: 'male', // Default, bisa diubah
                    age_category: 'child',
                    relationship_to_primary: '',
                });
            }
        }

        setData((prev) => ({
            ...prev,
            guests: newGuests
        }));
    };

    // Fungsi untuk sinkronisasi sederhana (regenerate semua dari awal)
    const synchronizeGuestDetails = () => {
        const guests: GuestDetail[] = [];
        
        // Add primary guest (always first)
        guests.push({
            name: data.guest_name || '',
            gender: data.guest_gender,
            age_category: 'adult',
            relationship_to_primary: 'self',
            phone: data.guest_phone,
            email: data.guest_email,
        });

        // Add remaining male adults (excluding primary if primary is male)
        const remainingMales = data.guest_count_male - (data.guest_gender === 'male' ? 1 : 0);
        for (let i = 0; i < remainingMales; i++) {
            guests.push({
                name: '',
                gender: 'male',
                age_category: 'adult',
                relationship_to_primary: '',
            });
        }

        // Add female adults (excluding primary if primary is female)
        const remainingFemales = data.guest_count_female - (data.guest_gender === 'female' ? 1 : 0);
        for (let i = 0; i < remainingFemales; i++) {
            guests.push({
                name: '',
                gender: 'female',
                age_category: 'adult',
                relationship_to_primary: '',
            });
        }

        // Add children
        for (let i = 0; i < data.guest_count_children; i++) {
            guests.push({
                name: '',
                gender: 'male', // Default, can be changed
                age_category: 'child',
                relationship_to_primary: '',
            });
        }

        setData((prev) => ({
            ...prev,
            guests: guests
        }));
    };



    // Email checking function
    const checkEmailExists = useCallback(async (email: string) => {
        if (!email || !email.includes('@')) {
            setEmailStatus(null);
            setShowLoginPrompt(false);
            return;
        }

        setIsCheckingEmail(true);
        setEmailStatus('checking');

        try {
            const response = await fetch('/api/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.exists) {
                    setEmailStatus('exists');
                    setShowLoginPrompt(true);
                } else {
                    setEmailStatus('available');
                    setShowLoginPrompt(false);
                }
            } else {
                setEmailStatus(null);
                setShowLoginPrompt(false);
            }
        } catch (error) {
            console.error('Error checking email:', error);
            setEmailStatus(null);
            setShowLoginPrompt(false);
        } finally {
            setIsCheckingEmail(false);
        }
    }, []);

    // Debounced email checking
    const handleEmailChange = (email: string) => {
        setData((prev) => ({
            ...prev,
            guest_email: email
        }));

        // Clear existing timeout
        if (emailCheckTimeout) {
            clearTimeout(emailCheckTimeout);
        }

        // Set new timeout for checking email (Optional feature - not blocking submission)
        if (!auth?.user && email.includes('@')) { 
            const timeout = setTimeout(() => {
                checkEmailExists(email);
            }, 1000);
            setEmailCheckTimeout(timeout);
        }
    };
    
    const dpOptions = [
        { value: 50, label: t('booking.down_payment_50'), description: t('booking.pay_50_now') },
        { value: 70, label: t('booking.down_payment_70'), description: t('booking.pay_70_now') },
        { value: 100, label: t('booking.full_payment'), description: t('booking.pay_100_now') },
    ];

    const countries = [
        'Indonesia',
        'Singapore',
        'Malaysia',
        'Thailand',
        'Philippines',
        'Vietnam',
        'Cambodia',
        'Laos',
        'Myanmar',
        'Brunei',
        'Australia',
        'New Zealand',
        'Japan',
        'South Korea',
        'China',
        'India',
        'United States',
        'United Kingdom',
        'Germany',
        'France',
        'Netherlands',
        'Other'
    ];


    // Guest count validation
    const guestCountError = totalGuests > property.capacity_max;
    const canSubmit = data.check_in_date && 
                     data.check_out_date && 
                     data.check_in_time && 
                     totalGuests > 0 && 
                     !guestCountError && 
                     rateCalculation && 
                     !processing;

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
                                                    // Refetch availability when dates change
                                                    if (startDate && endDate) {
                                                        refetchAvailability(startDate, endDate);
                                                    }
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
                                                bookedDates={availabilityData?.booked_dates || initialAvailabilityData.booked_dates || []}
                                                loading={availabilityLoading}
                                                error={availabilityError}
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
                                                            {t('booking.property_available')} {t('booking.total')}: Rp {rateCalculation.total_amount.toLocaleString()} {t('booking.for')} {rateCalculation.nights} {t('booking.nights')}.
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
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'name', e.target.value);
                                                            }
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
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'gender', value);
                                                            }
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
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'phone', e.target.value);
                                                            }
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
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'email', e.target.value);
                                                            }
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
                                                        {data.guests.slice(1).map((guest, index) => (
                                                            <div key={index} className="border rounded-lg p-4 bg-white">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <User className="h-4 w-4 text-blue-600" />
                                                                    <h4 className="font-medium">{t('booking.guest')} {index + 2}</h4>
                                                                    <Badge variant="outline">
                                                                        {guest.age_category === 'child' ? t('booking.child') : 
                                                                         guest.gender === 'male' ? t('booking.male_adult') : t('booking.female_adult')}
                                                                    </Badge>
                                                                </div>
                                                                
                                                                <div className="grid md:grid-cols-3 gap-4">
                                                                    <div>
                                                                        <Label>{t('booking.full_name')} {guest.age_category === 'adult' ? '*' : ''}</Label>
                                                                        <Input
                                                                            value={guest.name}
                                                                            onChange={(e) => updateGuest(index + 1, 'name', e.target.value)}
                                                                            placeholder={t('booking.enter_guest_full_name')}
                                                                            className={guest.age_category === 'adult' && !guest.name ? 'border-red-500' : ''}
                                                                        />
                                                                        {guest.age_category === 'adult' && !guest.name && (
                                                                            <p className="text-sm text-red-600 mt-1">{t('booking.name_required_for_adult_guests')}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label>{t('booking.gender')} *</Label>
                                                                        <Select 
                                                                            value={guest.gender} 
                                                                            onValueChange={(value: 'male' | 'female') => updateGuest(index + 1, 'gender', value)}
                                                                        >
                                                                            <SelectTrigger className={!guest.gender ? 'border-red-500' : ''}>
                                                                                <SelectValue placeholder={t('booking.select_gender')} />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="male">{t('booking.male')}</SelectItem>
                                                                                <SelectItem value="female">{t('booking.female')}</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {!guest.gender && (
                                                                            <p className="text-sm text-red-600 mt-1">{t('booking.gender_required')}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label>{t('booking.relationship_to_primary_guest')} {guest.age_category === 'adult' ? '*' : ''}</Label>
                                                                        <Select 
                                                                            value={guest.relationship_to_primary} 
                                                                            onValueChange={(value) => updateGuest(index + 1, 'relationship_to_primary', value)}
                                                                        >
                                                                            <SelectTrigger className={guest.age_category === 'adult' && !guest.relationship_to_primary ? 'border-red-500' : ''}>
                                                                                <SelectValue placeholder={t('booking.select_relationship')} />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {relationshipToOptions.slice(1).map(option => (
                                                                                    <SelectItem key={option.value} value={option.value}>
                                                                                        {option.label}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {guest.age_category === 'adult' && !guest.relationship_to_primary && (
                                                                            <p className="text-sm text-red-600 mt-1">{t('booking.relationship_required_for_adult_guests')}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {guest.age_category === 'adult' && (
                                                                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                                                                        <div>
                                                                            <Label>{t('booking.phone_number')} (Optional)</Label>
                                                                            <Input
                                                                                value={guest.phone || ''}
                                                                                onChange={(e) => updateGuest(index + 1, 'phone', e.target.value)}
                                                                                placeholder={t('booking.enter_phone')}
                                                                            />
                                                                        </div>
                                                                            <div>
                                                                                <Label>{t('booking.email_address')} (Optional)</Label>
                                                                                <Input
                                                                                    value={guest.email || ''}
                                                                                    onChange={(e) => updateGuest(index + 1, 'email', e.target.value)} 
                                                                                    placeholder={t('booking.enter_email')}
                                                                                />
                                                                            </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
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
                                                {dpOptions.map((option) => (
                                                    <div
                                                        key={option.value}
                                                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                                            data.dp_percentage === option.value
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                        onClick={() => setData((prev) => ({
                                                            ...prev,
                                                            dp_percentage: option.value
                                                        }))}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-medium">{option.label}</div>
                                                                <div className="text-sm text-gray-600">{option.description}</div>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name="dp_percentage"
                                                                    value={option.value}
                                                                    checked={data.dp_percentage === option.value}
                                                                    onChange={() => setData((prev) => ({
                                                                        ...prev,
                                                                        dp_percentage: option.value
                                                                    }))}
                                                                    className="text-blue-600"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
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
                                {rateCalculation && (
                                    <Card className="shadow-xl border-0">
                                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2">
                                                    <Tag className="h-5 w-5" />
                                                    {t('booking.total_price')}
                                                </CardTitle>
                                                {/* discountInfo was removed, so this badge is no longer relevant */}
                                            </div>
                                            {/* Show discount prices */}
                                            {/* discountInfo was removed, so this section is no longer relevant */}
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="space-y-3 text-sm">
                                                    {/* Discount Price Display */}
                                                    {/* discountInfo was removed, so this section is no longer relevant */}

                                                    {/* Additional Fees */}
                                                    {rateCalculation.extra_bed_amount > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">{t('booking.extra_beds')} ({extraBeds})</span>
                                                            <span className="font-medium">
                                                                {t('booking.included')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">{t('booking.cleaning_fee')}</span>
                                                        <span className="font-medium">{t('booking.included')}</span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">{t('booking.taxes_fees')}</span>
                                                        <span className="font-medium">{t('booking.included')}</span>
                                                    </div>
                                                    
                                                    <Separator />
                                                    
                                                    {/* Final Total */}
                                                    <div className="flex justify-between items-center text-lg font-bold">
                                                        <span>{t('booking.total')}</span>
                                                        <span className="text-blue-600">
                                                            Rp {rateCalculation.total_amount.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="text-center text-xs text-green-600 bg-green-50 p-2 rounded">
                                                        ✓ {t('booking.all_inclusive_price_no_hidden_fees')}
                                                    </div>
                                                </div>
                                                
                                                <Separator />
                                                
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span>{t('booking.down_payment')} ({data.dp_percentage}%)</span>
                                                        <span className="font-medium">
                                                            Rp {(rateCalculation.total_amount * data.dp_percentage / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm text-gray-600">
                                                        <span>{t('booking.remaining')}</span>
                                                        <span>
                                                            Rp {(rateCalculation.total_amount * (100 - data.dp_percentage) / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
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
