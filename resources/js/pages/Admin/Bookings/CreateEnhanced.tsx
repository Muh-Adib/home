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
    CalendarDays, Users, DollarSign, CheckCircle, AlertCircle, Building2,
    Phone, Mail, Globe, IdCard, User, UserPlus, Bed, Clock, Calculator,
    RefreshCw, Info, Sparkles, Tag, Percent, ArrowLeft, CreditCard,
    Shield, Calendar, TrendingUp, Zap, Loader2, Plus, X, Trash2,
    Search, Filter, Star, MapPin, Wifi, Car, Coffee, Utensils
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

interface CreateBookingEnhancedProps {
    properties: Property[];
    selectedProperty?: Property | null;
    prefilledData?: {
        property_id?: string;
        check_in_date?: string;
        check_out_date?: string;
    };
}

export default function CreateBookingEnhanced({ properties, selectedProperty, prefilledData }: CreateBookingEnhancedProps) {
    const { t } = useTranslation();
    
    // State management
    const [currentProperty, setCurrentProperty] = useState<Property | null>(selectedProperty || null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [activeTab, setActiveTab] = useState('property');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

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

    // Enhanced API call wrapper
    const enhancedApiCall = useCallback(async (endpoint: string, options: RequestInit) => {
        try {
            const response = await fetch(endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    ...options.headers
                }
            });
            
            const responseData = await response.json();
            
            if (response.ok) {
                return responseData;
            } else {
                throw new Error(responseData.error || 'API call failed');
            }
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }, []);

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

    // Filtered properties based on search and amenities
    const filteredProperties = useMemo(() => {
        let filtered = properties;
        
        if (searchTerm) {
            filtered = filtered.filter(property => 
                property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                property.address.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (selectedAmenities.length > 0) {
            filtered = filtered.filter(property => 
                selectedAmenities.every(amenity => 
                    property.amenities?.some(prop => prop.name === amenity)
                )
            );
        }
        
        return filtered;
    }, [properties, searchTerm, selectedAmenities]);

    // Enhanced property selection with visual feedback
    const handlePropertySelect = useCallback((property: Property) => {
        setCurrentProperty(property);
        setData('property_id', property.id.toString());
        
        // Reset calculations
        setRateCalculation(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);
        
        // Load property data
        loadPropertyAvailabilityAndRates(property.id);
        
        // Update capacity if needed
        if (totalGuests > property.capacity_max) {
            setData('guest_male', Math.floor(property.capacity_max / 2));
            setData('guest_female', Math.floor(property.capacity_max / 2));
            setData('guest_children', property.capacity_max % 2);
        }
        
        // Move to next tab
        setActiveTab('dates');
    }, [setData, totalGuests]);

    // Load property availability and rates
    const loadPropertyAvailabilityAndRates = useCallback(async (propertyId: number) => {
        try {
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const response = await enhancedApiCall('/admin/api/admin/booking-management/availability-and-rates', {
                method: 'POST',
                body: JSON.stringify({
                    property_id: propertyId,
                    check_in: startDate,
                    check_out: endDate,
                    guest_count: totalGuests,
                }),
            });
            
            if (response.success) {
                setAvailabilityError(null);
            } else {
                setAvailabilityError(response.error || 'Failed to load availability data');
            }
        } catch (error) {
            setAvailabilityError('Network error loading availability data');
        }
    }, [enhancedApiCall, totalGuests]);

    // Enhanced date range change handler
    const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
        setData('check_in_date', startDate);
        setData('check_out_date', endDate);
        
        // Clear previous calculations
        setRateCalculation(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);
        
        if (startDate && endDate && currentProperty) {
            setIsCalculatingRate(true);
            
            const checkAvailabilityAndRate = async () => {
                try {
                    const availabilityResponse = await enhancedApiCall('/admin/api/admin/booking-management/availability-and-rates', {
                        method: 'POST',
                        body: JSON.stringify({
                            property_id: currentProperty.id,
                            check_in: startDate,
                            check_out: endDate,
                            guest_count: totalGuests,
                        }),
                    });
                    
                    if (availabilityResponse.success) {
                        const isAvailable = !availabilityResponse.booked_dates || availabilityResponse.booked_dates.length === 0;
                        setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
                        
                        if (!isAvailable) {
                            setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                            setIsCalculatingRate(false);
                            return;
                        }
                        
                        const rateResponse = await enhancedApiCall('/admin/api/admin/booking-management/calculate-rate', {
                            method: 'POST',
                            body: JSON.stringify({
                                property_id: currentProperty.id,
                                check_in: startDate,
                                check_out: endDate,
                                guest_count: totalGuests,
                            }),
                        });
                        
                        if (rateResponse.success) {
                            const calculation = rateResponse.calculation || rateResponse;
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
                            setRateError(rateResponse.message || 'Rate calculation failed');
                        }
                    } else {
                        setAvailabilityError(availabilityResponse.message || 'Failed to check availability');
                    }
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
                } finally {
                    setIsCalculatingRate(false);
                }
            };
            
            setTimeout(checkAvailabilityAndRate, 300);
        }
    }, [currentProperty, setData, totalGuests, enhancedApiCall]);

    // Enhanced guest count change handler
    const handleGuestCountChange = useCallback((genderType: 'male' | 'female' | 'children', newCount: number) => {
        const countField = genderType === 'children' ? 'guest_children' : 
                          genderType === 'male' ? 'guest_male' : 'guest_female';
        
        setData(countField, newCount);
        
        // Recalculate rate when guest count changes
        if (data.check_in_date && data.check_out_date && currentProperty) {
            setTimeout(async () => {
                try {
                    const response = await enhancedApiCall('/admin/api/admin/booking-management/calculate-rate', {
                        method: 'POST',
                        body: JSON.stringify({
                            property_id: currentProperty.id,
                            check_in: data.check_in_date,
                            check_out: data.check_out_date,
                            guest_count: totalGuests,
                        }),
                    });
                    
                    if (response.success) {
                        const calculation = response.calculation || response;
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
                        setRateError(response.message || 'Rate calculation failed');
                    }
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
                }
            }, 300);
        }
    }, [data, setData, currentProperty, totalGuests, enhancedApiCall]);

    // Enhanced form submission
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        
        if (!canSubmit) {
            return;
        }
        
        // Prepare form data without guest details
        const formData = {
            ...data,
            guest_count: totalGuests,
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
                    // setSyncFeedback(errors.error); // This line was removed from the new_code, so it's removed here.
                }
            }
        });
    }, [data, totalGuests, setData, post, router, canSubmit]);

    // Validation
    const canSubmit = data.property_id && 
                     data.check_in_date && 
                     data.check_out_date && 
                     data.guest_name.trim() && 
                     data.guest_email.trim() && 
                     data.guest_phone.trim() && 
                     data.guest_country && 
                     totalGuests > 0;

    // Available amenities for filtering
    const availableAmenities = [
        { name: 'WiFi', icon: Wifi },
        { name: 'Parking', icon: Car },
        { name: 'Kitchen', icon: Utensils },
        { name: 'Coffee Maker', icon: Coffee },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Booking (Enhanced)" />
            
            <div className="space-y-6">
                {/* Enhanced Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Create New Booking</h1>
                            <p className="text-blue-100 mt-1">
                                Enhanced booking experience with smart property selection and real-time pricing
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => router.visit(route('admin.booking-management.index'))}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Bookings
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Enhanced Progress Steps */}
                <div className="flex items-center justify-center space-x-4">
                    {[
                        { id: 'property', label: 'Select Property', icon: Building2 },
                        { id: 'dates', label: 'Choose Dates', icon: Calendar },
                        { id: 'guests', label: 'Guest Details', icon: Users },
                        { id: 'review', label: 'Review & Confirm', icon: CheckCircle }
                    ].map((step, index) => {
                        const Icon = step.icon;
                        const isActive = activeTab === step.id;
                        const isCompleted = ['property', 'dates', 'guests'].indexOf(activeTab) > index;
                        
                        return (
                            <div key={step.id} className="flex items-center">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                    isActive ? 'bg-blue-600 border-blue-600 text-white' :
                                    isCompleted ? 'bg-green-600 border-green-600 text-white' :
                                    'bg-gray-100 border-gray-300 text-gray-500'
                                }`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className={`ml-2 text-sm font-medium ${
                                    isActive ? 'text-blue-600' :
                                    isCompleted ? 'text-green-600' :
                                    'text-gray-500'
                                }`}>
                                    {step.label}
                                </span>
                                {index < 3 && (
                                    <div className={`w-8 h-0.5 ml-2 ${
                                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
                                    }`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Enhanced Main Content */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Form Area */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-lg">
                            <CardContent className="p-6">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="property">Property</TabsTrigger>
                                        <TabsTrigger value="dates">Dates</TabsTrigger>
                                        <TabsTrigger value="guests">Guests</TabsTrigger>
                                        <TabsTrigger value="review">Review</TabsTrigger>
                                    </TabsList>
                                    
                                    {/* Property Selection Tab */}
                                    <TabsContent value="property" className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Select Property</h3>
                                            
                                            {/* Search and Filter */}
                                            <div className="space-y-4 mb-6">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                                    <Input
                                                        placeholder="Search properties..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="pl-10"
                                                    />
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-2">
                                                    {availableAmenities.map((amenity) => {
                                                        const Icon = amenity.icon;
                                                        const isSelected = selectedAmenities.includes(amenity.name);
                                                        
                                                        return (
                                                            <Button
                                                                key={amenity.name}
                                                                variant={isSelected ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setSelectedAmenities(prev => 
                                                                            prev.filter(a => a !== amenity.name)
                                                                        );
                                                                    } else {
                                                                        setSelectedAmenities(prev => 
                                                                            [...prev, amenity.name]
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <Icon className="h-4 w-4 mr-1" />
                                                                {amenity.name}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            {/* Property Grid */}
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {filteredProperties.map((property) => (
                                                    <Card 
                                                        key={property.id}
                                                        className={`cursor-pointer transition-all hover:shadow-lg ${
                                                            currentProperty?.id === property.id 
                                                                ? 'ring-2 ring-blue-500 bg-blue-50' 
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                        onClick={() => handlePropertySelect(property)}
                                                    >
                                                        <CardContent className="p-4">
                                                            <div className="aspect-video bg-gray-200 rounded-lg mb-3 overflow-hidden">
                                                                {property.cover_image ? (
                                                                    <img 
                                                                        src={property.cover_image} 
                                                                        alt={property.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                                                        <Building2 className="h-8 w-8 text-gray-500" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <h4 className="font-semibold text-lg mb-1">{property.name}</h4>
                                                            <p className="text-sm text-gray-600 mb-2 flex items-center">
                                                                <MapPin className="h-3 w-3 mr-1" />
                                                                {property.address}
                                                            </p>
                                                            
                                                            <div className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="flex items-center">
                                                                        <Users className="h-3 w-3 mr-1" />
                                                                        {property.capacity}-{property.capacity_max}
                                                                    </span>
                                                                    <span className="flex items-center">
                                                                        <DollarSign className="h-3 w-3 mr-1" />
                                                                        {property.formatted_base_rate}
                                                                    </span>
                                                                </div>
                                                                <Badge variant="secondary">
                                                                    {property.amenities?.length || 0} amenities
                                                                </Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                            
                                            {filteredProperties.length === 0 && (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                                    <p>No properties found matching your criteria</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                    
                                    {/* Dates Selection Tab */}
                                    <TabsContent value="dates" className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Select Dates</h3>
                                            
                                            {currentProperty ? (
                                                <div className="space-y-4">
                                                    <div className="bg-blue-50 p-4 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            {currentProperty.cover_image && (
                                                                <img 
                                                                    src={currentProperty.cover_image} 
                                                                    alt={currentProperty.name}
                                                                    className="w-16 h-16 rounded-lg object-cover"
                                                                />
                                                            )}
                                                            <div>
                                                                <h4 className="font-semibold">{currentProperty.name}</h4>
                                                                <p className="text-sm text-gray-600">{currentProperty.address}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <Label>Check-in & Check-out Dates</Label>
                                                        <DateRange
                                                            startDate={data.check_in_date}
                                                            endDate={data.check_out_date}
                                                            onDateChange={handleDateRangeChange}
                                                            minDate={new Date().toISOString().split('T')[0]}
                                                            size="lg"
                                                        />
                                                    </div>
                                                    
                                                    {/* Availability Status */}
                                                    {availabilityStatus && (
                                                        <div>
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
                                                    
                                                    {data.check_in_date && data.check_out_date && (
                                                        <Button 
                                                            onClick={() => setActiveTab('guests')}
                                                            disabled={!rateCalculation}
                                                            className="w-full"
                                                        >
                                                            Continue to Guest Details
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                                    <p>Please select a property first</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                    
                                    {/* Guest Details Tab */}
                                    <TabsContent value="guests" className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Guest Information</h3>
                                            
                                            {/* Guest Count */}
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <Label>Male Adults</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={data.guest_male}
                                                            onChange={(e) => handleGuestCountChange('male', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Female Adults</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={data.guest_female}
                                                            onChange={(e) => handleGuestCountChange('female', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Children</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={data.guest_children}
                                                            onChange={(e) => handleGuestCountChange('children', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">Total Guests:</span>
                                                        <Badge variant="secondary">{totalGuests}</Badge>
                                                    </div>
                                                    {extraBeds > 0 && (
                                                        <div className="mt-2 text-sm text-blue-600">
                                                            Extra beds needed: {extraBeds}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Primary Guest Info */}
                                            <div className="space-y-4">
                                                <h4 className="font-medium">Primary Guest</h4>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Full Name *</Label>
                                                        <Input
                                                            value={data.guest_name}
                                                            onChange={(e) => setData('guest_name', e.target.value)}
                                                            placeholder="Enter full name"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Email *</Label>
                                                        <Input
                                                            type="email"
                                                            value={data.guest_email}
                                                            onChange={(e) => setData('guest_email', e.target.value)}
                                                            placeholder="guest@example.com"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Phone *</Label>
                                                        <Input
                                                            type="tel"
                                                            value={data.guest_phone}
                                                            onChange={(e) => setData('guest_phone', e.target.value)}
                                                            placeholder="+62xxx"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Country</Label>
                                                        <Select value={data.guest_country} onValueChange={(value) => setData('guest_country', value)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
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
                                            
                                            <Button 
                                                onClick={() => setActiveTab('review')}
                                                disabled={!canSubmit}
                                                className="w-full"
                                            >
                                                Continue to Review
                                            </Button>
                                        </div>
                                    </TabsContent>
                                    
                                    {/* Review Tab */}
                                    <TabsContent value="review" className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Review & Confirm</h3>
                                            
                                            <div className="space-y-4">
                                                {/* Booking Summary */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Booking Summary</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <span>Property:</span>
                                                            <span className="font-medium">{currentProperty?.name}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Check-in:</span>
                                                            <span>{data.check_in_date}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Check-out:</span>
                                                            <span>{data.check_out_date}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Total Guests:</span>
                                                            <span>{totalGuests}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Primary Guest:</span>
                                                            <span>{data.guest_name}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                
                                                {/* Rate Summary */}
                                                {rateCalculation && (
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle>Rate Summary</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="space-y-3">
                                                            <div className="flex justify-between text-lg font-bold">
                                                                <span>Total Amount:</span>
                                                                <span className="text-blue-600">{rateCalculation.formatted.total_amount}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm text-gray-600">
                                                                <span>Per Night:</span>
                                                                <span>{rateCalculation.formatted.per_night}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm text-gray-600">
                                                                <span>Nights:</span>
                                                                <span>{rateCalculation.nights}</span>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                                
                                                {/* Submit Button */}
                                                <Button 
                                                    onClick={handleSubmit}
                                                    disabled={!canSubmit || processing}
                                                    className="w-full h-12 text-lg"
                                                >
                                                    {processing ? (
                                                        <>
                                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                            Creating Booking...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="h-5 w-5 mr-2" />
                                                            Create Booking
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Enhanced Sidebar */}
                    <div className="space-y-4">
                        {/* Current Property Info */}
                        {currentProperty && (
                            <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Selected Property
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                                        {currentProperty.cover_image ? (
                                            <img 
                                                src={currentProperty.cover_image} 
                                                alt={currentProperty.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                                <Building2 className="h-8 w-8 text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h4 className="font-semibold">{currentProperty.name}</h4>
                                    <p className="text-sm text-gray-600">{currentProperty.address}</p>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Capacity:</span>
                                            <span>{currentProperty.capacity}-{currentProperty.capacity_max} guests</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Base Rate:</span>
                                            <span>{currentProperty.formatted_base_rate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Cleaning Fee:</span>
                                            <span>Rp {currentProperty.cleaning_fee.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Rate Calculation */}
                        {rateCalculation && (
                            <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calculator className="h-5 w-5" />
                                        Rate Calculation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {rateCalculation.formatted.total_amount}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            for {rateCalculation.nights} nights
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Base Rate:</span>
                                            <span>Rp {rateCalculation.base_amount.toLocaleString()}</span>
                                        </div>
                                        {rateCalculation.weekend_premium > 0 && (
                                            <div className="flex justify-between text-amber-600">
                                                <span>Weekend Premium:</span>
                                                <span>+Rp {rateCalculation.weekend_premium.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {rateCalculation.extra_bed_amount > 0 && (
                                            <div className="flex justify-between">
                                                <span>Extra Beds:</span>
                                                <span>+Rp {rateCalculation.extra_bed_amount.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span>Cleaning Fee:</span>
                                            <span>Rp {rateCalculation.cleaning_fee.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tax:</span>
                                            <span>Rp {rateCalculation.tax_amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
