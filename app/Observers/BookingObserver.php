<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Booking;
use App\Models\Income;
use Illuminate\Support\Facades\Cache;

class BookingObserver
{
    /**
     * Handle the Booking "created" event.
     */
    public function created(Booking $booking): void
    {
        $this->invalidateAvailabilityCache($booking->property_id);
    }

    /**
     * Handle the Booking "updated" event.
     */
    public function updated(Booking $booking): void
    {
        if ($booking->isDirty(['check_in', 'check_out', 'booking_status', 'property_id'])) {
            $this->invalidateAvailabilityCache($booking->property_id);
            if ($booking->isDirty('property_id')) {
                $this->invalidateAvailabilityCache($booking->getOriginal('property_id'));
            }
        }
    }

    /**
     * Handle the Booking "deleting" event.
     */
    public function deleting(Booking $booking): void
    {
        // Delete all incomes associated with this booking
        Income::where('booking_id', $booking->id)->delete();

        // Delete all payments associated with this booking
        $booking->payments()->delete();
    }

    /**
     * Handle the Booking "deleted" event.
     */
    public function deleted(Booking $booking): void
    {
        $this->invalidateAvailabilityCache($booking->property_id);
    }

    /**
     * Invalidate the cached availability data for a property.
     */
    private function invalidateAvailabilityCache(int $propertyId): void
    {
        $today = now()->toDateString();
        $endDate = now()->addMonths(3)->toDateString();
        Cache::forget("property_v2_{$propertyId}_avail_{$today}_{$endDate}");
    }
}
