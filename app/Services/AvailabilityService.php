<?php

namespace App\Services;

use App\Models\Property;
use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * AvailabilityService - Service untuk menangani logika availability dan rate calculation
 * 
 * FIXES:
 * 1. Memperbaiki logika overlap detection
 * 2. Menambahkan method untuk format frontend
 * 3. Konsistensi field names
 * 4. Validasi tanggal yang lebih robust
 */
class AvailabilityService
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Check if property is available for given date range
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @return array
     */
    public function checkAvailability(Property $property, string $checkIn, string $checkOut): array
    {
        $bookedDates = $this->getBookedDatesInRange($property, $checkIn, $checkOut);
        $bookedPeriods = $this->getBookedPeriodsInRange($property, $checkIn, $checkOut);
        
        return [
            'success' => true,
            'property_id' => $property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'available' => count($bookedDates) === 0,
            'booked_dates' => $bookedDates,
            'booked_periods' => $bookedPeriods, // Untuk frontend yang butuh array periods
        ];
    }

    /**
     * Get booked periods for frontend (format: [[checkin, checkout], ...])
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @return array
     */
    public function getBookedPeriodsInRange(Property $property, string $checkIn, string $checkOut): array
    {
        $bookings = $this->getOverlappingBookings($property, $checkIn, $checkOut);
        
        $periods = [];
        foreach ($bookings as $booking) {
            $periods[] = [
                $booking->check_in,
                $booking->check_out
            ];
        }
        
        return $periods;
    }

    /**
     * Get overlapping bookings with proper logic
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @return Collection
     */
    private function getOverlappingBookings(Property $property, string $checkIn, string $checkOut): Collection
    {
        return Booking::where('property_id', $property->id)
            ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
            ->where(function ($query) use ($checkIn, $checkOut) {
                // Fix: Proper overlap detection
                // Dua periode overlap jika: start1 < end2 AND start2 < end1
                $query->where('check_in', '<', $checkOut)
                      ->where('check_out', '>', $checkIn);
            })
            ->get(['check_in', 'check_out', 'booking_status']);
    }

    /**
     * Get booked dates for property within given date range (FIXED)
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @return array
     */
    public function getBookedDatesInRange(Property $property, string $checkIn, string $checkOut): array
    {
        $bookings = $this->getOverlappingBookings($property, $checkIn, $checkOut);
        return $this->extractDatesFromBookings($bookings, $checkIn, $checkOut);
    }

    /**
     * Extract individual dates from booking periods (IMPROVED)
     * 
     * @param Collection $bookings
     * @param string $rangeStart
     * @param string $rangeEnd
     * @return array
     */
    private function extractDatesFromBookings(Collection $bookings, string $rangeStart = null, string $rangeEnd = null): array
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
     * Calculate property rate for given dates and guest count
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @param int $guestCount
     * @return array
     * @throws \Exception
     */
    public function calculateRate(Property $property, string $checkIn, string $checkOut, int $guestCount): array
    {
        // Validate dates first
        $dateValidation = $this->validateDates($checkIn, $checkOut);
        if ($dateValidation) {
            throw new \Exception(implode(', ', $dateValidation));
        }
        
        // Validate guest count
        if ($guestCount > $property->capacity_max) {
            throw new \Exception("Guest count cannot exceed property maximum capacity ({$property->capacity_max})");
        }

        // Check availability
        $availability = $this->checkAvailability($property, $checkIn, $checkOut);
        
        if (!$availability['available']) {
            throw new \Exception('Property is not available for selected dates');
        }

        // Use Property model's existing calculateRate method
        return $property->calculateRate($checkIn, $checkOut, $guestCount);
    }

    /**
     * Calculate rate with formatted response for API
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @param int $guestCount
     * @return array
     * @throws \Exception
     */
    public function calculateRateFormatted(Property $property, string $checkIn, string $checkOut, int $guestCount): array
    {
        $calculation = $this->calculateRate($property, $checkIn, $checkOut, $guestCount);
        
        return [
            'success' => true,
            'property_id' => $property->id,
            'dates' => [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
            ],
            'guest_count' => $guestCount,
            'calculation' => $calculation,
            'formatted' => [
                'base_amount' => 'Rp ' . number_format($calculation['base_amount'], 0, ',', '.'),
                'weekend_premium' => 'Rp ' . number_format($calculation['weekend_premium'], 0, ',', '.'),
                'seasonal_premium' => 'Rp ' . number_format($calculation['seasonal_premium'], 0, ',', '.'),
                'extra_bed_amount' => 'Rp ' . number_format($calculation['extra_bed_amount'], 0, ',', '.'),
                'cleaning_fee' => 'Rp ' . number_format($calculation['cleaning_fee'], 0, ',', '.'),
                'total_amount' => 'Rp ' . number_format($calculation['total_amount'], 0, ',', '.'),
                'per_night' => 'Rp ' . number_format($calculation['total_amount'] / $calculation['nights'], 0, ',', '.'),
            ]
        ];
    }

    /**
     * Filter properties by availability for given date range (FIXED field names)
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $checkIn
     * @param string $checkOut
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function filterPropertiesByAvailability($query, string $checkIn, string $checkOut)
    {
        return $query->whereDoesntHave('bookings', function ($q) use ($checkIn, $checkOut) {
            $q->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
              ->where('check_in', '<', $checkOut)
              ->where('check_out', '>', $checkIn);
        });
    }

    /**
     * Validate date inputs for availability checking (IMPROVED)
     * 
     * @param string $checkIn
     * @param string $checkOut
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
     * @param Property $property
     * @param string $startMonth (Y-m format)
     * @param int $monthsCount
     * @return array
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
                'days' => []
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
     * 
     * @param Property $property
     * @param int $nights
     * @param int $maxDaysToCheck
     * @return array|null
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
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @return array
     */
    public function debugAvailability(Property $property, string $checkIn, string $checkOut): array
    {
        $bookings = $this->getOverlappingBookings($property, $checkIn, $checkOut);
        
        return [
            'requested_period' => [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
            ],
            'overlapping_bookings' => $bookings->map(function($booking) {
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