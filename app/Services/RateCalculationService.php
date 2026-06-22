<?php

namespace App\Services;

use App\Domain\Booking\ValueObjects\RateCalculation;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RateCalculationService
{
    /**
     * ✅ SINGLE SOURCE OF TRUTH: Calculate extra bed count
     *
     * @param  int  $guestCount  Number of guests
     * @param  int  $propertyCapacity  Property base capacity
     * @return int Number of extra beds needed
     */
    public static function calculateExtraBedCount(int $guestCount, int $propertyCapacity): int
    {
        return max(0, $guestCount - $propertyCapacity);
    }

    /**
     * ✅ SINGLE SOURCE OF TRUTH: Calculate total extra bed amount
     *
     * @param  int  $guestCount  Number of guests
     * @param  int  $propertyCapacity  Property base capacity
     * @param  int  $extraBedRate  Rate per extra bed
     * @return int Total extra bed cost
     */
    public static function calculateExtraBedAmount(int $guestCount, int $propertyCapacity, int $extraBedRate): int
    {
        $extraBedCount = self::calculateExtraBedCount($guestCount, $propertyCapacity);

        return $extraBedCount * $extraBedRate;
    }

    /**
     * ✅ SINGLE SOURCE OF TRUTH: Calculate effective extra bed rate
     * Considers seasonal rate if available, otherwise uses property base rate
     *
     * @param  Property  $property  Property model
     * @param  PropertySeasonalRate|null  $seasonalRate  Seasonal rate (if applicable)
     * @return int Effective extra bed rate to use
     */
    public static function calculateEffectiveExtraBedRate(Property $property, ?PropertySeasonalRate $seasonalRate = null): int
    {
        // If seasonal rate exists and has custom extra_bed_rate, use it
        if ($seasonalRate && $seasonalRate->extra_bed_rate !== null) {
            return (int) $seasonalRate->extra_bed_rate;
        }

        // Otherwise use property's base extra_bed_rate
        return (int) ($property->extra_bed_rate ?? 0);
    }

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

        // Initialize calculation variables (Integers)
        $totalBaseAmount = 0;
        $totalWeekendPremium = 0;
        $totalSeasonalPremium = 0;
        $weekendNights = 0;
        $weekdayNights = 0;
        $seasonalNights = 0;
        $dailyBreakdown = [];
        $appliedSeasonalRates = [];
        $extraBedAmount = 0;
        $extraBeds = self::calculateExtraBedCount($guestCount, (int) $property->capacity);

        // Calculate night-by-night for dynamic pricing
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            $baseRate = (int) $property->base_rate;
            $dayRate = $baseRate;
            $dateString = $date->format('Y-m-d');
            $seasonalRate = $seasonalRates[$dateString] ?? null;
            $appliedPremiums = [];

            // Jika ada seasonal rate, hanya gunakan seasonal rate tanpa weekend premium
            $seasonalPremiumAmount = 0;
            $isWeekend = $date->isFriday() || $date->isSaturday() || $date->isSunday();
            $weekendPremiumAmount = 0;

            // Priority: Seasonal > Weekend > Base Rate
            if ($seasonalRate) {
                // Seasonal rate diterapkan langsung ke base_rate (tanpa weekend premium)
                // Assuming calculateRate returns float, cast to int
                $dayRate = (int) $seasonalRate->calculateRate($baseRate);
                $seasonalPremiumAmount = $dayRate - $baseRate;
                $totalSeasonalPremium += $seasonalPremiumAmount;
                $seasonalNights++;

                $appliedPremiums[] = [
                    'type' => 'seasonal',
                    'name' => $seasonalRate->name,
                    'description' => $seasonalRate->getFormattedRateDescription(),
                    'amount' => $seasonalPremiumAmount,
                    'min_stay_nights' => $seasonalRate->min_stay_nights,
                ];

                // Track unique seasonal rates applied
                if (! in_array($seasonalRate->name, array_column($appliedSeasonalRates, 'name'))) {
                    $appliedSeasonalRates[] = [
                        'name' => $seasonalRate->name,
                        'description' => $seasonalRate->getFormattedRateDescription(),
                        'dates' => [$dateString],
                        'min_stay_nights' => $seasonalRate->min_stay_nights,
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
                        $weekendPremiumAmount = (int) $property->weekend_premium_fixed;
                        $description = 'Rp '.number_format($weekendPremiumAmount, 0, ',', '.');
                    } else {
                        // Percentage based weekend premium (default)
                        $weekendPremiumAmount = (int) round($baseRate * ($property->weekend_premium_percent / 100));
                        $description = "+{$property->weekend_premium_percent}%";
                    }

                    $totalWeekendPremium += $weekendPremiumAmount;
                    $dayRate += $weekendPremiumAmount;

                    $appliedPremiums[] = [
                        'type' => 'weekend',
                        'name' => 'Weekend Premium',
                        'description' => $description,
                        'amount' => $weekendPremiumAmount,
                    ];
                } else {
                    $weekdayNights++;
                }
            }

            // Long weekend premium (national holidays) - only if no seasonal rate
            // Holiday premium tidak diterapkan jika sudah ada seasonal rate
            $holidayPremiumAmount = 0;
            if (! $seasonalRate && PropertyBusinessRulesService::isLongWeekend($date)) {
                $holidayPremiumAmount = (int) round($baseRate * 0.15); // 15% holiday premium
                $dayRate += $holidayPremiumAmount;

                $appliedPremiums[] = [
                    'type' => 'holiday',
                    'name' => 'Holiday Premium',
                    'description' => '+15%',
                    'amount' => $holidayPremiumAmount,
                ];
            }

            $totalBaseAmount += $dayRate;

            // Calculate extra bed rate for this day using single source of truth
            $effectiveExtraBedRate = self::calculateEffectiveExtraBedRate($property, $seasonalRate);

            // Add extra bed amount for this day
            $extraBedAmount += $extraBeds * $effectiveExtraBedRate;

            $dailyBreakdown[$dateString] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->format('l'),
                'base_rate' => $baseRate,
                'final_rate' => $dayRate,
                'premiums' => $appliedPremiums,
                'seasonal_rate' => $seasonalRate ? [
                    'name' => $seasonalRate->name,
                    'type' => $seasonalRate->rate_type,
                    'value' => $seasonalRate->rate_value,
                    'extra_bed_rate' => $seasonalRate->extra_bed_rate,
                    'min_stay_nights' => $seasonalRate->min_stay_nights,
                ] : null,
                'extra_bed_rate' => $effectiveExtraBedRate,
            ];
        }

        $cleaningFee = 0;
        $subtotal = $totalBaseAmount + $extraBedAmount + $cleaningFee;

        // Tax calculation (0% - tax removed)
        $taxAmount = 0;
        $totalAmount = $subtotal + $taxAmount;

        return new RateCalculation(
            nights: $nights,
            baseAmount: (int) ($property->base_rate * $nights), // Base without premiums
            weekendPremium: $totalWeekendPremium,
            seasonalPremium: $totalSeasonalPremium,
            extraBedAmount: $extraBedAmount,
            cleaningFee: $cleaningFee,
            taxAmount: $taxAmount,
            totalAmount: $totalAmount,
            extraBeds: $extraBeds,
            breakdown: [
                'weekday_nights' => $weekdayNights,
                'weekend_nights' => $weekendNights,
                'seasonal_nights' => $seasonalNights,
                'total_base_amount' => $totalBaseAmount, // Sum of daily rates
                'subtotal' => $subtotal,
                'rate_breakdown' => [
                    'base_rate_per_night' => (int) $property->base_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                    'peak_season_applied' => PropertyBusinessRulesService::hasPeakSeasonDates($checkInDate, $checkOutDate),
                    'long_weekend_applied' => PropertyBusinessRulesService::hasLongWeekend($checkInDate, $checkOutDate),
                    'seasonal_rates_applied' => $appliedSeasonalRates,
                ],
                'daily_breakdown' => $dailyBreakdown,
                'summary' => [
                    'average_nightly_rate' => $nights > 0 ? (int) ($totalBaseAmount / $nights) : 0,
                    'total_nights' => $nights,
                    'base_nights_rate' => (int) ($property->base_rate * $nights),
                    'total_premiums' => $totalWeekendPremium + $totalSeasonalPremium,
                    'taxes_and_fees' => $taxAmount + $cleaningFee + $extraBedAmount,
                ],
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
                        'taxes_and_fees' => $calculation->taxAmount + $calculation->cleaningFee,
                    ],
                ],
                'formatted' => [
                    'base_amount' => 'Rp '.number_format($calculation->baseAmount, 0, ',', '.'),
                    'weekend_premium' => 'Rp '.number_format($calculation->weekendPremium, 0, ',', '.'),
                    'seasonal_premium' => 'Rp '.number_format($calculation->seasonalPremium, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp '.number_format($calculation->extraBedAmount, 0, ',', '.'),
                    'cleaning_fee' => 'Rp '.number_format($calculation->cleaningFee, 0, ',', '.'),
                    'total_amount' => 'Rp '.number_format($calculation->totalAmount, 0, ',', '.'),
                    'per_night' => 'Rp '.number_format($calculation->totalAmount / $calculation->nights, 0, ',', '.'),
                ],
            ];
        } catch (\Throwable $e) {
            Log::error('Rate calculation failed', [
                'property_id' => $property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_count' => $guestCount,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => $e->getMessage(),
                'error_type' => 'calculation',
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
                'guest_count' => $guestCount,
            ];
        }
    }

    // Removed duplicate methods - now using PropertyBusinessRulesService
    // - isLongWeekend() -> PropertyBusinessRulesService::isLongWeekend()
    // - hasPeakSeasonDates() -> PropertyBusinessRulesService::hasPeakSeasonDates()
    // - hasLongWeekend() -> PropertyBusinessRulesService::hasLongWeekend()
    // - getMinimumStayInfo() -> PropertyBusinessRulesService::getMinimumStayInfo() deprecated
    // - getMinimumStayDiscount() -> PropertyBusinessRulesService::getMinimumStayDiscount() deprecated
}
