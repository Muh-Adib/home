import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AvailabilityData {
    success: boolean;
    property_id: number;
    property_slug: string;
    date_range: {
        start: string;
        end: string;
    };
    guest_count: number;
    booked_dates: string[];
    booked_periods: string[][];
    rates: Record<string, {
        base_rate: number;
        weekend_premium: boolean;
        seasonal_premium: boolean;
        is_weekend: boolean;
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

interface DateRange {
    from: Date | undefined;
    to: Date | undefined;
}

interface UsePropertyAvailabilityOptions {
    monthsToFetch?: number;
    guestCount?: number;
    enabled?: boolean;
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
    formatted: {
        total_amount: string;
        per_night: string;
    };
}

export function usePropertyAvailability(
    propertySlug: string,
    options: UsePropertyAvailabilityOptions = {}
) {
    const {
        monthsToFetch = 3,
        guestCount = 2,
        enabled = true
    } = options;

    const [selectedRange, setSelectedRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [currentRateCalculation, setCurrentRateCalculation] = useState<RateCalculation | null>(null);

    // Calculate date range for fetching
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsToFetch);

    // Fetch availability and rates data
    const {
        data: availabilityData,
        isLoading,
        error,
        refetch
    } = useQuery<AvailabilityData>({
        queryKey: ['property-availability', propertySlug, guestCount, monthsToFetch],
        queryFn: async () => {
            const params = new URLSearchParams({
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                guest_count: guestCount.toString()
            });

            const response = await fetch(`/api/properties/${propertySlug}/availability-and-rates?${params}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return response.json();
        },
        enabled: enabled && !!propertySlug,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
    });

    // Calculate rate for selected date range
    const calculateRateForRange = useCallback((from: Date, to: Date) => {
        if (!availabilityData?.rates || !availabilityData?.property_info) {
            return null;
        }

        const checkIn = from.toISOString().split('T')[0];
        const checkOut = to.toISOString().split('T')[0];
        
        // Check if any dates in range are booked
        const dateRange: string[] = [];
        const current = new Date(from);
        while (current < to) {
            dateRange.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        const hasBookedDates = dateRange.some(date => 
            availabilityData.booked_dates.includes(date)
        );

        if (hasBookedDates) {
            throw new Error('Property is not available for selected dates');
        }

        // Calculate total based on daily rates
        const nights = dateRange.length;
        let baseAmount = 0;
        let weekendPremium = 0;
        let seasonalPremium = 0;

        dateRange.forEach(date => {
            const dailyRate = availabilityData.rates[date];
            if (dailyRate) {
                baseAmount += dailyRate.base_rate;
                if (dailyRate.weekend_premium) {
                    weekendPremium += dailyRate.base_rate * (availabilityData.property_info.weekend_premium_percent / 100);
                }
                if (dailyRate.seasonal_premium) {
                    seasonalPremium += dailyRate.base_rate * 0.2; // Estimate, should come from seasonal rates
                }
            }
        });

        // Calculate extra beds
        const extraBeds = Math.max(0, guestCount - availabilityData.property_info.capacity);
        const extraBedAmount = extraBeds * availabilityData.property_info.extra_bed_rate * nights;

        // Calculate cleaning fee
        const cleaningFee = availabilityData.property_info.cleaning_fee;

        // Calculate subtotal
        const subtotal = baseAmount + weekendPremium + seasonalPremium + extraBedAmount + cleaningFee;

        // Calculate tax (11%)
        const taxAmount = subtotal * 0.11;

        // Calculate total
        const totalAmount = subtotal + taxAmount;

        const calculation: RateCalculation = {
            nights,
            base_amount: baseAmount,
            weekend_premium: weekendPremium,
            seasonal_premium: seasonalPremium,
            extra_bed_amount: extraBedAmount,
            cleaning_fee: cleaningFee,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            formatted: {
                total_amount: 'Rp ' + totalAmount.toLocaleString(),
                per_night: 'Rp ' + Math.round(totalAmount / nights).toLocaleString()
            }
        };

        return calculation;
    }, [availabilityData, guestCount]);

    // Update rate calculation when range changes
    useEffect(() => {
        if (selectedRange.from && selectedRange.to) {
            try {
                const calculation = calculateRateForRange(selectedRange.from, selectedRange.to);
                setCurrentRateCalculation(calculation);
            } catch (error) {
                console.warn('Rate calculation failed:', error);
                setCurrentRateCalculation(null);
            }
        } else {
            setCurrentRateCalculation(null);
        }
    }, [selectedRange, calculateRateForRange]);

    // Helper functions
    const isDateBooked = useCallback((date: Date) => {
        if (!availabilityData?.booked_dates) return false;
        const dateStr = date.toISOString().split('T')[0];
        return availabilityData.booked_dates.includes(dateStr);
    }, [availabilityData]);

    const isDateInBookedPeriod = useCallback((date: Date) => {
        if (!availabilityData?.booked_periods) return false;
        const dateStr = date.toISOString().split('T')[0];
        
        return availabilityData.booked_periods.some(([start, end]) => {
            return dateStr >= start && dateStr < end;
        });
    }, [availabilityData]);

    const getDailyRate = useCallback((date: Date) => {
        if (!availabilityData?.rates) return null;
        const dateStr = date.toISOString().split('T')[0];
        return availabilityData.rates[dateStr] || null;
    }, [availabilityData]);

    const getNextAvailableDate = useCallback(() => {
        if (!availabilityData?.rates) return null;
        
        const today = new Date();
        const availableDates = Object.keys(availabilityData.rates)
            .filter(date => date >= today.toISOString().split('T')[0])
            .sort();
        
        return availableDates[0] ? new Date(availableDates[0]) : null;
    }, [availabilityData]);

    return {
        // Data
        availabilityData,
        selectedRange,
        currentRateCalculation,
        
        // Loading states
        isLoading,
        error: error as Error | null,
        
        // Actions
        setSelectedRange,
        refetch,
        
        // Helper functions
        isDateBooked,
        isDateInBookedPeriod,
        getDailyRate,
        getNextAvailableDate,
        calculateRateForRange,
        
        // Computed values
        isRangeValid: !!(selectedRange.from && selectedRange.to && currentRateCalculation),
        bookedDates: availabilityData?.booked_dates || [],
        bookedPeriods: availabilityData?.booked_periods || [],
    };
} 