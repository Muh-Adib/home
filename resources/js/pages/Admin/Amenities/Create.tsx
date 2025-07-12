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
import { ArrowLeft, Save, AlertCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BreadcrumbItem, Amenity} from '@/types';
import { getAvailableIcons } from '@/lib/lucide-icons';
import AmenityItem from '@/components/AmenityItem';

interface CreateAmenityProps {
    categories: Record<string, string>;
}

export default function CreateAmenity({ categories }: CreateAmenityProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        icon: 'none',
        category: '',
        description: '',
        is_active: true as boolean,
        sort_order: 0,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        // Handle icon conversion before submission
        const iconValue = data.icon === 'none' ? '' : data.icon;
        setData('icon', iconValue);
        
        // Submit after state update
        setTimeout(() => {
            post(route('admin.amenities.store'), {
                onSuccess: () => {
                    reset();
                },
            });
        }, 0);
    };

    const iconOptions = getAvailableIcons();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Amenities', href: '/admin/amenities' },
        { title: 'Create Amenity', href: '' },
    ];

    // Create mock amenity object for preview
    const previewAmenity: Amenity = {
        id: 0,
        name: data.name || 'Amenity Name',
        icon: data.icon === 'none' ? '' : data.icon,
        category: data.category,
        description: data.description,
        is_active: data.is_active,
        sort_order: data.sort_order,
        created_at: '',
        updated_at: '',
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Amenity" />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/amenities">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                    
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Amenity</h1>
                        <p className="text-muted-foreground">
                            Add a new amenity for properties
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
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
                                        <Label htmlFor="name">
                                            Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Enter amenity name"
                                            required
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
                                        <Label htmlFor="category">
                                            Category <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={data.category} onValueChange={(value) => setData('category', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(categories).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
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
                                            placeholder="Enter amenity description (optional)"
                                            rows={3}
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Active Status */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label htmlFor="is_active">Active Status</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Whether this amenity is available for properties
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
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
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Lower numbers appear first in listings
                                        </p>
                                        {errors.sort_order && (
                                            <p className="text-sm text-red-600">{errors.sort_order}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Preview */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Preview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {/* Card Preview */}
                                        <AmenityItem 
                                            amenity={previewAmenity}
                                            variant="card"
                                            showName={true}
                                        />
                                        
                                        {/* Badge Preview */}
                                        <div className="pt-4 border-t">
                                            <Label className="text-sm font-medium mb-2 block">Badge Preview:</Label>
                                            <div className="flex gap-2">
                                                <AmenityItem 
                                                    amenity={previewAmenity}
                                                    variant="badge"
                                                    showName={false}
                                                />
                                                <AmenityItem 
                                                    amenity={previewAmenity}
                                                    variant="badge"
                                                    showName={true}
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* List Preview */}
                                        <div className="pt-4 border-t">
                                            <Label className="text-sm font-medium mb-2 block">List Preview:</Label>
                                            <AmenityItem 
                                                amenity={previewAmenity}
                                                variant="list"
                                                showName={true}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Help Text */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Guidelines
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• Use clear, descriptive names</p>
                                        <p>• Choose appropriate icons that represent the amenity</p>
                                        <p>• Select the correct category for proper grouping</p>
                                        <p>• Add descriptions for better understanding</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-6 border-t">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/admin/amenities">Cancel</Link>
                        </Button>
                        
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Creating...' : 'Create Amenity'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}