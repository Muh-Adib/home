<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertySeasonalRate;
use Carbon\Carbon;

/**
 * Property Business Rules Service
 *
 * ✅ SINGLE SOURCE OF TRUTH for property-related business rules:
 * - Peak season detection
 * - Long weekend/holiday detection
 * - Minimum stay calculations and validation
 *
 * All methods are static for easy access without instantiation
 */
class PropertyBusinessRulesService
{
    /**
     * Peak season months (July, August, December)
     */
    private const PEAK_SEASON_MONTHS = [7, 8, 12];

    /**
     * Indonesian national holidays for long weekend detection
     */
    private const INDONESIAN_HOLIDAYS = [
        ['month' => 1, 'day' => 1],   // New Year
        ['month' => 8, 'day' => 17],  // Independence Day
        ['month' => 12, 'day' => 25], // Christmas
    ];

    /**
     * ✅ SINGLE SOURCE: Check if specific date is a long weekend (Indonesian holiday)
     *
     * @param  Carbon|string  $date  Date to check
     * @return bool True if date is a long weekend
     */
    public static function isLongWeekend($date): bool
    {
        $carbonDate = $date instanceof Carbon ? $date : Carbon::parse($date);

        foreach (self::INDONESIAN_HOLIDAYS as $holiday) {
            if ($carbonDate->month === $holiday['month'] && $carbonDate->day === $holiday['day']) {
                return true;
            }
        }

        return false;
    }

    /**
     * ✅ SINGLE SOURCE: Check if date range includes any long weekend
     *
     * @param  Carbon|string  $checkIn  Check-in date
     * @param  Carbon|string  $checkOut  Check-out date
     * @return bool True if range includes long weekend
     */
    public static function hasLongWeekend($checkIn, $checkOut): bool
    {
        $checkInDate = $checkIn instanceof Carbon ? $checkIn->copy() : Carbon::parse($checkIn);
        $checkOutDate = $checkOut instanceof Carbon ? $checkOut->copy() : Carbon::parse($checkOut);

        for ($date = $checkInDate; $date->lt($checkOutDate); $date->addDay()) {
            if (self::isLongWeekend($date)) {
                return true;
            }
        }

        return false;
    }

    /**
     * ✅ SINGLE SOURCE: Check if date range includes peak season dates
     *
     * Peak season: July, August, December
     *
     * @param  Carbon|string  $checkIn  Check-in date
     * @param  Carbon|string  $checkOut  Check-out date
     * @return bool True if range includes peak season
     */
    public static function hasPeakSeasonDates($checkIn, $checkOut): bool
    {
        $checkInDate = $checkIn instanceof Carbon ? $checkIn->copy() : Carbon::parse($checkIn);
        $checkOutDate = $checkOut instanceof Carbon ? $checkOut->copy() : Carbon::parse($checkOut);

        for ($date = $checkInDate; $date->lt($checkOutDate); $date->addDay()) {
            if (in_array($date->month, self::PEAK_SEASON_MONTHS)) {
                return true;
            }
        }

        return false;
    }

    /**
     * ✅ SINGLE SOURCE: Get effective minimum stay for property and dates
     * Considers seasonal rates, weekend, and peak season
     *
     * @param  Property  $property  Property model
     * @param  string  $checkIn  Check-in date
     * @param  string  $checkOut  Check-out date
     * @return int Effective minimum stay in nights
     */
    public static function getEffectiveMinimumStay(Property $property, string $checkIn, string $checkOut): int
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);

        // Get seasonal rates for this period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $property->id,
            $checkInDate,
            $checkOutDate
        );

        // Get the highest minimum stay from seasonal rates
        $maxSeasonalMinStay = 0;
        if (! empty($seasonalRates)) {
            foreach ($seasonalRates as $date => $seasonalRate) {
                if ($seasonalRate && $seasonalRate->min_stay_nights > $maxSeasonalMinStay) {
                    $maxSeasonalMinStay = $seasonalRate->min_stay_nights;
                }
            }
        }

        // If seasonal rate has higher minimum stay, use it
        if ($maxSeasonalMinStay > 0) {
            return $maxSeasonalMinStay;
        }

        // Otherwise get default based on property settings
        return self::getDefaultMinimumStay($property, $checkInDate, $checkOutDate);
    }

    /**
     * Get default minimum stay based on property settings (weekend/peak)
     *
     * @param  Property  $property  Property model
     * @param  Carbon  $checkInDate  Check-in date
     * @param  Carbon  $checkOutDate  Check-out date
     * @return int Default minimum stay
     */
    private static function getDefaultMinimumStay(Property $property, Carbon $checkInDate, Carbon $checkOutDate): int
    {
        // Check if it includes weekend (Friday/Saturday)
        $includesWeekend = false;
        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            if ($date->isFriday() || $date->isSaturday()) {
                $includesWeekend = true;
                break;
            }
        }

        // Check if it includes peak season
        $includesPeakSeason = self::hasPeakSeasonDates($checkInDate, $checkOutDate);

        // Return appropriate minimum stay
        if ($includesPeakSeason) {
            return $property->min_stay_peak;
        } elseif ($includesWeekend) {
            return $property->min_stay_weekend;
        } else {
            return $property->min_stay_weekday;
        }
    }

    /**
     * ✅ SINGLE SOURCE: Get comprehensive minimum stay information
     *
     * @param  Property  $property  Property model
     * @param  string  $checkIn  Check-in date
     * @param  string  $checkOut  Check-out date
     * @return array Minimum stay information
     */
    public static function getMinimumStayInfo(Property $property, string $checkIn, string $checkOut): array
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);
        $nights = $checkInDate->diffInDays($checkOutDate);

        // Get seasonal rates for this period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $property->id,
            $checkInDate,
            $checkOutDate
        );

        $effectiveMinStay = self::getEffectiveMinimumStay($property, $checkIn, $checkOut);
        $meetsRequirement = $nights >= $effectiveMinStay;

        // Get seasonal rate info if applicable
        $seasonalRateInfo = null;
        if (! empty($seasonalRates)) {
            $appliedSeasonalRates = [];
            foreach ($seasonalRates as $date => $seasonalRate) {
                if ($seasonalRate && $seasonalRate->min_stay_nights > 0) {
                    $appliedSeasonalRates[] = [
                        'name' => $seasonalRate->name,
                        'min_stay' => $seasonalRate->min_stay_nights,
                        'date' => $date,
                    ];
                }
            }

            if (! empty($appliedSeasonalRates)) {
                $seasonalRateInfo = $appliedSeasonalRates;
            }
        }

        return [
            'required_nights' => $effectiveMinStay,
            'current_nights' => $nights,
            'meets_requirement' => $meetsRequirement,
            'has_seasonal_rate' => ! empty($seasonalRates),
            'seasonal_rate_info' => $seasonalRateInfo,
            'weekday_min_stay' => $property->min_stay_weekday,
            'weekend_min_stay' => $property->min_stay_weekend,
            'peak_min_stay' => $property->min_stay_peak,
            'effective_min_stay' => $effectiveMinStay,
            'default_min_stay' => [
                'weekday' => $property->min_stay_weekday,
                'weekend' => $property->min_stay_weekend,
                'peak' => $property->min_stay_peak,
            ],
        ];
    }

    /**
     * ✅ SINGLE SOURCE: Validate if booking meets minimum stay requirements
     *
     * @param  Property  $property  Property model
     * @param  string  $checkIn  Check-in date
     * @param  string  $checkOut  Check-out date
     * @return bool True if meets minimum stay requirement
     */
    public static function validateMinimumStay(Property $property, string $checkIn, string $checkOut): bool
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);
        $nights = $checkInDate->diffInDays($checkOutDate);

        $effectiveMinStay = self::getEffectiveMinimumStay($property, $checkIn, $checkOut);

        return $nights >= $effectiveMinStay;
    }
}
