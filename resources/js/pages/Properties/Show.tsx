import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Map } from '@/components/ui/map';
import { DateRange } from '@/components/ui/date-range';
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
    Wifi,
    Car,
    Coffee,
    Tv,
    AirVent,
    Clock,
    CheckCircle,
    ArrowLeft,
    Calendar,
    Calculator,
    TrendingUp,
    Sparkles,
    Info,
    Tag,
    Percent
} from 'lucide-react';

interface Property {
    id: number;
    name: string;
    slug: string;
    description: string;
    address: string;
    lat?: number;
    lng?: number;
    capacity: number;
    capacity_max: number;
    bedroom_count: number;
    bathroom_count: number;
    base_rate: number;
    formatted_base_rate: string;
    weekend_premium_percent: number;
    cleaning_fee: number;
    extra_bed_rate: number;
    house_rules?: string;
    check_in_time: string;
    check_out_time: string;
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    is_featured: boolean;
    owner: {
        id: number;
        name: string;
        email: string;
    };
    amenities: Amenity[];
    media: Media[];
    // Rate calculation data from backend
    current_rate_calculation?: {
        nights: number;
        total_amount: number;
        subtotal: number;
        tax_amount: number;
        cleaning_fee: number;
        extra_bed_amount: number;
        seasonal_premium: number;
        weekend_premium: number;
        extra_beds: number;
        rate_breakdown: {
            seasonal_rates_applied: Array<{
                name: string;
                description: string;
                dates: string[];
            }>;
        };
    };
    current_total_rate?: number;
    current_rate_per_night?: number;
    formatted_current_rate?: string;
    has_seasonal_rate?: boolean;
    seasonal_rate_info?: Array<{
        name: string;
        description: string;
        dates?: string[];
    }>;
}

interface Amenity {
    id: number;
    name: string;
    icon: string;
    category: string;
}

interface Media {
    id: number;
    file_name: string;
    file_path: string;
    thumbnail_path?: string;
    file_size: number;
    mime_type: string;
    media_type: 'image' | 'video';
    alt_text?: string;
    description?: string;
    display_order: number;
    is_featured: boolean;
    url: string;
    thumbnail_url?: string;
}

interface PropertyShowProps {
    property: Property;
    similarProperties: Property[];
    searchParams?: {
        check_in?: string;
        check_out?: string;
        guests?: number;
    };
}

export default function PropertyShow({ property, similarProperties, searchParams }: PropertyShowProps) {
    const page = usePage();
    const urlParams = new URLSearchParams(window.location.search);
    const checkIn = urlParams.get('check_in') || searchParams?.check_in || new Date().toISOString().split('T')[0];
    const checkOut = urlParams.get('check_out') || searchParams?.check_out || new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
    const guests = parseInt(urlParams.get('guests') || searchParams?.guests?.toString() || '2');

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showAllAmenities, setShowAllAmenities] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [selectedCheckIn, setSelectedCheckIn] = useState(checkIn);
    const [selectedCheckOut, setSelectedCheckOut] = useState(checkOut);
    const [selectedGuests, setSelectedGuests] = useState(guests);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Update URL when dates change
    const updateSearchParams = (newCheckIn: string, newCheckOut: string, newGuests: number) => {
        const params = new URLSearchParams(window.location.search);
        params.set('check_in', newCheckIn);
        params.set('check_out', newCheckOut);
        params.set('guests', newGuests.toString());
        
        // Use router.visit to update URL and fetch new data
        router.visit(`${window.location.pathname}?${params.toString()}`, {
            preserveState: true,
            replace: true,
        });
    };

    // Handle date range change
    const handleDateChange = (startDate: string, endDate: string) => {
        setSelectedCheckIn(startDate);
        setSelectedCheckOut(endDate);
        updateSearchParams(startDate, endDate, selectedGuests);
    };

    // Handle guest count change
    const handleGuestChange = (newGuests: number) => {
        setSelectedGuests(newGuests);
        updateSearchParams(selectedCheckIn, selectedCheckOut, newGuests);
    };

    const images = property.media.filter(media => media.media_type === 'image') || [];
    const videos = property.media.filter(media => media.media_type === 'video') || [];
    
    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // Group amenities by category
    const amenityCategories = property.amenities.reduce((acc, amenity) => {
        if (!acc[amenity.category]) {
            acc[amenity.category] = [];
        }
        acc[amenity.category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, any> = {
            basic: Wifi,
            entertainment: Tv,
            kitchen: Coffee,
            outdoor: Car,
            wellness: AirVent,
            business: Building2,
        };
        return icons[category] || CheckCircle;
    };

    // Calculate fake discount (20% markup from final rate)
    const calculateDiscountPrice = () => {
        if (!property.current_rate_calculation) return null;
        
        const finalRate = property.current_rate_calculation.total_amount;
        const originalPrice = finalRate * 1.2; // 20% markup
        const discountAmount = originalPrice - finalRate;
        const discountPercent = Math.round((discountAmount / originalPrice) * 100);
        
        return {
            original_price: originalPrice,
            final_price: finalRate,
            discount_amount: discountAmount,
            discount_percent: discountPercent,
            nights: property.current_rate_calculation.nights
        };
    };

    const discountInfo = calculateDiscountPrice();

    // Calculate nights between dates
    const calculateNights = (checkInDate: string, checkOutDate: string) => {
        if (!checkInDate || !checkOutDate) return 0;
        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const nights = calculateNights(checkIn, checkOut);

    // Format date for display
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <>
            <Head title={`${property.name} - Property Management System`} />
            
            <div className="min-h-screen bg-white">
                {/* Navigation */}
                <div className="sticky top-0 z-50 bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <Link href="/properties" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Properties
                            </Link>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Heart className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Media Gallery */}
                <div className="relative">
                    {/* Main Image Display */}
                    <div className="aspect-video bg-slate-200 relative">
                        {images.length > 0 ? (
                            <>
                                <img 
                                    src={images[currentImageIndex]?.url} 
                                    alt={images[currentImageIndex]?.alt_text || property.name}
                                    className="w-full h-full object-cover"
                                />
                                
                                {images.length > 1 && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                            onClick={prevImage}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                            onClick={nextImage}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        
                                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                                            {currentImageIndex + 1} / {images.length}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                <Building2 className="h-24 w-24 text-blue-400" />
                            </div>
                        )}
                        
                        {property.is_featured && (
                            <Badge className="absolute top-4 left-4 bg-yellow-500 text-white">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                            </Badge>
                        )}

                        {/* Discount Badge */}
                        {discountInfo && checkIn && checkOut && (
                            <Badge className="absolute top-4 right-4 bg-red-500 text-white text-sm px-3 py-1">
                                <Percent className="h-3 w-3 mr-1" />
                                {discountInfo.discount_percent}% OFF
                            </Badge>
                        )}
                    </div>

                    {/* Thumbnail Gallery */}
                    {(images.length > 1 || videos.length > 0) && (
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {/* Image Thumbnails */}
                                {images.map((image, index) => (
                                    <button
                                        key={`image-${image.id}`}
                                        onClick={() => setCurrentImageIndex(index)}
                                        className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                            currentImageIndex === index 
                                                ? 'border-blue-500 shadow-lg scale-105' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <img 
                                            src={image.thumbnail_url || image.url} 
                                            alt={image.alt_text || `Image ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        {image.is_featured && (
                                            <div className="absolute top-1 right-1">
                                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                                
                                {/* Video Thumbnails */}
                                {videos.map((video, index) => (
                                    <div
                                        key={`video-${video.id}`}
                                        className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 bg-black/10 flex items-center justify-center"
                                    >
                                        <div className="text-center">
                                            <div className="w-6 h-6 mx-auto mb-1 bg-white/90 rounded-full flex items-center justify-center">
                                                <div className="w-0 h-0 border-l-2 border-l-gray-800 border-y-2 border-y-transparent border-y-[3px] ml-0.5" />
                                            </div>
                                            <span className="text-xs text-gray-600 font-medium">Video</span>
                                        </div>
                                        {video.is_featured && (
                                            <div className="absolute top-1 right-1">
                                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Property Info */}
                <div className="container mx-auto px-4 py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Header */}
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center text-gray-600">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {property.address}
                                    </div>
                                    {property.lat && property.lng && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setShowMap(!showMap)}
                                        >
                                            <MapPin className="h-4 w-4 mr-2" />
                                            {showMap ? 'Hide Map' : 'Show Map'}
                                        </Button>
                                    )}
                                </div>

                                {/* Map Section */}
                                {showMap && property.lat && property.lng && (
                                    <div className="mb-6">
                                        <Map
                                            lat={property.lat}
                                            lng={property.lng}
                                            height="400px"
                                            propertyName={property.name}
                                            address={property.address}
                                            className="shadow-lg"
                                        />
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <Bed className="h-4 w-4 mr-1" />
                                        {property.bedroom_count} Bedrooms
                                    </div>
                                    <div className="flex items-center">
                                        <Bath className="h-4 w-4 mr-1" />
                                        {property.bathroom_count} Bathrooms
                                    </div>
                                    <div className="flex items-center">
                                        <Users className="h-4 w-4 mr-1" />
                                        {property.capacity}-{property.capacity_max} Guests
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Description */}
                            <div>
                                <h2 className="text-xl font-semibold mb-4">About this property</h2>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                    {property.description}
                                </p>
                            </div>

                            <Separator />

                            {/* Amenities */}
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Amenities</h2>
                                <div className="space-y-6">
                                    {Object.entries(amenityCategories).map(([category, amenities]) => {
                                        const CategoryIcon = getCategoryIcon(category);
                                        const visibleAmenities = showAllAmenities ? amenities : amenities.slice(0, 4);
                                        
                                        return (
                                            <div key={category}>
                                                <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-3 capitalize">
                                                    <CategoryIcon className="h-5 w-5 text-blue-600" />
                                                    {category.replace('_', ' ')}
                                                </h3>
                                                <div className="grid md:grid-cols-2 gap-2">
                                                    {visibleAmenities.map(amenity => (
                                                        <div key={amenity.id} className="flex items-center gap-2 text-gray-600">
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                            {amenity.name}
                                                        </div>
                                                    ))}
                                                </div>
                                                {!showAllAmenities && amenities.length > 4 && (
                                                    <Button
                                                        variant="link"
                                                        className="p-0 h-auto text-blue-600"
                                                        onClick={() => setShowAllAmenities(true)}
                                                    >
                                                        Show {amenities.length - 4} more amenities
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <Separator />

                            {/* House Rules */}
                            {property.house_rules && (
                                <>
                                    <div>
                                        <h2 className="text-xl font-semibold mb-4">House Rules</h2>
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-600" />
                                                    <span className="text-sm">
                                                        Check-in: {property.check_in_time}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-600" />
                                                    <span className="text-sm">
                                                        Check-out: {property.check_out_time}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-600" />
                                                    <span className="text-sm">
                                                        Min stay (weekday): {property.min_stay_weekday} nights
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-600" />
                                                    <span className="text-sm">
                                                        Min stay (weekend): {property.min_stay_weekend} nights
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 whitespace-pre-line">
                                                {property.house_rules}
                                            </p>
                                        </div>
                                    </div>
                                    
                                </>
                            )}

                           
                        </div>

                        {/* Booking Card */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24">
                                <Card className="shadow-xl border-0">
                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-2 pt-4 rounded-t-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {/* Show discount prices if dates are selected */}
                                                {discountInfo && checkIn && checkOut ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg text-gray-400 line-through">
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
                                                            <span className="text-gray-600 ml-1">total</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            (Rp {Math.round(discountInfo.final_price / discountInfo.nights).toLocaleString()}/night)
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="text-3xl font-bold text-blue-600">
                                                            {property.formatted_current_rate || property.formatted_base_rate}
                                                        </span>
                                                        <span className="text-gray-600 ml-1">/night</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                                Whole Property
                                            </Badge>
                                        </div>
                                        
                                        {/* Selected Dates Info */}
                                        {checkIn && checkOut && (
                                            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-sm text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                        <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                                >
                                                    <Calendar className="h-4 w-4 mr-2" />
                                                    {showDatePicker ? 'Hide Picker' : 'Change Dates'}
                                                </Button>
                                                
                                                            
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                        {nights} {nights === 1 ? 'night' : 'nights'}
                                                    </Badge>
                                                </div>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Check-in:</span>
                                                        <span className="font-medium">{formatDate(checkIn)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Check-out:</span>
                                                        <span className="font-medium">{formatDate(checkOut)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Guests:</span>
                                                        <span className="font-medium">{guests} guest{guests !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Special Offers */}
                                        {property.has_seasonal_rate && property.seasonal_rate_info && property.seasonal_rate_info.length > 0 && (
                                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                                <div className="flex items-center gap-2 text-green-800 mb-2">
                                                    <Sparkles className="h-4 w-4" />
                                                    <span className="font-medium text-sm">Special Offers</span>
                                                </div>
                                                {property.seasonal_rate_info.slice(0, 2).map((rate, index) => (
                                                    <div key={index} className="text-xs text-green-700">
                                                        • {rate.name}: {rate.description}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Date Range Picker */}
                                        {showDatePicker && (
                                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                                                    <div>
                                                        <Label className="text-sm font-medium">Check-in & Check-out Dates</Label>
                                                        <DateRange
                                                            startDate={selectedCheckIn}
                                                            endDate={selectedCheckOut}
                                                            onDateChange={handleDateChange}
                                                            minDate={new Date().toISOString().split('T')[0]}
                                                            minStayWeekday={property.min_stay_weekday}
                                                            minStayWeekend={property.min_stay_weekend}
                                                            minStayPeak={property.min_stay_peak}
                                                            showMinStayWarning={true}
                                                            size="md"
                                                            showNights={true}
                                                            startLabel="Check-in"
                                                            endLabel="Check-out"
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <Label htmlFor="guests" className="text-sm font-medium">Number of Guests</Label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => selectedGuests > 1 && handleGuestChange(selectedGuests - 1)}
                                                                disabled={selectedGuests <= 1}
                                                            >
                                                                -
                                                            </Button>
                                                            <Input
                                                                id="guests"
                                                                type="number"
                                                                min="1"
                                                                max={property.capacity_max}
                                                                value={selectedGuests}
                                                                onChange={(e) => {
                                                                    const value = parseInt(e.target.value) || 1;
                                                                    if (value >= 1 && value <= property.capacity_max) {
                                                                        handleGuestChange(value);
                                                                    }
                                                                }}
                                                                className="w-20 text-center"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => selectedGuests < property.capacity_max && handleGuestChange(selectedGuests + 1)}
                                                                disabled={selectedGuests >= property.capacity_max}
                                                            >
                                                                +
                                                            </Button>
                                                            <span className="text-sm text-gray-600 ml-2">
                                                                (Max {property.capacity_max})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                    </CardHeader>
                                    
                                    <CardContent className="space-y-6">
                                        
                                        {/* Simple Rate Summary */}
                                        {checkIn && checkOut && property.current_rate_calculation ? (
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                    <Tag className="h-4 w-4" />
                                                    Total Price
                                                </h3>
                                                
                                                <div className="space-y-3 text-sm">
                                                    {/* Discount Price Display */}
                                                    {discountInfo && (
                                                        <>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-600">Original Price</span>
                                                                <span className="text-gray-400 line-through">
                                                                    Rp {discountInfo.original_price.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-600">Discount</span>
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
                                                    {property.current_rate_calculation.extra_bed_amount > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">Extra beds</span>
                                                            <span className="font-medium">
                                                                Included
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">Cleaning fee</span>
                                                        <span className="font-medium">Included</span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">Taxes & fees</span>
                                                        <span className="font-medium">Included</span>
                                                    </div>
                                                    
                                                    <Separator />
                                                    
                                                    {/* Final Total */}
                                                    <div className="flex justify-between items-center text-lg font-bold">
                                                        <span>Total</span>
                                                        <span className="text-blue-600">
                                                            Rp {property.current_rate_calculation.total_amount.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="text-center text-xs text-green-600 bg-green-50 p-2 rounded">
                                                        ✓ All-inclusive price, no hidden fees
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between font-medium">
                                                    <span className="text-gray-600">Starting from</span>
                                                    <span>{property.formatted_base_rate}/night</span>
                                                </div>
                                                
                                                {/* Special Rate Indicator */}
                                                {property.has_seasonal_rate && property.seasonal_rate_info && property.seasonal_rate_info.length > 0 && (
                                                    <div className="border-t pt-2 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-600 text-xs font-medium">Special Rates Available</span>
                                                            <Sparkles className="h-4 w-4 text-green-600" />
                                                        </div>
                                                        {property.seasonal_rate_info.slice(0, 2).map((rate, index) => (
                                                            <div key={index} className="flex justify-between items-center">
                                                                <span className="text-xs text-gray-600">{rate.name}</span>
                                                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                                                    {rate.description}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                    <div className="flex items-center gap-2 text-sm text-blue-800">
                                                        <Info className="h-4 w-4" />
                                                        <span>Select dates to see total price</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <Separator />

                                        {/* Booking Actions */}
                                        <div className="space-y-3">
                                            <Link href={`/properties/${property.slug}/book${selectedCheckIn && selectedCheckOut ? `?check_in=${selectedCheckIn}&check_out=${selectedCheckOut}&guests=${selectedGuests}` : ''}`}>
                                                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                                                    <Calendar className="h-4 w-4 mr-2" />
                                                    Book Now
                                                </Button>
                                            </Link>
                                            
                                        </div>

                                        <div className="text-center text-xs text-gray-500">
                                            You won't be charged yet
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Similar Properties */}
                    {similarProperties.length > 0 && (
                        <div className="mt-16">
                            <h2 className="text-2xl font-bold mb-8">Similar Properties</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {similarProperties.map((similarProperty) => (
                                    <Card key={similarProperty.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                        <div className="aspect-video bg-slate-200 relative">
                                            {similarProperty.media && similarProperty.media.length > 0 ? (
                                                <img 
                                                    src={similarProperty.media.find(m => m.is_featured)?.url || similarProperty.media[0]?.url} 
                                                    alt={similarProperty.media.find(m => m.is_featured)?.alt_text || similarProperty.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                    <Building2 className="h-8 w-8 text-blue-400" />
                                                </div>
                                            )}
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base line-clamp-1">{similarProperty.name}</CardTitle>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <MapPin className="h-3 w-3 mr-1" />
                                                <span className="line-clamp-1">{similarProperty.address}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-lg font-bold text-blue-600">
                                                        {similarProperty.formatted_current_rate || similarProperty.formatted_base_rate}
                                                    </span>
                                                    <span className="text-xs text-gray-600">/night</span>
                                                </div>
                                                <Link href={`/properties/${similarProperty.slug}?check_in=${selectedCheckIn}&check_out=${selectedCheckOut}&guests=${selectedGuests}`}>
                                                    <Button size="sm" variant="outline">
                                                        View
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 