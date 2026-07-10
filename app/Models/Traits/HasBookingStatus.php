<?php

declare(strict_types=1);

namespace App\Models\Traits;

use App\Services\RateCalculationService;
use Carbon\Carbon;

/**
 * Booking Status Trait
 *
 * Handles booking status checks and transitions, including status coloring
 */
trait HasBookingStatus
{
    /**
     * Get status color for UI display
     *
     * ✅ CENTRALIZED: This is the single source of truth for status colors
     *    Used by: BookingResource, Listeners, etc via $booking->status_color
     */
    public function getStatusColor(): string
    {
        return match ($this->booking_status) {
            'pending_verification' => 'yellow',
            'confirmed' => 'green',
            'checked_in' => 'blue',
            'checked_out' => 'gray',
            'cancelled' => 'red',
            'no_show' => 'red',
            default => 'gray'
        };
    }

    /**
     * Check if booking can be cancelled
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->booking_status, [
            'pending_verification',
            'confirmed',
        ]) && $this->check_in > now();
    }

    /**
     * Check if booking can be checked in
     */
    public function canCheckIn(): bool
    {
        $checkIn = Carbon::parse($this->check_in)->startOfDay();
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        return $this->booking_status === 'confirmed'
               && in_array($this->payment_status, ['fully_paid', 'dp_received'])
               && $checkIn->between($yesterday, $today);
    }

    /**
     * Check if booking can be checked out
     */
    public function canCheckOut(): bool
    {
        return $this->booking_status === 'checked_in'
               && $this->check_out <= now()->addHours(2); // Grace period
    }

    /**
     * Check if extra bed is needed
     */
    public function needsExtraBed(): bool
    {
        return $this->guest_count > $this->property->capacity;
    }

    /**
     * Get number of extra beds needed
     * ✅ Uses single source of truth from RateCalculationService
     */
    public function getExtraBedCount(): int
    {
        return RateCalculationService::calculateExtraBedCount(
            $this->guest_count,
            $this->property->capacity
        );
    }
}
