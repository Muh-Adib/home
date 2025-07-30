import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
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
    Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type BreadcrumbItem } from '@/types';

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

interface GuestDetail {
    id?: number;
    name: string;
    gender: 'male' | 'female';
    age_category: 'adult' | 'child' | 'infant';
    relationship_to_primary: string;
    phone?: string;
    email?: string;
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
}

export default function CreateBooking({ properties, selectedProperty, prefilledData, availabilityData: initialAvailabilityData }: CreateBookingProps) {
    const { t } = useTranslation();
    
    // State management
    const [currentProperty, setCurrentProperty] = useState<Property | null>(selectedProperty || null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);
    const [showGuestDetails, setShowGuestDetails] = useState(false);
    const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
    const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(initialAvailabilityData || null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

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
    });

    // Calculate total guests
    const totalGuests = useMemo(() => {
        return data.guest_male + data.guest_female + data.guest_children;
    }, [data.guest_male, data.guest_female, data.guest_children]);

    // Calculate extra beds needed
    const extraBeds = useMemo(() => {
        if (!currentProperty) return 0;
        const totalForExtraBeds = Math.ceil(data.guest_male + data.guest_female + Math.ceil((data.guest_children - currentProperty.capacity) * 0.5));
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
        
        // Load property date range data
        if (property) {
            loadPropertyDateRange(property.id);
            
            // Update capacity if needed
            if (totalGuests > property.capacity_max) {
                setData('guest_male', Math.floor(property.capacity_max / 2));
                setData('guest_female', Math.floor(property.capacity_max / 2));
                setData('guest_children', property.capacity_max % 2);
            }
        }
    };

    // Load property date range data with better error handling
    const loadPropertyDateRange = async (propertyId: number) => {
        setIsLoadingAvailability(true);
        try {
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const response = await fetch(`/admin/api/admin/booking-management/property-date-range?property_id=${propertyId}&start_date=${startDate}&end_date=${endDate}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
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
            const response = await fetch('/admin/api/admin/booking-management/check-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
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
            const response = await fetch('/admin/api/admin/booking-management/calculate-rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
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
            
            // Check availability first
            checkAvailability(currentProperty.id, startDate, endDate);
            
            // Calculate rate with delay for better UX
            setTimeout(async () => {
                try {
                    const calculation = await calculateRateFromBackendData(startDate, endDate);
                    setRateCalculation(calculation);
                    setRateError(null);
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
                } finally {
                    setIsCalculatingRate(false);
                }
            }, 500);
        }
    }, [calculateRateFromBackendData, currentProperty, setData, checkAvailability]);

    // Handle guest count changes with real-time recalculation
    const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
        const countField = genderType === 'children' ? 'guest_children' : 
                          genderType === 'male' ? 'guest_male' : 'guest_female';
        
        setData(countField, newCount);
        
        // Recalculate rate when guest count changes with debounce
        if (data.check_in_date && data.check_out_date && currentProperty) {
            setTimeout(async () => {
                try {
                    const calculation = await calculateRateFromBackendData(data.check_in_date, data.check_out_date);
                    setRateCalculation(calculation);
                    setRateError(null);
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
                }
            }, 300);
        }
    };

    // Auto-generate guest list when counts change
    useEffect(() => {
        setShowGuestDetails(totalGuests > 1);
    }, [totalGuests]);

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
                     rateCalculation !== null &&
                     availabilityStatus === 'available';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!canSubmit) {
            return;
        }
        
        post(route('admin.booking-management.store'), {
            onSuccess: () => {
                // Redirect to bookings list
                router.visit(route('admin.booking-management.index'));
            },
            onError: (errors) => {
                console.error('Booking creation failed:', errors);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Booking" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create New Booking</h1>
                        <p className="text-gray-600 mt-1">
                            Create a new booking for guests with real-time availability and pricing
                        </p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => router.visit(route('admin.booking-management.index'))}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Bookings
                    </Button>
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
                                                    value={data.guest_male}
                                                    onChange={(e) => handleGenderCountChange('male', parseInt(e.target.value) || 0)}
                                                    className={errors.guest_male ? 'border-red-500' : ''}
                                                />
                                                {errors.guest_male && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_male}</p>
                                                )}
                                            </div>
                                            <div>
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
                                            <div>
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
                                        <div className="bg-slate-50 p-4 rounded-lg">
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
                                            
                                            {extraBeds > 0 && currentProperty && (
                                                <div className="mt-2 flex items-center gap-2 text-sm">
                                                    <Bed className="h-4 w-4 text-blue-600" />
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
                                        <h3 className="text-lg font-semibold mb-4">Primary Guest</h3>
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
                                        <div className="grid md:grid-cols-2 gap-4">
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

                                    <div className="flex gap-4 pt-4">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => router.visit(route('admin.booking-management.index'))}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={!canSubmit || processing}
                                            className="flex-1"
                                        >
                                            {processing ? 'Creating...' : 'Create Booking'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Enhanced Rate Calculation Sidebar */}
                    <div className="space-y-6">
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
                                                <div className="text-3xl font-bold text-blue-600">
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
                                                    <span>Tax (11%)</span>
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
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}