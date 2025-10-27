import React from 'react';
import { Link, router } from '@inertiajs/react';
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
import type { Property } from '@/types/property';

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
        <div className="space-y-4 sm:space-y-6">
            <Card className="md:sticky md:top-6 shadow-xl border-0 bg-gradient-to-br from-background to-muted/30 card-modern">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
                        <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        {t('properties.book_your_stay')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                    
                    {/* Date Range Picker */}
                    <div className="space-y-3">
                        <div id="date-range">
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
                                {/* Fake Discount Calculation */}
                                {/* Fake Discount Calculation */}
                                {(() => {
                                    const originalPrice = rateCalculation.total_amount;
                                    const inflatedPrice = Math.round(originalPrice * 1.17); // Naikkan 17%
                                    const discountAmount = inflatedPrice - originalPrice;
                                    const discountPercentage = Math.round((discountAmount / inflatedPrice) * 100);
                                    
                                    return (
                                        <>
                                            {/* Main Price Display with Fake Discount */}
                                            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border border-red-200 relative overflow-hidden">
                                                {/* Discount Badge */}
                                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full transform rotate-12 shadow-lg">
                                                    -{discountPercentage}%
                                                </div>
                                                
                                                {/* Original Price (Crossed Out) */}
                                                <div className="text-lg text-gray-500 line-through mb-1">
                                                    Rp {inflatedPrice.toLocaleString()}
                                                </div>
                                                
                                                {/* Discounted Price */}
                                                <div className="text-3xl font-bold text-red-600">
                                                    Rp {originalPrice.toLocaleString()}
                                                </div>
                                                
                                                {/* Savings Info */}
                                                <div className="text-sm text-green-600 font-semibold mt-1">
                                                    Hemat Rp {discountAmount.toLocaleString()}!
                                                </div>
                                                
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {t('properties.for')} {rateCalculation.nights} {t('booking.nights')} • Rp {Math.round(originalPrice / rateCalculation.nights).toLocaleString()}/{t('booking.night')}
                                                </div>
                                                
                                                {/* Limited Time Offer */}
                                                <div className="text-xs text-red-600 mt-2 font-semibold animate-pulse">
                                                    ⏰ Penawaran Terbatas! Berakhir dalam 23:59:45
                                                </div>
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
                                        </>
                                    );
                                })()}


                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <Button 
                            size="lg" 
                            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:opacity-50 shadow-lg"
                            disabled={!canSubmit}
                            onClick={() => {
                                if (canSubmit) {
                                    // Gunakan router.visit untuk navigasi GET dengan parameter query string
                                    router.visit(`/properties/${property.slug}/book?check_in=${checkInDate}&check_out=${checkOutDate}&guests=${guestCount}`, {
                                        method: 'get',
                                        preserveScroll: true,
                                        preserveState: false,
                                        onError: (errors) => {
                                            console.error('Terjadi kesalahan:', errors);
                                        },
                                        onSuccess: () => {
                                            console.log('Berhasil menuju halaman booking');
                                        }
                                    });
                                }
                            }}
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
                        </Button>
                    </div>

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