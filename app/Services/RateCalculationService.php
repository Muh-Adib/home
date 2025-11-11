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
        
        // Debug: Log seasonal rates found
        if (!empty($seasonalRates)) {
            Log::debug('Seasonal rates found for property', [
                'property_id' => $property->id,
                'check_in' => $checkInDate->format('Y-m-d'),
                'check_out' => $checkOutDate->format('Y-m-d'),
                'rates' => array_map(function($rate) {
                    return $rate ? [
                        'name' => $rate->name,
                        'type' => $rate->rate_type,
                        'value' => $rate->rate_value,
                        'start_date' => $rate->start_date->format('Y-m-d'),
                        'end_date' => $rate->end_date->format('Y-m-d'),
                    ] : null;
                }, $seasonalRates)
            ]);
        }
        
        // Initialize calculation variables
        $totalBaseAmount = 0;
        $totalWeekendPremium = 0;
        $totalSeasonalPremium = 0;
        $weekendNights = 0;
        $weekdayNights = 0;
        $seasonalNights = 0;
        $dailyBreakdown = [];
        $appliedSeasonalRates = [];
        $extraBedAmount = 0;
        $extraBeds = $guestCount ? max(0, $guestCount - $property->capacity) : 0;
        
        // Calculate night-by-night for dynamic pricing
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            $dayRate = $property->base_rate;
            $dateString = $date->format('Y-m-d');
            $seasonalRate = $seasonalRates[$dateString] ?? null;
            $appliedPremiums = [];
            
            // Apply seasonal rate FIRST if exists (seasonal rate takes priority over weekend premium)
            // Jika ada seasonal rate, hanya gunakan seasonal rate tanpa weekend premium
            $seasonalPremiumAmount = 0;
            $isWeekend = $date->isFriday() || $date->isSaturday() || $date->isSunday();
            $weekendPremiumAmount = 0;
            
            // Priority: Seasonal > Weekend > Base Rate
            if ($seasonalRate) {
                // Seasonal rate diterapkan langsung ke base_rate (tanpa weekend premium)
                $originalRate = $property->base_rate;
                $dayRate = $seasonalRate->calculateRate($originalRate);
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
                
                // Count night type (seasonal rate days are counted separately)
                if ($isWeekend) {
                    $weekendNights++;
                } else {
                    $weekdayNights++;
                }
            } else {
                // Apply weekend premium ONLY if no seasonal rate exists
                // Weekend: Jumat, Sabtu, Minggu
                if ($isWeekend) {
                    $weekendNights++;
                    
                    // Calculate weekend premium based on type (percentage or fixed)
                    if ($property->weekend_premium_type === 'fixed' && $property->weekend_premium_fixed) {
                        // Fixed price weekend premium
                        $weekendPremiumAmount = $property->weekend_premium_fixed;
                        $description = 'Rp ' . number_format($weekendPremiumAmount, 0, ',', '.');
                    } else {
                        // Percentage based weekend premium (default)
                        $weekendPremiumAmount = $property->base_rate * ($property->weekend_premium_percent / 100);
                        $description = "+{$property->weekend_premium_percent}%";
                    }
                    
                    $totalWeekendPremium += $weekendPremiumAmount;
                    $dayRate += $weekendPremiumAmount;
                    
                    $appliedPremiums[] = [
                        'type' => 'weekend',
                        'name' => 'Weekend Premium',
                        'description' => $description,
                        'amount' => $weekendPremiumAmount
                    ];
                } else {
                    $weekdayNights++;
                }
            }
            
            // Long weekend premium (national holidays) - only if no seasonal rate
            // Holiday premium tidak diterapkan jika sudah ada seasonal rate
            $holidayPremiumAmount = 0;
            if (!$seasonalRate && $this->isLongWeekend($date)) {
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
            
            // Calculate extra bed rate for this day
            // Jika ada seasonal rate dengan extra_bed_rate, gunakan itu
            // Jika tidak, gunakan property->extra_bed_rate
            $effectiveExtraBedRate = $property->extra_bed_rate;
            if ($seasonalRate && $seasonalRate->extra_bed_rate !== null) {
                $effectiveExtraBedRate = $seasonalRate->extra_bed_rate;
            }
            
            // Add extra bed amount for this day
            $extraBedAmount += $extraBeds * $effectiveExtraBedRate;
            
            $dailyBreakdown[$dateString] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->format('l'),
                'base_rate' => $property->base_rate,
                'final_rate' => $dayRate,
                'premiums' => $appliedPremiums,
                'seasonal_rate' => $seasonalRate ? [
                    'name' => $seasonalRate->name,
                    'type' => $seasonalRate->rate_type,
                    'value' => $seasonalRate->rate_value,
                    'extra_bed_rate' => $seasonalRate->extra_bed_rate,
                    'min_stay_nights' => $seasonalRate->min_stay_nights
                ] : null,
                'extra_bed_rate' => $effectiveExtraBedRate,
            ];
        }
        
        // Apply minimum stay discount
        $minimumStayDiscount = 0;
        if ($nights >= 7) {
            $minimumStayDiscount = $totalBaseAmount * 0; // 10% discount for weekly stays
        } elseif ($nights >= 3) {
            $minimumStayDiscount = $totalBaseAmount * 0; // 5% discount for 3+ nights
        }
        
        $subtotal = $totalBaseAmount + $extraBedAmount + $property->cleaning_fee - $minimumStayDiscount;
        
        // Tax calculation (0% - tax removed)
        $taxAmount = 0;
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
     * Calculate rate with formatted response for API (Frontend compatible)
     */
    public function calculateRateFormatted(Property $property, string $checkIn, string $checkOut, int $guestCount): array
    {
        try {
            $calculation = $this->calculateRate($property, $checkIn, $checkOut, $guestCount);
            $calculationArray = $calculation->toArray();
            
            return [
                'success' => true,
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
                'guest_count' => $guestCount,
                'calculation' => [
                    'nights' => $calculation->nights,
                    'weekday_nights' => $calculationArray['breakdown']['weekday_nights'] ?? 0,
                    'weekend_nights' => $calculationArray['breakdown']['weekend_nights'] ?? 0,
                    'seasonal_nights' => $calculationArray['breakdown']['seasonal_nights'] ?? 0,
                    'base_amount' => $calculation->baseAmount,
                    'total_base_amount' => $calculationArray['breakdown']['total_base_amount'] ?? $calculation->baseAmount,
                    'weekend_premium' => $calculation->weekendPremium,
                    'seasonal_premium' => $calculation->seasonalPremium,
                    'extra_bed_amount' => $calculation->extraBedAmount,
                    'cleaning_fee' => $calculation->cleaningFee,
                    'minimum_stay_discount' => $calculationArray['breakdown']['minimum_stay_discount'] ?? 0,
                    'subtotal' => $calculationArray['breakdown']['subtotal'] ?? 0,
                    'tax_amount' => $calculation->taxAmount,
                    'total_amount' => $calculation->totalAmount,
                    'extra_beds' => $calculation->extraBeds,
                    'rate_breakdown' => [
                        'base_rate_per_night' => $property->base_rate,
                        'weekend_premium_percent' => $property->weekend_premium_percent ?? 0,
                        'peak_season_applied' => $calculation->seasonalPremium > 0,
                        'long_weekend_applied' => false, // TODO: implement proper logic
                        'seasonal_rates_applied' => $calculation->seasonalRatesApplied,
                    ],
                    'daily_breakdown' => $calculationArray['breakdown']['daily_breakdown'] ?? [],
                    'summary' => $calculationArray['breakdown']['summary'] ?? [
                        'average_nightly_rate' => $calculation->totalAmount / $calculation->nights,
                        'total_nights' => $calculation->nights,
                        'base_nights_rate' => $calculation->baseAmount,
                        'total_premiums' => $calculation->weekendPremium + $calculation->seasonalPremium,
                        'effective_discount' => $calculationArray['breakdown']['minimum_stay_discount'] ?? 0,
                        'taxes_and_fees' => $calculation->taxAmount + $calculation->cleaningFee,
                    ],
                ],
                'formatted' => [
                    'base_amount' => 'Rp ' . number_format($calculation->baseAmount, 0, ',', '.'),
                    'weekend_premium' => 'Rp ' . number_format($calculation->weekendPremium, 0, ',', '.'),
                    'seasonal_premium' => 'Rp ' . number_format($calculation->seasonalPremium, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp ' . number_format($calculation->extraBedAmount, 0, ',', '.'),
                    'cleaning_fee' => 'Rp ' . number_format($calculation->cleaningFee, 0, ',', '.'),
                    'total_amount' => 'Rp ' . number_format($calculation->totalAmount, 0, ',', '.'),
                    'per_night' => 'Rp ' . number_format($calculation->totalAmount / $calculation->nights, 0, ',', '.'),
                ],
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
                'error' => $e->getMessage(),
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
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
        
        // Check if any weekend days fall in the period (Jumat, Sabtu, Minggu)
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            if ($date->isFriday() || $date->isSaturday() || $date->isSunday()) {
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