import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Globe,
    Upload,
    Image,
    Save,
    RotateCcw,
    Info
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface GeneralSettings {
    site_name: string;
    site_description: string;
    contact_email: string;
    contact_phone: string;
    contact_address: string;
    timezone: string;
    currency: string;
    language: string;
    logo_path?: string;
    favicon_path?: string;
}

interface GeneralSettingsProps {
    settings: GeneralSettings;
}

export default function GeneralSettings({ settings }: GeneralSettingsProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(
        settings.logo_path ? `/storage/${settings.logo_path}` : null
    );
    const [faviconPreview, setFaviconPreview] = useState<string | null>(
        settings.favicon_path ? `/storage/${settings.favicon_path}` : null
    );

    const { data, setData, post, processing, errors, reset } = useForm<GeneralSettings & { logo?: File; favicon?: File }>({
        site_name: settings.site_name,
        site_description: settings.site_description,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        contact_address: settings.contact_address,
        timezone: settings.timezone,
        currency: settings.currency,
        language: settings.language,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'General', href: '#' },
    ];

    const timezones = [
        { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB)' },
        { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA)' },
        { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT)' },
        { value: 'UTC', label: 'UTC' },
        { value: 'Asia/Singapore', label: 'Asia/Singapore' },
        { value: 'America/New_York', label: 'America/New_York' },
        { value: 'Europe/London', label: 'Europe/London' },
    ];

    const currencies = [
        { value: 'IDR', label: 'Indonesian Rupiah (IDR)' },
        { value: 'USD', label: 'US Dollar (USD)' },
        { value: 'EUR', label: 'Euro (EUR)' },
        { value: 'SGD', label: 'Singapore Dollar (SGD)' },
        { value: 'MYR', label: 'Malaysian Ringgit (MYR)' },
    ];

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'id', label: 'Bahasa Indonesia' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'de', label: 'Deutsch' },
    ];

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('logo', file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('favicon', file);
            setFaviconPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/general');
    };

    const handleReset = () => {
        reset();
        setLogoPreview(settings.logo_path ? `/storage/${settings.logo_path}` : null);
        setFaviconPreview(settings.favicon_path ? `/storage/${settings.favicon_path}` : null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General Settings - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Globe className="h-8 w-8 text-blue-600" />
                            General Settings
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Configure basic site information and global preferences
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Site Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Site Information</CardTitle>
                            <p className="text-sm text-gray-600">
                                Basic information about your property management system
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="site_name">Site Name *</Label>
                                    <Input
                                        id="site_name"
                                        value={data.site_name}
                                        onChange={(e) => setData('site_name', e.target.value)}
                                        className={errors.site_name ? 'border-red-500' : ''}
                                        placeholder="Property Management System"
                                    />
                                    {errors.site_name && (
                                        <p className="text-sm text-red-600 mt-1">{errors.site_name}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="contact_email">Contact Email *</Label>
                                    <Input
                                        id="contact_email"
                                        type="email"
                                        value={data.contact_email}
                                        onChange={(e) => setData('contact_email', e.target.value)}
                                        className={errors.contact_email ? 'border-red-500' : ''}
                                        placeholder="contact@propertyms.com"
                                    />
                                    {errors.contact_email && (
                                        <p className="text-sm text-red-600 mt-1">{errors.contact_email}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="site_description">Site Description *</Label>
                                <Textarea
                                    id="site_description"
                                    value={data.site_description}
                                    onChange={(e) => setData('site_description', e.target.value)}
                                    className={errors.site_description ? 'border-red-500' : ''}
                                    rows={3}
                                    placeholder="Modern property management and booking system"
                                />
                                {errors.site_description && (
                                    <p className="text-sm text-red-600 mt-1">{errors.site_description}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="contact_phone">Contact Phone *</Label>
                                    <Input
                                        id="contact_phone"
                                        value={data.contact_phone}
                                        onChange={(e) => setData('contact_phone', e.target.value)}
                                        className={errors.contact_phone ? 'border-red-500' : ''}
                                        placeholder="+62 123 456 7890"
                                    />
                                    {errors.contact_phone && (
                                        <p className="text-sm text-red-600 mt-1">{errors.contact_phone}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="contact_address">Contact Address *</Label>
                                    <Input
                                        id="contact_address"
                                        value={data.contact_address}
                                        onChange={(e) => setData('contact_address', e.target.value)}
                                        className={errors.contact_address ? 'border-red-500' : ''}
                                        placeholder="Jakarta, Indonesia"
                                    />
                                    {errors.contact_address && (
                                        <p className="text-sm text-red-600 mt-1">{errors.contact_address}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Localization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Localization</CardTitle>
                            <p className="text-sm text-gray-600">
                                Regional settings for your application
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label htmlFor="timezone">Timezone *</Label>
                                    <Select value={data.timezone} onValueChange={(value) => setData('timezone', value)}>
                                        <SelectTrigger className={errors.timezone ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select timezone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timezones.map(timezone => (
                                                <SelectItem key={timezone.value} value={timezone.value}>
                                                    {timezone.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.timezone && (
                                        <p className="text-sm text-red-600 mt-1">{errors.timezone}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="currency">Currency *</Label>
                                    <Select value={data.currency} onValueChange={(value) => setData('currency', value)}>
                                        <SelectTrigger className={errors.currency ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencies.map(currency => (
                                                <SelectItem key={currency.value} value={currency.value}>
                                                    {currency.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.currency && (
                                        <p className="text-sm text-red-600 mt-1">{errors.currency}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="language">Language *</Label>
                                    <Select value={data.language} onValueChange={(value) => setData('language', value)}>
                                        <SelectTrigger className={errors.language ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {languages.map(language => (
                                                <SelectItem key={language.value} value={language.value}>
                                                    {language.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.language && (
                                        <p className="text-sm text-red-600 mt-1">{errors.language}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Branding */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding</CardTitle>
                            <p className="text-sm text-gray-600">
                                Upload your logo and favicon for site branding
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Logo Upload */}
                                <div>
                                    <Label htmlFor="logo">Site Logo</Label>
                                    <div className="mt-2 space-y-4">
                                        {logoPreview && (
                                            <div className="relative w-32 h-16 border-2 border-gray-200 rounded-lg overflow-hidden">
                                                <img
                                                    src={logoPreview}
                                                    alt="Logo preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="logo"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById('logo')?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Choose Logo
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Recommended: 200x100px, PNG or JPG, max 2MB
                                        </p>
                                    </div>
                                    {errors.logo && (
                                        <p className="text-sm text-red-600 mt-1">{errors.logo}</p>
                                    )}
                                </div>

                                {/* Favicon Upload */}
                                <div>
                                    <Label htmlFor="favicon">Favicon</Label>
                                    <div className="mt-2 space-y-4">
                                        {faviconPreview && (
                                            <div className="relative w-8 h-8 border-2 border-gray-200 rounded overflow-hidden">
                                                <img
                                                    src={faviconPreview}
                                                    alt="Favicon preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="favicon"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFaviconChange}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById('favicon')?.click()}
                                            >
                                                <Image className="h-4 w-4 mr-2" />
                                                Choose Favicon
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Recommended: 32x32px, PNG or ICO, max 512KB
                                        </p>
                                    </div>
                                    {errors.favicon && (
                                        <p className="text-sm text-red-600 mt-1">{errors.favicon}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Alert */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Changes to general settings will take effect immediately. Some changes may require 
                            clearing the cache or restarting the application to be fully applied.
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