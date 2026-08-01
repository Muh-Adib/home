<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Booking;
use App\Models\Property;
use App\Models\SystemSetting;
use App\Services\Payroll\Dtos\PropertyNightOverlapDto;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class NightOverlapCalculatorService
{
    /**
     * Calculate monthly night overlap and bonus funds for all active properties.
     *
     * @return Collection<int, PropertyNightOverlapDto>
     */
    public function calculateAllProperties(int $month, int $year, array $rates = []): Collection
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();
        $startOfNextMonth = Carbon::create($year, $month, 1)->addMonth()->startOfDay();

        $rates = array_merge([
            'bonus_booking_fo' => (float) SystemSetting::get('bonus_booking_fo', 3000),
            'bonus_night_fo' => (float) SystemSetting::get('bonus_night_fo', 1000),
            'bonus_booking_hk' => (float) SystemSetting::get('bonus_booking_hk', 3000),
            'bonus_night_hk' => (float) SystemSetting::get('bonus_night_hk', 5000),
        ], $rates);

        $properties = Property::active()->get();

        // Eager load active bookings overlapping with the target month
        $bookings = Booking::whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
            ->where('check_in', '<', $startOfNextMonth->toDateString())
            ->where('check_out', '>', $startDate->toDateString())
            ->get();

        $bookingsByProperty = $bookings->groupBy('property_id');

        $results = collect();

        foreach ($properties as $property) {
            $propBookings = $bookingsByProperty->get($property->id, collect());
            $dto = $this->calculateForProperty($property, $propBookings, $startDate, $endDate, $startOfNextMonth, $rates);
            $results->put($property->id, $dto);
        }

        return $results;
    }

    /**
     * Calculate overlap metrics for a single property given its overlapping bookings.
     */
    public function calculateForProperty(
        Property $property,
        Collection $propBookings,
        Carbon $startDate,
        Carbon $endDate,
        Carbon $startOfNextMonth,
        array $rates
    ): PropertyNightOverlapDto {
        $bookingCount = 0;
        $occupiedNights = 0;
        $bookingsBreakdown = [];

        $bonusBookingFo = (float) ($rates['bonus_booking_fo'] ?? 3000);
        $bonusNightFo = (float) ($rates['bonus_night_fo'] ?? 1000);
        $bonusBookingHk = (float) ($rates['bonus_booking_hk'] ?? 3000);
        $bonusNightHk = (float) ($rates['bonus_night_hk'] ?? 5000);

        foreach ($propBookings as $booking) {
            $checkInCarbon = Carbon::parse($booking->check_in)->startOfDay();
            $checkOutCarbon = Carbon::parse($booking->check_out)->startOfDay();

            // 1. Booking count: check_in is within target month
            $isStartingInMonth = $checkInCarbon->gte($startDate) && $checkInCarbon->lte($endDate);
            if ($isStartingInMonth) {
                $bookingCount++;
            }

            // 2. Occupied nights: night-by-night overlap within target month
            $overlapStart = $checkInCarbon->max($startDate);
            $overlapEnd = $checkOutCarbon->min($startOfNextMonth);

            $nightsInMonth = 0;
            if ($overlapEnd->gt($overlapStart)) {
                $nightsInMonth = (int) $overlapStart->diffInDays($overlapEnd);
            }

            $occupiedNights += $nightsInMonth;

            $bookingsBreakdown[] = [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'guest_name' => $booking->guest_name,
                'check_in' => $booking->check_in,
                'check_out' => $booking->check_out,
                'created_by' => $booking->created_by,
                'followed_up_by' => $booking->followed_up_by,
                'is_starting_in_month' => $isStartingInMonth,
                'nights_in_month' => $nightsInMonth,
            ];
        }

        $bonusBooking = $bookingCount;
        $bonusNight = max(0, $occupiedNights - $bonusBooking);

        $foBookingFund = $bonusBooking * $bonusBookingFo;
        $foNightFund = $bonusNight * $bonusNightFo;
        $hkBookingFund = $bonusBooking * $bonusBookingHk;
        $hkNightFund = $bonusNight * $bonusNightHk;

        $totalFoFund = $foBookingFund + $foNightFund;
        $totalHkFund = $hkBookingFund + $hkNightFund;

        return new PropertyNightOverlapDto(
            propertyId: $property->id,
            propertyName: $property->name,
            location: strtolower((string) ($property->location ?? 'selatan')),
            bookingCount: $bookingCount,
            occupiedNights: $occupiedNights,
            bonusBooking: $bonusBooking,
            bonusNight: $bonusNight,
            foBookingFund: $foBookingFund,
            foNightFund: $foNightFund,
            hkBookingFund: $hkBookingFund,
            hkNightFund: $hkNightFund,
            totalFoFund: $totalFoFund,
            totalHkFund: $totalHkFund,
            bookingsBreakdown: $bookingsBreakdown
        );
    }
}
