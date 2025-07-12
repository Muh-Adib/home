import React, { useState, useCallback, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Map } from '@/components/ui/map';
import { Separator } from '@/components/ui/separator';
import { 
    ArrowLeft, 
    Building2,
    MapPin,
    Users,
    Bed,
    Bath,
    DollarSign,
    Clock,
    Calendar,
    Star,
    Save,
    AlertCircle,
    Info,
    Eye,
    EyeOff
} from 'lucide-react';
import { Amenity } from '@/types';

interface User {
    id: number;
    name: string;
    email: string;
}

interface CreatePropertyProps {
    amenities: Amenity[];
    owners?: User[];
}

interface PropertyFormData {
    name: string;
    description: string;
    address: string;
    maps_link: string;
    lat: number | null;
    lng: number | null;
    capacity: number;
    capacity_max: number;
    bedroom_count: number;
    bathroom_count: number;
    base_rate: number;
    weekend_premium_percent: number;
    cleaning_fee: number;
    extra_bed_rate: number;
    house_rules: string;
    check_in_time: string;
    check_out_time: string;
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    is_featured: boolean;
    seo_title: string;
    seo_description: string;
    amenities: number[];
    owner_id?: string;
}

// Utility functions
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

const validateCoordinate = (lat: number | null, lng: number | null): boolean => {
    if (lat === null || lng === null) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Indonesian cities with coordinates for better geocoding
const INDONESIAN_CITIES = {
    'jakarta': { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
    'yogya': { lat: -7.7972, lng: 110.3688, name: 'Yogyakarta' },
    'jogja': { lat: -7.7972, lng: 110.3688, name: 'Yogyakarta' },
    'yogyakarta': { lat: -7.7972, lng: 110.3688, name: 'Yogyakarta' },
    'bandung': { lat: -6.9175, lng: 107.6191, name: 'Bandung' },
    'surabaya': { lat: -7.2575, lng: 112.7521, name: 'Surabaya' },
    'bali': { lat: -8.6705, lng: 115.2126, name: 'Bali' },
    'denpasar': { lat: -8.6705, lng: 115.2126, name: 'Denpasar' },
    'ubud': { lat: -8.5069, lng: 115.2624, name: 'Ubud' },
    'canggu': { lat: -8.6482, lng: 115.1386, name: 'Canggu' },
    'seminyak': { lat: -8.6913, lng: 115.1735, name: 'Seminyak' },
    'kuta': { lat: -8.7203, lng: 115.1677, name: 'Kuta' },
    'sanur': { lat: -8.6872, lng: 115.2620, name: 'Sanur' },
    'lombok': { lat: -8.6500, lng: 116.3244, name: 'Lombok' },
    'medan': { lat: 3.5952, lng: 98.6722, name: 'Medan' },
    'palembang': { lat: -2.9761, lng: 104.7754, name: 'Palembang' },
    'makassar': { lat: -5.1477, lng: 119.4327, name: 'Makassar' },
    'semarang': { lat: -6.9661, lng: 110.4203, name: 'Semarang' },
    'malang': { lat: -7.9797, lng: 112.6304, name: 'Malang' },
};

function CreateProperty({ amenities, owners }: CreatePropertyProps) {
    const [showMap, setShowMap] = useState(false);
    const [mapCenter, setMapCenter] = useState({ lat: -6.2088, lng: 106.8456 }); // Jakarta default
    const [showAdvancedSEO, setShowAdvancedSEO] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>('');

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
        address: '',
        maps_link: '',
        lat: null as number | null,
        lng: null as number | null,
        capacity: 2,
        capacity_max: 4,
        bedroom_count: 1,
        bathroom_count: 1,
        base_rate: 500000,
        weekend_premium_percent: 20,
        cleaning_fee: 50000,
        extra_bed_rate: 75000,
        house_rules: '',
        check_in_time: '14:00',
        check_out_time: '12:00',
        min_stay_weekday: 1,
        min_stay_weekend: 2,
        min_stay_peak: 3,
        is_featured: false as boolean,
        seo_title: '',
        seo_description: '',
        amenities: [] as number[],
        owner_id: owners ? undefined : '',
    });

    // Auto-generate SEO title when property name changes
    useEffect(() => {
        if (data.name && !data.seo_title) {
            const cityName = selectedCity ? INDONESIAN_CITIES[selectedCity as keyof typeof INDONESIAN_CITIES]?.name : '';
            const generatedTitle = cityName 
                ? `${data.name} - Luxury Villa in ${cityName} | Book Now`
                : `${data.name} - Premium Villa Rental | Book Direct`;
            setData('seo_title', generatedTitle);
        }
    }, [data.name, selectedCity, setData]);

    // Auto-generate SEO description when description changes
    useEffect(() => {
        if (data.description && !data.seo_description && data.description.length > 20) {
            const shortDesc = data.description.substring(0, 150).trim();
            const generatedDesc = shortDesc + (data.description.length > 150 ? '...' : '') + 
                ` Book direct for best rates. ${data.bedroom_count} bedrooms, ${data.bathroom_count} bathrooms, sleeps ${data.capacity_max}.`;
            setData('seo_description', generatedDesc);
        }
    }, [data.description, data.bedroom_count, data.bathroom_count, data.capacity_max, setData]);

    // Ensure capacity_max is always >= capacity
    useEffect(() => {
        if (data.capacity > data.capacity_max) {
            setData('capacity_max', data.capacity);
        }
    }, [data.capacity, data.capacity_max, setData]);

    const handleLocationChange = useCallback((lat: number, lng: number) => {
        setData(prev => ({ ...prev, lat, lng }));
        setMapCenter({ lat, lng });
    }, [setData]);

    const handleAddressChange = (address: string) => {
        setData('address', address);
        
        // Enhanced geocoding with better city detection
        const addressLower = address.toLowerCase();
        let detectedCity = '';
        
        for (const [key, cityData] of Object.entries(INDONESIAN_CITIES)) {
            if (addressLower.includes(key)) {
                setMapCenter({ lat: cityData.lat, lng: cityData.lng });
                setSelectedCity(key);
                detectedCity = cityData.name;
                break;
            }
        }
        
        // If we detected a city and SEO title is empty or still default, update it
        if (detectedCity && data.name) {
            const currentSEOTitle = data.seo_title;
            if (!currentSEOTitle || currentSEOTitle.includes('Premium Villa Rental')) {
                setData('seo_title', `${data.name} - Luxury Villa in ${detectedCity} | Book Now`);
            }
        }
    };

    const handleAmenityChange = (amenityId: number, checked: boolean) => {
        setData('amenities', 
            checked 
                ? [...data.amenities, amenityId]
                : data.amenities.filter(id => id !== amenityId)
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Client-side validation
        const validationErrors: Record<string, string> = {};
        
        if (!data.name.trim()) validationErrors.name = 'Property name is required';
        if (!data.description.trim()) validationErrors.description = 'Description is required';
        if (!data.address.trim()) validationErrors.address = 'Address is required';
        if (data.capacity < 1) validationErrors.capacity = 'Capacity must be at least 1';
        if (data.capacity_max < data.capacity) validationErrors.capacity_max = 'Maximum capacity must be at least equal to standard capacity';
        if (data.base_rate < 0) validationErrors.base_rate = 'Base rate cannot be negative';
        if (data.lat !== null && data.lng !== null && !validateCoordinate(data.lat, data.lng)) {
            validationErrors.coordinates = 'Invalid coordinates';
        }
        
        if (Object.keys(validationErrors).length > 0) {
            // Show validation errors (in real app, you'd set these to form errors)
            console.log('Validation errors:', validationErrors);
            return;
        }
        
        post(route('admin.properties.store'), {
            onSuccess: () => {
                // Handle success
                console.log('Property created successfully');
            },
            onError: (errors) => {
                // Handle server errors
                console.log('Server errors:', errors);
            }
        });
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset all fields? This action cannot be undone.')) {
            reset();
            setShowMap(false);
            setSelectedCity('');
            setMapCenter({ lat: -6.2088, lng: 106.8456 });
        }
    };

    // Group amenities by category with better organization
    const amenityCategories = amenities.reduce((acc, amenity) => {
        const category = amenity.category || 'other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    // Sort categories for better UX
    const sortedCategories = Object.keys(amenityCategories).sort((a, b) => {
        const order = ['essential', 'comfort', 'entertainment', 'outdoor', 'safety', 'other'];
        return order.indexOf(a) - order.indexOf(b);
    });

    // Calculate estimated pricing
    const weekendRate = data.base_rate + (data.base_rate * data.weekend_premium_percent / 100);
    const totalForWeekendStay = (weekendRate * 2) + data.cleaning_fee;


    return (
        <>
            <Head title="Create Property - Admin" />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Link href={route('admin.properties.index')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Properties
                                </Link>
                                <div className="h-6 w-px bg-gray-300" />
                                <h1 className="text-2xl font-bold text-gray-900">Create New Property</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Global Error Display */}
                        {Object.keys(errors).length > 0 && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="font-medium mb-2">Please fix the following errors:</div>
                                    <ul className="text-sm space-y-1">
                                        {Object.entries(errors).map(([field, message]) => (
                                            <li key={field}>• {field}: {String(message)}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Main Form */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Basic Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5" />
                                            Basic Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="name">Property Name *</Label>
                                                <Input
                                                    id="name"
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    placeholder="Villa Sunset Paradise"
                                                    className={errors.name ? 'border-red-500' : ''}
                                                />
                                                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                                            </div>

                                            {/* Owner Selection (only for super admin) */}
                                            {owners && (
                                                <div>
                                                    <Label htmlFor="owner_id">Property Owner *</Label>
                                                    <Select value={data.owner_id} onValueChange={(value) => setData('owner_id', value)}>
                                                        <SelectTrigger className={errors.owner_id ? 'border-red-500' : ''}>
                                                            <SelectValue placeholder="Select owner..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="auto">Auto-assign</SelectItem>
                                                            {owners.map(owner => (
                                                                <SelectItem key={owner.id} value={owner.id.toString()}>
                                                                    {owner.name} ({owner.email})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.owner_id && <p className="text-sm text-red-600 mt-1">{errors.owner_id}</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="description">Description *</Label>
                                            <Textarea
                                                id="description"
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                rows={4}
                                                placeholder="Describe your property in detail..."
                                                className={errors.description ? 'border-red-500' : ''}
                                            />
                                            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="is_featured"
                                                    checked={data.is_featured}
                                                    onCheckedChange={(checked: boolean) => setData('is_featured', checked)}
                                                />
                                                <Label htmlFor="is_featured" className="flex items-center gap-2">
                                                    <Star className="h-4 w-4" />
                                                    Featured Property
                                                </Label>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Location */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MapPin className="h-5 w-5" />
                                            Location
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="address">Address *</Label>
                                            <Textarea
                                                id="address"
                                                value={data.address}
                                                onChange={(e) => handleAddressChange(e.target.value)}
                                                rows={2}
                                                placeholder="Jl. Raya Villa No. 123, Canggu, Badung, Bali 80361"
                                                className={errors.address ? 'border-red-500' : ''}
                                            />
                                            {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="maps_link">Maps Link</Label>
                                            <Input
                                                id="maps_link"
                                                value={data.maps_link}
                                                onChange={(e) => setData('maps_link', e.target.value)}
                                                placeholder="https://maps.app.goo.gl/XCq7dHsWgRQwbBAx8"
                                            />
                                            {errors.maps_link && <p className="text-sm text-red-600 mt-1">{errors.maps_link}</p>}
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="lat">Latitude</Label>
                                                <Input
                                                    id="lat"
                                                    type="number"
                                                    step="any"
                                                    value={data.lat || ''}
                                                    onChange={(e) => setData('lat', e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder="-8.6705"
                                                    className={errors.lat ? 'border-red-500' : ''}
                                                />
                                                {errors.lat && <p className="text-sm text-red-600 mt-1">{errors.lat}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="lng">Longitude</Label>
                                                <Input
                                                    id="lng"
                                                    type="number"
                                                    step="any"
                                                    value={data.lng || ''}
                                                    onChange={(e) => setData('lng', e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder="115.2126"
                                                    className={errors.lng ? 'border-red-500' : ''}
                                                />
                                                {errors.lng && <p className="text-sm text-red-600 mt-1">{errors.lng}</p>}
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setShowMap(!showMap)}
                                                    className="w-full"
                                                >
                                                    <MapPin className="h-4 w-4 mr-2" />
                                                    {showMap ? 'Hide Map' : 'Show Map'}
                                                </Button>
                                            </div>
                                        </div>

                                        {showMap && (
                                            <div className="space-y-2">
                                                <Label>Select Location on Map</Label>
                                                <Map
                                                    lat={data.lat || mapCenter.lat}
                                                    lng={data.lng || mapCenter.lng}
                                                    height="300px"
                                                    draggable={true}
                                                    onLocationChange={handleLocationChange}
                                                    propertyName={data.name || "New Property"}
                                                    address={data.address}
                                                />
                                                <p className="text-sm text-gray-600">
                                                    <Info className="h-3 w-3 inline mr-1" />
                                                    Drag the marker to set the exact location
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Property Details */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Property Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="capacity">Standard Capacity *</Label>
                                                <Input
                                                    id="capacity"
                                                    type="number"
                                                    min="1"
                                                    value={data.capacity}
                                                    onChange={(e) => setData('capacity', parseInt(e.target.value) || 1)}
                                                    className={errors.capacity ? 'border-red-500' : ''}
                                                />
                                                {errors.capacity && <p className="text-sm text-red-600 mt-1">{errors.capacity}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="capacity_max">Maximum Capacity *</Label>
                                                <Input
                                                    id="capacity_max"
                                                    type="number"
                                                    min={data.capacity}
                                                    value={data.capacity_max}
                                                    onChange={(e) => setData('capacity_max', parseInt(e.target.value) || data.capacity)}
                                                    className={errors.capacity_max ? 'border-red-500' : ''}
                                                />
                                                {errors.capacity_max && <p className="text-sm text-red-600 mt-1">{errors.capacity_max}</p>}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="bedroom_count">Bedrooms *</Label>
                                                <Input
                                                    id="bedroom_count"
                                                    type="number"
                                                    min="1"
                                                    value={data.bedroom_count}
                                                    onChange={(e) => setData('bedroom_count', parseInt(e.target.value) || 1)}
                                                    className={errors.bedroom_count ? 'border-red-500' : ''}
                                                />
                                                {errors.bedroom_count && <p className="text-sm text-red-600 mt-1">{errors.bedroom_count}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="bathroom_count">Bathrooms *</Label>
                                                <Input
                                                    id="bathroom_count"
                                                    type="number"
                                                    min="1"
                                                    value={data.bathroom_count}
                                                    onChange={(e) => setData('bathroom_count', parseInt(e.target.value) || 1)}
                                                    className={errors.bathroom_count ? 'border-red-500' : ''}
                                                />
                                                {errors.bathroom_count && <p className="text-sm text-red-600 mt-1">{errors.bathroom_count}</p>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Pricing */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="h-5 w-5" />
                                            Pricing
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="base_rate">Base Rate (IDR/night) *</Label>
                                                <Input
                                                    id="base_rate"
                                                    type="number"
                                                    min="0"
                                                    value={data.base_rate}
                                                    onChange={(e) => setData('base_rate', parseInt(e.target.value) || 0)}
                                                    className={errors.base_rate ? 'border-red-500' : ''}
                                                />
                                                {errors.base_rate && <p className="text-sm text-red-600 mt-1">{errors.base_rate}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="weekend_premium_percent">Weekend Premium (%)</Label>
                                                <Input
                                                    id="weekend_premium_percent"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={data.weekend_premium_percent}
                                                    onChange={(e) => setData('weekend_premium_percent', parseInt(e.target.value) || 0)}
                                                    className={errors.weekend_premium_percent ? 'border-red-500' : ''}
                                                />
                                                {errors.weekend_premium_percent && <p className="text-sm text-red-600 mt-1">{errors.weekend_premium_percent}</p>}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="cleaning_fee">Cleaning Fee (IDR)</Label>
                                                <Input
                                                    id="cleaning_fee"
                                                    type="number"
                                                    min="0"
                                                    value={data.cleaning_fee}
                                                    onChange={(e) => setData('cleaning_fee', parseInt(e.target.value) || 0)}
                                                    className={errors.cleaning_fee ? 'border-red-500' : ''}
                                                />
                                                {errors.cleaning_fee && <p className="text-sm text-red-600 mt-1">{errors.cleaning_fee}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="extra_bed_rate">Extra Bed Rate (IDR/night)</Label>
                                                <Input
                                                    id="extra_bed_rate"
                                                    type="number"
                                                    min="0"
                                                    value={data.extra_bed_rate}
                                                    onChange={(e) => setData('extra_bed_rate', parseInt(e.target.value) || 0)}
                                                    className={errors.extra_bed_rate ? 'border-red-500' : ''}
                                                />
                                                {errors.extra_bed_rate && <p className="text-sm text-red-600 mt-1">{errors.extra_bed_rate}</p>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Booking Rules */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Booking Rules
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="check_in_time">Check-in Time *</Label>
                                                <Input
                                                    id="check_in_time"
                                                    type="time"
                                                    value={data.check_in_time}
                                                    onChange={(e) => setData('check_in_time', e.target.value)}
                                                    className={errors.check_in_time ? 'border-red-500' : ''}
                                                />
                                                {errors.check_in_time && <p className="text-sm text-red-600 mt-1">{errors.check_in_time}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="check_out_time">Check-out Time *</Label>
                                                <Input
                                                    id="check_out_time"
                                                    type="time"
                                                    value={data.check_out_time}
                                                    onChange={(e) => setData('check_out_time', e.target.value)}
                                                    className={errors.check_out_time ? 'border-red-500' : ''}
                                                />
                                                {errors.check_out_time && <p className="text-sm text-red-600 mt-1">{errors.check_out_time}</p>}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="min_stay_weekday">Min Stay Weekday (nights)</Label>
                                                <Input
                                                    id="min_stay_weekday"
                                                    type="number"
                                                    min="1"
                                                    value={data.min_stay_weekday}
                                                    onChange={(e) => setData('min_stay_weekday', parseInt(e.target.value) || 1)}
                                                    className={errors.min_stay_weekday ? 'border-red-500' : ''}
                                                />
                                                {errors.min_stay_weekday && <p className="text-sm text-red-600 mt-1">{errors.min_stay_weekday}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="min_stay_weekend">Min Stay Weekend (nights)</Label>
                                                <Input
                                                    id="min_stay_weekend"
                                                    type="number"
                                                    min="1"
                                                    value={data.min_stay_weekend}
                                                    onChange={(e) => setData('min_stay_weekend', parseInt(e.target.value) || 1)}
                                                    className={errors.min_stay_weekend ? 'border-red-500' : ''}
                                                />
                                                {errors.min_stay_weekend && <p className="text-sm text-red-600 mt-1">{errors.min_stay_weekend}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="min_stay_peak">Min Stay Peak Season (nights)</Label>
                                                <Input
                                                    id="min_stay_peak"
                                                    type="number"
                                                    min="1"
                                                    value={data.min_stay_peak}
                                                    onChange={(e) => setData('min_stay_peak', parseInt(e.target.value) || 1)}
                                                    className={errors.min_stay_peak ? 'border-red-500' : ''}
                                                />
                                                {errors.min_stay_peak && <p className="text-sm text-red-600 mt-1">{errors.min_stay_peak}</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="house_rules">House Rules</Label>
                                            <Textarea
                                                id="house_rules"
                                                value={data.house_rules}
                                                onChange={(e) => setData('house_rules', e.target.value)}
                                                rows={4}
                                                placeholder="No smoking, No pets, Quiet hours after 10 PM..."
                                                className={errors.house_rules ? 'border-red-500' : ''}
                                            />
                                            {errors.house_rules && <p className="text-sm text-red-600 mt-1">{errors.house_rules}</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* SEO */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>SEO Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="seo_title">SEO Title</Label>
                                            <Input
                                                id="seo_title"
                                                value={data.seo_title}
                                                onChange={(e) => setData('seo_title', e.target.value)}
                                                placeholder="Best Villa in Bali - Villa Sunset Paradise"
                                                className={errors.seo_title ? 'border-red-500' : ''}
                                            />
                                            {errors.seo_title && <p className="text-sm text-red-600 mt-1">{errors.seo_title}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="seo_description">SEO Description</Label>
                                            <Textarea
                                                id="seo_description"
                                                value={data.seo_description}
                                                onChange={(e) => setData('seo_description', e.target.value)}
                                                rows={3}
                                                placeholder="Experience luxury at Villa Sunset Paradise with stunning ocean views..."
                                                className={errors.seo_description ? 'border-red-500' : ''}
                                            />
                                            {errors.seo_description && <p className="text-sm text-red-600 mt-1">{errors.seo_description}</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sidebar */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Amenities */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Amenities</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                                        {Object.entries(amenityCategories).map(([category, categoryAmenities]) => (
                                            <div key={category}>
                                                <h4 className="font-medium text-sm text-gray-900 mb-2 capitalize">
                                                    {category.replace('_', ' ')}
                                                </h4>
                                                <div className="space-y-2 ml-2">
                                                    {categoryAmenities.map(amenity => (
                                                        <div key={amenity.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`amenity-${amenity.id}`}
                                                                checked={Array.isArray(data.amenities) && data.amenities.includes(amenity.id)}
                                                                onCheckedChange={(checked) => handleAmenityChange(amenity.id, checked as boolean)}
                                                            />
                                                            <Label 
                                                                htmlFor={`amenity-${amenity.id}`}
                                                                className="text-sm font-normal"
                                                            >
                                                                {amenity.name}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Actions */}
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="space-y-4">
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full"
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {processing ? 'Creating...' : 'Create Property'}
                                            </Button>
                                            
                                            <Link href={route('admin.properties.index')}>
                                                <Button variant="outline" className="w-full">
                                                    Cancel
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

// Wrap with AppLayout
CreateProperty.layout = (page: React.ReactElement) => <AppLayout>{page}</AppLayout>;

export default CreateProperty; 
