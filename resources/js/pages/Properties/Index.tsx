import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
    Building2, 
    Search, 
    Filter, 
    MapPin, 
    Users, 
    Bed, 
    Bath, 
    Star,
    Heart,
    SlidersHorizontal,
    X,
    Calendar,
    ArrowUpDown
} from 'lucide-react';

interface Property {
    id: number;
    name: string;
    slug: string;
    description: string;
    address: string;
    base_rate: number;
    formatted_base_rate: string;
    capacity: number;
    capacity_max: number;
    bedroom_count: number;
    bathroom_count: number;
    is_featured: boolean;
    amenities: Amenity[];
    media: Media[];
    featured_images: Media[];
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

interface Amenity {
    id: number;
    name: string;
    icon: string;
    category: string;
}

interface PropertiesIndexProps {
    properties: {
        data: Property[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        prev_page_url?: string;
        next_page_url?: string;
    };
    amenities: Amenity[];
    filters: {
        search?: string;
        amenities?: string;
        guests?: number;
        sort?: string;
    };
}

export default function PropertiesIndex({ properties, amenities, filters }: PropertiesIndexProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState({
        search: filters.search || '',
        selectedAmenities: filters.amenities ? filters.amenities.split(',') : [],
        guests: filters.guests || 2,
        sort: filters.sort || 'featured',
    });

    const handleSearch = () => {
        const params: any = {};
        
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.selectedAmenities.length > 0) {
            params.amenities = localFilters.selectedAmenities.join(',');
        }
        if (localFilters.guests > 1) params.guests = localFilters.guests;
        if (localFilters.sort !== 'featured') params.sort = localFilters.sort;

        router.get('/properties', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({
            search: '',
            selectedAmenities: [],
            guests: 2,
            sort: 'featured',
        });
        router.get('/properties');
    };

    const toggleAmenity = (amenityId: string) => {
        setLocalFilters(prev => ({
            ...prev,
            selectedAmenities: prev.selectedAmenities.includes(amenityId)
                ? prev.selectedAmenities.filter(id => id !== amenityId)
                : [...prev.selectedAmenities, amenityId]
        }));
    };

    const sortOptions = [
        { value: 'featured', label: 'Featured First' },
        { value: 'price_low', label: 'Price: Low to High' },
        { value: 'price_high', label: 'Price: High to Low' },
        { value: 'name', label: 'Name A-Z' },
    ];

    const amenityCategories = amenities.reduce((acc, amenity) => {
        if (!acc[amenity.category]) {
            acc[amenity.category] = [];
        }
        acc[amenity.category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    return (
        <>
            <Head title="Properties - Property Management System" />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
                                <p className="text-gray-600 mt-1">
                                    {properties.total} properties found
                                </p>
                            </div>
                            <Link href="/">
                                <Button variant="outline">
                                    Back to Home
                                </Button>
                            </Link>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search properties by name, location..."
                                    value={localFilters.search}
                                    onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="pl-10"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Filters
                                    {(localFilters.selectedAmenities.length > 0 || localFilters.guests > 2) && (
                                        <Badge variant="secondary" className="ml-1">
                                            {localFilters.selectedAmenities.length + (localFilters.guests > 2 ? 1 : 0)}
                                        </Badge>
                                    )}
                                </Button>
                                
                                <Select value={localFilters.sort} onValueChange={(value) => {
                                    setLocalFilters(prev => ({ ...prev, sort: value }));
                                    // Auto apply sort
                                    setTimeout(handleSearch, 100);
                                }}>
                                    <SelectTrigger className="w-[200px]">
                                        <ArrowUpDown className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                <Button onClick={handleSearch}>
                                    Search
                                </Button>
                            </div>
                        </div>

                        {/* Filter Panel */}
                        {showFilters && (
                            <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">Filters</h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowFilters(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Guest Count */}
                                    <div>
                                        <Label className="text-sm font-medium mb-3 block">
                                            Guests: {localFilters.guests}
                                        </Label>
                                        <Slider
                                            value={[localFilters.guests]}
                                            onValueChange={(value) => setLocalFilters(prev => ({ ...prev, guests: value[0] }))}
                                            max={20}
                                            min={1}
                                            step={1}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>1</span>
                                            <span>20+</span>
                                        </div>
                                    </div>

                                    {/* Amenities by Category */}
                                    {Object.entries(amenityCategories).map(([category, categoryAmenities]) => (
                                        <div key={category}>
                                            <Label className="text-sm font-medium mb-3 block capitalize">
                                                {category.replace('_', ' ')}
                                            </Label>
                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                                {categoryAmenities.map(amenity => (
                                                    <div key={amenity.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`amenity-${amenity.id}`}
                                                            checked={localFilters.selectedAmenities.includes(amenity.id.toString())}
                                                            onCheckedChange={() => toggleAmenity(amenity.id.toString())}
                                                        />
                                                        <Label
                                                            htmlFor={`amenity-${amenity.id}`}
                                                            className="text-sm cursor-pointer"
                                                        >
                                                            {amenity.name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 mt-6 pt-4 border-t">
                                    <Button onClick={handleSearch} className="flex-1">
                                        Apply Filters
                                    </Button>
                                    <Button variant="outline" onClick={clearFilters}>
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Properties Grid */}
                <div className="container mx-auto px-4 py-8">
                    {properties.data.length > 0 ? (
                        <>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {properties.data.map((property) => (
                                    <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                        <div className="aspect-video bg-slate-200 relative">
                                            {property.media && property.media.length > 0 ? (
                                                <img 
                                                    src={property.media.find(m => m.is_featured)?.url || property.media[0]?.url} 
                                                    alt={property.media.find(m => m.is_featured)?.alt_text || property.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                    <Building2 className="h-12 w-12 text-blue-400" />
                                                </div>
                                            )}
                                            
                                            <div className="absolute top-2 left-2 flex gap-1">
                                                {property.is_featured && (
                                                    <Badge className="bg-yellow-500 text-white">
                                                        <Star className="h-3 w-3 mr-1" />
                                                        Featured
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                                            >
                                                <Heart className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg line-clamp-1">{property.name}</CardTitle>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <MapPin className="h-4 w-4 mr-1" />
                                                <span className="line-clamp-1">{property.address}</span>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent>
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                {property.description}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center">
                                                        <Bed className="h-4 w-4 mr-1" />
                                                        {property.bedroom_count}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Bath className="h-4 w-4 mr-1" />
                                                        {property.bathroom_count}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Users className="h-4 w-4 mr-1" />
                                                        {property.capacity}-{property.capacity_max}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Amenities Preview */}
                                            {property.amenities && property.amenities.length > 0 && (
                                                <div className="mb-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {property.amenities.slice(0, 3).map(amenity => (
                                                            <Badge key={amenity.id} variant="secondary" className="text-xs">
                                                                {amenity.name}
                                                            </Badge>
                                                        ))}
                                                        {property.amenities.length > 3 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{property.amenities.length - 3} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-2xl font-bold text-blue-600">
                                                        {property.formatted_base_rate}
                                                    </span>
                                                    <span className="text-sm text-gray-600">/night</span>
                                                </div>
                                                <Link href={`/properties/${property.slug}`}>
                                                    <Button size="sm">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Pagination */}
                            {properties.last_page > 1 && (
                                <div className="flex justify-center mt-8">
                                    <div className="flex items-center gap-2">
                                        {properties.prev_page_url && (
                                            <Link href={properties.prev_page_url}>
                                                <Button variant="outline">Previous</Button>
                                            </Link>
                                        )}
                                        
                                        <span className="px-4 py-2 text-sm text-gray-600">
                                            Page {properties.current_page} of {properties.last_page}
                                        </span>
                                        
                                        {properties.next_page_url && (
                                            <Link href={properties.next_page_url}>
                                                <Button variant="outline">Next</Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No properties found</h3>
                            <p className="text-gray-500 mb-4">
                                Try adjusting your search criteria or filters
                            </p>
                            <Button onClick={clearFilters} variant="outline">
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 