import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    CalendarDays,
    Users,
    DollarSign,
    CheckCircle,
    AlertCircle,
    Building2,
    Phone,
    Mail,
    Globe,
    IdCard
} from 'lucide-react';
import { DateRange, formatDateRange } from '@/components/ui/date-range';
import { type BreadcrumbItem } from '@/types';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    capacity: number;
    capacity_max: number;
    base_rate: number;
    formatted_base_rate: string;
    weekend_premium_percent: number;
    cleaning_fee: number;
    extra_bed_rate: number;
}

interface AvailabilityCheck {
    available: boolean;
    property_id: number;
    check_in: string;
    check_out: string;
    conflicting_bookings?: any[];
}

interface RateCalculation {
    base_amount: number;
    weekend_premium: number;
    seasonal_premium: number;
    extra_bed_amount: number;
    cleaning_fee: number;
    total_amount: number;
    nights: number;
    rate_breakdown: any;
}

interface CreateBookingProps {
    properties: Property[];
}

export default function CreateBooking({ properties }: CreateBookingProps) {
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityCheck | null>(null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [calculatingRate, setCalculatingRate] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        property_id: '',
        check_in_date: '',
        check_out_date: '',
        guest_count: 2,
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guest_country: 'Indonesia',
        guest_id_number: '',
        guest_breakdown_male: 1,
        guest_breakdown_female: 1,
        guest_breakdown_children: 0,
        guest_relationships: '',
        special_requests: '',
        booking_status: 'confirmed',
        payment_status: 'paid',
        admin_notes: '',
        auto_confirm: true,
    });

    // Country options
    const countries = [
        'Indonesia', 'Singapore', 'Malaysia', 'Thailand', 'Philippines',
        'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Brunei',
        'United States', 'United Kingdom', 'Australia', 'Japan', 'South Korea',
        'China', 'India', 'Germany', 'France', 'Netherlands'
    ];

    const handlePropertyChange = (propertyId: string) => {
        const property = properties.find(p => p.id.toString() === propertyId);
        setSelectedProperty(property || null);
        setData('property_id', propertyId);
        
        // Reset availability and rate when property changes
        setAvailabilityStatus(null);
        setRateCalculation(null);
        
        // Update capacity if needed
        if (property && data.guest_count > property.capacity_max) {
            setData('guest_count', property.capacity_max);
        }
    };

    const checkAvailability = async () => {
        if (!selectedProperty || !data.check_in_date || !data.check_out_date) return;

        setCheckingAvailability(true);
        try {
            const response = await fetch('/api/admin/booking-management/check-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    property_id: selectedProperty.id,
                    check_in: data.check_in_date,
                    check_out: data.check_out_date,
                }),
            });
            
            const result = await response.json();
            setAvailabilityStatus(result);
            
            if (result.available) {
                calculateRate();
            }
        } catch (error) {
            console.error('Error checking availability:', error);
        } finally {
            setCheckingAvailability(false);
        }
    };

    const calculateRate = async () => {
        if (!selectedProperty || !data.check_in_date || !data.check_out_date) return;

        setCalculatingRate(true);
        try {
            const response = await fetch('/api/admin/booking-management/calculate-rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    property_id: selectedProperty.id,
                    check_in: data.check_in_date,
                    check_out: data.check_out_date,
                    guest_count: data.guest_count,
                }),
            });
            
            const result = await response.json();
            if (result.success) {
                setRateCalculation(result.calculation);
            }
        } catch (error) {
            console.error('Error calculating rate:', error);
        } finally {
            setCalculatingRate(false);
        }
    };

    // Auto-check availability when dates change
    useEffect(() => {
        if (selectedProperty && data.check_in_date && data.check_out_date) {
            const timer = setTimeout(() => {
                checkAvailability();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedProperty, data.check_in_date, data.check_out_date]);

    // Recalculate rate when guest count changes
    useEffect(() => {
        if (availabilityStatus?.available && selectedProperty) {
            const timer = setTimeout(() => {
                calculateRate();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [data.guest_count]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.booking-management.store'), {
            onSuccess: () => {
                // Redirect to bookings list or show success message
                router.visit(route('admin.bookings.index'));
            }
        });
    };

    const updateGuestBreakdown = (type: 'male' | 'female' | 'children', value: number) => {
        const newData = { ...data };
        newData[`guest_breakdown_${type}`] = value;
        
        // Update total guest count
        const totalGuests = newData.guest_breakdown_male + newData.guest_breakdown_female + newData.guest_breakdown_children;
        newData.guest_count = totalGuests;
        
        setData(newData);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Booking Management', href: '/admin/booking-management' },
        { title: 'Create Booking', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Manual Booking" />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Manual Booking</h1>
                        <p className="text-gray-600 mt-1">
                            Create a confirmed booking directly as admin
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit(route('admin.bookings.index'))}>
                        Back to Bookings
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Property Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Property Selection
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="property_id">Select Property *</Label>
                                    <Select value={data.property_id} onValueChange={handlePropertyChange}>
                                        <SelectTrigger className={errors.property_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Choose a property..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {properties.map(property => (
                                                <SelectItem key={property.id} value={property.id.toString()}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{property.name}</span>
                                                        <span className="text-xs text-gray-500">{property.address}</span>
                                                        <span className="text-xs text-blue-600">
                                                            {property.formatted_base_rate}/night • Max {property.capacity_max} guests
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.property_id && <p className="text-sm text-red-500 mt-1">{errors.property_id}</p>}
                                </div>

                                {selectedProperty && (
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium">Base Rate:</span>
                                                <p className="text-blue-600">{selectedProperty.formatted_base_rate}/night</p>
                                            </div>
                                            <div>
                                                <span className="font-medium">Capacity:</span>
                                                <p>{selectedProperty.capacity} - {selectedProperty.capacity_max} guests</p>
                                            </div>
                                            <div>
                                                <span className="font-medium">Weekend Premium:</span>
                                                <p>{selectedProperty.weekend_premium_percent}%</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Booking Dates */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5" />
                                Booking Dates
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <DateRange
                                    startDate={data.check_in_date}
                                    endDate={data.check_out_date}
                                    onDateChange={(startDate, endDate) => {
                                        setData(prev => ({
                                            ...prev,
                                            check_in_date: startDate,
                                            check_out_date: endDate
                                        }));
                                    }}
                                    minDate={new Date().toISOString().split('T')[0]}
                                    size="lg"
                                    showNights={true}
                                    startLabel="Check-in Date"
                                    endLabel="Check-out Date"
                                    className={errors.check_in_date || errors.check_out_date ? 'border-red-500' : ''}
                                />
                                {(errors.check_in_date || errors.check_out_date) && (
                                    <p className="text-sm text-red-500">
                                        {errors.check_in_date || errors.check_out_date}
                                    </p>
                                )}

                                {/* Availability Status */}
                                {checkingAvailability && (
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Checking availability...
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {availabilityStatus && (
                                    <Alert className={availabilityStatus.available ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                                        {availabilityStatus.available ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <AlertDescription className={availabilityStatus.available ? 'text-green-800' : 'text-red-800'}>
                                            {availabilityStatus.available 
                                                ? `✓ Property is available for ${formatDateRange(data.check_in_date, data.check_out_date)}`
                                                : `✗ Property is not available for selected dates`
                                            }
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Guest Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Guest Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="guest_name">Guest Name *</Label>
                                    <Input
                                        id="guest_name"
                                        value={data.guest_name}
                                        onChange={(e) => setData('guest_name', e.target.value)}
                                        className={errors.guest_name ? 'border-red-500' : ''}
                                    />
                                    {errors.guest_name && <p className="text-sm text-red-500 mt-1">{errors.guest_name}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="guest_email">Email *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="guest_email"
                                            type="email"
                                            value={data.guest_email}
                                            onChange={(e) => setData('guest_email', e.target.value)}
                                            className={`pl-10 ${errors.guest_email ? 'border-red-500' : ''}`}
                                        />
                                    </div>
                                    {errors.guest_email && <p className="text-sm text-red-500 mt-1">{errors.guest_email}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="guest_phone">Phone Number *</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="guest_phone"
                                            value={data.guest_phone}
                                            onChange={(e) => setData('guest_phone', e.target.value)}
                                            className={`pl-10 ${errors.guest_phone ? 'border-red-500' : ''}`}
                                        />
                                    </div>
                                    {errors.guest_phone && <p className="text-sm text-red-500 mt-1">{errors.guest_phone}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="guest_country">Country</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                        <Select value={data.guest_country} onValueChange={(value) => setData('guest_country', value)}>
                                            <SelectTrigger className="pl-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries.map(country => (
                                                    <SelectItem key={country} value={country}>
                                                        {country}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <Label htmlFor="guest_id_number">ID Number (Optional)</Label>
                                    <div className="relative">
                                        <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="guest_id_number"
                                            value={data.guest_id_number}
                                            onChange={(e) => setData('guest_id_number', e.target.value)}
                                            className="pl-10"
                                            placeholder="Passport, ID Card, or other identification number"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            {/* Guest Breakdown */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Guest Breakdown</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="male_count">Male Guests</Label>
                                        <Input
                                            id="male_count"
                                            type="number"
                                            min="0"
                                            max="20"
                                            value={data.guest_breakdown_male}
                                            onChange={(e) => updateGuestBreakdown('male', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="female_count">Female Guests</Label>
                                        <Input
                                            id="female_count"
                                            type="number"
                                            min="0"
                                            max="20"
                                            value={data.guest_breakdown_female}
                                            onChange={(e) => updateGuestBreakdown('female', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="children_count">Children (0-12)</Label>
                                        <Input
                                            id="children_count"
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={data.guest_breakdown_children}
                                            onChange={(e) => updateGuestBreakdown('children', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Users className="h-4 w-4" />
                                    <span>Total Guests: {data.guest_count}</span>
                                    {selectedProperty && data.guest_count > selectedProperty.capacity && (
                                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                                            Extra bed needed
                                        </Badge>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="guest_relationships">Guest Relationships (Optional)</Label>
                                    <Input
                                        id="guest_relationships"
                                        value={data.guest_relationships}
                                        onChange={(e) => setData('guest_relationships', e.target.value)}
                                        placeholder="e.g., Family, Friends, Couple, Business trip"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rate Calculation */}
                    {rateCalculation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Rate Calculation
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span>Base rate ({rateCalculation.nights} nights)</span>
                                        <span>Rp {rateCalculation.base_amount.toLocaleString('id-ID')}</span>
                                    </div>
                                    {rateCalculation.weekend_premium > 0 && (
                                        <div className="flex justify-between text-blue-600">
                                            <span>Weekend premium</span>
                                            <span>+Rp {rateCalculation.weekend_premium.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {rateCalculation.seasonal_premium > 0 && (
                                        <div className="flex justify-between text-purple-600">
                                            <span>Seasonal premium</span>
                                            <span>+Rp {rateCalculation.seasonal_premium.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {rateCalculation.extra_bed_amount > 0 && (
                                        <div className="flex justify-between text-orange-600">
                                            <span>Extra bed charges</span>
                                            <span>+Rp {rateCalculation.extra_bed_amount.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {rateCalculation.cleaning_fee > 0 && (
                                        <div className="flex justify-between">
                                            <span>Cleaning fee</span>
                                            <span>+Rp {rateCalculation.cleaning_fee.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between text-lg font-semibold">
                                        <span>Total Amount</span>
                                        <span>Rp {rateCalculation.total_amount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Additional Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="special_requests">Special Requests</Label>
                                    <Input
                                        id="special_requests"
                                        value={data.special_requests}
                                        onChange={(e) => setData('special_requests', e.target.value)}
                                        placeholder="Any special requirements or notes"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="admin_notes">Admin Notes (Internal)</Label>
                                    <Input
                                        id="admin_notes"
                                        value={data.admin_notes}
                                        onChange={(e) => setData('admin_notes', e.target.value)}
                                        placeholder="Internal notes for staff reference"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="booking_status">Booking Status</Label>
                                        <Select value={data.booking_status} onValueChange={(value) => setData('booking_status', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="payment_status">Payment Status</Label>
                                        <Select value={data.payment_status} onValueChange={(value) => setData('payment_status', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="partial">Partially Paid</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex gap-4 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(route('admin.bookings.index'))}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || !availabilityStatus?.available || calculatingRate}
                        >
                            {processing ? 'Creating Booking...' : 'Create Booking'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}