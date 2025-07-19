<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Domain\Booking\ValueObjects\RateCalculation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RateCalculationService
{
    /**
     * Calculate rate for property and dates - now the single source of truth
     */
    public function calculateRate(Property $property, string $checkIn, string $checkOut, int $guestCount): RateCalculation
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);
        $nights = $checkInDate->diffInDays($checkOutDate);
        
        if ($nights <= 0) {
            throw new \InvalidArgumentException('Check-out must be after check-in date');
        }
        
        // Get seasonal rates for this period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $property->id, 
            $checkInDate, 
            $checkOutDate
        );
        
        // Initialize calculation variables
        $totalBaseAmount = 0;
        $totalWeekendPremium = 0;
        $totalSeasonalPremium = 0;
        $weekendNights = 0;
        $weekdayNights = 0;
        $seasonalNights = 0;
        $dailyBreakdown = [];
        $appliedSeasonalRates = [];
        
        // Calculate night-by-night for dynamic pricing
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            $dayRate = $property->base_rate;
            $dateString = $date->format('Y-m-d');
            $seasonalRate = $seasonalRates[$dateString] ?? null;
            $appliedPremiums = [];
            
            // Apply seasonal rate if exists
            $seasonalPremiumAmount = 0;
            if ($seasonalRate) {
                $originalRate = $dayRate;
                $dayRate = $seasonalRate->calculateRate($dayRate);
                $seasonalPremiumAmount = $dayRate - $originalRate;
                $totalSeasonalPremium += $seasonalPremiumAmount;
                $seasonalNights++;
                
                $appliedPremiums[] = [
                    'type' => 'seasonal',
                    'name' => $seasonalRate->name,
                    'description' => $seasonalRate->getFormattedRateDescription(),
                    'amount' => $seasonalPremiumAmount,
                    'min_stay_nights' => $seasonalRate->min_stay_nights 
                ];
                
                // Track unique seasonal rates applied
                if (!in_array($seasonalRate->name, array_column($appliedSeasonalRates, 'name'))) {
                    $appliedSeasonalRates[] = [
                        'name' => $seasonalRate->name,
                        'description' => $seasonalRate->getFormattedRateDescription(),
                        'dates' => [$dateString],
                        'min_stay_nights' => $seasonalRate->min_stay_nights 
                    ];
                } else {
                    // Add date to existing seasonal rate
                    $key = array_search($seasonalRate->name, array_column($appliedSeasonalRates, 'name'));
                    $appliedSeasonalRates[$key]['dates'][] = $dateString;
                }
            }
            
            // Weekend premium (Friday, Saturday) - only if no seasonal rate or if seasonal rate allows
            $weekendPremiumAmount = 0;
            if (($date->isFriday() || $date->isSaturday()) && 
                (!$seasonalRate || !$seasonalRate->applies_to_weekends_only)) {
                $weekendNights++;
                $weekendPremiumAmount = $property->base_rate * ($property->weekend_premium_percent / 100);
                $totalWeekendPremium += $weekendPremiumAmount;
                $dayRate += $weekendPremiumAmount;
                
                $appliedPremiums[] = [
                    'type' => 'weekend',
                    'name' => 'Weekend Premium',
                    'description' => "+{$property->weekend_premium_percent}%",
                    'amount' => $weekendPremiumAmount
                ];
            } else if (!($date->isFriday() || $date->isSaturday())) {
                $weekdayNights++;
            }
            
            // Long weekend premium (national holidays) - stacks with others
            $holidayPremiumAmount = 0;
            if ($this->isLongWeekend($date)) {
                $holidayPremiumAmount = $property->base_rate * 0.15; // 15% holiday premium
                $dayRate += $holidayPremiumAmount;
                
                $appliedPremiums[] = [
                    'type' => 'holiday',
                    'name' => 'Holiday Premium',
                    'description' => '+15%',
                    'amount' => $holidayPremiumAmount
                ];
            }
            
            $totalBaseAmount += $dayRate;
            
            $dailyBreakdown[$dateString] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->format('l'),
                'base_rate' => $property->base_rate,
                'final_rate' => $dayRate,
                'premiums' => $appliedPremiums,
                'seasonal_rate' => $seasonalRate ? [
                    'name' => $seasonalRate->name,
                    'type' => $seasonalRate->rate_type,
                    'value' => $seasonalRate->rate_value
                ] : null
            ];
        }
        
        // Extra bed calculation
        $extraBeds = $guestCount ? max(0, $guestCount - $property->capacity) : 0;
        $extraBedAmount = $extraBeds * $property->extra_bed_rate * $nights;
        
        // Apply minimum stay discount
        $minimumStayDiscount = 0;
        if ($nights >= 7) {
            $minimumStayDiscount = $totalBaseAmount * 0.1; // 10% discount for weekly stays
        } elseif ($nights >= 3) {
            $minimumStayDiscount = $totalBaseAmount * 0.05; // 5% discount for 3+ nights
        }
        
        $subtotal = $totalBaseAmount + $extraBedAmount + $property->cleaning_fee - $minimumStayDiscount;
        
        // Tax calculation (11% VAT)
        $taxAmount = $subtotal * 0.11;
        $totalAmount = $subtotal + $taxAmount;
        
        // Get minimum stay information
        $minimumStayInfo = $this->getMinimumStayInfo($property, $checkIn, $checkOut);
        
        return new RateCalculation(
            nights: $nights,
            baseAmount: $property->base_rate * $nights,
            weekendPremium: $totalWeekendPremium,
            seasonalPremium: $totalSeasonalPremium,
            extraBedAmount: $extraBedAmount,
            cleaningFee: $property->cleaning_fee,
            taxAmount: $taxAmount,
            totalAmount: $totalAmount,
            extraBeds: $extraBeds,
            breakdown: [
                'weekday_nights' => $weekdayNights,
                'weekend_nights' => $weekendNights,
                'seasonal_nights' => $seasonalNights,
                'total_base_amount' => $totalBaseAmount,
                'minimum_stay_discount' => $minimumStayDiscount,
                'subtotal' => $subtotal,
                'rate_breakdown' => [
                    'base_rate_per_night' => $property->base_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                    'peak_season_applied' => $this->hasPeakSeasonDates($checkInDate, $checkOutDate),
                    'long_weekend_applied' => $this->hasLongWeekend($checkInDate, $checkOutDate),
                    'seasonal_rates_applied' => $appliedSeasonalRates,
                ],
                'daily_breakdown' => $dailyBreakdown,
                'summary' => [
                    'average_nightly_rate' => $nights > 0 ? $totalBaseAmount / $nights : 0,
                    'total_nights' => $nights,
                    'base_nights_rate' => $property->base_rate * $nights,
                    'total_premiums' => $totalWeekendPremium + $totalSeasonalPremium,
                    'effective_discount' => $minimumStayDiscount,
                    'taxes_and_fees' => $taxAmount + $property->cleaning_fee + $extraBedAmount,
                ]
            ],
            seasonalRatesApplied: $appliedSeasonalRates
        );
    }

    /**
     * Calculate rate with formatted response for API
     */
    public function calculateRateFormatted(Property $property, string $checkIn, string $checkOut, int $guestCount): array
    {
        try {
            $calculation = $this->calculateRate($property, $checkIn, $checkOut, $guestCount);
            
            return [
                'success' => true,
                'rates' => $calculation->toArray(),
                'property_id' => $property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_count' => $guestCount,
            ];
        } catch (\Exception $e) {
            Log::error('Rate calculation failed', [
                'property_id' => $property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_count' => $guestCount,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error_type' => 'calculation',
                'message' => $e->getMessage(),
                'property_id' => $property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_count' => $guestCount,
            ];
        }
    }

    /**
     * Check if date is a long weekend (Indonesian national holidays)
     */
    private function isLongWeekend(Carbon $date): bool
    {
        // Common Indonesian long weekends (simplified)
        $longWeekends = [
            // New Year
            ['month' => 1, 'day' => 1],
            // Independence Day
            ['month' => 8, 'day' => 17],
            // Christmas
            ['month' => 12, 'day' => 25],
        ];
        
        foreach ($longWeekends as $holiday) {
            if ($date->month === $holiday['month'] && $date->day === $holiday['day']) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if date range has peak season dates
     */
    private function hasPeakSeasonDates(Carbon $checkIn, Carbon $checkOut): bool
    {
        for ($date = $checkIn->copy(); $date->lt($checkOut); $date->addDay()) {
            if (in_array($date->month, [12, 7, 8])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if date range has long weekend
     */
    private function hasLongWeekend(Carbon $checkIn, Carbon $checkOut): bool
    {
        for ($date = $checkIn->copy(); $date->lt($checkOut); $date->addDay()) {
            if ($this->isLongWeekend($date)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get minimum stay information for the property and dates
     */
    private function getMinimumStayInfo(Property $property, string $checkIn, string $checkOut): array
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);
        $nights = $checkInDate->diffInDays($checkOutDate);

        // Determine effective minimum stay based on period
        $effectiveMinStay = $property->min_stay_weekday; // Default to weekday
        
        // Check if any weekend days fall in the period
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            if ($date->isWeekend()) {
                $effectiveMinStay = max($effectiveMinStay, $property->min_stay_weekend);
            }
            
            // Check for peak season (simplified - you might want to expand this)
            if (in_array($date->month, [12, 7, 8])) {
                $effectiveMinStay = max($effectiveMinStay, $property->min_stay_peak);
            }
        }

        return [
            'required_nights' => $effectiveMinStay,
            'current_nights' => $nights,
            'meets_requirement' => $nights >= $effectiveMinStay,
            'weekday_min_stay' => $property->min_stay_weekday,
            'weekend_min_stay' => $property->min_stay_weekend,
            'peak_min_stay' => $property->min_stay_peak,
        ];
    }
} 