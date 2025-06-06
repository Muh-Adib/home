import React, { useState } from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
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
import { type Amenity, type BreadcrumbItem, type PageProps, type User } from '@/types';
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
    ImageIcon
} from 'lucide-react';
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';

interface CreatePropertyProps extends PageProps {
    amenities: Amenity[];
    owners: User[] | null;
}

export default function CreateProperty({ amenities, owners }: CreatePropertyProps) {
    const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        address: '',
        owner_id: 'auto',
        lat: '',
        lng: '',
        capacity: 2,
        capacity_max: 4,
        bedroom_count: 1,
        bathroom_count: 1,
        base_rate: 500000,
        weekend_premium_percent: 20,
        cleaning_fee: 100000,
        extra_bed_rate: 50000,
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
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties', href: '/admin/properties' },
        { title: 'Create Property', href: '' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/properties');
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Property - Admin Dashboard" />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Property</h1>
                        <p className="text-muted-foreground">
                            Add a new property to your portfolio
                        </p>
                    </div>
                    
                    <Button variant="outline" asChild>
                        <Link href="/admin/properties">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Properties
                        </Link>
                    </Button>
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
                        {owners ? (
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="owner_id">Owner *</Label>
                                        <Select
                                            value={data.owner_id}
                                            onValueChange={(value) => setData('owner_id', value)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Owner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">Auto-assign</SelectItem>
                                                {owners.filter(owner => owner.role === 'property_owner').map((owner) => (
                                                    <SelectItem key={owner.id} value={owner.id.toString()}>
                                                        {owner.name} ({owner.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.owner_id && <p className="text-sm text-red-500">{errors.owner_id}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        ) : null}
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
                                    <Label htmlFor="address">Address *</Label>
                                    <Input
                                        id="address"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        placeholder="Jl. Raya Ubud No. 123, Ubud, Bali"
                                        className={errors.address ? 'border-red-500' : ''}
                                    />
                                    {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                                </div>
                            </div>

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

                    {/* Media Upload Notice */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Media Upload
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    📸 <strong>Photos & Videos</strong> can be uploaded after creating the property. 
                                    You'll be able to add stunning images and videos from the property edit page or media management section.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button type="submit" disabled={processing} className="flex-1">
                            {processing ? (
                                'Creating Property...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Create Property
                                </>
                            )}
                        </Button>
                        <Button type="button" variant="outline" asChild className="flex-1">
                            <Link href="/admin/properties">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 
