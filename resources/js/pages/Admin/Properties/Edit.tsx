import React, { useState, useCallback } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Map } from '@/components/ui/map';
import { type Amenity, type Property, type BreadcrumbItem, type PageProps } from '@/types';
import { 
    Building2, 
    Save, 
    ArrowLeft,
    Users,
    DollarSign,
    Clock,
    Star,
    Settings,
    Info,
    AlertTriangle,
    ImageIcon,
    Eye,
    MapPin
} from 'lucide-react';

interface EditPropertyProps extends PageProps {
    property: Property & {
        amenities: Amenity[];
    };
    amenities: Amenity[];
}

export default function EditProperty({ property, amenities }: EditPropertyProps) {
    const [selectedAmenities, setSelectedAmenities] = useState<number[]>(
        property.amenities?.map((a: Amenity) => a.id) || []
    );
    const [showMap, setShowMap] = useState(false);
    const [mapCenter, setMapCenter] = useState({ 
        lat: property.lat || -6.2088, 
        lng: property.lng || 106.8456 
    });

    const { data, setData, put, processing, errors } = useForm({
        name: property.name || '',
        description: property.description || '',
        address: property.address || '',
        lat: property.lat || null,
        lng: property.lng || null,
        capacity: property.capacity || 2,
        capacity_max: property.capacity_max || 4,
        bedroom_count: property.bedroom_count || 1,
        bathroom_count: property.bathroom_count || 1,
        base_rate: property.base_rate || 500000,
        weekend_premium_percent: property.weekend_premium_percent || 20,
        cleaning_fee: property.cleaning_fee || 100000,
        extra_bed_rate: property.extra_bed_rate || 50000,
        status: property.status || 'active',
        house_rules: property.house_rules || '',
        check_in_time: property.check_in_time || '14:00',
        check_out_time: property.check_out_time || '12:00',
        min_stay_weekday: property.min_stay_weekday || 1,
        min_stay_weekend: property.min_stay_weekend || 2,
        min_stay_peak: property.min_stay_peak || 3,
        is_featured: property.is_featured || false,
        seo_title: property.seo_title || '',
        seo_description: property.seo_description || '',
        amenities: selectedAmenities,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties', href: '/admin/properties' },
        { title: property.name, href: `/admin/properties/${property.slug}` },
        { title: 'Edit', href: '' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/properties/${property.slug}`);
    };

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

    const handleAmenityToggle = (amenityId: number) => {
        const updated = selectedAmenities.includes(amenityId)
            ? selectedAmenities.filter(id => id !== amenityId)
            : [...selectedAmenities, amenityId];
        
        setSelectedAmenities(updated);
        setData('amenities', updated);
    };

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const amenityCategories = amenities.reduce((acc, amenity) => {
        if (!acc[amenity.category]) {
            acc[amenity.category] = [];
        }
        acc[amenity.category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    const statusOptions = [
        { value: 'active', label: 'Active', description: 'Property is available for booking' },
        { value: 'inactive', label: 'Inactive', description: 'Property is hidden from public' },
        { value: 'maintenance', label: 'Maintenance', description: 'Property is under maintenance' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${property.name} - Admin Dashboard`} />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Property</h1>
                        <p className="text-muted-foreground">
                            Update property information and settings
                        </p>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/admin/properties/${property.slug}`}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Details
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/properties/${property.slug}`} target="_blank">
                                Preview
                            </Link>
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Property Name *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Villa Paradise Bali"
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status *</Label>
                                    <Select value={data.status} onValueChange={(value: "active" | "inactive" | "maintenance") => setData('status', value)}>
                                        <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    <div>
                                                        <div>{option.label}</div>
                                                        <div className="text-xs text-muted-foreground">{option.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address *</Label>
                                <Textarea
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => handleAddressChange(e.target.value)}
                                    placeholder="Jl. Raya Ubud No. 123, Ubud, Bali"
                                    rows={2}
                                    className={errors.address ? 'border-red-500' : ''}
                                />
                                {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
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
                                    {errors.lat && <p className="text-sm text-red-500">{errors.lat}</p>}
                                </div>
                                <div className="space-y-2">
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
                                    {errors.lng && <p className="text-sm text-red-500">{errors.lng}</p>}
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
                                    <Label>Property Location</Label>
                                    <Map
                                        lat={data.lat || mapCenter.lat}
                                        lng={data.lng || mapCenter.lng}
                                        height="300px"
                                        draggable={true}
                                        onLocationChange={handleLocationChange}
                                        propertyName={data.name || "Property"}
                                        address={data.address}
                                    />
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Drag the marker to update the exact location
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Describe your property, its unique features, and what makes it special..."
                                    rows={4}
                                    className={errors.description ? 'border-red-500' : ''}
                                />
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Capacity & Rooms */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Capacity & Rooms
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="capacity">Standard Capacity *</Label>
                                    <Input
                                        id="capacity"
                                        type="number"
                                        min="1"
                                        value={data.capacity}
                                        onChange={(e) => setData('capacity', parseInt(e.target.value))}
                                        className={errors.capacity ? 'border-red-500' : ''}
                                    />
                                    {errors.capacity && <p className="text-sm text-red-500">{errors.capacity}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="capacity_max">Maximum Capacity *</Label>
                                    <Input
                                        id="capacity_max"
                                        type="number"
                                        min={data.capacity}
                                        value={data.capacity_max}
                                        onChange={(e) => setData('capacity_max', parseInt(e.target.value))}
                                        className={errors.capacity_max ? 'border-red-500' : ''}
                                    />
                                    {errors.capacity_max && <p className="text-sm text-red-500">{errors.capacity_max}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bedroom_count">Bedrooms *</Label>
                                    <Input
                                        id="bedroom_count"
                                        type="number"
                                        min="1"
                                        value={data.bedroom_count}
                                        onChange={(e) => setData('bedroom_count', parseInt(e.target.value))}
                                        className={errors.bedroom_count ? 'border-red-500' : ''}
                                    />
                                    {errors.bedroom_count && <p className="text-sm text-red-500">{errors.bedroom_count}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bathroom_count">Bathrooms *</Label>
                                    <Input
                                        id="bathroom_count"
                                        type="number"
                                        min="1"
                                        value={data.bathroom_count}
                                        onChange={(e) => setData('bathroom_count', parseInt(e.target.value))}
                                        className={errors.bathroom_count ? 'border-red-500' : ''}
                                    />
                                    {errors.bathroom_count && <p className="text-sm text-red-500">{errors.bathroom_count}</p>}
                                </div>
                            </div>

                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    Extra bed charges will apply automatically when guest count exceeds standard capacity.
                                </AlertDescription>
                            </Alert>
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
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="base_rate">Base Rate per Night (IDR) *</Label>
                                    <Input
                                        id="base_rate"
                                        type="number"
                                        min="0"
                                        value={data.base_rate}
                                        onChange={(e) => setData('base_rate', parseInt(e.target.value))}
                                        className={errors.base_rate ? 'border-red-500' : ''}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Preview: {formatCurrency(data.base_rate)}
                                    </p>
                                    {errors.base_rate && <p className="text-sm text-red-500">{errors.base_rate}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="weekend_premium_percent">Weekend Premium (%)</Label>
                                    <Input
                                        id="weekend_premium_percent"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={data.weekend_premium_percent}
                                        onChange={(e) => setData('weekend_premium_percent', parseInt(e.target.value))}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Weekend Rate: {formatCurrency(data.base_rate * (1 + data.weekend_premium_percent / 100))}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cleaning_fee">Cleaning Fee (IDR) *</Label>
                                    <Input
                                        id="cleaning_fee"
                                        type="number"
                                        min="0"
                                        value={data.cleaning_fee}
                                        onChange={(e) => setData('cleaning_fee', parseInt(e.target.value))}
                                        className={errors.cleaning_fee ? 'border-red-500' : ''}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Preview: {formatCurrency(data.cleaning_fee)}
                                    </p>
                                    {errors.cleaning_fee && <p className="text-sm text-red-500">{errors.cleaning_fee}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="extra_bed_rate">Extra Bed Rate per Night (IDR) *</Label>
                                    <Input
                                        id="extra_bed_rate"
                                        type="number"
                                        min="0"
                                        value={data.extra_bed_rate}
                                        onChange={(e) => setData('extra_bed_rate', parseInt(e.target.value))}
                                        className={errors.extra_bed_rate ? 'border-red-500' : ''}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Preview: {formatCurrency(data.extra_bed_rate)}
                                    </p>
                                    {errors.extra_bed_rate && <p className="text-sm text-red-500">{errors.extra_bed_rate}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Check-in/out & Stay Rules */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Check-in/out & Stay Rules
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="check_in_time">Check-in Time *</Label>
                                    <Input
                                        id="check_in_time"
                                        type="time"
                                        value={data.check_in_time}
                                        onChange={(e) => setData('check_in_time', e.target.value)}
                                        className={errors.check_in_time ? 'border-red-500' : ''}
                                    />
                                    {errors.check_in_time && <p className="text-sm text-red-500">{errors.check_in_time}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="check_out_time">Check-out Time *</Label>
                                    <Input
                                        id="check_out_time"
                                        type="time"
                                        value={data.check_out_time}
                                        onChange={(e) => setData('check_out_time', e.target.value)}
                                        className={errors.check_out_time ? 'border-red-500' : ''}
                                    />
                                    {errors.check_out_time && <p className="text-sm text-red-500">{errors.check_out_time}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="min_stay_weekday">Min Stay Weekday (nights) *</Label>
                                    <Input
                                        id="min_stay_weekday"
                                        type="number"
                                        min="1"
                                        value={data.min_stay_weekday}
                                        onChange={(e) => setData('min_stay_weekday', parseInt(e.target.value))}
                                        className={errors.min_stay_weekday ? 'border-red-500' : ''}
                                    />
                                    {errors.min_stay_weekday && <p className="text-sm text-red-500">{errors.min_stay_weekday}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="min_stay_weekend">Min Stay Weekend (nights) *</Label>
                                    <Input
                                        id="min_stay_weekend"
                                        type="number"
                                        min="1"
                                        value={data.min_stay_weekend}
                                        onChange={(e) => setData('min_stay_weekend', parseInt(e.target.value))}
                                        className={errors.min_stay_weekend ? 'border-red-500' : ''}
                                    />
                                    {errors.min_stay_weekend && <p className="text-sm text-red-500">{errors.min_stay_weekend}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="min_stay_peak">Min Stay Peak Season (nights) *</Label>
                                    <Input
                                        id="min_stay_peak"
                                        type="number"
                                        min="1"
                                        value={data.min_stay_peak}
                                        onChange={(e) => setData('min_stay_peak', parseInt(e.target.value))}
                                        className={errors.min_stay_peak ? 'border-red-500' : ''}
                                    />
                                    {errors.min_stay_peak && <p className="text-sm text-red-500">{errors.min_stay_peak}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="house_rules">House Rules</Label>
                                <Textarea
                                    id="house_rules"
                                    value={data.house_rules}
                                    onChange={(e) => setData('house_rules', e.target.value)}
                                    placeholder="No smoking, No pets, Check-in after 2 PM, etc."
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Amenities */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5" />
                                Amenities
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Object.entries(amenityCategories).map(([category, categoryAmenities]) => (
                                <div key={category} className="space-y-3">
                                    <h4 className="font-medium text-lg capitalize">{category}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {categoryAmenities.map((amenity) => (
                                            <div
                                                key={amenity.id}
                                                className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <Checkbox
                                                    id={`amenity-${amenity.id}`}
                                                    checked={selectedAmenities.includes(amenity.id)}
                                                    onCheckedChange={() => handleAmenityToggle(amenity.id)}
                                                />
                                                <Label 
                                                    htmlFor={`amenity-${amenity.id}`}
                                                    className="text-sm font-medium cursor-pointer"
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

                    {/* SEO & Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                SEO & Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_featured"
                                    checked={data.is_featured}
                                    onCheckedChange={(checked) => setData('is_featured', Boolean(checked))}
                                />
                                <Label htmlFor="is_featured" className="text-sm font-medium">
                                    Featured Property
                                </Label>
                                <Badge variant="secondary">Will appear on homepage</Badge>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="seo_title">SEO Title</Label>
                                    <Input
                                        id="seo_title"
                                        value={data.seo_title}
                                        onChange={(e) => setData('seo_title', e.target.value)}
                                        placeholder="Auto-generated from property name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="seo_description">SEO Description</Label>
                                    <Textarea
                                        id="seo_description"
                                        value={data.seo_description}
                                        onChange={(e) => setData('seo_description', e.target.value)}
                                        placeholder="Auto-generated from description"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Media Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Media Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Manage photos and videos for your property to attract more guests.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button variant="outline" asChild>
                                    <Link href={`/admin/properties/${property.slug}/media`}>
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        Manage Media ({property.media?.length || 0} files)
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={`/admin/properties/${property.slug}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Property
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Media Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Media Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">Property Photos & Videos</p>
                                    <p className="text-sm text-muted-foreground">
                                        Currently: {property.media?.length || 0} files uploaded
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/properties/${property.slug}/media`}>
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            Manage Media
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/properties/${property.slug}`}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Property
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            
                            {(!property.media || property.media.length === 0) && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        No media uploaded yet. Add photos and videos to attract more guests!
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button type="submit" disabled={processing} className="flex-1">
                            {processing ? (
                                'Updating Property...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Update Property
                                </>
                            )}
                        </Button>
                        <Button type="button" variant="outline" asChild className="flex-1">
                            <Link href={`/admin/properties/${property.slug}`}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 
