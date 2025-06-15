import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    Image,
    DollarSign,
    Shield,
    Settings,
    Save,
    RotateCcw,
    Info,
    AlertTriangle,
    Star,
    FileText
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface PropertySettings {
    require_property_approval: boolean;
    auto_publish_properties: boolean;
    max_images_per_property: number;
    image_max_size_mb: number;
    allowed_image_types: string;
    require_property_verification: boolean;
    enable_seasonal_pricing: boolean;
    enable_weekend_pricing: boolean;
    default_weekend_premium: number;
    enable_extra_bed_pricing: boolean;
    enable_cleaning_fee: boolean;
    minimum_property_rate: number;
    maximum_property_rate?: number;
    enable_property_reviews: boolean;
    require_house_rules: boolean;
}

interface Amenity {
    id: number;
    name: string;
    category: string;
    is_active: boolean;
}

interface PropertySettingsProps {
    settings: PropertySettings;
    amenities: Amenity[];
}

export default function PropertySettings({ settings, amenities }: PropertySettingsProps) {
    const { data, setData, post, processing, errors, reset } = useForm<PropertySettings>({
        require_property_approval: settings.require_property_approval,
        auto_publish_properties: settings.auto_publish_properties,
        max_images_per_property: settings.max_images_per_property,
        image_max_size_mb: settings.image_max_size_mb,
        allowed_image_types: settings.allowed_image_types,
        require_property_verification: settings.require_property_verification,
        enable_seasonal_pricing: settings.enable_seasonal_pricing,
        enable_weekend_pricing: settings.enable_weekend_pricing,
        default_weekend_premium: settings.default_weekend_premium,
        enable_extra_bed_pricing: settings.enable_extra_bed_pricing,
        enable_cleaning_fee: settings.enable_cleaning_fee,
        minimum_property_rate: settings.minimum_property_rate,
        maximum_property_rate: settings.maximum_property_rate,
        enable_property_reviews: settings.enable_property_reviews,
        require_house_rules: settings.require_house_rules,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'Property', href: '#' },
    ];

    const imageTypeOptions = [
        { value: 'jpg,jpeg,png', label: 'JPG, JPEG, PNG' },
        { value: 'jpg,jpeg,png,gif', label: 'JPG, JPEG, PNG, GIF' },
        { value: 'jpg,jpeg,png,webp', label: 'JPG, JPEG, PNG, WebP' },
        { value: 'jpg,jpeg,png,gif,webp', label: 'All Common Types' },
    ];

    const maxImagesOptions = [
        { value: 5, label: '5 Images' },
        { value: 10, label: '10 Images' },
        { value: 15, label: '15 Images' },
        { value: 20, label: '20 Images' },
        { value: 30, label: '30 Images' },
        { value: 50, label: '50 Images' },
    ];

    const imageSizeOptions = [
        { value: 2, label: '2 MB' },
        { value: 5, label: '5 MB' },
        { value: 10, label: '10 MB' },
        { value: 15, label: '15 MB' },
        { value: 20, label: '20 MB' },
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/property');
    };

    const handleReset = () => {
        reset();
    };

    const amenityCategories = amenities.reduce((acc, amenity) => {
        if (!acc[amenity.category]) {
            acc[amenity.category] = [];
        }
        acc[amenity.category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Property Settings - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Building2 className="h-8 w-8 text-indigo-600" />
                            Property Settings
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Configure property management, pricing, and media settings
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Property Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Property Management
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Configure property approval and publishing workflow
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Require Property Approval</Label>
                                        <p className="text-sm text-gray-600">
                                            All new properties must be approved by admin before listing
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.require_property_approval}
                                        onCheckedChange={(checked) => setData('require_property_approval', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Auto-Publish Properties</Label>
                                        <p className="text-sm text-gray-600">
                                            Automatically publish properties after approval (if approval disabled)
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.auto_publish_properties}
                                        onCheckedChange={(checked) => setData('auto_publish_properties', checked)}
                                        disabled={data.require_property_approval}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Require Property Verification</Label>
                                        <p className="text-sm text-gray-600">
                                            Require verification of property details and ownership
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.require_property_verification}
                                        onCheckedChange={(checked) => setData('require_property_verification', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Require House Rules</Label>
                                        <p className="text-sm text-gray-600">
                                            Property owners must specify house rules for their properties
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.require_house_rules}
                                        onCheckedChange={(checked) => setData('require_house_rules', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Media Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Image className="h-5 w-5" />
                                Media Management
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Configure image upload limits and file type restrictions
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="max_images_per_property">Maximum Images per Property *</Label>
                                    <Select 
                                        value={data.max_images_per_property.toString()} 
                                        onValueChange={(value) => setData('max_images_per_property', parseInt(value))}
                                    >
                                        <SelectTrigger className={errors.max_images_per_property ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select maximum images" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {maxImagesOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.max_images_per_property && (
                                        <p className="text-sm text-red-600 mt-1">{errors.max_images_per_property}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="image_max_size_mb">Maximum Image Size *</Label>
                                    <Select 
                                        value={data.image_max_size_mb.toString()} 
                                        onValueChange={(value) => setData('image_max_size_mb', parseInt(value))}
                                    >
                                        <SelectTrigger className={errors.image_max_size_mb ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select maximum size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {imageSizeOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.image_max_size_mb && (
                                        <p className="text-sm text-red-600 mt-1">{errors.image_max_size_mb}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="allowed_image_types">Allowed Image Types *</Label>
                                <Select 
                                    value={data.allowed_image_types} 
                                    onValueChange={(value) => setData('allowed_image_types', value)}
                                >
                                    <SelectTrigger className={errors.allowed_image_types ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select allowed file types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {imageTypeOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    File types that property owners can upload
                                </p>
                                {errors.allowed_image_types && (
                                    <p className="text-sm text-red-600 mt-1">{errors.allowed_image_types}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing Features */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Pricing Features
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Enable advanced pricing features and set rate limits
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable Seasonal Pricing</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow property owners to set seasonal rate variations
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_seasonal_pricing}
                                        onCheckedChange={(checked) => setData('enable_seasonal_pricing', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable Weekend Pricing</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow different rates for weekends and holidays
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_weekend_pricing}
                                        onCheckedChange={(checked) => setData('enable_weekend_pricing', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable Extra Bed Pricing</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow additional charges for extra beds
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_extra_bed_pricing}
                                        onCheckedChange={(checked) => setData('enable_extra_bed_pricing', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable Cleaning Fee</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow property owners to charge cleaning fees
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_cleaning_fee}
                                        onCheckedChange={(checked) => setData('enable_cleaning_fee', checked)}
                                    />
                                </div>
                            </div>

                            {data.enable_weekend_pricing && (
                                <div>
                                    <Label htmlFor="default_weekend_premium">Default Weekend Premium *</Label>
                                    <div className="relative">
                                        <Input
                                            id="default_weekend_premium"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={data.default_weekend_premium}
                                            onChange={(e) => setData('default_weekend_premium', parseFloat(e.target.value) || 0)}
                                            className={`pr-8 ${errors.default_weekend_premium ? 'border-red-500' : ''}`}
                                            placeholder="25.00"
                                        />
                                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Default percentage increase for weekend rates
                                    </p>
                                    {errors.default_weekend_premium && (
                                        <p className="text-sm text-red-600 mt-1">{errors.default_weekend_premium}</p>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="minimum_property_rate">Minimum Property Rate *</Label>
                                    <Input
                                        id="minimum_property_rate"
                                        type="number"
                                        min="0"
                                        value={data.minimum_property_rate}
                                        onChange={(e) => setData('minimum_property_rate', parseFloat(e.target.value) || 0)}
                                        className={errors.minimum_property_rate ? 'border-red-500' : ''}
                                        placeholder="50000"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Currently: {formatCurrency(data.minimum_property_rate)}
                                    </p>
                                    {errors.minimum_property_rate && (
                                        <p className="text-sm text-red-600 mt-1">{errors.minimum_property_rate}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="maximum_property_rate">Maximum Property Rate (Optional)</Label>
                                    <Input
                                        id="maximum_property_rate"
                                        type="number"
                                        min="0"
                                        value={data.maximum_property_rate || ''}
                                        onChange={(e) => setData('maximum_property_rate', parseFloat(e.target.value) || undefined)}
                                        className={errors.maximum_property_rate ? 'border-red-500' : ''}
                                        placeholder="10000000"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Leave blank for no limit
                                    </p>
                                    {errors.maximum_property_rate && (
                                        <p className="text-sm text-red-600 mt-1">{errors.maximum_property_rate}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reviews & Feedback */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5" />
                                Reviews & Feedback
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Configure review and rating system for properties
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Enable Property Reviews</Label>
                                    <p className="text-sm text-gray-600">
                                        Allow guests to leave reviews and ratings for properties
                                    </p>
                                </div>
                                <Switch
                                    checked={data.enable_property_reviews}
                                    onCheckedChange={(checked) => setData('enable_property_reviews', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Available Amenities */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Available Amenities
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Overview of amenities that can be assigned to properties
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Object.entries(amenityCategories).map(([category, categoryAmenities]) => (
                                <div key={category}>
                                    <h4 className="font-medium text-gray-900 mb-3 capitalize">{category}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {categoryAmenities.map((amenity) => (
                                            <Badge
                                                key={amenity.id}
                                                variant={amenity.is_active ? "default" : "secondary"}
                                                className="text-xs"
                                            >
                                                {amenity.name}
                                                {!amenity.is_active && " (Inactive)"}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            
                            {Object.keys(amenityCategories).length === 0 && (
                                <p className="text-gray-500 text-center py-4">
                                    No amenities configured yet. Add amenities in the Amenities management section.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Alert */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Property settings will apply to all new properties. Existing properties will retain their current 
                            configuration unless manually updated. Changes to pricing features may require property owners 
                            to update their rate settings.
                        </AlertDescription>
                    </Alert>

                    {/* Warning Alert */}
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Disabling property approval will allow immediate listing of new properties. Ensure you have 
                            adequate moderation processes in place before making this change.
                        </AlertDescription>
                    </Alert>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            disabled={processing}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 