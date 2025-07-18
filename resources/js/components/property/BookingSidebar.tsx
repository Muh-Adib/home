import React from 'react';
import { Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DateRange } from '@/components/ui/date-range';
import { 
    Calendar as CalendarIcon,
    Calculator,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Info,
    Sparkles,
    Clock,
    Tag,
    ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/components/PropertyCard';

interface BookingSidebarProps {
    property: Property;
    availabilityData: any;
    searchParams: {
        check_in: string;
        check_out: string;
        guests: number;
    };
    onDateRangeChange: (startDate: string, endDate: string) => void;
    onGuestCountChange: (count: number) => void;
    checkInDate: string;
    checkOutDate: string;
    guestCount: number;
    maxSelectableDate: string;
    effectiveMinStay: {
        minStay: number;
        reason: string;
        seasonalRateApplied?: any;
    };
    meetsMinimumStay: boolean;
    // Rate calculation data from parent
    rateCalculation?: any;
    rateError?: string | null;
    isCalculatingRate?: boolean;
    hasSeasonalPremium?: boolean;
    hasWeekendPremium?: boolean;
    isRateReady?: boolean;
}

export function BookingSidebar({
    property,
    availabilityData,
    searchParams,
    onDateRangeChange,
    onGuestCountChange,
    checkInDate,
    checkOutDate,
    guestCount,
    maxSelectableDate,
    effectiveMinStay,
    meetsMinimumStay,
    // Rate calculation props
    rateCalculation,
    rateError,
    isCalculatingRate,
    hasSeasonalPremium,
    hasWeekendPremium,
    isRateReady
}: BookingSidebarProps) {
    const { t } = useTranslation();

    const handleDateRangeChange = (startDate: string, endDate: string) => {
        onDateRangeChange(startDate, endDate);
    };

    const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let count = parseInt(e.target.value) || 1;
        
        // Jika input melebihi kapasitas maksimum, set ke kapasitas maksimum
        if (count > property.capacity_max) {
            count = property.capacity_max;
            e.target.value = property.capacity_max.toString();
        }
        
        onGuestCountChange(count);
    };

    const canSubmit = isRateReady && meetsMinimumStay && checkInDate && checkOutDate && guestCount;

    return (
        <div className="space-y-6">
            <Card className="md:sticky md:top-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        {t('properties.book_your_stay')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    
                    {/* Date Range Picker */}
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="date-range">{t('booking.check_in_checkout_dates')}</Label>
                            <DateRange
                                startDate={checkInDate}
                                endDate={checkOutDate}
                                onDateChange={handleDateRangeChange}
                                bookedDates={availabilityData?.booked_dates || []}
                                loading={isCalculatingRate}
                                error={rateError}
                                minDate={new Date().toISOString().split('T')[0]}
                                maxDate={maxSelectableDate}
                                minStayWeekday={effectiveMinStay.minStay}
                                minStayWeekend={effectiveMinStay.minStay}
                                minStayPeak={effectiveMinStay.minStay}
                                showMinStayWarning={true}
                                autoTrigger={true}
                                triggerDelay={300}
                                className="w-full"
                                size="lg"
                                compact={false}
                                showNights={true}
                                startLabel={t('booking.check_in')}
                                endLabel={t('booking.check_out')}
                                placeholder={{
                                    start: t('booking.check_in'),
                                    end: t('booking.check_out')
                                }}
                            />
                            
                            {/* Minimum Stay Information */}
                            {checkInDate && checkOutDate && (
                                <div className="mt-2">
                                    {effectiveMinStay.reason === 'seasonal_rate' && (
                                        <Alert className="bg-green-50 border-green-200">
                                            <Sparkles className="h-4 w-4 text-green-600" />
                                            <AlertDescription className="text-green-800">
                                                <strong>Minimum Stay {effectiveMinStay.minStay} malam</strong> berdasarkan seasonal rate "{effectiveMinStay.seasonalRateApplied?.[0].name}"
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    {effectiveMinStay.reason === 'weekend' && (
                                        <Alert className="bg-amber-50 border-amber-200">
                                            <Tag className="h-4 w-4 text-amber-600" />
                                            <AlertDescription className="text-amber-800">
                                                <strong>Minimum Stay {effectiveMinStay.minStay} malam</strong> untuk weekend booking
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    {effectiveMinStay.reason === 'weekday' && (
                                        <Alert className="bg-blue-50 border-blue-200">
                                            <CalendarIcon className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-800">
                                                <strong>Minimum Stay {effectiveMinStay.minStay} malam</strong> untuk weekday booking
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    {effectiveMinStay.reason === 'sandwiched_between_bookings' && (
                                        <Alert className="bg-gray-50 border-gray-200">
                                            <Info className="h-4 w-4 text-gray-600" />
                                            <AlertDescription className="text-gray-700">
                                                <strong>Minimum Stay 1 malam</strong> karena tanggal terjepit antara booking lain
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    {!meetsMinimumStay && (
                                        <Alert variant="destructive" className="mt-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Minimum stay tidak terpenuhi. Pilih minimal {effectiveMinStay.minStay} malam.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <Label htmlFor="guests">{t('booking.guests')}</Label>
                            <Input
                                id="guests"
                                type="number"
                                value={guestCount}
                                onChange={handleGuestCountChange}
                                min="1"
                                max={property.capacity_max}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Rate Calculation Display */}
                    <div className="space-y-3">
                        {isCalculatingRate && (
                            <Alert>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <AlertDescription>
                                    {t('properties.calculating_best_rates')}
                                </AlertDescription>
                            </Alert>
                        )}

                        {rateError && (
                            <Alert variant={rateError.includes(t('properties.property_not_available')) ? 'default' : 'destructive'}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>
                                    {rateError.includes(t('properties.property_not_available')) ? t('properties.property_not_available') : t('properties.calculation_error')}
                                </AlertTitle>
                                <AlertDescription>
                                    {rateError.includes(t('properties.property_not_available')) ? (
                                        <div className="space-y-2">
                                            <p>{rateError.split('.')[0]}</p>
                                            <p className="text-xs text-gray-600">
                                                {t('properties.select_different_dates')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span>{rateError}</span>
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        {isRateReady && rateCalculation && (
                            <div className="space-y-4">
                                {/* Main Price Display */}
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {rateCalculation.formatted.total_amount}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {t('properties.for')} {rateCalculation.nights} {t('booking.nights')} • {rateCalculation.formatted.per_night}/{t('booking.night')}
                                    </div>
                                    
                                    {hasSeasonalPremium && (
                                        <div className="text-xs text-green-600 mt-2 flex items-center justify-center">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            {t('properties.special_seasonal_rates')}
                                        </div>
                                    )}
                                    
                                    {hasWeekendPremium && (
                                        <div className="text-xs text-amber-600 mt-1 flex items-center justify-center">
                                            <Tag className="h-3 w-3 mr-1" />
                                            {t('properties.weekend_premium_included')}
                                        </div>
                                    )}
                                    
                                    {/* Minimum Stay Info */}
                                    <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Minimum stay: {effectiveMinStay.minStay} malam
                                        {effectiveMinStay.reason === 'seasonal_rate' && (
                                            <span className="ml-1">({effectiveMinStay.seasonalRateApplied?.[0].name})</span>
                                        )}
                                    </div>
                                </div>

                                {/* Rate Breakdown */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>{t('properties.base_rate')} ({rateCalculation.nights} {t('booking.nights')})</span>
                                        <span>Rp {rateCalculation.base_amount.toLocaleString()}</span>
                                    </div>
                                    
                                    {rateCalculation.weekend_premium > 0 && (
                                        <div className="flex justify-between text-amber-600">
                                            <span>{t('properties.weekend_premium')}</span>
                                            <span>+Rp {rateCalculation.weekend_premium.toLocaleString()}</span>
                                        </div>
                                    )}
                                    
                                    {rateCalculation.seasonal_premium > 0 && (
                                        <div className="text-green-600">
                                            <div className="flex justify-between">
                                                <span>{t('properties.seasonal_premium')}</span>
                                                <span>+Rp {rateCalculation.seasonal_premium.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {rateCalculation.extra_bed_amount > 0 && (
                                        <div className="flex justify-between">
                                            <span>{t('properties.extra_beds')} ({rateCalculation.extra_beds})</span>
                                            <span>+Rp {rateCalculation.extra_bed_amount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between">
                                        <span>{t('properties.cleaning_fee')}</span>
                                        <span>Rp {rateCalculation.cleaning_fee.toLocaleString()}</span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                        <span>{t('properties.tax')}</span>
                                        <span>Rp {rateCalculation.tax_amount.toLocaleString()}</span>
                                    </div>
                                    
                                    <Separator />
                                    
                                    <div className="flex justify-between font-semibold text-base">
                                        <span>{t('properties.total')}</span>
                                        <span>Rp {rateCalculation.total_amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <Button 
                            size="lg" 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            disabled={!canSubmit}
                            asChild
                        >
                            <Link
                                href={!canSubmit ? '#' : `/properties/${property.slug}/book?check_in=${checkInDate}&check_out=${checkOutDate}&guests=${guestCount}`}
                            >
                                {isCalculatingRate ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        {t('properties.calculating')}
                                    </>
                                ) : canSubmit ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        {t('properties.book_now')}
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="h-4 w-4 mr-2" />
                                        {t('properties.select_dates_to_book')}
                                    </>
                                )}
                            </Link>
                        </Button>
                    </div>

                    {/* Additional Info */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            <strong>{t('properties.free_cancellation')}</strong> {t('properties.free_cancellation_desc')}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Quick Contact */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('properties.need_help')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">
                        {t('properties.contact_support_desc')}
                    </p>
                    <Button variant="outline" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('properties.contact_support')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
} 