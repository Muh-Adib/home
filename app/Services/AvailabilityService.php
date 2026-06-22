<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Property;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * AvailabilityService - Service untuk menangani logika availability saja
 *
 * REFACTORED:
 * 1. Menghilangkan logic rate calculation (dipindah ke RateCalculationService)
 * 2. Fokus hanya pada availability checking
 * 3. Tidak lagi bergantung pada Property model untuk rate calculation
 * 4. Clean separation of concerns
 */
class AvailabilityService
{
    private RateCalculationService $rateCalculationService;

    public function __construct(RateCalculationService $rateCalculationService)
    {
        $this->rateCalculationService = $rateCalculationService;
    }

    /**
     * Check if property is available for given date range
     *
     * @param  int|null  $guestCount  Total guests to check against capacity
     * @param  int|null  $excludeBookingId  Booking ID to exclude from check (for edit mode)
     * @param  bool  $ignoreOta  Ignore OTA bookings (for overriding)
     */
    public function checkAvailability(Property $property, string $checkIn, string $checkOut, ?int $guestCount = null, ?int $excludeBookingId = null, bool $ignoreOta = false): array
    {
        // 1. Capacity Check
        if ($guestCount !== null && $guestCount > $property->capacity_max) {
            return [
                'success' => false,
                'error_type' => 'capacity',
                'message' => "Jumlah tamu ({$guestCount}) melebihi kapasitas maksimum properti ({$property->capacity_max}).",
                'available' => false,
            ];
        }

        // 2. Date Availability Check
        $bookedDates = $this->getBookedDatesInRange($property, $checkIn, $checkOut, $excludeBookingId, $ignoreOta);
        $bookedPeriods = $this->getBookedPeriodsInRange($property, $checkIn, $checkOut, $excludeBookingId, $ignoreOta);

        return [
            'success' => true,
            'property_id' => $property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'available' => count($bookedDates) === 0,
            'error_type' => count($bookedDates) > 0 ? 'availability' : null,
            'booked_dates' => $bookedDates,
            'booked_periods' => $bookedPeriods,
        ];
    }

    /**
     * Get booked periods for frontend (format: [[checkin, checkout], ...])
     *
     * @param  int|null  $excludeBookingId  Booking ID to exclude from check (for edit mode)
     * @param  bool  $ignoreOta  Ignore OTA bookings (for overriding)
     */
    public function getBookedPeriodsInRange(Property $property, string $checkIn, string $checkOut, ?int $excludeBookingId = null, bool $ignoreOta = false): array
    {
        $bookings = $this->getOverlappingBookings($property, $checkIn, $checkOut, $excludeBookingId, $ignoreOta);

        $periods = [];
        foreach ($bookings as $booking) {
            $periods[] = [
                $booking->check_in,
                $booking->check_out,
            ];
        }

        return $periods;
    }

    /**
     * Get overlapping bookings with proper logic
     *
     * @param  int|null  $excludeBookingId  Booking ID to exclude from check (for edit mode)
     * @param  bool  $ignoreOta  Ignore OTA bookings (for overriding)
     */
    private function getOverlappingBookings(Property $property, string $checkIn, string $checkOut, ?int $excludeBookingId = null, bool $ignoreOta = true): Collection
    {
        // Ensure dates are in proper Y-m-d format
        try {
            $checkInFormatted = Carbon::parse($checkIn)->format('Y-m-d');
            $checkOutFormatted = Carbon::parse($checkOut)->format('Y-m-d');
        } catch (\Exception $e) {
            Log::error('Invalid date format in getOverlappingBookings', [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'error' => $e->getMessage(),
            ]);

            return collect([]);
        }

        $query = Booking::where('property_id', $property->id)
            ->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
            ->where(function ($query) use ($checkInFormatted, $checkOutFormatted) {
                // Fix: Proper overlap detection
                // Dua periode overlap jika: start1 < end2 AND start2 < end1
                $query->where('check_in', '<', $checkOutFormatted)
                    ->where('check_out', '>', $checkInFormatted);
            });

        // Exclude specific booking if provided (for edit mode)
        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        // Ignore OTA bookings if requested
        if ($ignoreOta) {
            $query->whereNotIn('source', ['airbnb', 'booking_com', 'ota']);
        }

        return $query->get(['check_in', 'check_out', 'booking_status', 'source']);
    }

    /**
     * Get booked dates for property within given date range (FIXED)
     *
     * @param  int|null  $excludeBookingId  Booking ID to exclude from check (for edit mode)
     * @param  bool  $ignoreOta  Ignore OTA bookings (for overriding)
     */
    public function getBookedDatesInRange(Property $property, string $checkIn, string $checkOut, ?int $excludeBookingId = null, bool $ignoreOta = false): array
    {
        $bookings = $this->getOverlappingBookings($property, $checkIn, $checkOut, $excludeBookingId, $ignoreOta);

        return $this->extractDatesFromBookings($bookings, $checkIn, $checkOut);
    }

    /**
     * Extract individual dates from booking periods (IMPROVED)
     */
    private function extractDatesFromBookings(Collection $bookings, ?string $rangeStart = null, ?string $rangeEnd = null): array
    {
        $bookedDates = [];

        foreach ($bookings as $booking) {
            $checkIn = Carbon::parse($booking->check_in);
            $checkOut = Carbon::parse($booking->check_out);

            // Optional: limit to specific range
            if ($rangeStart) {
                $checkIn = $checkIn->max(Carbon::parse($rangeStart));
            }
            if ($rangeEnd) {
                $checkOut = $checkOut->min(Carbon::parse($rangeEnd));
            }

            $current = $checkIn->copy();
            while ($current->lt($checkOut)) {
                $bookedDates[] = $current->format('Y-m-d');
                $current->addDay();
            }
        }

        return array_unique($bookedDates);
    }

    /**
     * Get comprehensive availability and rate data for a property
     */
    public function getAvailabilityData(Property $property, string $startDate, string $endDate): array
    {
        $startDateObj = Carbon::parse($startDate);
        $endDateObj = Carbon::parse($endDate);

        // Get booked dates via service method
        $bookedDates = $this->getBookedDatesInRange($property, $startDate, $endDate);

        // Generate daily rates for the entire period
        $rates = [];
        for ($currentDate = $startDateObj->copy(); $currentDate->lt($endDateObj); $currentDate->addDay()) {
            $dateString = $currentDate->format('Y-m-d');
            $isWeekend = $currentDate->isFriday() || $currentDate->isSaturday() || $currentDate->isSunday();

            try {
                // Re-use RateCalculationService for single source of truth
                $calculation = $this->rateCalculationService->calculateRate($property, $dateString, $currentDate->copy()->addDay()->format('Y-m-d'), $property->capacity);

                // Find applied seasonal rate from calculation results
                $seasonalInfo = ! empty($calculation->seasonalRatesApplied) ? $calculation->seasonalRatesApplied[0] : null;

                // Get extra bed rate and final rate from daily breakdown
                $dailyBreakdown = $calculation->breakdown['daily_breakdown'][$dateString] ?? null;
                $extraBedRate = $dailyBreakdown ? ($dailyBreakdown['extra_bed_rate'] ?? $property->extra_bed_rate) : $property->extra_bed_rate;
                $finalRate = $dailyBreakdown ? ($dailyBreakdown['final_rate'] ?? $property->base_rate) : $property->base_rate;

                $rates[$dateString] = [
                    'base_rate' => $property->base_rate,
                    'final_rate' => $finalRate,
                    'weekend_premium' => $isWeekend,
                    'weekend_premium_amount' => $calculation->weekendPremium,
                    'seasonal_premium' => $calculation->seasonalPremium,
                    'seasonal_premium_amount' => $calculation->seasonalPremium,
                    'is_weekend' => $isWeekend,
                    'has_seasonal_rate' => $calculation->seasonalPremium > 0,
                    'seasonal_rate_applied' => $seasonalInfo ? [
                        'name' => $seasonalInfo['name'],
                        'description' => $seasonalInfo['description'],
                        'min_stay_nights' => $seasonalInfo['min_stay_nights'] ?? 1,
                    ] : null,
                    'extra_bed_rate' => (int) $extraBedRate,
                    'total_rate' => $calculation->totalAmount,
                ];
            } catch (\Throwable $e) {
                Log::warning('Rate calculation failed for date', [
                    'property_id' => $property->id,
                    'date' => $dateString,
                    'error' => $e->getMessage(),
                ]);

                $rates[$dateString] = [
                    'base_rate' => $property->base_rate,
                    'final_rate' => (int) ($property->base_rate ?? 0),
                    'weekend_premium' => $isWeekend,
                    'weekend_premium_amount' => 0,
                    'seasonal_premium' => 0,
                    'seasonal_premium_amount' => 0,
                    'is_weekend' => $isWeekend,
                    'has_seasonal_rate' => false,
                    'seasonal_rate_applied' => null,
                    'extra_bed_rate' => (int) ($property->extra_bed_rate ?? 0),
                    'total_rate' => (int) ($property->base_rate ?? 0),
                ];
            }
        }

        return [
            'success' => true,
            'property' => [
                'id' => $property->id,
                'name' => $property->name,
                'base_rate' => $property->base_rate,
                'capacity' => $property->capacity,
                'capacity_max' => $property->capacity_max,
                'cleaning_fee' => 0,
                'extra_bed_rate' => $property->extra_bed_rate,
                'weekend_premium_percent' => $property->weekend_premium_percent,
                'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
            ],
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'booked_dates' => $bookedDates,
            'booked_periods' => $this->getBookedPeriodsInRange($property, $startDate, $endDate),
            'availability_data' => [
                'rates' => $rates,
            ],
        ];
    }

    /**
     * Calculate rate with formatted response for API
     * Now delegates to RateCalculationService
     *
     * @throws \Exception
     */
    public function calculateRateFormatted(Property $property, string $checkIn, string $checkOut, int $guestCount): array
    {
        // Validate dates first
        $dateValidation = $this->validateDates($checkIn, $checkOut);
        if ($dateValidation) {
            return [
                'success' => false,
                'error_type' => 'validation',
                'message' => implode(', ', $dateValidation),
                'errors' => $dateValidation,
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
                'guest_count' => $guestCount,
            ];
        }

        // Validate guest count
        if ($guestCount > $property->capacity_max) {
            return [
                'success' => false,
                'error_type' => 'capacity',
                'message' => "Guest count cannot exceed property maximum capacity ({$property->capacity_max})",
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
                'guest_count' => $guestCount,
                'capacity_info' => [
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'requested_guests' => $guestCount,
                ],
            ];
        }

        // Check availability
        $availability = $this->checkAvailability($property, $checkIn, $checkOut);

        if (! $availability['available']) {
            return [
                'success' => false,
                'error_type' => 'availability',
                'message' => 'Property is not available for selected dates',
                'property_id' => $property->id,
                'dates' => [
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                ],
                'guest_count' => $guestCount,
                'availability_info' => [
                    'available' => false,
                    'booked_dates' => $availability['booked_dates'],
                    'booked_periods' => $availability['booked_periods'],
                    'alternative_dates' => $this->getNextAvailableDates($property, 3), // Suggest next 3 nights
                ],
            ];
        }

        // Delegate rate calculation to RateCalculationService
        return $this->rateCalculationService->calculateRateFormatted($property, $checkIn, $checkOut, $guestCount);
    }

    /**
     * Filter properties by availability for given date range (FIXED field names)
     *
     * @param  Builder  $query
     * @return Builder
     */
    public function filterPropertiesByAvailability($query, string $checkIn, string $checkOut)
    {
        // Ensure dates are in proper Y-m-d format
        try {
            $checkInFormatted = Carbon::parse($checkIn)->format('Y-m-d');
            $checkOutFormatted = Carbon::parse($checkOut)->format('Y-m-d');
        } catch (\Exception $e) {
            Log::error('Invalid date format in filterPropertiesByAvailability', [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'error' => $e->getMessage(),
            ]);

            return $query; // Return unfiltered query on error
        }

        return $query->whereDoesntHave('bookings', function ($q) use ($checkInFormatted, $checkOutFormatted) {
            $q->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
                ->where('check_in', '<', $checkOutFormatted)
                ->where('check_out', '>', $checkInFormatted);
        });
    }

    /**
     * Validate date inputs for availability checking (IMPROVED)
     *
     * @return array|null Returns null if valid, array of errors if invalid
     */
    public function validateDates(string $checkIn, string $checkOut): ?array
    {
        $errors = [];

        try {
            $checkInDate = Carbon::parse($checkIn);
            $checkOutDate = Carbon::parse($checkOut);
            $now = now()->startOfDay();

            // Check if dates are in the past
            if ($checkInDate->lt($now)) {
                $errors[] = 'Check-in date cannot be in the past';
            }

            // Check date order
            if ($checkOutDate->lte($checkInDate)) {
                $errors[] = 'Check-out date must be after check-in date';
            }

            // Check minimum stay (optional - adjust as needed)
            $daysDiff = $checkInDate->diffInDays($checkOutDate);
            if ($daysDiff < 1) {
                $errors[] = 'Minimum stay is 1 night';
            }

            // Check maximum stay
            if ($daysDiff > 365) {
                $errors[] = 'Booking period cannot exceed 365 days';
            }

        } catch (\Exception $e) {
            $errors[] = 'Invalid date format provided. Use Y-m-d format (e.g., 2024-12-25)';
        }

        return empty($errors) ? null : $errors;
    }

    /**
     * Get availability calendar for property (for admin/management)
     *
     * @param  string  $startMonth  (Y-m format)
     */
    public function getAvailabilityCalendar(Property $property, string $startMonth, int $monthsCount = 6): array
    {
        $startDate = Carbon::createFromFormat('Y-m', $startMonth)->startOfMonth();
        $endDate = $startDate->copy()->addMonths($monthsCount)->endOfMonth();

        $bookedDates = $this->getBookedDatesInRange(
            $property,
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d')
        );

        $calendar = [];
        $currentMonth = $startDate->copy();

        for ($i = 0; $i < $monthsCount; $i++) {
            $monthData = [
                'year' => $currentMonth->year,
                'month' => $currentMonth->month,
                'month_name' => $currentMonth->format('F Y'),
                'days' => [],
            ];

            $daysInMonth = $currentMonth->daysInMonth;
            for ($day = 1; $day <= $daysInMonth; $day++) {
                $date = $currentMonth->copy()->day($day);
                $dateString = $date->format('Y-m-d');

                $monthData['days'][] = [
                    'date' => $dateString,
                    'day' => $day,
                    'is_booked' => in_array($dateString, $bookedDates),
                    'is_past' => $date->lt(now()->startOfDay()),
                    'is_weekend' => $date->isWeekend(),
                ];
            }

            $calendar[] = $monthData;
            $currentMonth->addMonth();
        }

        return [
            'property_id' => $property->id,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
            'calendar' => $calendar,
            'total_booked_days' => count($bookedDates),
        ];
    }

    /**
     * Get next available dates for property
     */
    public function getNextAvailableDates(Property $property, int $nights = 1, int $maxDaysToCheck = 90): ?array
    {
        $currentDate = now()->startOfDay();
        $endCheckDate = $currentDate->copy()->addDays($maxDaysToCheck);

        while ($currentDate->lte($endCheckDate)) {
            $checkOut = $currentDate->copy()->addDays($nights);

            $availability = $this->checkAvailability(
                $property,
                $currentDate->format('Y-m-d'),
                $checkOut->format('Y-m-d')
            );

            if ($availability['available']) {
                return [
                    'check_in' => $currentDate->format('Y-m-d'),
                    'check_out' => $checkOut->format('Y-m-d'),
                    'nights' => $nights,
                ];
            }

            $currentDate->addDay();
        }

        return null;
    }

    /**
     * Debug method untuk troubleshooting
     */
    public function debugAvailability(Property $property, string $checkIn, string $checkOut): array
    {
        $bookings = $this->getOverlappingBookings($property, $checkIn, $checkOut);

        return [
            'requested_period' => [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
            ],
            'overlapping_bookings' => $bookings->map(function ($booking) {
                return [
                    'check_in' => $booking->check_in,
                    'check_out' => $booking->check_out,
                    'status' => $booking->booking_status,
                ];
            })->toArray(),
            'booked_dates' => $this->getBookedDatesInRange($property, $checkIn, $checkOut),
            'is_available' => $bookings->count() === 0,
        ];
    }
}
