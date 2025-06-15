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
import {
    Calendar,
    Clock,
    Users,
    Shield,
    Settings,
    Save,
    RotateCcw,
    Info,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface BookingSettings {
    require_admin_verification: boolean;
    auto_confirm_bookings: boolean;
    minimum_advance_booking_hours: number;
    maximum_advance_booking_days: number;
    default_check_in_time: string;
    default_check_out_time: string;
    allow_same_day_booking: boolean;
    allow_past_date_booking: boolean;
    require_guest_details: boolean;
    max_guests_per_booking: number;
    enable_guest_reviews: boolean;
    enable_host_reviews: boolean;
    booking_modification_deadline_hours: number;
    cancellation_policy: string;
}

interface BookingSettingsProps {
    settings: BookingSettings;
}

export default function BookingSettings({ settings }: BookingSettingsProps) {
    const { data, setData, post, processing, errors, reset } = useForm<BookingSettings>({
        require_admin_verification: settings.require_admin_verification,
        auto_confirm_bookings: settings.auto_confirm_bookings,
        minimum_advance_booking_hours: settings.minimum_advance_booking_hours,
        maximum_advance_booking_days: settings.maximum_advance_booking_days,
        default_check_in_time: settings.default_check_in_time,
        default_check_out_time: settings.default_check_out_time,
        allow_same_day_booking: settings.allow_same_day_booking,
        allow_past_date_booking: settings.allow_past_date_booking,
        require_guest_details: settings.require_guest_details,
        max_guests_per_booking: settings.max_guests_per_booking,
        enable_guest_reviews: settings.enable_guest_reviews,
        enable_host_reviews: settings.enable_host_reviews,
        booking_modification_deadline_hours: settings.booking_modification_deadline_hours,
        cancellation_policy: settings.cancellation_policy,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'Booking', href: '#' },
    ];

    const advanceBookingOptions = [
        { value: 1, label: '1 Jam' },
        { value: 2, label: '2 Jam' },
        { value: 6, label: '6 Jam' },
        { value: 12, label: '12 Jam' },
        { value: 24, label: '24 Jam' },
        { value: 48, label: '48 Jam' },
        { value: 72, label: '72 Jam' },
    ];

    const maxAdvanceOptions = [
        { value: 30, label: '30 Hari' },
        { value: 60, label: '60 Hari' },
        { value: 90, label: '90 Hari' },
        { value: 180, label: '6 Bulan' },
        { value: 365, label: '1 Tahun' },
    ];

    const modificationDeadlineOptions = [
        { value: 1, label: '1 Jam' },
        { value: 6, label: '6 Jam' },
        { value: 12, label: '12 Jam' },
        { value: 24, label: '24 Jam' },
        { value: 48, label: '48 Jam' },
        { value: 72, label: '72 Jam' },
        { value: 168, label: '1 Minggu' },
        { value: 720, label: '1 Bulan' },
    ];

    const cancellationPolicies = [
        { value: 'flexible', label: 'Flexible', description: 'Pembatalan gratis hingga 24 jam sebelum check-in' },
        { value: 'moderate', label: 'Moderate', description: 'Pembatalan gratis hingga 5 hari sebelum check-in' },
        { value: 'strict', label: 'Strict', description: 'Pembatalan gratis hingga 14 hari sebelum check-in' },
    ];

    const timeOptions = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return { value: `${hour}:00`, label: `${hour}:00` };
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/booking');
    };

    const handleReset = () => {
        reset();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Booking Settings - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Calendar className="h-8 w-8 text-orange-600" />
                            Booking Settings
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Configure booking rules, policies, and workflow preferences
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Booking Workflow */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Booking Workflow
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Configure how bookings are processed and verified
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Require Admin Verification</Label>
                                        <p className="text-sm text-gray-600">
                                            All bookings must be verified by admin before payment
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.require_admin_verification}
                                        onCheckedChange={(checked) => setData('require_admin_verification', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Auto-Confirm Bookings</Label>
                                        <p className="text-sm text-gray-600">
                                            Automatically confirm bookings after payment (if verification disabled)
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.auto_confirm_bookings}
                                        onCheckedChange={(checked) => setData('auto_confirm_bookings', checked)}
                                        disabled={data.require_admin_verification}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Require Guest Details</Label>
                                        <p className="text-sm text-gray-600">
                                            Require detailed guest information during booking
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.require_guest_details}
                                        onCheckedChange={(checked) => setData('require_guest_details', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Booking Timing Rules */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Booking Timing Rules
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Set advance booking requirements and check-in/out times
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="minimum_advance_booking_hours">Minimum Advance Booking *</Label>
                                    <Select 
                                        value={data.minimum_advance_booking_hours.toString()} 
                                        onValueChange={(value) => setData('minimum_advance_booking_hours', parseInt(value))}
                                    >
                                        <SelectTrigger className={errors.minimum_advance_booking_hours ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select minimum advance time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {advanceBookingOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Minimum time required before check-in date
                                    </p>
                                    {errors.minimum_advance_booking_hours && (
                                        <p className="text-sm text-red-600 mt-1">{errors.minimum_advance_booking_hours}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="maximum_advance_booking_days">Maximum Advance Booking *</Label>
                                    <Select 
                                        value={data.maximum_advance_booking_days.toString()} 
                                        onValueChange={(value) => setData('maximum_advance_booking_days', parseInt(value))}
                                    >
                                        <SelectTrigger className={errors.maximum_advance_booking_days ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select maximum advance time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {maxAdvanceOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Maximum days in advance for booking
                                    </p>
                                    {errors.maximum_advance_booking_days && (
                                        <p className="text-sm text-red-600 mt-1">{errors.maximum_advance_booking_days}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="default_check_in_time">Default Check-in Time *</Label>
                                    <Select 
                                        value={data.default_check_in_time} 
                                        onValueChange={(value) => setData('default_check_in_time', value)}
                                    >
                                        <SelectTrigger className={errors.default_check_in_time ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select check-in time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeOptions.map(time => (
                                                <SelectItem key={time.value} value={time.value}>
                                                    {time.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.default_check_in_time && (
                                        <p className="text-sm text-red-600 mt-1">{errors.default_check_in_time}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="default_check_out_time">Default Check-out Time *</Label>
                                    <Select 
                                        value={data.default_check_out_time} 
                                        onValueChange={(value) => setData('default_check_out_time', value)}
                                    >
                                        <SelectTrigger className={errors.default_check_out_time ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select check-out time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeOptions.map(time => (
                                                <SelectItem key={time.value} value={time.value}>
                                                    {time.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.default_check_out_time && (
                                        <p className="text-sm text-red-600 mt-1">{errors.default_check_out_time}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Allow Same Day Booking</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow guests to book for the same day
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.allow_same_day_booking}
                                        onCheckedChange={(checked) => setData('allow_same_day_booking', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Allow Past Date Booking</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow booking for past dates (for admin use)
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.allow_past_date_booking}
                                        onCheckedChange={(checked) => setData('allow_past_date_booking', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Guest Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Guest Management
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Configure guest limits and review settings
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="max_guests_per_booking">Maximum Guests per Booking *</Label>
                                <Input
                                    id="max_guests_per_booking"
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={data.max_guests_per_booking}
                                    onChange={(e) => setData('max_guests_per_booking', parseInt(e.target.value) || 1)}
                                    className={errors.max_guests_per_booking ? 'border-red-500' : ''}
                                    placeholder="20"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Global maximum, individual properties can set lower limits
                                </p>
                                {errors.max_guests_per_booking && (
                                    <p className="text-sm text-red-600 mt-1">{errors.max_guests_per_booking}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable Guest Reviews</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow guests to leave reviews for properties
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_guest_reviews}
                                        onCheckedChange={(checked) => setData('enable_guest_reviews', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable Host Reviews</Label>
                                        <p className="text-sm text-gray-600">
                                            Allow property owners to review guests
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_host_reviews}
                                        onCheckedChange={(checked) => setData('enable_host_reviews', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Modification & Cancellation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Modification & Cancellation
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Set policies for booking changes and cancellations
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="booking_modification_deadline_hours">Modification Deadline *</Label>
                                <Select 
                                    value={data.booking_modification_deadline_hours.toString()} 
                                    onValueChange={(value) => setData('booking_modification_deadline_hours', parseInt(value))}
                                >
                                    <SelectTrigger className={errors.booking_modification_deadline_hours ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select modification deadline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {modificationDeadlineOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value.toString()}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    How long before check-in guests can modify bookings
                                </p>
                                {errors.booking_modification_deadline_hours && (
                                    <p className="text-sm text-red-600 mt-1">{errors.booking_modification_deadline_hours}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="cancellation_policy">Cancellation Policy *</Label>
                                <Select 
                                    value={data.cancellation_policy} 
                                    onValueChange={(value) => setData('cancellation_policy', value)}
                                >
                                    <SelectTrigger className={errors.cancellation_policy ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select cancellation policy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cancellationPolicies.map(policy => (
                                            <SelectItem key={policy.value} value={policy.value}>
                                                <div>
                                                    <div className="font-medium">{policy.label}</div>
                                                    <div className="text-xs text-gray-500">{policy.description}</div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.cancellation_policy && (
                                    <p className="text-sm text-red-600 mt-1">{errors.cancellation_policy}</p>
                                )}
                            </div>

                            {/* Policy Preview */}
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Current Policy:</strong> {cancellationPolicies.find(p => p.value === data.cancellation_policy)?.description}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Info Alert */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Booking settings will apply to all new bookings. Existing bookings will retain their original terms. 
                            Changes to verification requirements may affect the booking workflow immediately.
                        </AlertDescription>
                    </Alert>

                    {/* Warning Alert */}
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Disabling admin verification will allow automatic booking confirmations after payment. 
                            Ensure your availability calendar is accurate before making this change.
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