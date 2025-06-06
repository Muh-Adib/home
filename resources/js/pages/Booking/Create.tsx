import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    ArrowLeft, 
    Calendar, 
    Users, 
    CreditCard, 
    Building2,
    MapPin,
    Info,
    Calculator,
    AlertCircle,
    CheckCircle,
    Bed,
    Clock
} from 'lucide-react';

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
    cover_image?: string;
}

interface BookingCreateProps {
    property: Property;
}

interface BookingFormData {
    check_in_date: string;
    check_out_date: string;
    guest_count_male: number;
    guest_count_female: number;
    guest_count_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests?: string;
    dp_percentage: number;
}

interface RateCalculation {
    nights: number;
    weekday_nights: number;
    weekend_nights: number;
    base_amount: number;
    total_base_amount: number;
    weekend_premium: number;
    extra_bed_amount: number;
    cleaning_fee: number;
    minimum_stay_discount: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    extra_beds: number;
    rate_breakdown: {
        base_rate_per_night: number;
        weekend_premium_percent: number;
        peak_season_applied: boolean;
        long_weekend_applied: boolean;
    };
}

export default function BookingCreate({ property }: BookingCreateProps) {
    const [totalGuests, setTotalGuests] = useState(2);
    const [extraBeds, setExtraBeds] = useState(0);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        check_in_date: '',
        check_out_date: '',
        guest_count_male: 1,
        guest_count_female: 1,
        guest_count_children: 0,
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        special_requests: '',
        dp_percentage: 30,
    });

    // Calculate total guests whenever individual counts change
    useEffect(() => {
        const total = data.guest_count_male + data.guest_count_female + data.guest_count_children;
        setTotalGuests(total);
        
        // Calculate extra beds needed
        const extraBedsNeeded = Math.max(0, total - property.capacity);
        setExtraBeds(extraBedsNeeded);
    }, [data.guest_count_male, data.guest_count_female, data.guest_count_children, property.capacity]);

    const calculateRate = useCallback(async () => {
        try {
            const response = await fetch(`/api/properties/${property.slug}/calculate-rate?` + new URLSearchParams({
                check_in: data.check_in_date,
                check_out: data.check_out_date,
                guest_count: totalGuests.toString(),
            }));
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await response.json();
                    if (result.success) {
                        setRateCalculation(result.calculation);
                    } else {
                        console.error('Rate calculation failed:', result.error);
                    }
                } else {
                    console.error('API returned non-JSON response');
                }
            } else {
                console.error('Rate calculation request failed with status:', response.status);
            }
        } catch (error) {
            console.error('Error calculating rate:', error);
            // Silently fail - don't show error to user, just skip rate calculation
        }
    }, [property.slug, data.check_in_date, data.check_out_date, totalGuests]);

    // Calculate rate when dates change
    useEffect(() => {
        if (data.check_in_date && data.check_out_date) {
            calculateRate();
        }
    }, [data.check_in_date, data.check_out_date, calculateRate]);

    const dpOptions = [
        { value: 30, label: '30% Down Payment', description: 'Pay 30% now, 70% later' },
        { value: 50, label: '50% Down Payment', description: 'Pay 50% now, 50% later' },
        { value: 70, label: '70% Down Payment', description: 'Pay 70% now, 30% later' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/properties/${property.slug}/book`);
    };

    const guestCountError = totalGuests > property.capacity_max;
    const canSubmit = data.check_in_date && 
                     data.check_out_date && 
                     !guestCountError && 
                     data.guest_name && 
                     data.guest_email && 
                     data.guest_phone && 
                     availabilityStatus === 'available' && 
                     rateCalculation !== null;

    return (
        <>
            <Head title={`Book ${property.name} - Property Management System`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <Link href={`/properties/${property.slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Property
                        </Link>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Booking Form */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-blue-600" />
                                        Book Your Stay
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Dates */}
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="check_in_date">Check-in Date</Label>
                                                <Input
                                                    id="check_in_date"
                                                    type="date"
                                                    value={data.check_in_date}
                                                    onChange={(e) => setData('check_in_date', e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className={errors.check_in_date ? 'border-red-500' : ''}
                                                />
                                                {errors.check_in_date && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.check_in_date}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="check_out_date">Check-out Date</Label>
                                                <Input
                                                    id="check_out_date"
                                                    type="date"
                                                    value={data.check_out_date}
                                                    onChange={(e) => setData('check_out_date', e.target.value)}
                                                    min={data.check_in_date || new Date().toISOString().split('T')[0]}
                                                    className={errors.check_out_date ? 'border-red-500' : ''}
                                                />
                                                {errors.check_out_date && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.check_out_date}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Availability Status */}
                                        {data.check_in_date && data.check_out_date && (
                                            <div className="mt-4">
                                                {availabilityStatus === 'checking' && (
                                                    <Alert>
                                                        <Clock className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Checking availability and calculating rates...
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                
                                                {availabilityStatus === 'unavailable' && (
                                                    <Alert variant="destructive">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Property is not available for selected dates. Please choose different dates.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                
                                                {availabilityStatus === 'available' && rateCalculation && (
                                                    <Alert>
                                                        <CheckCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Property is available! Total: Rp {rateCalculation.total_amount.toLocaleString()} for {rateCalculation.nights} nights.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}

                                        <Separator />

                                        {/* Guest Breakdown */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <Users className="h-5 w-5 text-blue-600" />
                                                <h3 className="text-lg font-semibold">Guest Details</h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <Label htmlFor="guest_count_male">Male Adults</Label>
                                                        <Input
                                                            id="guest_count_male"
                                                            type="number"
                                                            min="0"
                                                            value={data.guest_count_male}
                                                            onChange={(e) => setData('guest_count_male', parseInt(e.target.value) || 0)}
                                                            className={errors.guest_count_male ? 'border-red-500' : ''}
                                                        />
                                                        {errors.guest_count_male && (
                                                            <p className="text-sm text-red-600 mt-1">{errors.guest_count_male}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="guest_count_female">Female Adults</Label>
                                                        <Input
                                                            id="guest_count_female"
                                                            type="number"
                                                            min="0"
                                                            value={data.guest_count_female}
                                                            onChange={(e) => setData('guest_count_female', parseInt(e.target.value) || 0)}
                                                            className={errors.guest_count_female ? 'border-red-500' : ''}
                                                        />
                                                        {errors.guest_count_female && (
                                                            <p className="text-sm text-red-600 mt-1">{errors.guest_count_female}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="guest_count_children">Children (0-12)</Label>
                                                        <Input
                                                            id="guest_count_children"
                                                            type="number"
                                                            min="0"
                                                            value={data.guest_count_children}
                                                            onChange={(e) => setData('guest_count_children', parseInt(e.target.value) || 0)}
                                                            className={errors.guest_count_children ? 'border-red-500' : ''}
                                                        />
                                                        {errors.guest_count_children && (
                                                            <p className="text-sm text-red-600 mt-1">{errors.guest_count_children}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Guest Count Summary */}
                                                <div className="bg-slate-50 p-4 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium">Total Guests:</span>
                                                        <Badge variant={guestCountError ? "destructive" : "secondary"}>
                                                            {totalGuests} guests
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Property capacity: {property.capacity} - {property.capacity_max} guests
                                                    </div>
                                                    
                                                    {extraBeds > 0 && (
                                                        <div className="mt-2 flex items-center gap-2 text-sm">
                                                            <Bed className="h-4 w-4 text-blue-600" />
                                                            <span>Extra beds needed: {extraBeds}</span>
                                                            <span className="text-gray-600">
                                                                (+Rp {(extraBeds * property.extra_bed_rate).toLocaleString()}/night)
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {guestCountError && (
                                                        <Alert className="mt-2">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <AlertDescription>
                                                                Guest count exceeds maximum capacity ({property.capacity_max})
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Primary Guest Info */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Primary Guest Information</h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="guest_name">Full Name *</Label>
                                                    <Input
                                                        id="guest_name"
                                                        type="text"
                                                        value={data.guest_name}
                                                        onChange={(e) => setData('guest_name', e.target.value)}
                                                        className={errors.guest_name ? 'border-red-500' : ''}
                                                        placeholder="Enter full name"
                                                    />
                                                    {errors.guest_name && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_name}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="guest_phone">Phone Number *</Label>
                                                    <Input
                                                        id="guest_phone"
                                                        type="tel"
                                                        value={data.guest_phone}
                                                        onChange={(e) => setData('guest_phone', e.target.value)}
                                                        className={errors.guest_phone ? 'border-red-500' : ''}
                                                        placeholder="+62xxx"
                                                    />
                                                    {errors.guest_phone && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.guest_phone}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <Label htmlFor="guest_email">Email Address *</Label>
                                                <Input
                                                    id="guest_email"
                                                    type="email"
                                                    value={data.guest_email}
                                                    onChange={(e) => setData('guest_email', e.target.value)}
                                                    className={errors.guest_email ? 'border-red-500' : ''}
                                                    placeholder="your@email.com"
                                                />
                                                {errors.guest_email && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.guest_email}</p>
                                                )}
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Down Payment Options */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <CreditCard className="h-5 w-5 text-blue-600" />
                                                <h3 className="text-lg font-semibold">Payment Option</h3>
                                            </div>
                                            
                                            <div className="grid gap-3">
                                                {dpOptions.map((option) => (
                                                    <div
                                                        key={option.value}
                                                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                                            data.dp_percentage === option.value
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                        onClick={() => setData('dp_percentage', option.value)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-medium">{option.label}</div>
                                                                <div className="text-sm text-gray-600">{option.description}</div>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name="dp_percentage"
                                                                    value={option.value}
                                                                    checked={data.dp_percentage === option.value}
                                                                    onChange={() => setData('dp_percentage', option.value)}
                                                                    className="text-blue-600"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Special Requests */}
                                        <div>
                                            <Label htmlFor="special_requests">Special Requests (Optional)</Label>
                                            <Textarea
                                                id="special_requests"
                                                value={data.special_requests}
                                                onChange={(e) => setData('special_requests', e.target.value)}
                                                rows={3}
                                                placeholder="Any special requests or requirements..."
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <Link href={`/properties/${property.slug}`} className="flex-1">
                                                <Button variant="outline" className="w-full">Cancel</Button>
                                            </Link>
                                            <Button 
                                                type="submit" 
                                                disabled={!canSubmit || processing}
                                                className="flex-1"
                                            >
                                                {processing ? 'Processing...' : 'Continue to Confirmation'}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Property Summary & Rate */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4 space-y-6">
                                {/* Property Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Your Booking</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden">
                                                {property.cover_image ? (
                                                    <img 
                                                        src={property.cover_image} 
                                                        alt={property.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <Building2 className="h-8 w-8 text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-semibold">{property.name}</h3>
                                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-4 w-4 mr-1" />
                                                    {property.address}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Rate Calculation */}
                                {(rateCalculation || isCalculatingRate) && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Calculator className="h-5 w-5" />
                                                Rate Breakdown
                                                {isCalculatingRate && (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {isCalculatingRate ? (
                                                <div className="space-y-3">
                                                    <div className="animate-pulse">
                                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                                                        <div className="h-6 bg-gray-300 rounded w-full"></div>
                                                    </div>
                                                </div>
                                            ) : rateCalculation ? (
                                            <div className="space-y-3 text-sm">
                                                {/* Base Rate Breakdown */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span>Base rate ({rateCalculation.nights} nights)</span>
                                                        <span>Rp {rateCalculation.base_amount.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    {rateCalculation.weekday_nights > 0 && rateCalculation.weekend_nights > 0 && (
                                                        <div className="text-xs text-gray-500 pl-2">
                                                            • Weekdays: {rateCalculation.weekday_nights} nights<br/>
                                                            • Weekends: {rateCalculation.weekend_nights} nights
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Weekend Premium */}
                                                {rateCalculation.weekend_premium > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Weekend premium ({rateCalculation.rate_breakdown.weekend_premium_percent}%)</span>
                                                        <span>Rp {rateCalculation.weekend_premium.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                
                                                {/* Peak Season Indicator */}
                                                {rateCalculation.rate_breakdown.peak_season_applied && (
                                                    <div className="flex justify-between text-orange-600">
                                                        <span>Peak season premium (20%)</span>
                                                        <span>Applied</span>
                                                    </div>
                                                )}
                                                
                                                {/* Long Weekend Indicator */}
                                                {rateCalculation.rate_breakdown.long_weekend_applied && (
                                                    <div className="flex justify-between text-purple-600">
                                                        <span>Holiday premium (15%)</span>
                                                        <span>Applied</span>
                                                    </div>
                                                )}
                                                
                                                {/* Extra Beds */}
                                                {extraBeds > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Extra beds ({extraBeds} × {rateCalculation.nights} nights)</span>
                                                        <span>Rp {rateCalculation.extra_bed_amount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                
                                                {/* Cleaning Fee */}
                                                {rateCalculation.cleaning_fee > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Cleaning fee</span>
                                                        <span>Rp {rateCalculation.cleaning_fee.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                
                                                {/* Minimum Stay Discount */}
                                                {rateCalculation.minimum_stay_discount > 0 && (
                                                    <div className="flex justify-between text-green-600">
                                                        <span>
                                                            {rateCalculation.nights >= 7 ? 'Weekly stay discount (10%)' : 'Multi-night discount (5%)'}
                                                        </span>
                                                        <span>-Rp {rateCalculation.minimum_stay_discount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                
                                                <Separator />
                                                
                                                {/* Subtotal */}
                                                <div className="flex justify-between">
                                                    <span>Subtotal</span>
                                                    <span>Rp {rateCalculation.subtotal.toLocaleString()}</span>
                                                </div>
                                                
                                                {/* Tax */}
                                                <div className="flex justify-between">
                                                    <span>Tax (11%)</span>
                                                    <span>Rp {rateCalculation.tax_amount.toLocaleString()}</span>
                                                </div>
                                                
                                                <Separator />
                                                
                                                {/* Total */}
                                                <div className="flex justify-between font-semibold text-lg">
                                                    <span>Total</span>
                                                    <span>Rp {rateCalculation.total_amount.toLocaleString()}</span>
                                                </div>
                                                
                                                <Separator />
                                                
                                                {/* Payment Breakdown */}
                                                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                                                    <div className="flex justify-between text-blue-700 font-semibold">
                                                        <span>Down Payment ({data.dp_percentage}%)</span>
                                                        <span>Rp {Math.round(rateCalculation.total_amount * data.dp_percentage / 100).toLocaleString()}</span>
                                                    </div>
                                                    
                                                    <div className="flex justify-between text-blue-600">
                                                        <span>Remaining Balance</span>
                                                        <span>Rp {Math.round(rateCalculation.total_amount * (100 - data.dp_percentage) / 100).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            ) : null}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Info */}
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Your booking will be verified by our staff before confirmation.
                                        Payment is required after verification.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 