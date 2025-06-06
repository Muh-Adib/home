import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
    Calculator
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
    is_featured: boolean;
    owner: {
        id: number;
        name: string;
        email: string;
    };
    amenities: Amenity[];
    media: Media[];
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
}

export default function PropertyShow({ property, similarProperties }: PropertyShowProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showAllAmenities, setShowAllAmenities] = useState(false);

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
                                <div className="flex items-center text-gray-600 mb-4">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {property.address}
                                </div>
                                
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
                                    <Separator />
                                </>
                            )}

                            {/* Host */}
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Hosted by {property.owner.name}</h2>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Users className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{property.owner.name}</p>
                                        <p className="text-sm text-gray-600">Property Owner</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking Card */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-2xl font-bold text-blue-600">
                                                    {property.formatted_base_rate}
                                                </span>
                                                <span className="text-gray-600">/night</span>
                                            </div>
                                            <Badge variant="secondary">
                                                Whole Property
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Pricing Details */}
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Base rate</span>
                                                <span>{property.formatted_base_rate}/night</span>
                                            </div>
                                            {property.weekend_premium_percent > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Weekend premium</span>
                                                    <span>+{property.weekend_premium_percent}%</span>
                                                </div>
                                            )}
                                            {property.cleaning_fee > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Cleaning fee</span>
                                                    <span>Rp {property.cleaning_fee.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {property.extra_bed_rate > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Extra bed (per night)</span>
                                                    <span>Rp {property.extra_bed_rate.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        {/* Booking Actions */}
                                        <div className="space-y-3">
                                            <Link href={`/properties/${property.slug}/book`}>
                                                <Button className="w-full" size="lg">
                                                    <Calendar className="h-4 w-4 mr-2" />
                                                    Book Now
                                                </Button>
                                            </Link>
                                            
                                            <Button variant="outline" className="w-full">
                                                <Calculator className="h-4 w-4 mr-2" />
                                                Calculate Rate
                                            </Button>
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
                                                        {similarProperty.formatted_base_rate}
                                                    </span>
                                                    <span className="text-xs text-gray-600">/night</span>
                                                </div>
                                                <Link href={`/properties/${similarProperty.slug}`}>
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