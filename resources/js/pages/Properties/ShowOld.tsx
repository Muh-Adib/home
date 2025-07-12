import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from '@/components/ui/date-range';
import { Map } from '@/components/ui/map';
import { 
    Building2, 
    MapPin, 
    Users, 
    Bed, 
    Bath, 
    Star,
    Heart,
    Share2,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Calculator,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Info,
    Sparkles,
    Clock,
    DollarSign,
    Tag,
    ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import AmenityItem from '@/components/AmenityItem';
import PropertyCard, { type Property, type Amenity } from '@/components/PropertyCard';
import { type PageProps } from '@/types';

interface PropertyShowProps extends PageProps {
    property: Property & {
        owner: any;
        amenities: any[];
        media: any[];
        seasonalRates?: any[];
        bookedDates:any[]
    };
    similarProperties: Property[];
    searchParams: {
        check_in: string;
        check_out: string;
        guests: number;
    };
    availabilityData: {
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

export default function PropertyShow({ property, similarProperties, searchParams, availabilityData }: PropertyShowProps) {
    const { t } = useTranslation();
    console.log('🏠 Property:', property);
    console.log('📊 Availability Data:', availabilityData);
    
    // Simple state management
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [guestCount, setGuestCount] = useState(searchParams.guests || 2);
    
    // Date range state - using string format untuk compatibility dengan DateRange component
    const [checkInDate, setCheckInDate] = useState(searchParams.check_in || '');
    const [checkOutDate, setCheckOutDate] = useState(searchParams.check_out || '');
    
    // Rate calculation state
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [rateError, setRateError] = useState<string | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);

    // Calculate rate from backend data
    const calculateRateFromBackendData = useCallback((checkIn: string, checkOut: string) => {
        if (!availabilityData?.rates || !availabilityData?.property_info || !checkIn || !checkOut) {
            return null;
        }

        const fromDate = new Date(checkIn);
        const toDate = new Date(checkOut);
        
        // Generate date range
        const dateArray = [];
        const current = new Date(fromDate);
        while (current < toDate) {
            dateArray.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        console.log('📅 Date array:', dateArray);
        console.log('📊 Available rates data:', availabilityData.rates);
        
        // Check for seasonal rates in data
        const hasSeasonalData = Object.values(availabilityData.rates).some(rate => rate.seasonal_premium > 0);
        console.log('🎪 Seasonal rates found in data:', hasSeasonalData);

        // Check availability
        const hasBookedDates = dateArray.some(date => 
            availabilityData.booked_dates.includes(date)
        );

        if (hasBookedDates) {
            throw new Error(t('properties.property_not_available'));
        }

        // Calculate total with proper number conversion
        const nights = dateArray.length;
        let baseAmount = 0;
        let weekendPremium = 0;
        let seasonalPremium = 0;

        console.log('🔢 Property info:', availabilityData.property_info);
        console.log('🛏️ Guest count:', guestCount, 'vs capacity:', availabilityData.property_info.capacity);

        dateArray.forEach(date => {
            const dailyRate = availabilityData.rates[date];
            if (dailyRate) {
                // Ensure all values are numbers with validation
                const dailyBaseRate = Number(dailyRate.base_rate) || 0;
                const weekendPremiumPercent = Number(availabilityData.property_info.weekend_premium_percent) || 0;
                const dailySeasonalPremium = Number(dailyRate.seasonal_premium) || 0;
                
                // Validate the numbers
                if (isNaN(dailyBaseRate)) {
                    console.error(`❌ Invalid base rate for ${date}:`, dailyRate.base_rate);
                    return;
                }
                
                baseAmount += dailyBaseRate;
                
                // Add seasonal premium if exists
                if (dailySeasonalPremium > 0) {
                    seasonalPremium += dailySeasonalPremium;
                    console.log(`🎪 ${date}: Seasonal premium = ${dailySeasonalPremium.toLocaleString('id-ID')} ${dailyRate.seasonal_rate_applied ? `(${dailyRate.seasonal_rate_applied[0].name})` : ''}`);
                }
                
                if (dailyRate.weekend_premium) {
                    const premiumAmount = dailyBaseRate * (weekendPremiumPercent / 100);
                    weekendPremium += premiumAmount;
                    console.log(`🎯 ${date}: Weekend premium = ${dailyBaseRate} * ${weekendPremiumPercent}% = ${premiumAmount}`);
                }
                
                console.log(`📊 ${date}: base=${dailyBaseRate.toLocaleString('id-ID')}, seasonal=${dailySeasonalPremium.toLocaleString('id-ID')}, weekend=${dailyRate.weekend_premium}, running_total=${(baseAmount + seasonalPremium).toLocaleString('id-ID')}`);
            } else {
                console.warn(`⚠️ No rate data for ${date}`);
            }
        });

        // Extra beds calculation with number conversion
        const capacity = Number(availabilityData.property_info.capacity) || 0;
        const extraBedRate = Number(availabilityData.property_info.extra_bed_rate) || 0;
        const extraBeds = Math.max(0, guestCount - capacity);
        const extraBedAmount = extraBeds * extraBedRate * nights;

        // Cleaning fee with number conversion
        const cleaningFee = Number(availabilityData.property_info.cleaning_fee) || 0;

        // Subtotal
        const subtotal = baseAmount + weekendPremium + seasonalPremium + extraBedAmount + cleaningFee;

        // Tax (11%)
        const taxAmount = subtotal * 0.11;

        // Total (rounded to avoid floating point issues)
        const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

        console.log('💰 Detailed Calculation Breakdown:');
        console.log(`  🌙 Nights: ${nights}`);
        console.log(`  💵 Base Amount: Rp ${baseAmount.toLocaleString('id-ID')} (${baseAmount})`);
        console.log(`  🎯 Weekend Premium: Rp ${weekendPremium.toLocaleString('id-ID')} (${weekendPremium})`);
        console.log(`  🎪 Seasonal Premium: Rp ${seasonalPremium.toLocaleString('id-ID')} (${seasonalPremium})`);
        console.log(`  🛏️ Extra Bed Amount: Rp ${extraBedAmount.toLocaleString('id-ID')} (${extraBedAmount})`);
        console.log(`  🧹 Cleaning Fee: Rp ${cleaningFee.toLocaleString('id-ID')} (${cleaningFee})`);
        console.log(`  ➕ Subtotal: Rp ${subtotal.toLocaleString('id-ID')} (${subtotal})`);
        console.log(`  🏛️ Tax 11%: Rp ${taxAmount.toLocaleString('id-ID')} (${taxAmount})`);
        console.log(`  🎯 FINAL TOTAL: Rp ${totalAmount.toLocaleString('id-ID')} (${totalAmount})`);
        console.log(`  📊 Calculation: ${subtotal} + ${taxAmount} = ${totalAmount}`);
        
        // Sanity check for unreasonable amounts
        if (totalAmount > 100000000) { // More than 100 million
            console.error('🚨 WARNING: Total amount seems unreasonably high!', {
                totalAmount,
                baseAmount,
                nights,
                guestCount,
                capacity: availabilityData.property_info.capacity
            });
        }

        return {
            nights,
            base_amount: Math.round(baseAmount),
            weekend_premium: Math.round(weekendPremium),
            seasonal_premium: Math.round(seasonalPremium),
            extra_bed_amount: Math.round(extraBedAmount),
            cleaning_fee: Math.round(cleaningFee),
            tax_amount: Math.round(taxAmount),
            total_amount: Math.round(totalAmount),
            extra_beds: extraBeds,
            formatted: {
                total_amount: 'Rp ' + Math.round(totalAmount).toLocaleString('id-ID'),
                per_night: 'Rp ' + Math.round(totalAmount / nights).toLocaleString('id-ID')
            }
        };
    }, [availabilityData, guestCount, t]);

 // Calculate effective minimum stay based on seasonal rates and availability
const calculateEffectiveMinStay = useCallback((checkIn: string, checkOut: string) => {
    if (!availabilityData?.rates || !checkIn || !checkOut) {
        return {
            minStay: 1,
            reason: 'default',
            seasonalRateApplied: null
        };
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // 1. PRIORITAS PERTAMA: Cek seasonal rate berdasarkan tanggal check-in
    const checkInDateStr = checkInDate.toISOString().split('T')[0];
    const checkInRate = availabilityData.rates[checkInDateStr];
    
    if (checkInRate && checkInRate.seasonal_premium > 0 && checkInRate.seasonal_rate_applied) {
        const seasonalMinStay = checkInRate.seasonal_rate_applied[0].min_stay_nights;
        
        console.log('🎪 Seasonal rate found on check-in date, using minimum stay:', seasonalMinStay);
        
        return {
            minStay: seasonalMinStay,
            reason: 'seasonal_rate',
            seasonalRateApplied: checkInRate.seasonal_rate_applied
        };
    }

    // 2. PRIORITAS KEDUA: Cek apakah terhimpit dengan booking lain
    const dayBeforeCheckIn = new Date(checkInDate);
    dayBeforeCheckIn.setDate(dayBeforeCheckIn.getDate() - 1);
    const dayBeforeCheckInStr = dayBeforeCheckIn.toISOString().split('T')[0];
    
    // FIX: Perbaiki pengecekan hari setelah check-out
    const dayAfterCheckOut = new Date(checkOutDate);
    dayAfterCheckOut.setDate(dayAfterCheckOut.getDate() + 1); // Tambah 1 hari
    const dayAfterCheckOutStr = dayAfterCheckOut.toISOString().split('T')[0];
    
    const hasBookingBefore = availabilityData.booked_dates.includes(dayBeforeCheckInStr);
    const hasBookingAfter = availabilityData.booked_dates.includes(dayAfterCheckOutStr);
    
    // Tentukan minimum stay normal berdasarkan hari
    const isWeekend = checkInDate.getDay() === 0 || checkInDate.getDay() === 6;
    const normalMinStay = isWeekend ? property.min_stay_weekend : property.min_stay_weekday;
    
    // Jika terhimpit dengan booking lain, buat aturan yang lebih fleksibel
    if (hasBookingBefore || hasBookingAfter) {
        // Hitung berapa hari maksimum yang bisa dipesan sebelum bertemu booking lain
        let maxPossibleNights = 0;
        const currentDate = new Date(checkInDate);
        
        while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (availabilityData.booked_dates.includes(dateStr)) {
                break;
            }
            maxPossibleNights++;
            currentDate.setDate(currentDate.getDate() + 1);
            
            // Batasi maksimum 30 hari untuk mencegah infinite loop
            if (maxPossibleNights > 30) break;
        }
        
        // Jika ruang yang tersedia kurang dari minimum stay normal, gunakan yang tersedia
        const flexibleMinStay = Math.min(normalMinStay, maxPossibleNights);
        
        console.log('📅 Terhimpit dengan booking lain. Normal min stay:', normalMinStay, 
                   'Max available nights:', maxPossibleNights, 'Using:', flexibleMinStay);
        
        return {
            minStay: Math.max(1, flexibleMinStay), // Minimal 1 malam
            reason: 'sandwiched_between_bookings',
            seasonalRateApplied: null
        };
    }

    // 3. PRIORITAS KETIGA: Gunakan minimum stay normal
    if (isWeekend) {
        console.log('🎯 Weekend booking, using weekend minimum stay:', property.min_stay_weekend);
        return {
            minStay: property.min_stay_weekend,
            reason: 'weekend',
            seasonalRateApplied: null
        };
    }

    // Default ke weekday minimum stay
    console.log('📅 Weekday booking, using weekday minimum stay:', property.min_stay_weekday);
    return {
        minStay: property.min_stay_weekday,
        reason: 'weekday',
        seasonalRateApplied: null
    };
}, [availabilityData, property.min_stay_weekday, property.min_stay_weekend]);

    // Get effective minimum stay for current date range
    const effectiveMinStay = useMemo(() => {
        if (!checkInDate || !checkOutDate) {
            return {
                minStay: 1,
                reason: 'default',
                seasonalRateApplied: null
            };
        }
        return calculateEffectiveMinStay(checkInDate, checkOutDate);
    }, [checkInDate, checkOutDate, calculateEffectiveMinStay]);

    // Check if current selection meets minimum stay requirement
    const meetsMinimumStay = useMemo(() => {
        if (!checkInDate || !checkOutDate) return false;
        
        const fromDate = new Date(checkInDate);
        const toDate = new Date(checkOutDate);
        const nights = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return nights >= effectiveMinStay.minStay;
    }, [checkInDate, checkOutDate, effectiveMinStay.minStay]);

    // Handle date range change from DateRange component
    const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
        console.log('🗓️ Date range changed:', startDate, endDate);
        setCheckInDate(startDate);
        setCheckOutDate(endDate);
        
        // Clear previous calculations when dates change
        setRateCalculation(null);
        setRateError(null);
        
        // Calculate rate if both dates are selected
        if (startDate && endDate) {
            setIsCalculatingRate(true);
            
            // Use setTimeout to show loading state briefly
            setTimeout(() => {
                try {
                    const calculation = calculateRateFromBackendData(startDate, endDate);
                    setRateCalculation(calculation);
                    console.log('✅ Rate calculated:', calculation?.formatted.total_amount);
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : t('properties.calculation_error'));
                    console.warn('⚠️ Rate calculation failed:', error);
                } finally {
                    setIsCalculatingRate(false);
                }
            }, 300);
        }
    }, [calculateRateFromBackendData, t]);

    // Update URL when dates or guest count changes
    useEffect(() => {
        if (checkInDate && checkOutDate) {
            const url = new URL(window.location.href);
            url.searchParams.set('check_in', checkInDate);
            url.searchParams.set('check_out', checkOutDate);
            url.searchParams.set('guests', guestCount.toString());
            window.history.replaceState({}, '', url.toString());
        }
    }, [checkInDate, checkOutDate, guestCount]);

    // Recalculate when guest count changes
    useEffect(() => {
        if (checkInDate && checkOutDate) {
            handleDateRangeChange(checkInDate, checkOutDate);
        }
    }, [guestCount, handleDateRangeChange, checkInDate, checkOutDate]);

    // Image gallery helpers
    const images = property.media?.filter(m => m.media_type === 'image') || [];
    const featuredImage = images.find(img => img.is_featured) || images[0];
    
    const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

    // Amenities grouped by category
    const amenitiesByCategory = property.amenities?.reduce((acc: Record<string, any[]>, amenity: any) => {
        const category = amenity.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(amenity);
        return acc;
    }, {} as Record<string, any[]>) || {};

    // Format check-in/out times
    const formatTime = (time: string) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // Get max selectable date from backend data (3-month limit)
    const maxSelectableDate = useMemo(() => {
        return availabilityData?.date_range?.end || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }, [availabilityData]);

    // Computed values
    const isRateReady = !!(rateCalculation && !rateError);
    const hasSeasonalPremium = (rateCalculation?.seasonal_premium || 0) > 0;
    const hasWeekendPremium = (rateCalculation?.weekend_premium || 0) > 0;

    return (
        <AppLayout>
            <Head title={property.name} />
            
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    
                    {/* Breadcrumb & Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                            <Link href="/properties" className="hover:text-blue-600 transition-colors">
                                {t('properties.properties')}
                            </Link>
                            <span>›</span>
                            <span className="text-gray-900 font-medium">{property.name}</span>
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                                        {property.name}
                                    </h1>
                                    {property.is_featured && (
                                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                            <Star className="h-3 w-3 mr-1" />
                                            {t('properties.featured')}
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex items-center text-gray-600 mb-3">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    <span>{property.address}</span>
                                </div>
                                
                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span>{property.capacity}-{property.capacity_max} {t('booking.guests')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Bed className="h-4 w-4" />
                                        <span>{property.bedroom_count} {t('properties.bedrooms')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Bath className="h-4 w-4" />
                                        <span>{property.bathroom_count} {t('properties.bathrooms')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                    <Heart className="h-4 w-4 mr-2" />
                                    {t('properties.save')}
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Share2 className="h-4 w-4 mr-2" />
                                    {t('properties.share')}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        
                        {/* Main Content */}
                        <div className="xl:col-span-2 space-y-8">
                            
                            {/* Image Gallery */}
                            {images.length > 0 && (
                                <Card className="overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="relative">
                                            <div className="aspect-[16/10] bg-gray-200">
                                                {featuredImage ? (
                                                    <img 
                                                        src={images[currentImageIndex]?.url || featuredImage.url}
                                                        alt={images[currentImageIndex]?.alt_text || property.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <Building2 className="h-20 w-20 text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Navigation Arrows */}
                                            {images.length > 1 && (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                                        onClick={prevImage}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                                        onClick={nextImage}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            
                                            {/* Image Counter */}
                                            {images.length > 1 && (
                                                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                                                    {currentImageIndex + 1} / {images.length}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Thumbnail Strip */}
                                        {images.length > 1 && (
                                            <div className="p-4">
                                                <div className="flex gap-2 overflow-x-auto">
                                                    {images.slice(0, 6).map((image, index) => (
                                                        <button
                                                            key={image.id}
                                                            onClick={() => setCurrentImageIndex(index)}
                                                            className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                                                index === currentImageIndex 
                                                                    ? 'border-blue-500 ring-2 ring-blue-200' 
                                                                    : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <img 
                                                                src={image.thumbnail_url || image.url}
                                                                alt={image.alt_text || property.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                    {images.length > 6 && (
                                                        <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                                            +{images.length - 6}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Property Details Tabs */}
                            <Tabs defaultValue="overview" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="overview">{t('properties.overview')}</TabsTrigger>
                                    <TabsTrigger value="amenities">{t('properties.amenities')}</TabsTrigger>
                                    <TabsTrigger value="policies">{t('properties.policies')}</TabsTrigger>
                                    <TabsTrigger value="location">{t('properties.location')}</TabsTrigger>
                                </TabsList>
                                
                                {/* Overview Tab */}
                                <TabsContent value="overview" className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Building2 className="h-5 w-5" />
                                                {t('properties.description')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {property.description}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Property Features */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('properties.property_features')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                                    <p className="font-semibold">{property.capacity}-{property.capacity_max}</p>
                                                    <p className="text-sm text-gray-600">{t('booking.guests')}</p>
                                                </div>
                                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                                    <Bed className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                                    <p className="font-semibold">{property.bedroom_count}</p>
                                                    <p className="text-sm text-gray-600">{t('properties.bedrooms')}</p>
                                                </div>
                                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                                    <Bath className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                                    <p className="font-semibold">{property.bathroom_count}</p>
                                                    <p className="text-sm text-gray-600">{t('properties.bathrooms')}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Check-in Information */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Clock className="h-5 w-5" />
                                                {t('properties.check_in_information')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">{t('properties.check_in_time')}</Label>
                                                    <p className="text-lg font-semibold">{formatTime(property.check_in_time)}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">{t('properties.check_out_time')}</Label>
                                                    <p className="text-lg font-semibold">{formatTime(property.check_out_time)}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">{t('properties.minimum_stay_weekday')}</Label>
                                                    <p className="font-semibold">{property.min_stay_weekday} {t('booking.nights')}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">{t('properties.minimum_stay_weekend')}</Label>
                                                    <p className="font-semibold">{property.min_stay_weekend} {t('booking.nights')}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">{t('properties.minimum_stay_peak')}</Label>
                                                    <p className="font-semibold">{property.min_stay_peak} {t('booking.nights')}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Current Effective Minimum Stay */}
                                            {checkInDate && checkOutDate && (
                                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="h-4 w-4 text-blue-600" />
                                                        <Label className="text-sm font-medium text-blue-800">Minimum Stay Efektif</Label>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-blue-700">
                                                            {effectiveMinStay.reason === 'seasonal_rate' && (
                                                                <>Seasonal Rate: {effectiveMinStay.seasonalRateApplied?.[0].name}</>
                                                            )}
                                                            {effectiveMinStay.reason === 'weekend' && (
                                                                <>Weekend Booking</>
                                                            )}
                                                            {effectiveMinStay.reason === 'weekday' && (
                                                                <>Weekday Booking</>
                                                            )}
                                                            {effectiveMinStay.reason === 'sandwiched_between_bookings' && (
                                                                <>Terjepit Antara Booking</>
                                                            )}
                                                        </span>
                                                        <Badge variant={meetsMinimumStay ? "default" : "destructive"} className="text-xs">
                                                            {effectiveMinStay.minStay} malam
                                                        </Badge>
                                                    </div>
                                                    {!meetsMinimumStay && (
                                                        <p className="text-xs text-red-600 mt-1">
                                                            Pilih minimal {effectiveMinStay.minStay} malam untuk melanjutkan
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Amenities Tab */}
                                <TabsContent value="amenities">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                {t('properties.amenities')} ({property.amenities?.length || 0})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {Object.keys(amenitiesByCategory).length > 0 ? (
                                                <div className="space-y-6">
                                                    {Object.entries(amenitiesByCategory).map(([category, amenities]: [string, Amenity[]]) => (
                                                        <div key={category}>
                                                            <h3 className="text-lg font-semibold mb-3 capitalize">
                                                                {category.replace('_', ' ')}
                                                            </h3>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {amenities.map((amenity) => (
                                                                    <AmenityItem 
                                                                        key={amenity.id}
                                                                        amenity={amenity}
                                                                        variant="list"
                                                                        showName={true}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Alert>
                                                    <Info className="h-4 w-4" />
                                                    <AlertDescription>
                                                        {t('properties.no_amenities_info')}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Policies Tab */}
                                <TabsContent value="policies">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('properties.house_rules_policies')}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {property.house_rules && (
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-3">{t('properties.house_rules')}</h3>
                                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                        {property.house_rules}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Location Tab */}
                                <TabsContent value="location">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MapPin className="h-5 w-5" />
                                                {t('properties.location_area')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-600">{t('properties.address')}</Label>
                                                    <p className="text-lg">{property.address}</p>
                                                </div>
                                                
                                                {/* Map */}
                                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                                    {property.lat && property.lng && !isNaN(Number(property.lat)) && !isNaN(Number(property.lng)) ? (
                                                        <Map
                                                            lat={Number(property.lat)}
                                                            lng={Number(property.lng)}
                                                            height="400px"
                                                            propertyName={property.name}
                                                            address={property.address}
                                                            className="w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                            <div className="text-center">
                                                                <MapPin className="h-12 w-12 mx-auto mb-2" />
                                                                <p>Peta tidak tersedia</p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    Koordinat: {property.lat || 'null'}, {property.lng || 'null'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>

                            {/* Similar Properties */}
                            {similarProperties && similarProperties.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('properties.similar_properties')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            {similarProperties.slice(0, 4).map((similarProperty) => (
                                                <PropertyCard 
                                                    key={similarProperty.slug}
                                                    property={similarProperty}
                                                    viewMode="grid"
                                                    maxAmenities={3}
                                                    className="shadow-sm"
                                                />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Booking Sidebar */}
                        <div className="space-y-6">
                            <Card className="md:sticky md:top-6">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CalendarIcon className="h-5 w-5" />
                                        {t('properties.book_your_stay')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    
                                    {/* Date Range Picker */}
                                    <div className="space-y-3">
                                        <div>
                                            <Label htmlFor="date-range">{t('booking.check_in_checkout_dates')}</Label>
                                            <DateRange
                                                startDate={checkInDate}
                                                endDate={checkOutDate}
                                                onDateChange={handleDateRangeChange}
                                                bookedDates={availabilityData?.booked_dates || []}
                                                loading={isCalculatingRate}
                                                error={rateError}
                                                minDate={new Date().toISOString().split('T')[0]}
                                                maxDate={maxSelectableDate}
                                                minStayWeekday={effectiveMinStay.minStay}
                                                minStayWeekend={effectiveMinStay.minStay}
                                                minStayPeak={effectiveMinStay.minStay}
                                                showMinStayWarning={true}
                                                autoTrigger={true}
                                                triggerDelay={300}
                                                className="w-full"
                                                size="lg"
                                                compact={false}
                                                showNights={true}
                                                startLabel={t('booking.check_in')}
                                                endLabel={t('booking.check_out')}
                                                placeholder={{
                                                    start: t('booking.check_in'),
                                                    end: t('booking.check_out')
                                                }}
                                            />
                                            
                                            {/* Minimum Stay Information */}
                                            {checkInDate && checkOutDate && (
                                                <div className="mt-2">
                                                    {effectiveMinStay.reason === 'seasonal_rate' && (
                                                        <Alert className="bg-green-50 border-green-200">
                                                            <Sparkles className="h-4 w-4 text-green-600" />
                                                            <AlertDescription className="text-green-800">
                                                                <strong>Minimum Stay {effectiveMinStay.minStay} malam</strong> berdasarkan seasonal rate "{effectiveMinStay.seasonalRateApplied?.[0].name}"
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    
                                                    {effectiveMinStay.reason === 'weekend' && (
                                                        <Alert className="bg-amber-50 border-amber-200">
                                                            <Tag className="h-4 w-4 text-amber-600" />
                                                            <AlertDescription className="text-amber-800">
                                                                <strong>Minimum Stay {effectiveMinStay.minStay} malam</strong> untuk weekend booking
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    
                                                    {effectiveMinStay.reason === 'weekday' && (
                                                        <Alert className="bg-blue-50 border-blue-200">
                                                            <CalendarIcon className="h-4 w-4 text-blue-600" />
                                                            <AlertDescription className="text-blue-800">
                                                                <strong>Minimum Stay {effectiveMinStay.minStay} malam</strong> untuk weekday booking
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    
                                                    {effectiveMinStay.reason === 'sandwiched_between_bookings' && (
                                                        <Alert className="bg-gray-50 border-gray-200">
                                                            <Info className="h-4 w-4 text-gray-600" />
                                                            <AlertDescription className="text-gray-700">
                                                                <strong>Minimum Stay 1 malam</strong> karena tanggal terjepit antara booking lain
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    
                                                    {!meetsMinimumStay && (
                                                        <Alert variant="destructive" className="mt-2">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <AlertDescription>
                                                                Minimum stay tidak terpenuhi. Pilih minimal {effectiveMinStay.minStay} malam.
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="guests">{t('booking.guests')}</Label>
                                            <Input
                                                id="guests"
                                                type="number"
                                                value={guestCount}
                                                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                                                min="1"
                                                max={property.capacity_max}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Rate Calculation Display */}
                                    <div className="space-y-3">
                                        {isCalculatingRate && (
                                            <Alert>
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                <AlertDescription>
                                                    {t('properties.calculating_best_rates')}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {rateError && (
                                            <Alert variant={rateError.includes(t('properties.property_not_available')) ? 'default' : 'destructive'}>
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>
                                                    {rateError.includes(t('properties.property_not_available')) ? t('properties.property_not_available') : t('properties.calculation_error')}
                                                </AlertTitle>
                                                <AlertDescription>
                                                    {rateError.includes(t('properties.property_not_available')) ? (
                                                        <div className="space-y-2">
                                                            <p>{rateError.split('.')[0]}</p>
                                                            <p className="text-xs text-gray-600">
                                                                {t('properties.select_different_dates')}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <span>{rateError}</span>
                                                        </div>
                                                    )}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {isRateReady && rateCalculation && (
                                            <div className="space-y-4">
                                                {/* Main Price Display */}
                                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                                    <div className="text-3xl font-bold text-blue-600">
                                                        {rateCalculation.formatted.total_amount}
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        {t('properties.for')} {rateCalculation.nights} {t('booking.nights')} • {rateCalculation.formatted.per_night}/{t('booking.night')}
                                                    </div>
                                                    
                                                    {hasSeasonalPremium && (
                                                        <div className="text-xs text-green-600 mt-2 flex items-center justify-center">
                                                            <Sparkles className="h-3 w-3 mr-1" />
                                                            {t('properties.special_seasonal_rates')}
                                                        </div>
                                                    )}
                                                    
                                                    {hasWeekendPremium && (
                                                        <div className="text-xs text-amber-600 mt-1 flex items-center justify-center">
                                                            <Tag className="h-3 w-3 mr-1" />
                                                            {t('properties.weekend_premium_included')}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Minimum Stay Info */}
                                                    <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Minimum stay: {effectiveMinStay.minStay} malam
                                                        {effectiveMinStay.reason === 'seasonal_rate' && (
                                                            <span className="ml-1">({effectiveMinStay.seasonalRateApplied?.[0].name})</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Rate Breakdown */}
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>{t('properties.base_rate')} ({rateCalculation.nights} {t('booking.nights')})</span>
                                                        <span>Rp {rateCalculation.base_amount.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    {rateCalculation.weekend_premium > 0 && (
                                                        <div className="flex justify-between text-amber-600">
                                                            <span>{t('properties.weekend_premium')}</span>
                                                            <span>+Rp {rateCalculation.weekend_premium.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {rateCalculation.seasonal_premium > 0 && (
                                                        <div className="text-green-600">
                                                            <div className="flex justify-between">
                                                                <span>{t('properties.seasonal_premium')}</span>
                                                                <span>+Rp {rateCalculation.seasonal_premium.toLocaleString()}</span>
                                                            </div>
                                                            {/* Show seasonal rate details if available */}
                                                            {checkInDate && checkOutDate && (
                                                                <div className="text-xs text-green-700 mt-1 ml-2">
                                                                    {Object.entries(availabilityData.rates)
                                                                        .filter(([date, rate]) => {
                                                                            const checkDate = new Date(checkInDate);
                                                                            const endDate = new Date(checkOutDate);
                                                                            const rateDate = new Date(date);
                                                                            return rateDate >= checkDate && rateDate < endDate && rate.seasonal_premium > 0;
                                                                        })
                                                                        .map(([date, rate]) => rate.seasonal_rate_applied?.[0].name)
                                                                        .filter((name, index, arr) => name && arr.indexOf(name) === index)
                                                                        .map((name) => `• ${name}`)
                                                                        .join(', ')
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {rateCalculation.extra_bed_amount > 0 && (
                                                        <div className="flex justify-between">
                                                            <span>{t('properties.extra_beds')} ({rateCalculation.extra_beds})</span>
                                                            <span>+Rp {rateCalculation.extra_bed_amount.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex justify-between">
                                                        <span>{t('properties.cleaning_fee')}</span>
                                                        <span>Rp {rateCalculation.cleaning_fee.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    <div className="flex justify-between">
                                                        <span>{t('properties.tax')}</span>
                                                        <span>Rp {rateCalculation.tax_amount.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    <Separator />
                                                    
                                                    <div className="flex justify-between font-semibold text-base">
                                                        <span>{t('properties.total')}</span>
                                                        <span>Rp {rateCalculation.total_amount.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        <Button 
                                            size="lg" 
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                            disabled={!isRateReady || isCalculatingRate || !checkInDate || !checkOutDate || !meetsMinimumStay}
                                            asChild
                                        >
                                            <Link
                                                href={`/properties/${property.slug}/book?check_in=${checkInDate}&check_out=${checkOutDate}&guests=${guestCount}`}
                                            >
                                                {isCalculatingRate ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                        {t('properties.calculating')}
                                                    </>
                                                ) : isRateReady ? (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        {t('properties.book_now')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Calculator className="h-4 w-4 mr-2" />
                                                        {t('properties.select_dates_to_book')}
                                                    </>
                                                )}
                                            </Link>
                                        </Button>
                                    </div>

                                    {/* Additional Info */}
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription className="text-xs">
                                            <strong>{t('properties.free_cancellation')}</strong> {t('properties.free_cancellation_desc')}
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>

                            {/* Quick Contact */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{t('properties.need_help')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-gray-600">
                                        {t('properties.contact_support_desc')}
                                    </p>
                                    <Button variant="outline" className="w-full">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        {t('properties.contact_support')}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 
