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
    Edit,
    Bed,
    Clock,
    Calculator,
    RefreshCw,
    Info,
    Sparkles,
    Tag,
    Percent,
    CreditCard,
    Shield,
    Calendar,
    TrendingUp,
    TrendingDown,
    Activity,
    Loader2,
    Save,
    FileText,
    Eye,
    ArrowUpDown,
    AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type BreadcrumbItem, type Booking, type Property } from '@/types';
import AdminLayout from '@/layouts/admin-layout';

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
}

export default function BookingEdit({ booking, properties, paymentMethods }: BookingEditProps) {
    const { t } = useTranslation();
    
    // State management
    const [currentProperty, setCurrentProperty] = useState<Property | null>(booking.property || null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
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

    const { data, setData, put, processing, errors, reset } = useForm({
        property_id: booking.property_id?.toString() || '',
        check_in_date: booking.check_in ? new Date(booking.check_in).toISOString().split('T')[0] : '',
        check_out_date: booking.check_out ? new Date(booking.check_out).toISOString().split('T')[0] : '',
        guest_male: booking.guest_male || 1,
        guest_female: booking.guest_female || 1,
        guest_children: booking.guest_children || 0,
        guest_name: booking.guest_name || '',
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        guest_country: booking.guest_country || 'Indonesia',
        guest_id_number: booking.guest_id_number || '',
        guest_gender: booking.guest_gender || 'male' as 'male' | 'female',
        relationship_type: booking.relationship_type || 'keluarga' as 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran',
        special_requests: booking.special_requests || '',
        internal_notes: booking.internal_notes || '',
        booking_status: booking.booking_status || 'confirmed' as 'pending_verification' | 'confirmed',
        payment_status: booking.payment_status || 'fully_paid' as 'dp_pending' | 'dp_received' | 'fully_paid',
        dp_percentage: booking.dp_percentage || 100,
        check_in_time: booking.check_in_time || '15:00',
        source: booking.source || 'direct' as 'direct' | 'phone' | 'walk_in' | 'ota',
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
            const availabilityResponse = await fetch('/admin/api/admin/booking-management/check-availability', {
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
                
                // Calculate rate
                const rateResponse = await fetch('/admin/api/admin/booking-management/calculate-rate', {
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
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);
        
        // Check availability and calculate rate if both dates are selected
        if (startDate && endDate && currentProperty) {
            checkAvailabilityAndCalculateRate(currentProperty.id, startDate, endDate);
        }
    }, [currentProperty, setData, checkAvailabilityAndCalculateRate]);

    // Handle guest count changes
    const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
        const countField = genderType === 'children' ? 'guest_children' : 
                          genderType === 'male' ? 'guest_male' : 'guest_female';
        
        setData(countField, newCount);
        
        // Recalculate rate when guest count changes
        if (data.check_in_date && data.check_out_date && currentProperty) {
            setTimeout(() => {
                checkAvailabilityAndCalculateRate(currentProperty.id, data.check_in_date, data.check_out_date);
            }, 300);
        }
    };

    // Auto show/hide payment form based on booking status
    useEffect(() => {
        if (data.booking_status === 'confirmed' && data.payment_status !== 'dp_pending') {
            setShowPaymentForm(true);
        } else {
            setShowPaymentForm(false);
        }
    }, [data.booking_status, data.payment_status]);

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
        
        // Prepare form data with payment and rate override
        const formData = {
            ...data,
            guest_count: totalGuests,
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
        
        put(route('admin.booking-management.update', booking.booking_number), {
            onSuccess: () => {
                router.visit(route('admin.booking-management.show', booking.booking_number));
            },
            onError: (errors: any) => {
                console.error('Booking update failed:', errors);
                if (errors.error) {
                    setSyncFeedback(errors.error);
                }
            }
        });
    };

    // Calculate payment impact
    const paymentImpact = useMemo(() => {
        if (!rateCalculation) return null;
        
        const originalAmount = booking.total_amount || 0;
        const newAmount = manualRateOverride ? overrideAmount : rateCalculation.total_amount;
        const difference = newAmount - originalAmount;
        
        return {
            originalAmount,
            newAmount,
            difference,
            percentage: originalAmount > 0 ? (difference / originalAmount) * 100 : 0,
        };
    }, [rateCalculation, manualRateOverride, overrideAmount, booking.total_amount]);

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

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
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

                                    {/* Rate Information with Comparison */}
                                    {hasChanges && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <ArrowUpDown className="h-5 w-5 text-orange-600" />
                                                <h3 className="text-lg font-semibold">Rate Comparison</h3>
                                                <Badge variant="outline">Changes Detected</Badge>
                                            </div>
                                            
                                            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div className="text-sm">
                                                        <div className="flex justify-between mb-2">
                                                            <span className="font-medium">Original Booking Rate:</span>
                                                            <span className="font-semibold">{formatCurrency(booking.total_amount || 0)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Nights:</span>
                                                            <span>{booking.nights || 0}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-sm">
                                                        <div className="flex justify-between mb-2">
                                                            <span className="font-medium">New Calculated Rate:</span>
                                                            <span className="font-semibold">
                                                                {rateCalculation ? formatCurrency(rateCalculation.total_amount) : 'Calculating...'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Nights:</span>
                                                            <span>{rateCalculation?.nights || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {paymentImpact && (
                                                    <div className="pt-2 border-t border-orange-300">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium">Rate Impact:</span>
                                                            <div className="text-right">
                                                                <div className={`font-semibold ${paymentImpact.difference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                    {paymentImpact.difference >= 0 ? '+' : ''}{formatCurrency(paymentImpact.difference)}
                                                                </div>
                                                                <div className="text-xs text-gray-600">
                                                                    ({paymentImpact.percentage >= 0 ? '+' : ''}{paymentImpact.percentage.toFixed(1)}%)
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

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
                                                                <span>Calculated Rate:</span>
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

                    {/* Enhanced Sidebar */}
                    <div className="space-y-6">
                        {/* Rate Calculation Sidebar */}
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
                                                Calculating rates...
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
                                            <p>Make changes to see rate calculation</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Booking Summary Card */}
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
                                        <span>Booking Number:</span>
                                        <span className="font-medium">{booking.booking_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Property:</span>
                                        <span className="font-medium">{currentProperty?.name || booking.property?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Check-in:</span>
                                        <span>{data.check_in_date ? formatDate(data.check_in_date) : 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Check-out:</span>
                                        <span>{data.check_out_date ? formatDate(data.check_out_date) : 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Nights:</span>
                                        <span>{rateCalculation?.nights || booking.nights || 0}</span>
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
                                        <div className="text-xs text-gray-600 text-center">
                                            ({paymentImpact.percentage >= 0 ? '+' : ''}{paymentImpact.percentage.toFixed(1)}% change)
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