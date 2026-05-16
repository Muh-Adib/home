import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface RateCalculation {
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

export interface AvailabilityData {
    success: boolean;
    property_id: string;
    date_range: {
        start: string;
        end: string;
    };
    guest_count: number;
    booked_dates: string[];
    booked_periods: string[][];
    rates: Record<string, {
        base_rate: number;
        final_rate: number;
        weekend_premium_amount: number;
        seasonal_premium_amount: number;
        seasonal_rate_applied?: {
            name: string;
            rate_type: string;
            rate_value: number;
            description: string;
            min_stay_nights: number;
        }[];
        is_weekend: boolean;
        has_seasonal_rate: boolean;
        extra_bed_rate: number;
    }>;
    property_info: {
        base_rate: number;
        capacity: number;
        capacity_max: number;
        cleaning_fee: number;
        extra_bed_rate: number;
        weekend_premium_percent: number;
    };
}

interface UseRateCalculationProps {
    availabilityData: AvailabilityData | null;
    guestCount: number;
}

interface UseRateCalculationReturn {
    rateCalculation: RateCalculation | null;
    rateError: string | null;
    isCalculatingRate: boolean;
    calculateRate: (checkIn: string, checkOut: string) => Promise<RateCalculation | null>;
    hasSeasonalPremium: boolean;
    hasWeekendPremium: boolean;
    isRateReady: boolean;
}

export function useRateCalculation({
    availabilityData,
    guestCount
}: UseRateCalculationProps): UseRateCalculationReturn {
    const { t } = useTranslation();
    const [rateCalculation, setRateCalculation] = useState<RateCalculation | null>(null);
    const [rateError, setRateError] = useState<string | null>(null);
    const [isCalculatingRate, setIsCalculatingRate] = useState(false);

    // Generate date array between check-in and check-out
    const generateDateArray = useCallback((checkIn: string, checkOut: string): string[] => {
        const fromDate = new Date(checkIn);
        const toDate = new Date(checkOut);
        const dateArray: string[] = [];
        const current = new Date(fromDate);

        while (current < toDate) {
            dateArray.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        return dateArray;
    }, []);

    // Check if dates are available
    const checkAvailability = useCallback((dateArray: string[]): boolean => {
        const bookedDates = availabilityData?.booked_dates;
        if (!Array.isArray(bookedDates) || bookedDates.length === 0) return true;

        return !dateArray.some(date => bookedDates.includes(date));
    }, [availabilityData]);

    // Calculate daily rates
    // Calculate daily rates using actual amounts from server
    const calculateDailyRates = useCallback((dateArray: string[]) => {
        if (!availabilityData?.rates || !availabilityData?.property_info) {
            return { baseAmount: 0, weekendPremium: 0, seasonalPremium: 0 };
        }

        let baseAmount = 0;
        let weekendPremium = 0;
        let seasonalPremium = 0;

        dateArray.forEach(date => {
            const dailyRate = availabilityData.rates[date];
            if (!dailyRate) {
                console.warn(`⚠️ No rate data for ${date}`);
                return;
            }

            // Use actual amounts from server (no recalculation needed)
            const dailyBaseRate = Number(dailyRate.base_rate) || 0;
            const dailyWeekendPremium = Number(dailyRate.weekend_premium_amount) || 0;
            const dailySeasonalPremium = Number(dailyRate.seasonal_premium_amount) || 0;

            // Validate the numbers
            if (isNaN(dailyBaseRate)) {
                console.error(`❌ Invalid final rate for ${date}:`, dailyRate.final_rate);
                return;
            }

            baseAmount += dailyBaseRate;
            weekendPremium += dailyWeekendPremium;
            seasonalPremium += dailySeasonalPremium;

            // Log for debugging
            if (dailySeasonalPremium > 0) {
                console.log(`🎪 ${date}: Seasonal premium = ${dailySeasonalPremium.toLocaleString('id-ID')} ${dailyRate.seasonal_rate_applied ? `(${dailyRate.seasonal_rate_applied[0].name})` : ''}`);
            }

            if (dailyWeekendPremium > 0) {
                console.log(`🎯 ${date}: Weekend premium = ${dailyWeekendPremium.toLocaleString('id-ID')}`);
            }

            console.log(`📊 ${date}: final_rate=${dailyBaseRate.toLocaleString('id-ID')}, seasonal=${dailySeasonalPremium.toLocaleString('id-ID')}, weekend=${dailyWeekendPremium.toLocaleString('id-ID')}, running_total=${baseAmount.toLocaleString('id-ID')}`);
        });

        return { baseAmount, weekendPremium, seasonalPremium };
    }, [availabilityData]);

    // Calculate extra beds with seasonal rate support
    const calculateExtraBeds = useCallback((checkIn: string, checkOut: string) => {
        if (!availabilityData?.property_info) return { extraBeds: 0, extraBedAmount: 0 };

        const capacity = Number(availabilityData.property_info.capacity) || 0;
        const extraBeds = Math.max(0, guestCount - capacity);

        if (extraBeds === 0) {
            return { extraBeds: 0, extraBedAmount: 0 };
        }

        // Calculate extra bed amount using daily rates (supports seasonal extra bed rates)
        const dateArray = generateDateArray(checkIn, checkOut);
        let extraBedAmount = 0;

        dateArray.forEach(date => {
            const dailyRate = availabilityData.rates?.[date];
            if (dailyRate) {
                const dailyExtraBedRate = Number(dailyRate.extra_bed_rate) || Number(availabilityData.property_info.extra_bed_rate) || 0;
                extraBedAmount += extraBeds * dailyExtraBedRate;
            }
        });

        return { extraBeds, extraBedAmount };
    }, [availabilityData, guestCount, generateDateArray]);

    // Main rate calculation function
    const calculateRate = useCallback((checkIn: string, checkOut: string): RateCalculation | null => {
        // Validate inputs
        if (!checkIn || !checkOut) {
            console.warn('❌ Missing check-in or check-out dates');
            return null;
        }

        if (!availabilityData?.rates || !availabilityData?.property_info) {
            console.warn('❌ Missing availability data or property info');
            return null;
        }

        // Validate date format
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            console.error('❌ Invalid date format');
            throw new Error('Invalid date format');
        }

        if (checkInDate >= checkOutDate) {
            console.error('❌ Check-out date must be after check-in date');
            throw new Error('Check-out date must be after check-in date');
        }

        try {
            // Generate date array
            const dateArray = generateDateArray(checkIn, checkOut);
            console.log('📅 Date array:', dateArray);

            // Check availability
            if (!checkAvailability(dateArray)) {
                throw new Error(t('properties.property_not_available'));
            }

            // Calculate daily rates
            const { baseAmount, weekendPremium, seasonalPremium } = calculateDailyRates(dateArray);

            // Calculate nights and extra beds
            const nights = dateArray.length;
            const { extraBeds, extraBedAmount } = calculateExtraBeds(checkIn, checkOut);

            // Calculate cleaning fee
            const cleaningFee = Number(availabilityData.property_info.cleaning_fee) || 0;

            // Calculate subtotal and tax
            const subtotal = baseAmount + weekendPremium + seasonalPremium + extraBedAmount + cleaningFee;
            const taxAmount = 0; // Tax removed - set to 0
            const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

            // Sanity check for unreasonable amounts
            if (totalAmount > 100000000) {
                console.error('🚨 WARNING: Total amount seems unreasonably high!', {
                    totalAmount,
                    baseAmount,
                    nights,
                    guestCount,
                    capacity: availabilityData.property_info.capacity
                });
            }

            // Validate final calculation
            if (totalAmount <= 0) {
                console.error('❌ Invalid total amount calculated:', totalAmount);
                throw new Error('Invalid rate calculation');
            }

            console.log('💰 Detailed Calculation Breakdown:');
            console.log(`  🌙 Nights: ${nights}`);
            console.log(`  💵 Base Amount: Rp ${baseAmount.toLocaleString('id-ID')} (${baseAmount})`);
            console.log(`  🎯 Weekend Premium: Rp ${weekendPremium.toLocaleString('id-ID')} (${weekendPremium})`);
            console.log(`  🎪 Seasonal Premium: Rp ${seasonalPremium.toLocaleString('id-ID')} (${seasonalPremium})`);
            console.log(`  🛏️ Extra Bed Amount: Rp ${extraBedAmount.toLocaleString('id-ID')} (${extraBedAmount})`);
            console.log(`  🧹 Cleaning Fee: Rp ${cleaningFee.toLocaleString('id-ID')} (${cleaningFee})`);
            console.log(`  ➕ Subtotal: Rp ${subtotal.toLocaleString('id-ID')} (${subtotal})`);
            console.log(`  🏛️ Tax 0%: Rp ${taxAmount.toLocaleString('id-ID')} (${taxAmount})`);
            console.log(`  🎯 FINAL TOTAL: Rp ${totalAmount.toLocaleString('id-ID')} (${totalAmount})`);

            return {
                nights,
                base_amount: Math.round(baseAmount),
                weekend_premium: Math.round(weekendPremium),
                seasonal_premium: Math.round(seasonalPremium),
                extra_bed_amount: Math.round(extraBedAmount),
                cleaning_fee: Math.round(cleaningFee),
                tax_amount: Math.round(taxAmount),
                total_amount: Math.round(totalAmount),
                extra_beds: extraBeds,
                formatted: {
                    total_amount: 'Rp ' + Math.round(totalAmount).toLocaleString('id-ID'),
                    per_night: 'Rp ' + Math.round(totalAmount / nights).toLocaleString('id-ID')
                }
            };
        } catch (error) {
            console.error('❌ Rate calculation error:', error);
            throw error;
        }
    }, [availabilityData, guestCount, generateDateArray, checkAvailability, calculateDailyRates, calculateExtraBeds, t]);

    // Async rate calculation with loading state
    const calculateRateAsync = useCallback(async (checkIn: string, checkOut: string) => {
        setIsCalculatingRate(true);
        setRateError(null);

        try {
            // Use setTimeout to show loading state briefly
            await new Promise(resolve => setTimeout(resolve, 300));

            const calculation = calculateRate(checkIn, checkOut);
            setRateCalculation(calculation);
            console.log('✅ Rate calculated:', calculation?.formatted.total_amount);

            return calculation;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('properties.calculation_error');
            setRateCalculation(null);
            setRateError(errorMessage);
            console.warn('⚠️ Rate calculation failed:', error);
            throw error;
        } finally {
            setIsCalculatingRate(false);
        }
    }, [calculateRate, t]);

    // Computed values
    const hasSeasonalPremium = useMemo(() => (rateCalculation?.seasonal_premium || 0) > 0, [rateCalculation]);
    const hasWeekendPremium = useMemo(() => (rateCalculation?.weekend_premium || 0) > 0, [rateCalculation]);
    const isRateReady = useMemo(() => !!(rateCalculation && !rateError), [rateCalculation, rateError]);

    return {
        rateCalculation,
        rateError,
        isCalculatingRate,
        calculateRate: calculateRateAsync,
        hasSeasonalPremium,
        hasWeekendPremium,
        isRateReady
    };
} 