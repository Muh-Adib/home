import React, { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BreadcrumbItem } from '@/types';

interface Amenity {
    id: number;
    name: string;
    icon: string;
    category: string;
    description: string;
    is_active: boolean;
    sort_order: number;
}

interface EditAmenityProps {
    amenity: Amenity;
    categories: Record<string, string>;
}

export default function EditAmenity({ amenity, categories }: EditAmenityProps) {
    const { data, setData, patch, processing, errors } = useForm({
        name: amenity.name,
        icon: amenity.icon || 'none',
        category: amenity.category,
        description: amenity.description || '',
        is_active: amenity.is_active,
        sort_order: amenity.sort_order,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        // Handle icon conversion before submission
        const iconValue = data.icon === 'none' ? '' : data.icon;
        setData('icon', iconValue);
        
        // Submit after state update
        setTimeout(() => {
            patch(route('admin.amenities.update', amenity.id));
        }, 0);
    };

    const iconOptions = [
        { value: 'none', label: '🚫 None' },
        { value: 'wifi', label: '📶 WiFi' },
        { value: 'snowflake', label: '❄️ AC' },
        { value: 'car', label: '🚗 Parking' },
        { value: 'tv', label: '📺 TV' },
        { value: 'shirt', label: '🧺 Linens' },
        { value: 'chef-hat', label: '👨‍🍳 Kitchen' },
        { value: 'refrigerator', label: '🧊 Fridge' },
        { value: 'microwave', label: '📻 Microwave' },
        { value: 'coffee', label: '☕ Coffee' },
        { value: 'utensils', label: '🍽️ Dining' },
        { value: 'droplets', label: '🚿 Hot Water' },
        { value: 'wind', label: '💨 Hair Dryer' },
        { value: 'soap', label: '🧼 Toiletries' },
        { value: 'play', label: '▶️ Streaming' },
        { value: 'speaker', label: '🔊 Sound' },
        { value: 'gamepad-2', label: '🎮 Games' },
        { value: 'waves', label: '🏊 Pool' },
        { value: 'trees', label: '🌳 Garden' },
        { value: 'flame', label: '🔥 BBQ' },
        { value: 'armchair', label: '🪑 Seating' },
        { value: 'umbrella', label: '🏖️ Beach' },
        { value: 'camera', label: '📷 Security' },
        { value: 'lock', label: '🔒 Safe' },
        { value: 'heart-pulse', label: '🩹 First Aid' },
        { value: 'fire-extinguisher', label: '🧯 Fire Safety' },
    ];

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Amenities', href: '/admin/amenities' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${amenity.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href={route('admin.amenities.index')}>
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Amenities
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Edit Amenity</h1>
                            <p className="text-gray-600 mt-1">Update amenity information</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Amenity Name *</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="e.g. WiFi, Swimming Pool, Air Conditioning"
                                            className={errors.name ? 'border-red-500' : ''}
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-red-600">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Icon */}
                                    <div className="space-y-2">
                                        <Label htmlFor="icon">Icon</Label>
                                        <Select value={data.icon || 'none'} onValueChange={(value) => setData('icon', value === 'none' ? '' : value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an icon" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {iconOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.icon && (
                                            <p className="text-sm text-red-600">{errors.icon}</p>
                                        )}
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category *</Label>
                                        <Select value={data.category} onValueChange={(value) => setData('category', value)}>
                                            <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(categories).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.category && (
                                            <p className="text-sm text-red-600">{errors.category}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Brief description of the amenity..."
                                            rows={4}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>

                                    {/* Sort Order */}
                                    <div className="space-y-2">
                                        <Label htmlFor="sort_order">Sort Order</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            value={data.sort_order}
                                            onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            min="0"
                                            className={errors.sort_order ? 'border-red-500' : ''}
                                        />
                                        <p className="text-sm text-gray-500">
                                            Lower numbers appear first.
                                        </p>
                                        {errors.sort_order && (
                                            <p className="text-sm text-red-600">{errors.sort_order}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Status & Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Active Status */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="is_active">Active Status</Label>
                                            <p className="text-sm text-gray-500">
                                                Enable this amenity for properties
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Preview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Preview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span className="text-blue-600 text-sm">
                                                    {data.icon && data.icon !== 'none' ? iconOptions.find(i => i.value === data.icon)?.label.split(' ')[0] : '🏠'}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {data.name || 'Amenity Name'}
                                                </div>
                                                {data.description && (
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {data.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="text-sm text-gray-500">
                                            <p><strong>Category:</strong> {categories[data.category] || 'Not selected'}</p>
                                            <p><strong>Status:</strong> {data.is_active ? 'Active' : 'Inactive'}</p>
                                            <p><strong>Sort Order:</strong> {data.sort_order}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end space-x-4 pt-6 border-t">
                        <Link href={route('admin.amenities.index')}>
                            <Button variant="outline" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            <Save className="w-4 h-4 mr-2" />
                            {processing ? 'Saving...' : 'Update Amenity'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 