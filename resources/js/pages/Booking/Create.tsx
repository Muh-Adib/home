import React, { useState, useEffect, useCallback } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Property } from '@/types/property';


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
    check_in: string;
    check_out: string;
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
    guests?: string;
}

export default function BookingCreate({ property, initialFormData, auth }: BookingCreateProps) {
    const { t } = useTranslation();
    // const page = usePage(); // Tidak perlu lagi
    // Hapus searchParams dan urlCheckIn/urlCheckOut/urlGuests

    // Inisialisasi state dari initialFormData
    const [totalGuests, setTotalGuests] = useState(initialFormData.guest_male + initialFormData.guest_female + initialFormData.guest_children);
    const [extraBeds, setExtraBeds] = useState(0);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [showGuestDetails, setShowGuestDetails] = useState(false);
    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
    
    // Email checking states
    const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'exists' | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Gunakan initialFormData dari props
    const { data, setData, post, processing, errors } = useForm<BookingFormData>(initialFormData);

    // Type assertion for errors to match BookingErrors interface
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

    // Calculate total guests whenever individual counts change
    useEffect(() => {
        const total = data.guest_male + data.guest_female + data.guest_children;
        setTotalGuests(total);

        const totalForExtraBeds = Math.ceil(data.guest_male + data.guest_female + Math.ceil((data.guest_children - property.bedroom_count) * 0.5));
        
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
            guest_male: maleCount,
            guest_female: femaleCount,
            guest_children: childrenCount,
        }));

        // Tampilkan feedback sinkronisasi
        setSyncFeedback('Gender count berhasil disinkronkan dari rincian tamu');
        setTimeout(() => setSyncFeedback(null), 2000);
    };

    // Fungsi untuk menangani perubahan gender count dengan mempertahankan data guest yang ada
    const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
        // Update count terlebih dahulu
        const countField = genderType === 'children' ? 'guest_children' : 
                          genderType === 'male' ? 'guest_male' : 'guest_female';
        
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
        const remainingMales = data.guest_male - (data.guest_gender === 'male' ? 1 : 0);
        for (let i = 0; i < remainingMales; i++) {
            guests.push({
                name: '',
                gender: 'male',
                age_category: 'adult',
                relationship_to_primary: '',
            });
        }

        // Add female adults (excluding primary if primary is female)
        const remainingFemales = data.guest_female - (data.guest_gender === 'female' ? 1 : 0);
        for (let i = 0; i < remainingFemales; i++) {
            guests.push({
                name: '',
                gender: 'female',
                age_category: 'adult',
                relationship_to_primary: '',
            });
        }

        // Add children
        for (let i = 0; i < data.guest_children; i++) {
            guests.push({
                name: '',
                gender: 'male', // Default, can be changed
                age_category: 'child',
                relationship_to_primary: 'child',
            });
        }

        setData((prev) => ({
            ...prev,
            guests: guests
        }));
    };

    const calculateRate = useCallback(async () => {
        try {
            const response = await fetch(`/api/properties/${property.slug}/calculate-rate?` + new URLSearchParams({
                check_in: data.check_in,
                check_out: data.check_out,
                guest_count: totalGuests.toString(),
            }));
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await response.json();
                    if (result.success) {
                        setRateCalculation(result.calculation);
                        setAvailabilityStatus('available');
                        console.log('Rate calculation:', result.calculation);
                    } else {
                        setAvailabilityStatus('unavailable');
                    }
                } else {
                    setAvailabilityStatus('unavailable');
                }
            } else {
                setAvailabilityStatus('unavailable');
            }
        } catch (error) {
            console.error('Error calculating rate:', error);
            setAvailabilityStatus('unavailable');
        }
    }, [property.slug, data.check_in, data.check_out, totalGuests]);

    // Calculate rate when dates change
    useEffect(() => {
        if (data.check_in && data.check_out) {
            setAvailabilityStatus('checking');
            calculateRate();
        }
    }, [data.check_in, data.check_out, calculateRate]);

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

        // Clear existing timeout to prevent memory leaks
        if (emailCheckTimeout) {
            clearTimeout(emailCheckTimeout);
            setEmailCheckTimeout(null);
        }

        // Set new timeout for checking email (Optional feature - not blocking submission)
        if (!auth?.user && email.includes('@')) { 
            const timeout = setTimeout(() => {
                checkEmailExists(email);
            }, 1000);
            setEmailCheckTimeout(timeout);
        }
    };

    // Cleanup timeouts on component unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (emailCheckTimeout) {
                clearTimeout(emailCheckTimeout);
            }
        };
    }, [emailCheckTimeout]);
    
    const dpOptions = [
        { value: 50, label: '50% Down Payment', description: 'Pay 50% now, 50% later' },
        { value: 70, label: '70% Down Payment', description: 'Pay 70% now, 30% later' },
        { value: 100, label: '100% Full Payment', description: 'Pay 100% now' },
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

    const relationshipOptions = [
        { value: 'keluarga', label: t('booking.family') },
        { value: 'teman', label: t('booking.friends') },
        { value: 'kolega', label: t('booking.colleagues') },
        { value: 'pasangan', label: t('booking.couple') },
        { value: 'campuran', label: t('booking.mixed') },
    ];

    const relationshipToOptions = [
        { value: 'self', label: t('booking.self') },
        { value: 'spouse', label: t('booking.spouse') },
        { value: 'child', label: t('booking.child') },
        { value: 'parent', label: t('booking.parent') },
        { value: 'sibling', label: t('booking.sibling') },
        { value: 'friend', label: t('booking.friend') },
        { value: 'colleague', label: t('booking.colleague') },
        { value: 'relative', label: t('booking.relative') },
        { value: 'other', label: t('booking.other') },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        console.log('Form submission started', {
            data,
            canSubmit,
            totalGuests,
            availabilityStatus,
            hasRateCalculation: !!rateCalculation
        });
        
        if (!canSubmit) {
            console.warn('Form submission blocked - validation failed', {
                hasCheckInDate: !!data.check_in,
                hasCheckOutDate: !!data.check_out,
                guestCountError,
                hasGuestName: !!data.guest_name?.trim(),
                hasGuestEmail: !!data.guest_email?.trim(),
                hasGuestPhone: !!data.guest_phone?.trim(),
                hasCountry: !!data.guest_country,
                totalGuests,
                availabilityStatus,
                hasRateCalculation: !!rateCalculation
            });
            return;
        }

        // ✅ FIX: Prepare data with proper field mapping
        const submitData = {
            // ✅ FIX: Ensure proper date format (YYYY-MM-DD)
            check_in: data.check_in,
            check_out: data.check_out,
            check_in_time: data.check_in_time || '15:00',
            
            // ✅ FIX: Ensure proper guest count calculation
            guest_male: data.guest_male || 0,
            guest_female: data.guest_female || 0,
            guest_children: data.guest_children || 0,
            guest_count: totalGuests,
            
            // Guest information
            guest_name: data.guest_name?.trim() || '',
            guest_email: data.guest_email?.trim() || '',
            guest_phone: data.guest_phone?.trim() || '',
            guest_country: data.guest_country || 'Indonesia',
            guest_id_number: data.guest_id_number || '',
            guest_gender: data.guest_gender || 'male',
            relationship_type: data.relationship_type || 'keluarga',
            
            // Booking details
            special_requests: data.special_requests || '',
            dp_percentage: data.dp_percentage || 50,
            guests: data.guests || [],
        };

        console.log('Submitting booking data:', submitData);
        
        // Always use the same booking route - backend will handle user registration if needed
        post(`/properties/${property.slug}/book`, {
            ...submitData,
            onStart: () => {
                console.log('Starting booking submission...');
            },
            onSuccess: (page: any) => {
                console.log('Booking created successfully:', page);
            },
            onError: (errors: any) => {
                console.error('Booking creation failed:', errors);
            },
            onFinish: () => {
                console.log('Booking submission finished');
            }
        });
    };

    const guestCountError = totalGuests > property.capacity_max;
    const canSubmit = data.check_in && 
                     data.check_out && 
                     !guestCountError && 
                     data.guest_name.trim() && 
                     data.guest_email.trim() && 
                     data.guest_phone.trim() && 
                     data.guest_country && 
                     totalGuests > 0 && 
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
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                        {/* Booking Form */}
                        <div className="xl:col-span-2">
                            <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/30">
                                <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
                                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        {t('booking.book_your_stay')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                                        

                                        {/* Dates */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">{t('booking.check_in_checkout_dates')}</Label>
                                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                                                <div className="flex-1 text-center">
                                                                            <div className="text-xs text-muted-foreground mb-1">Check in</div>
                        <div className="font-semibold text-foreground text-sm">
                                                        {/* Tampilkan tanggal, readonly */}
                                                        <Input
                                                            type="text"
                                                            value={data.check_in ? new Date(data.check_in).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                                            readOnly
                                                            disabled
                                                            className="bg-muted cursor-not-allowed text-center border-0 p-0 shadow-none focus:ring-0 focus:border-0 text-foreground"
                                                        />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {data.check_in_time}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="w-8 h-0.5 bg-border"></div>
                                                    <div className="text-xs text-muted-foreground mt-1">{data.check_in && data.check_out ? `${rateCalculation?.nights || 0} malam` : ''}</div>
                                                </div>
                                                <div className="flex-1 text-center">
                                                    <div className="text-xs text-muted-foreground mb-1">Check out</div>
                                                    <div className="font-semibold text-foreground text-sm">
                                                        <Input
                                                            type="text"
                                                            value={data.check_out ? new Date(data.check_out).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                                            readOnly
                                                            disabled
                                                            className="bg-muted cursor-not-allowed text-center border-0 p-0 shadow-none focus:ring-0 focus:border-0 text-foreground"
                                                        />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {property.check_out_time}
                                                    </div>
                                                </div>
                                            </div>
                                            {(bookingErrors.check_in || bookingErrors.check_out) && (
                                                <p className="text-sm text-red-600 mt-1">
                                                    {bookingErrors.check_in || bookingErrors.check_out}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">{t('booking.check_in_time')}</Label>
                                            <Select value={data.check_in_time} onValueChange={(value: any) => setData((prev) => ({
                                                ...prev,
                                                check_in_time: value
                                            }))}>
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
                                                           {t('booking.property_available',{total: rateCalculation.total_amount.toLocaleString(), nights: rateCalculation.nights})}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}

                                        <Separator />

                                        {/* Guest Count */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-primary" />
                                                <h3 className="text-lg font-semibold text-foreground">{t('booking.guest_count')}</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 bg-muted/50 p-4 sm:p-6 rounded-lg border border-border">
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_male" className="text-sm font-medium">{t('booking.male_adults')}</Label>
                                                    <Input
                                                        id="guest_male"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_male}
                                                        onChange={(e) => handleGenderCountChange('male', parseInt(e.target.value) || 0)}
                                                        className={`h-12 text-base ${bookingErrors.guest_male ? 'border-red-500' : ''}`}
                                                    />
                                                    {bookingErrors.guest_male && (
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_male}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_female" className="text-sm font-medium">{t('booking.female_adults')}</Label>
                                                    <Input
                                                        id="guest_female"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_female}
                                                        onChange={(e) => handleGenderCountChange('female', parseInt(e.target.value) || 0)}
                                                        className={`h-12 text-base ${bookingErrors.guest_female ? 'border-red-500' : ''}`}
                                                    />
                                                    {bookingErrors.guest_female && (
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_female}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_children" className="text-sm font-medium">{t('booking.children')}</Label>
                                                    <Input
                                                        id="guest_children"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_children}
                                                        onChange={(e) => handleGenderCountChange('children', parseInt(e.target.value) || 0)}
                                                        className={`h-12 text-base ${bookingErrors.guest_children ? 'border-red-500' : ''}`}
                                                    />
                                                    {bookingErrors.guest_children && (
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_children}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Guest Count Summary */}
                                            <div className="bg-muted/50 p-4 sm:p-6 rounded-lg border border-border">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-medium text-base">{t('booking.total_guests')}:</span>
                                                    <Badge variant={guestCountError ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                                                        {totalGuests} guests
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground mb-3">
                                                    {t('booking.property_capacity')}: {property.capacity} - {property.capacity_max} {t('booking.guests')}
                                                </div>
                                                
                                                {extraBeds > 0 && (
                                                    <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-primary/10 rounded border border-primary/20">
                                                        <Bed className="h-4 w-4 text-primary" />
                                                        <span className="font-medium text-foreground">{t('booking.extra_beds_needed')}: {extraBeds}</span>
                                                        <span className="text-muted-foreground">
                                                            (+Rp {(extraBeds * property.extra_bed_rate).toLocaleString()}/night)
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {guestCountError && (
                                                    <Alert className="mt-3 border-red-500/20 bg-red-500/10">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription className="text-red-600">
                                                            {t('booking.guest_count_exceeds',{max: property.capacity_max})}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {/* Sync Info */}
                                                <div className="mt-4 pt-3 border-t border-border">
                                                    <div className="flex items-start gap-2 text-xs text-primary overflow-wrap">
                                                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                        <span>{t('booking.sync_info')}</span>
                                                    </div>
                                                    
                                                    {/* Sync Feedback */}
                                                    {syncFeedback && (
                                                        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 bg-green-500/10 p-3 rounded border border-green-500/20">
                                                            <CheckCircle className="h-3 w-3" />
                                                            <span>{syncFeedback}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Primary Guest Info */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-foreground">{t('booking.primary_guest')}</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_name" className="text-sm font-medium text-foreground">{t('booking.full_name')} *</Label>
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
                                                        className={`h-12 text-base ${bookingErrors.guest_name ? 'border-red-500' : ''}`}
                                                        placeholder={t('booking.enter_full_name')}
                                                    />
                                                    {bookingErrors.guest_name && (
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_name}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_gender" className="text-sm font-medium text-foreground">{t('booking.gender')} *</Label>
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
                                                        <SelectTrigger className={`h-12 text-base ${bookingErrors.guest_gender ? 'border-red-500' : ''}`}>
                                                            <SelectValue placeholder="Select gender" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">{t('booking.male')}</SelectItem>
                                                            <SelectItem value="female">{t('booking.female')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {bookingErrors.guest_gender && (
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_gender}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_phone" className="text-sm font-medium text-foreground">{t('booking.phone_number')}*</Label>
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
                                                            if (data.guests.length > 9) {
                                                                updateGuest(0, 'phone', e.target.value);
                                                            }
                                                        }}
                                                        className={`h-12 text-base ${bookingErrors.guest_phone ? 'border-red-500' : ''}`}
                                                        placeholder="628xxx"
                                                    />
                                                    {bookingErrors.guest_phone && (
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_phone}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_email" className="text-sm font-medium text-foreground">{t('booking.email_address')} *</Label>
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
                                                        className={`h-12 text-base ${bookingErrors.guest_email ? 'border-red-500' : ''}`}
                                                        placeholder="your@email.com"
                                                    />
                                                    {bookingErrors.guest_email && (
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_email}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="guest_country" className="text-sm font-medium text-foreground">{t('booking.country')} *</Label>
                                                    <Select value={data.guest_country} onValueChange={(value: any) => setData((prev) => ({
                                                        ...prev,
                                                        guest_country: value
                                                    }))}>
                                                        <SelectTrigger className={`h-12 text-base ${bookingErrors.guest_country ? 'border-red-500' : ''}`}>
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
                                                        <p className="text-sm text-red-600">{bookingErrors.guest_country}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Group Relationship */}
                                        <div className="space-y-3">
                                            <Label htmlFor="relationship_type" className="text-base font-medium text-foreground">{t('booking.guest_relationship')} *</Label>
                                            <Select value={data.relationship_type} onValueChange={(value: any) => setData((prev) => ({
                                                ...prev,
                                                relationship_type: value
                                            }))}>
                                                <SelectTrigger className={`h-12 text-base ${bookingErrors.relationship_type ? 'border-red-500' : ''}`}>
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
                                                <p className="text-sm text-red-600">{bookingErrors.relationship_type}</p>
                                            )}
                                        </div>

                                        {/* Additional Guest Details */}
                                        {totalGuests > 1 && (
                                            <div className="space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                    <h3 className="text-lg font-semibold text-foreground">{t('booking.guest_details')}</h3>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowGuestDetails(!showGuestDetails)}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                        {showGuestDetails ? t('booking.hide_details') : t('booking.add_guest_details')}
                                                    </Button>
                                                </div>

                                                {showGuestDetails && (
                                                    <div className="space-y-4 border rounded-lg p-4 sm:p-6 bg-muted/50 border-border">
                                                        {data.guests.slice(1).map((guest, index) => (
                                                            <div key={index} className="border rounded-lg p-4 sm:p-6 bg-card border-border">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <User className="h-4 w-4 text-primary" />
                                                                        <h4 className="font-medium text-foreground">{t('booking.guest_num',{number: index + 2})}</h4>
                                                                    </div>
                                                                    <Badge variant="outline" className="w-fit">
                                                                        {guest.age_category === 'child' ? t('booking.child') : 
                                                                         guest.gender === 'male' ? t('booking.male_adults') : t('booking.female_adults')}
                                                                    </Badge>
                                                                </div>
                                                                
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium text-foreground">{t('booking.full_name')} {guest.age_category === 'adult' ? '*' : ''}</Label>
                                                                        <Input
                                                                            value={guest.name}
                                                                            onChange={(e) => updateGuest(index + 1, 'name', e.target.value)}
                                                                            placeholder={t('booking.enter_full_name')}
                                                                            className={`h-12 text-base ${guest.age_category === 'adult' && !guest.name ? 'border-red-500' : ''}`}
                                                                        />
                                                                        {guest.age_category === 'adult' && !guest.name && (
                                                                            <p className="text-sm text-red-600">{t('booking.name_required_adults')}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium text-foreground">{t('booking.gender')} *</Label>
                                                                        <Select 
                                                                            value={guest.gender} 
                                                                            onValueChange={(value: 'male' | 'female') => updateGuest(index + 1, 'gender', value)}
                                                                        >
                                                                            <SelectTrigger className={`h-12 text-base ${!guest.gender ? 'border-red-500' : ''}`}>
                                                                                <SelectValue placeholder="Select gender" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="male">{t('booking.male')}</SelectItem>
                                                                                <SelectItem value="female">{t('booking.female')}</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {!guest.gender && (
                                                                            <p className="text-sm text-red-600">{t('booking.gender_required')}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium text-foreground">{t('booking.relationship_to_primary')} {guest.age_category === 'adult' ? '*' : ''}</Label>
                                                                        <Select 
                                                                            value={guest.relationship_to_primary} 
                                                                            onValueChange={(value) => updateGuest(index + 1, 'relationship_to_primary', value)}
                                                                        >
                                                                            <SelectTrigger className={`h-12 text-base ${guest.age_category === 'adult' && !guest.relationship_to_primary ? 'border-red-500' : ''}`}>
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
                                                                            <p className="text-sm text-red-600">{t('booking.relationship_required_adults')}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <Separator />

                                        {/* Down Payment Options */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-5 w-5 text-primary" />
                                                <h3 className="text-lg font-semibold text-foreground">Payment Option</h3>
                                            </div>
                                            
                                            <div className="grid gap-3">
                                                {dpOptions.map((option) => (
                                                    <div
                                                        key={option.value}
                                                        className={`border rounded-lg p-4 sm:p-6 cursor-pointer transition-colors ${
                                                            data.dp_percentage === option.value
                                                                ? 'border-primary bg-primary/10'
                                                                : 'border-border hover:border-primary/50'
                                                        }`}
                                                        onClick={() => setData((prev) => ({
                                                            ...prev,
                                                            dp_percentage: option.value
                                                        }))}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="font-medium text-base text-foreground">{option.label}</div>
                                                                <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
                                                            </div>
                                                            <div className="flex items-center ml-4">
                                                                <input
                                                                    type="radio"
                                                                    name="dp_percentage"
                                                                    value={option.value}
                                                                    checked={data.dp_percentage === option.value}
                                                                    onChange={() => setData((prev) => ({
                                                                        ...prev,
                                                                        dp_percentage: option.value
                                                                    }))}
                                                                    className="text-primary w-4 h-4"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Special Requests */}
                                        <div className="space-y-3">
                                            <Label htmlFor="special_requests" className="text-base font-medium text-foreground">Special Requests (Optional)</Label>
                                            <Textarea
                                                id="special_requests"
                                                value={data.special_requests}
                                                onChange={(e) => setData((prev) => ({
                                                    ...prev,
                                                    special_requests: e.target.value
                                                }))}
                                                rows={4}
                                                placeholder="Any special requests or requirements..."
                                                className="text-base resize-none"
                                            />
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                            <Link href={`/properties/${property.slug}`} className="flex-1">
                                                <Button variant="outline" className="w-full h-12 text-base">{t('common.cancel')}</Button>
                                            </Link>
                                            <Button 
                                                type="submit" 
                                                disabled={!canSubmit || processing}
                                                className="flex-1 h-12 text-base"
                                            >
                                                {processing ? t('booking.processing') : t('booking.continue_confirmation')}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Property Summary & Rate */}
                        <div className="xl:col-span-1">
                            <div className="sticky top-4 space-y-4 sm:space-y-6">
                                {/* Property Info */}
                                <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/30">
                                    <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
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
                                                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                                        <Building2 className="h-8 w-8 text-primary/60" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-semibold">{property.name}</h3>
                                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                    <MapPin className="h-4 w-4 mr-1" />
                                                    {property.address}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Rate Calculation */}
                                {rateCalculation && (
                                    <Card className="shadow-xl border-0 bg-gradient-to-br from-card to-muted/30">
                                        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-4 sm:p-6 border-b border-red-200">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-foreground">
                                                    <Tag className="h-5 w-5 text-red-600" />
                                                    Total Price
                                                </CardTitle>
                                                {discountInfo && (
                                                    <Badge variant="destructive" className="text-sm">
                                                        <Percent className="h-3 w-3 mr-1" />
                                                        {discountInfo.discount_percent}% OFF
                                                    </Badge>
                                                )}
                                            </div>
                                            {/* Show discount prices */}
                                            {discountInfo && (
                                                                                                    <div className="space-y-1 mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg text-muted-foreground line-through">
                                                                Rp {discountInfo.original_price.toLocaleString()}
                                                            </span>
                                                            <Badge variant="destructive" className="text-xs">
                                                                -{discountInfo.discount_percent}%
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <span className="text-3xl font-bold text-red-600">
                                                                Rp {discountInfo.final_price.toLocaleString()}
                                                            </span>
                                                            <span className="text-muted-foreground ml-1">total</span>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            (Rp {Math.round(discountInfo.final_price / discountInfo.nights).toLocaleString()}/night)
                                                        </div>
                                                    </div>
                                            )}
                                        </CardHeader>
                                        <CardContent className="px-4 sm:px-6">
                                            <div className="space-y-4">
                                                                                                    <div className="space-y-3 text-sm">
                                                        {/* Discount Price Display */}
                                                        {discountInfo && (
                                                            <>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground">Original Price</span>
                                                                    <span className="text-muted-foreground line-through">
                                                                        Rp {discountInfo.original_price.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-muted-foreground">Discount</span>
                                                                        <Badge variant="destructive" className="text-xs">
                                                                            {discountInfo.discount_percent}% OFF
                                                                        </Badge>
                                                                    </div>
                                                                    <span className="text-red-600 font-medium">
                                                                        -Rp {discountInfo.discount_amount.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Additional Fees */}
                                                        {rateCalculation.extra_bed_amount > 0 && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">Extra beds ({extraBeds})</span>
                                                                <span className="font-medium text-foreground">
                                                                    Included
                                                                </span>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">Cleaning fee</span>
                                                            <span className="font-medium text-foreground">Included</span>
                                                        </div>

                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">Taxes & fees</span>
                                                            <span className="font-medium text-foreground">Included</span>
                                                        </div>
                                                        
                                                        <Separator />
                                                        
                                                        {/* Final Total */}
                                                        <div className="flex justify-between items-center text-lg font-bold">
                                                            <span className="text-foreground">Total</span>
                                                            <span className="text-red-600">
                                                                Rp {rateCalculation.total_amount.toLocaleString()}
                                                            </span>
                                                        </div>

                                                        <div className="text-center text-xs text-green-600 bg-green-500/10 p-3 rounded border border-green-500/20">
                                                            ✓ All-inclusive price, no hidden fees
                                                        </div>
                                                    </div>
                                                
                                                <Separator />
                                                
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-foreground">Down Payment ({data.dp_percentage}%)</span>
                                                        <span className="font-medium text-foreground">
                                                            Rp {(rateCalculation.total_amount * data.dp_percentage / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm text-muted-foreground">
                                                        <span>Remaining</span>
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
    </GuestLayout>
);
} 