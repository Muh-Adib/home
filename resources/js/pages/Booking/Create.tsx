import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
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
    User
} from 'lucide-react';
import { DateRange, getDefaultDateRange } from '@/components/ui/date-range';

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
    guest_count_male: number;
    guest_count_female: number;
    guest_count_children: number;
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

export default function BookingCreate({ property, auth }: BookingCreateProps) {
    const page = usePage();
    const searchParams = new URLSearchParams(window.location.search);
    
    // Get URL parameters
    const urlCheckIn = searchParams.get('check_in') || '';
    const urlCheckOut = searchParams.get('check_out') || '';
    const urlGuests = parseInt(searchParams.get('guests') || '2');

    const [totalGuests, setTotalGuests] = useState(urlGuests);
    const [extraBeds, setExtraBeds] = useState(0);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [showGuestDetails, setShowGuestDetails] = useState(false);
    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

    // Calculate minimum stay for initial dates validation
    const getMinimumStay = () => {
        const today = new Date();
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        return isWeekend ? property.min_stay_weekend : property.min_stay_weekday;
    };

    // Auto-fill form data based on user login status and URL params
    const getInitialFormData = (): BookingFormData => {
        // Auto-fill with user data if logged in
        const user = auth?.user;
        
        return {
            check_in_date: urlCheckIn || '',
            check_out_date: urlCheckOut || '',
            guest_count_male: 2,
            guest_count_female: 2,
            guest_count_children: 0,
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

    const { data, setData, post, processing, errors } = useForm<BookingFormData>(getInitialFormData());

    // Calculate total guests whenever individual counts change
    useEffect(() => {
        const total = data.guest_count_male + data.guest_count_female + data.guest_count_children;
        setTotalGuests(total);

        const totalForExtraBeds = Math.ceil(data.guest_count_male + data.guest_count_female + (data.guest_count_children * 0.5));
        
        // Calculate extra beds needed
        const extraBedsNeeded = Math.max(0, totalForExtraBeds - property.capacity);
        setExtraBeds(extraBedsNeeded);

        // Auto-generate guest list based on counts
        generateGuestList();

        // Auto-show guest details when total guests > 1
        setShowGuestDetails(total > 1);
    }, [data.guest_count_male, data.guest_count_female, data.guest_count_children, data.guest_gender, property.capacity]);

    const generateGuestList = () => {
        // Gunakan fungsi sinkronisasi yang sudah dibuat
        synchronizeGuestDetails();
    };

    const updateGuest = (index: number, field: keyof GuestDetail, value: string) => {
        const newGuests = [...data.guests];
        newGuests[index] = { ...newGuests[index], [field]: value };
        setData('guests', newGuests);
        
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
        
        setData(countField, newCount);
        
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
            male: changedGenderType === 'male' ? newCount : data.guest_count_male,
            female: changedGenderType === 'female' ? newCount : data.guest_count_female,
            children: changedGenderType === 'children' ? newCount : data.guest_count_children,
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

        setData('guests', newGuests);
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

        setData('guests', guests);
    };

    const calculateRate = useCallback(async () => {
        try {
            const response = await fetch(`/api/properties/${property.slug}/calculate-rate?` + new URLSearchParams({
                check_in: data.check_in_date,
                check_out: data.check_out_date,
                guest_count: totalGuests.toString(),
            }));
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await response.json();
                    if (result.success) {
                        setRateCalculation(result.calculation);
                        setAvailabilityStatus('available');
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
    }, [property.slug, data.check_in_date, data.check_out_date, totalGuests]);

    // Calculate rate when dates change
    useEffect(() => {
        if (data.check_in_date && data.check_out_date) {
            setAvailabilityStatus('checking');
            calculateRate();
        }
    }, [data.check_in_date, data.check_out_date, calculateRate]);

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

    const relationshipOptions = [
        { value: 'keluarga', label: 'Family' },
        { value: 'teman', label: 'Friends' },
        { value: 'kolega', label: 'Colleagues' },
        { value: 'pasangan', label: 'Couple' },
        { value: 'campuran', label: 'Mixed Group' },
    ];

    const relationshipToOptions = [
        { value: 'self', label: 'Self (Primary Guest)' },
        { value: 'spouse', label: 'Spouse' },
        { value: 'child', label: 'Child' },
        { value: 'parent', label: 'Parent' },
        { value: 'sibling', label: 'Sibling' },
        { value: 'friend', label: 'Friend' },
        { value: 'colleague', label: 'Colleague' },
        { value: 'relative', label: 'Relative' },
        { value: 'other', label: 'Other' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check if user is logged in
        if (!auth?.user) {
            // Auto-register user first, then create booking
            router.post('/register/auto', {
                name: data.guest_name,
                email: data.guest_email,
                phone: data.guest_phone,
                gender: data.guest_gender,
                booking_data: JSON.stringify(data), // Pass booking data to be processed after registration
                property_slug: property.slug,
            });
        } else {
            // User is logged in, proceed with normal booking
            post(`/properties/${property.slug}/book`);
        }
    };

    const guestCountError = totalGuests > property.capacity_max;
    const canSubmit = data.check_in_date && 
                     data.check_out_date && 
                     !guestCountError && 
                     data.guest_name && 
                     data.guest_email && 
                     data.guest_phone && 
                     data.guest_country && 
                     data.guests.length > 0 && 
                     availabilityStatus === 'available' && 
                     rateCalculation !== null;

    return (
        <>
            <Head title={`Book ${property.name} - Property Management System`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <Link href={`/properties/${property.slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Property
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
                                        Book Your Stay
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Global Error Display */}
                                        {Object.keys(errors).length > 0 && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <div className="font-medium mb-2">Please fix the following errors:</div>
                                                    <ul className="text-sm space-y-1">
                                                        {Object.entries(errors).map(([field, message]) => (
                                                            <li key={field}>• {message}</li>
                                                        ))}
                                                    </ul>
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Dates */}
                                        <div>
                                            <Label>Check-in & Check-out Dates</Label>
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
                                                className={errors.check_in_date || errors.check_out_date ? 'border-red-500' : ''}
                                            />
                                            {(errors.check_in_date || errors.check_out_date) && (
                                                <p className="text-sm text-red-600 mt-1">
                                                    {errors.check_in_date || errors.check_out_date}
                                                </p>
                                            )}
                                        </div>

                                        {/* Availability Status */}
                                        {data.check_in_date && data.check_out_date && (
                                            <div className="mt-4">
                                                {availabilityStatus === 'checking' && (
                                                    <Alert>
                                                        <Clock className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Checking availability and calculating rates...
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                
                                                {availabilityStatus === 'unavailable' && (
                                                    <Alert variant="destructive">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Property is not available for selected dates. Please choose different dates.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                
                                                {availabilityStatus === 'available' && rateCalculation && (
                                                    <Alert>
                                                        <CheckCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Property is available! Total: Rp {rateCalculation.total_amount.toLocaleString()} for {rateCalculation.nights} nights.
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
                                                <h3 className="text-lg font-semibold">Guest Count</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                <div>
                                                    <Label htmlFor="guest_count_male">Male Adults</Label>
                                                    <Input
                                                        id="guest_count_male"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_count_male}
                                                        onChange={(e) => handleGenderCountChange('male', parseInt(e.target.value) || 0)}
                                                        className={errors.guest_count_male ? 'border-red-500' : ''}
                                                    />
                                                    {errors.guest_count_male && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_count_male}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_count_female">Female Adults</Label>
                                                    <Input
                                                        id="guest_count_female"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_count_female}
                                                        onChange={(e) => handleGenderCountChange('female', parseInt(e.target.value) || 0)}
                                                        className={errors.guest_count_female ? 'border-red-500' : ''}
                                                    />
                                                    {errors.guest_count_female && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_count_female}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_count_children">Children (0-10)</Label>
                                                    <Input
                                                        id="guest_count_children"
                                                        type="number"
                                                        min="0"
                                                        value={data.guest_count_children}
                                                        onChange={(e) => handleGenderCountChange('children', parseInt(e.target.value) || 0)}
                                                        className={errors.guest_count_children ? 'border-red-500' : ''}
                                                    />
                                                    {errors.guest_count_children && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_count_children}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Guest Count Summary */}
                                            <div className="bg-slate-50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium">Total Guests:</span>
                                                    <Badge variant={guestCountError ? "destructive" : "secondary"}>
                                                        {totalGuests} guests
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Property capacity: {property.capacity} - {property.capacity_max} guests
                                                </div>
                                                
                                                {extraBeds > 0 && (
                                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                                        <Bed className="h-4 w-4 text-blue-600" />
                                                        <span>Extra beds needed: {extraBeds}</span>
                                                        <span className="text-gray-600">
                                                            (+Rp {(extraBeds * property.extra_bed_rate).toLocaleString()}/night)
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {guestCountError && (
                                                    <Alert className="mt-2">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Guest count exceeds maximum capacity ({property.capacity_max})
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {/* Sync Info */}
                                                <div className="mt-3 pt-3 border-t border-slate-200">
                                                    <div className="flex items-center gap-2 text-xs text-blue-600">
                                                        <Info className="h-3 w-3" />
                                                        <span>Rincian tamu akan otomatis sinkron dengan rincian tamu di bawah</span>
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
                                            <h3 className="text-lg font-semibold mb-4">Primary Guest Information</h3>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label htmlFor="guest_name">Full Name *</Label>
                                                    <Input
                                                        id="guest_name"
                                                        type="text"
                                                        value={data.guest_name}
                                                        onChange={(e) => {
                                                            setData('guest_name', e.target.value);
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'name', e.target.value);
                                                            }
                                                        }}
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
                                                        onValueChange={(value: 'male' | 'female') => {
                                                            setData('guest_gender', value);
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'gender', value);
                                                            }
                                                        }}
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
                                                        onChange={(e) => {
                                                            setData('guest_phone', e.target.value);
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'phone', e.target.value);
                                                            }
                                                        }}
                                                        className={errors.guest_phone ? 'border-red-500' : ''}
                                                        placeholder="+62xxx"
                                                    />
                                                    {errors.guest_phone && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_phone}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <Label htmlFor="guest_email">Email Address *</Label>
                                                    <Input
                                                        id="guest_email"
                                                        type="email"
                                                        value={data.guest_email}
                                                        onChange={(e) => {
                                                            setData('guest_email', e.target.value);
                                                            // Update primary guest in guests array
                                                            if (data.guests.length > 0) {
                                                                updateGuest(0, 'email', e.target.value);
                                                            }
                                                        }}
                                                        className={errors.guest_email ? 'border-red-500' : ''}
                                                        placeholder="your@email.com"
                                                    />
                                                    {errors.guest_email && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_email}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_country">Country *</Label>
                                                    <Select value={data.guest_country} onValueChange={(value: any) => setData('guest_country', value)}>
                                                        <SelectTrigger className={errors.guest_country ? 'border-red-500' : ''}>
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
                                                    {errors.guest_country && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_country}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Group Relationship */}
                                        <div>
                                            <Label htmlFor="relationship_type">Group Relationship *</Label>
                                            <Select value={data.relationship_type} onValueChange={(value: any) => setData('relationship_type', value)}>
                                                <SelectTrigger className={errors.relationship_type ? 'border-red-500' : ''}>
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
                                            {errors.relationship_type && (
                                                <p className="text-sm text-red-600 mt-1">{errors.relationship_type}</p>
                                            )}
                                        </div>

                                        {/* Additional Guest Details */}
                                        {totalGuests > 1 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold">Guest Details</h3>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowGuestDetails(!showGuestDetails)}
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                        {showGuestDetails ? 'Hide Details' : 'Add Guest Details'}
                                                    </Button>
                                                </div>

                                                {showGuestDetails && (
                                                    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                                                        {data.guests.slice(1).map((guest, index) => (
                                                            <div key={index} className="border rounded-lg p-4 bg-white">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <User className="h-4 w-4 text-blue-600" />
                                                                    <h4 className="font-medium">Guest {index + 2}</h4>
                                                                    <Badge variant="outline">
                                                                        {guest.age_category === 'child' ? 'Child' : 
                                                                         guest.gender === 'male' ? 'Male Adult' : 'Female Adult'}
                                                                    </Badge>
                                                                </div>
                                                                
                                                                <div className="grid md:grid-cols-3 gap-4">
                                                                    <div>
                                                                        <Label>Full Name {guest.age_category === 'adult' ? '*' : ''}</Label>
                                                                        <Input
                                                                            value={guest.name}
                                                                            onChange={(e) => updateGuest(index + 1, 'name', e.target.value)}
                                                                            placeholder="Enter guest name"
                                                                            className={guest.age_category === 'adult' && !guest.name ? 'border-red-500' : ''}
                                                                        />
                                                                        {guest.age_category === 'adult' && !guest.name && (
                                                                            <p className="text-sm text-red-600 mt-1">Name is required for adult guests</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label>Gender *</Label>
                                                                        <Select 
                                                                            value={guest.gender} 
                                                                            onValueChange={(value: 'male' | 'female') => updateGuest(index + 1, 'gender', value)}
                                                                        >
                                                                            <SelectTrigger className={!guest.gender ? 'border-red-500' : ''}>
                                                                                <SelectValue placeholder="Select gender" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="male">Male</SelectItem>
                                                                                <SelectItem value="female">Female</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {!guest.gender && (
                                                                            <p className="text-sm text-red-600 mt-1">Gender is required</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label>Relationship to Primary Guest {guest.age_category === 'adult' ? '*' : ''}</Label>
                                                                        <Select 
                                                                            value={guest.relationship_to_primary} 
                                                                            onValueChange={(value) => updateGuest(index + 1, 'relationship_to_primary', value)}
                                                                        >
                                                                            <SelectTrigger className={guest.age_category === 'adult' && !guest.relationship_to_primary ? 'border-red-500' : ''}>
                                                                                <SelectValue placeholder="Select relationship" />
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
                                                                            <p className="text-sm text-red-600 mt-1">Relationship is required for adult guests</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {guest.age_category === 'adult' && (
                                                                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                                                                        <div>
                                                                            <Label>Phone (Optional)</Label>
                                                                            <Input
                                                                                value={guest.phone || ''}
                                                                                onChange={(e) => updateGuest(index + 1, 'phone', e.target.value)}
                                                                                placeholder="Phone number"
                                                                            />
                                                                        </div>
                                                                            <div>
                                                                                <Label>Email (Optional)</Label>
                                                                                <Input
                                                                                    value={guest.email || ''}
                                                                                    onChange={(e) => updateGuest(index + 1, 'email', e.target.value)} 
                                                                                    placeholder="your@email.com"
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
                                                <h3 className="text-lg font-semibold">Payment Option</h3>
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
                                                        onClick={() => setData('dp_percentage', option.value)}
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
                                                                    onChange={() => setData('dp_percentage', option.value)}
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
                                            <Label htmlFor="special_requests">Special Requests (Optional)</Label>
                                            <Textarea
                                                id="special_requests"
                                                value={data.special_requests}
                                                onChange={(e) => setData('special_requests', e.target.value)}
                                                rows={3}
                                                placeholder="Any special requests or requirements..."
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <Link href={`/properties/${property.slug}`} className="flex-1">
                                                <Button variant="outline" className="w-full">Cancel</Button>
                                            </Link>
                                            <Button 
                                                type="submit" 
                                                disabled={!canSubmit || processing}
                                                className="flex-1"
                                            >
                                                {processing ? 'Processing...' : 'Continue to Confirmation'}
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
                                        <CardTitle className="text-lg">Your Booking</CardTitle>
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
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Calculator className="h-5 w-5" />
                                                Rate Breakdown
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span>Base rate ({rateCalculation.nights} nights)</span>
                                                    <span>Rp {rateCalculation.base_amount.toLocaleString()}</span>
                                                </div>
                                                
                                                {rateCalculation.weekend_premium > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Weekend premium</span>
                                                        <span>Rp {rateCalculation.weekend_premium.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                
                                                {rateCalculation.extra_bed_amount > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Extra beds ({extraBeds})</span>
                                                        <span>Rp {rateCalculation.extra_bed_amount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                
                                                {rateCalculation.cleaning_fee > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Cleaning fee</span>
                                                        <span>Rp {rateCalculation.cleaning_fee.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                
                                                <Separator />
                                                
                                                <div className="flex justify-between font-semibold text-lg">
                                                    <span>Total</span>
                                                    <span>Rp {rateCalculation.total_amount.toLocaleString()}</span>
                                                </div>
                                                
                                                <Separator />
                                                
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span>Down Payment ({data.dp_percentage}%)</span>
                                                        <span className="font-medium">
                                                            Rp {(rateCalculation.total_amount * data.dp_percentage / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm text-gray-600">
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
        </>
    );
} 