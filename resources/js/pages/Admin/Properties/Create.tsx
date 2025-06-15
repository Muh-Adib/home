import React, { useState, useCallback } from 'react';
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
    Info
} from 'lucide-react';

interface Amenity {
    id: number;
    name: string;
    category: string;
    icon: string;
}

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
    [key: string]: any; // Index signature for FormDataType compatibility
}

function CreateProperty({ amenities, owners }: CreatePropertyProps) {
    const [showMap, setShowMap] = useState(false);
    const [mapCenter, setMapCenter] = useState({ lat: -6.2088, lng: 106.8456 }); // Jakarta default

    const { data, setData, post, processing, errors } = useForm<PropertyFormData>({
        name: '',
        description: '',
        address: '',
        lat: null,
        lng: null,
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
        is_featured: false,
        seo_title: '',
        seo_description: '',
        amenities: [],
        owner_id: owners ? undefined : '',
    });

    const handleLocationChange = useCallback((lat: number, lng: number) => {
        setData(prev => ({ ...prev, lat, lng }));
        setMapCenter({ lat, lng });
    }, [setData]);

    const handleAddressChange = (address: string) => {
        setData('address', address);
        
        // Simple geocoding simulation (in real app, use proper geocoding service)
        if (address.toLowerCase().includes('jakarta')) {
            setMapCenter({ lat: -6.2088, lng: 106.8456 });
        } else if (address.toLowerCase().includes('yogya') || address.toLowerCase().includes('jogja')) {
            setMapCenter({ lat: -7.7972, lng: 110.3688 });
        } else if (address.toLowerCase().includes('bandung')) {
            setMapCenter({ lat: -6.9175, lng: 107.6191 });
        } else if (address.toLowerCase().includes('surabaya')) {
            setMapCenter({ lat: -7.2575, lng: 112.7521 });
        } else if (address.toLowerCase().includes('bali') || address.toLowerCase().includes('denpasar')) {
            setMapCenter({ lat: -8.6705, lng: 115.2126 });
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
        post(route('admin.properties.store'));
    };

    // Group amenities by category
    const amenityCategories = amenities.reduce((acc, amenity) => {
        if (!acc[amenity.category]) {
            acc[amenity.category] = [];
        }
        acc[amenity.category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

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
                                            <li key={field}>• {field}: {message}</li>
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
                                                    onCheckedChange={(checked) => setData('is_featured', checked)}
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
                                                                checked={data.amenities.includes(amenity.id)}
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
