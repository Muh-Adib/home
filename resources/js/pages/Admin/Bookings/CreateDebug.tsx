import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from '@/components/ui/date-range';
import { 
    CalendarDays, Users, DollarSign, CheckCircle, AlertCircle, Building2,
    Phone, Mail, Globe, IdCard, User, UserPlus, Bed, Clock, Calculator,
    RefreshCw, Info, Sparkles, Tag, Percent, ArrowLeft, CreditCard,
    Shield, Calendar, TrendingUp, Zap, Loader2, Plus, X, Trash2,
    Bug, Database, Network, Code, Settings, Eye, EyeOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type BreadcrumbItem } from '@/types';

// Debug Interface
interface DebugInfo {
    apiCalls: Array<{
        endpoint: string;
        method: string;
        request: any;
        response: any;
        timestamp: Date;
        status: 'success' | 'error' | 'pending';
        duration: number;
    }>;
    stateChanges: Array<{
        component: string;
        field: string;
        oldValue: any;
        newValue: any;
        timestamp: Date;
    }>;
    errors: Array<{
        message: string;
        stack?: string;
        timestamp: Date;
        context: any;
    }>;
    performance: {
        componentMountTime: number;
        apiCallCount: number;
        averageApiResponseTime: number;
        renderCount: number;
    };
}

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
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    cover_image?: string;
    amenities?: any[];
    media?: any[];
}

interface RateCalculation {
    nights: number;
    base_amount: number;
    weekend_premium: number;
    seasonal_premium: number;
    extra_bed_amount: number;
    cleaning_fee: number;
    tax_amount: number;
    total_amount: number;
    extra_beds: number;
    formatted: {
        total_amount: string;
        per_night: string;
    };
}

interface CreateBookingDebugProps {
    properties: Property[];
    selectedProperty?: Property | null;
    prefilledData?: {
        property_id?: string;
        check_in_date?: string;
        check_out_date?: string;
    };
}

export default function CreateBookingDebug({ properties, selectedProperty, prefilledData }: CreateBookingDebugProps) {
    const { t } = useTranslation();
    
    // Debug State
    const [debugInfo, setDebugInfo] = useState<DebugInfo>({
        apiCalls: [],
        stateChanges: [],
        errors: [],
        performance: {
            componentMountTime: Date.now(),
            apiCallCount: 0,
            averageApiResponseTime: 0,
            renderCount: 0,
        }
    });
    const [showDebug, setShowDebug] = useState(false);
    const [debugMode, setDebugMode] = useState<'basic' | 'detailed' | 'performance'>('basic');
    
    // Main State
    const [currentProperty, setCurrentProperty] = useState<Property | null>(selectedProperty || null);
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        property_id: prefilledData?.property_id || '',
        check_in_date: prefilledData?.check_in_date || '',
        check_out_date: prefilledData?.check_out_date || '',
        guest_male: 1,
        guest_female: 1,
        guest_children: 0,
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guest_country: 'Indonesia',
        guest_id_number: '',
        guest_gender: 'male' as 'male' | 'female',
        relationship_type: 'keluarga' as 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran',
        special_requests: '',
        internal_notes: '',
        booking_status: 'confirmed' as 'pending_verification' | 'confirmed',
        payment_status: 'fully_paid' as 'dp_pending' | 'dp_received' | 'fully_paid',
        dp_percentage: 100,
        auto_confirm: true,
        check_in_time: '15:00',
        source: 'direct' as 'direct' | 'phone' | 'walk_in' | 'ota',
    });

    // Debug Functions
    const logApiCall = useCallback((endpoint: string, method: string, request: any, response: any, status: 'success' | 'error' | 'pending', duration: number) => {
        setDebugInfo(prev => ({
            ...prev,
            apiCalls: [...prev.apiCalls, {
                endpoint,
                method,
                request,
                response,
                timestamp: new Date(),
                status,
                duration
            }],
            performance: {
                ...prev.performance,
                apiCallCount: prev.performance.apiCallCount + 1,
                averageApiResponseTime: (prev.performance.averageApiResponseTime + duration) / 2
            }
        }));
    }, []);

    const logStateChange = useCallback((component: string, field: string, oldValue: any, newValue: any) => {
        setDebugInfo(prev => ({
            ...prev,
            stateChanges: [...prev.stateChanges, {
                component,
                field,
                oldValue,
                newValue,
                timestamp: new Date()
            }]
        }));
    }, []);

    const logError = useCallback((message: string, stack?: string, context?: any) => {
        setDebugInfo(prev => ({
            ...prev,
            errors: [...prev.errors, {
                message,
                stack,
                timestamp: new Date(),
                context
            }]
        }));
    }, []);

    // Enhanced API call wrapper with debug
    const debugApiCall = useCallback(async (endpoint: string, options: RequestInit) => {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substr(2, 9);
        
        logApiCall(endpoint, options.method || 'GET', options.body, null, 'pending', 0);
        
        try {
            const response = await fetch(endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-Debug-Request-ID': requestId,
                    ...options.headers
                }
            });
            
            const responseData = await response.json();
            const duration = Date.now() - startTime;
            
            if (response.ok) {
                logApiCall(endpoint, options.method || 'GET', options.body, responseData, 'success', duration);
                return responseData;
            } else {
                logApiCall(endpoint, options.method || 'GET', options.body, responseData, 'error', duration);
                throw new Error(responseData.error || 'API call failed');
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            logApiCall(endpoint, options.method || 'GET', options.body, { error: error.message }, 'error', duration);
            logError(`API call failed: ${endpoint}`, error.stack, { endpoint, options });
            throw error;
        }
    }, [logApiCall, logError]);

    // Calculate total guests
    const totalGuests = useMemo(() => {
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;
        return male + female + children;
    }, [data.guest_male, data.guest_female, data.guest_children]);

    // Calculate extra beds needed
    const extraBeds = useMemo(() => {
        if (!currentProperty) return 0;
        const male = Number(data.guest_male) || 0;
        const female = Number(data.guest_female) || 0;
        const children = Number(data.guest_children) || 0;
        const totalForExtraBeds = Math.ceil(male + female + Math.ceil((children - currentProperty.capacity) * 0.5));
        return Math.max(0, totalForExtraBeds - currentProperty.capacity);
    }, [currentProperty, data.guest_male, data.guest_female, data.guest_children]);

    // Enhanced property change handler with debug
    const handlePropertyChange = useCallback((propertyId: string) => {
        const oldProperty = currentProperty;
        const property = properties.find(p => p.id.toString() === propertyId);
        
        logStateChange('PropertySelection', 'property_id', oldProperty?.id, propertyId);
        
        setCurrentProperty(property || null);
        setData('property_id', propertyId);
        
        // Reset calculations
        setRateCalculation(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);
        
        if (property) {
            loadPropertyAvailabilityAndRatesDebug(property.id);
            
            // Update capacity if needed
            if (totalGuests > property.capacity_max) {
                logStateChange('PropertyChange', 'guest_male', data.guest_male, Math.floor(property.capacity_max / 2));
                logStateChange('PropertyChange', 'guest_female', data.guest_female, Math.floor(property.capacity_max / 2));
                logStateChange('PropertyChange', 'guest_children', data.guest_children, property.capacity_max % 2);
                
                setData('guest_male', Math.floor(property.capacity_max / 2));
                setData('guest_female', Math.floor(property.capacity_max / 2));
                setData('guest_children', property.capacity_max % 2);
            }
        }
    }, [currentProperty, properties, setData, totalGuests, data.guest_male, data.guest_female, data.guest_children, logStateChange]);

    // Debug version of availability loading
    const loadPropertyAvailabilityAndRatesDebug = useCallback(async (propertyId: number) => {
        try {
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const response = await debugApiCall('/admin/api/admin/booking-management/availability-and-rates', {
                method: 'POST',
                body: JSON.stringify({
                    property_id: propertyId,
                    check_in: startDate,
                    check_out: endDate,
                    guest_count: totalGuests,
                }),
            });
            
            if (response.success) {
                setAvailabilityError(null);
                logStateChange('Availability', 'availabilityData', null, response);
            } else {
                setAvailabilityError(response.error || 'Failed to load availability data');
                logError('Availability loading failed', undefined, response);
            }
        } catch (error) {
            setAvailabilityError('Network error loading availability data');
            logError('Availability loading network error', error.stack, { propertyId });
        }
    }, [debugApiCall, totalGuests, logStateChange, logError]);

    // Enhanced date range change handler with debug
    const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
        logStateChange('DateRange', 'check_in_date', data.check_in_date, startDate);
        logStateChange('DateRange', 'check_out_date', data.check_out_date, endDate);
        
        setData('check_in_date', startDate);
        setData('check_out_date', endDate);
        
        // Clear previous calculations
        setRateCalculation(null);
        setRateError(null);
        setAvailabilityStatus(null);
        setAvailabilityError(null);
        
        if (startDate && endDate && currentProperty) {
            setIsCalculatingRate(true);
            
            const checkAvailabilityAndRate = async () => {
                try {
                    const availabilityResponse = await debugApiCall('/admin/api/admin/booking-management/availability-and-rates', {
                        method: 'POST',
                        body: JSON.stringify({
                            property_id: currentProperty.id,
                            check_in: startDate,
                            check_out: endDate,
                            guest_count: totalGuests,
                        }),
                    });
                    
                    if (availabilityResponse.success) {
                        const isAvailable = !availabilityResponse.booked_dates || availabilityResponse.booked_dates.length === 0;
                        setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
                        
                        if (!isAvailable) {
                            setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                            setIsCalculatingRate(false);
                            return;
                        }
                        
                        const rateResponse = await debugApiCall('/admin/api/admin/booking-management/calculate-rate', {
                            method: 'POST',
                            body: JSON.stringify({
                                property_id: currentProperty.id,
                                check_in: startDate,
                                check_out: endDate,
                                guest_count: totalGuests,
                            }),
                        });
                        
                        if (rateResponse.success) {
                            const calculation = rateResponse.calculation || rateResponse;
                            const newRateCalculation = {
                                nights: calculation.nights,
                                base_amount: calculation.base_amount,
                                weekend_premium: calculation.weekend_premium || 0,
                                seasonal_premium: calculation.seasonal_premium || 0,
                                extra_bed_amount: calculation.extra_bed_amount || 0,
                                cleaning_fee: calculation.cleaning_fee || 0,
                                tax_amount: calculation.tax_amount || 0,
                                total_amount: calculation.total_amount,
                                extra_beds: calculation.extra_beds || 0,
                                formatted: {
                                    total_amount: 'Rp ' + calculation.total_amount.toLocaleString('id-ID'),
                                    per_night: 'Rp ' + Math.round(calculation.total_amount / calculation.nights).toLocaleString('id-ID')
                                }
                            };
                            
                            logStateChange('RateCalculation', 'rateCalculation', rateCalculation, newRateCalculation);
                            setRateCalculation(newRateCalculation);
                            setRateError(null);
                        } else {
                            setRateError(rateResponse.message || 'Rate calculation failed');
                            logError('Rate calculation failed', undefined, rateResponse);
                        }
                    } else {
                        setAvailabilityError(availabilityResponse.message || 'Failed to check availability');
                        logError('Availability check failed', undefined, availabilityResponse);
                    }
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
                    logError('Date range calculation error', error.stack, { startDate, endDate });
                } finally {
                    setIsCalculatingRate(false);
                }
            };
            
            setTimeout(checkAvailabilityAndRate, 300);
        }
    }, [currentProperty, setData, totalGuests, debugApiCall, logStateChange, logError, rateCalculation]);

    // Enhanced guest count change handler with debug
    const handleGenderCountChange = useCallback((genderType: 'male' | 'female' | 'children', newCount: number) => {
        const countField = genderType === 'children' ? 'guest_children' : 
                          genderType === 'male' ? 'guest_male' : 'guest_female';
        
        const oldValue = data[countField];
        logStateChange('GuestCount', countField, oldValue, newCount);
        
        setData(countField, newCount);
        
        // Recalculate rate when guest count changes
        if (data.check_in_date && data.check_out_date && currentProperty) {
            setTimeout(async () => {
                try {
                    const response = await debugApiCall('/admin/api/admin/booking-management/calculate-rate', {
                        method: 'POST',
                        body: JSON.stringify({
                            property_id: currentProperty.id,
                            check_in: data.check_in_date,
                            check_out: data.check_out_date,
                            guest_count: totalGuests,
                        }),
                    });
                    
                    if (response.success) {
                        const calculation = response.calculation || response;
                        const newRateCalculation = {
                            nights: calculation.nights,
                            base_amount: calculation.base_amount,
                            weekend_premium: calculation.weekend_premium || 0,
                            seasonal_premium: calculation.seasonal_premium || 0,
                            extra_bed_amount: calculation.extra_bed_amount || 0,
                            cleaning_fee: calculation.cleaning_fee || 0,
                            tax_amount: calculation.tax_amount || 0,
                            total_amount: calculation.total_amount,
                            extra_beds: calculation.extra_beds || 0,
                            formatted: {
                                total_amount: 'Rp ' + calculation.total_amount.toLocaleString('id-ID'),
                                per_night: 'Rp ' + Math.round(calculation.total_amount / calculation.nights).toLocaleString('id-ID')
                            }
                        };
                        
                        logStateChange('RateCalculation', 'rateCalculation', rateCalculation, newRateCalculation);
                        setRateCalculation(newRateCalculation);
                        setRateError(null);
                    } else {
                        setRateError(response.message || 'Rate calculation failed');
                        logError('Guest count rate calculation failed', undefined, response);
                    }
                } catch (error) {
                    setRateCalculation(null);
                    setRateError(error instanceof Error ? error.message : 'Error calculating rate');
                    logError('Guest count calculation error', error.stack, { genderType, newCount });
                }
            }, 300);
        }
    }, [data, setData, currentProperty, totalGuests, debugApiCall, logStateChange, logError, rateCalculation]);

    // Enhanced form submission with debug
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        
        logStateChange('FormSubmission', 'submitting', false, true);
        
        const formData = {
            ...data,
            guest_count: totalGuests,
        };
        
        Object.keys(formData).forEach(key => {
            setData(key as any, formData[key as keyof typeof formData]);
        });
        
        post(route('admin.booking-management.store'), {
            onSuccess: () => {
                logStateChange('FormSubmission', 'success', false, true);
                router.visit(route('admin.booking-management.index'));
            },
            onError: (errors: any) => {
                logError('Form submission failed', undefined, errors);
                logStateChange('FormSubmission', 'error', false, true);
            }
        });
    }, [data, totalGuests, setData, post, router, logStateChange, logError]);

    // Update render count
    useEffect(() => {
        setDebugInfo(prev => ({
            ...prev,
            performance: {
                ...prev.performance,
                renderCount: prev.performance.renderCount + 1
            }
        }));
    });

    // Breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/admin/dashboard' },
        { title: 'Bookings', href: '/admin/booking-management' },
        { title: 'Create Booking (Debug)' },
    ];

    // Validation
    const canSubmit = data.property_id && 
                     data.check_in_date && 
                     data.check_out_date && 
                     data.guest_name.trim() && 
                     data.guest_email.trim() && 
                     data.guest_phone.trim() && 
                     data.guest_country && 
                     totalGuests > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Booking (Debug Mode)" />
            
            <div className="space-y-6">
                {/* Debug Header */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bug className="h-5 w-5 text-yellow-600" />
                            <h2 className="text-lg font-semibold text-yellow-800">Debug Mode Active</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDebug(!showDebug)}
                            >
                                {showDebug ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {showDebug ? 'Hide Debug' : 'Show Debug'}
                            </Button>
                            <Select value={debugMode} onValueChange={(value: any) => setDebugMode(value)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="detailed">Detailed</SelectItem>
                                    <SelectItem value="performance">Performance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Debug Panel */}
                {showDebug && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-800">
                                <Bug className="h-5 w-5" />
                                Debug Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="api" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="api">API Calls</TabsTrigger>
                                    <TabsTrigger value="state">State Changes</TabsTrigger>
                                    <TabsTrigger value="errors">Errors</TabsTrigger>
                                    <TabsTrigger value="performance">Performance</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="api" className="space-y-2">
                                    <div className="text-sm font-medium">API Calls ({debugInfo.apiCalls.length})</div>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {debugInfo.apiCalls.map((call, index) => (
                                            <div key={index} className="p-2 bg-white rounded border text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={call.status === 'success' ? 'default' : call.status === 'error' ? 'destructive' : 'secondary'}>
                                                        {call.status}
                                                    </Badge>
                                                    <span className="font-medium">{call.method}</span>
                                                    <span className="text-gray-600">{call.endpoint}</span>
                                                    <span className="text-gray-500">{call.duration}ms</span>
                                                </div>
                                                {debugMode === 'detailed' && (
                                                    <div className="mt-1 text-gray-600">
                                                        <div>Request: {JSON.stringify(call.request, null, 2)}</div>
                                                        <div>Response: {JSON.stringify(call.response, null, 2)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                                
                                <TabsContent value="state" className="space-y-2">
                                    <div className="text-sm font-medium">State Changes ({debugInfo.stateChanges.length})</div>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {debugInfo.stateChanges.map((change, index) => (
                                            <div key={index} className="p-2 bg-white rounded border text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{change.component}</span>
                                                    <span className="text-gray-600">.</span>
                                                    <span className="text-blue-600">{change.field}</span>
                                                    <span className="text-gray-500">
                                                        {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                                
                                <TabsContent value="errors" className="space-y-2">
                                    <div className="text-sm font-medium">Errors ({debugInfo.errors.length})</div>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {debugInfo.errors.map((error, index) => (
                                            <div key={index} className="p-2 bg-red-50 rounded border text-xs">
                                                <div className="font-medium text-red-800">{error.message}</div>
                                                {debugMode === 'detailed' && error.stack && (
                                                    <div className="mt-1 text-red-600">{error.stack}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                                
                                <TabsContent value="performance" className="space-y-2">
                                    <div className="text-sm font-medium">Performance Metrics</div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-2 bg-white rounded border">
                                            <div className="font-medium">Component Mount Time</div>
                                            <div className="text-gray-600">{Date.now() - debugInfo.performance.componentMountTime}ms</div>
                                        </div>
                                        <div className="p-2 bg-white rounded border">
                                            <div className="font-medium">API Call Count</div>
                                            <div className="text-gray-600">{debugInfo.performance.apiCallCount}</div>
                                        </div>
                                        <div className="p-2 bg-white rounded border">
                                            <div className="font-medium">Avg API Response Time</div>
                                            <div className="text-gray-600">{Math.round(debugInfo.performance.averageApiResponseTime)}ms</div>
                                        </div>
                                        <div className="p-2 bg-white rounded border">
                                            <div className="font-medium">Render Count</div>
                                            <div className="text-gray-600">{debugInfo.performance.renderCount}</div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                {/* Main Form Content */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Form will be continued in next part due to length */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Booking Information (Debug Mode)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-gray-600 mb-4">
                                    Debug mode is active. All API calls and state changes are being logged.
                                </div>
                                
                                {/* Basic form fields for testing */}
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="property_id">Select Property *</Label>
                                        <Select 
                                            value={data.property_id} 
                                            onValueChange={handlePropertyChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a property" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {properties.map((property) => (
                                                    <SelectItem key={property.id} value={property.id.toString()}>
                                                        {property.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Check-in & Check-out Dates *</Label>
                                        <DateRange
                                            startDate={data.check_in_date}
                                            endDate={data.check_out_date}
                                            onDateChange={handleDateRangeChange}
                                            minDate={new Date().toISOString().split('T')[0]}
                                            size="lg"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label>Male Adults</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.guest_male}
                                                onChange={(e) => handleGenderCountChange('male', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Female Adults</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.guest_female}
                                                onChange={(e) => handleGenderCountChange('female', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Children</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.guest_children}
                                                onChange={(e) => handleGenderCountChange('children', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Primary Guest Name *</Label>
                                        <Input
                                            value={data.guest_name}
                                            onChange={(e) => {
                                                logStateChange('GuestName', 'guest_name', data.guest_name, e.target.value);
                                                setData('guest_name', e.target.value);
                                            }}
                                            placeholder="Enter full name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Email *</Label>
                                            <Input
                                                type="email"
                                                value={data.guest_email}
                                                onChange={(e) => {
                                                    logStateChange('GuestEmail', 'guest_email', data.guest_email, e.target.value);
                                                    setData('guest_email', e.target.value);
                                                }}
                                                placeholder="guest@example.com"
                                            />
                                        </div>
                                        <div>
                                            <Label>Phone *</Label>
                                            <Input
                                                type="tel"
                                                value={data.guest_phone}
                                                onChange={(e) => {
                                                    logStateChange('GuestPhone', 'guest_phone', data.guest_phone, e.target.value);
                                                    setData('guest_phone', e.target.value);
                                                }}
                                                placeholder="+62xxx"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => router.visit(route('admin.booking-management.index'))}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={!canSubmit || processing}
                                            onClick={handleSubmit}
                                            className="flex-1"
                                        >
                                            {processing ? 'Creating...' : 'Create Booking'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Debug Sidebar */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Current State
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Property:</span>
                                    <span>{currentProperty?.name || 'None'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Guests:</span>
                                    <span>{totalGuests}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Extra Beds:</span>
                                    <span>{extraBeds}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Rate Calculation:</span>
                                    <span>{rateCalculation ? 'Available' : 'None'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Availability Status:</span>
                                    <span>{availabilityStatus || 'Not checked'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Can Submit:</span>
                                    <span>{canSubmit ? 'Yes' : 'No'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {rateCalculation && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calculator className="h-5 w-5" />
                                        Rate Calculation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Total Amount:</span>
                                        <span className="font-medium">{rateCalculation.formatted.total_amount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Per Night:</span>
                                        <span>{rateCalculation.formatted.per_night}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Nights:</span>
                                        <span>{rateCalculation.nights}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
