<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Booking;
use App\Models\Income;
use App\Services\BookingDailyRevenueService;
use App\Services\PaymentIncomeSyncService;
use Illuminate\Support\Facades\Cache;

class BookingObserver
{
    /**
     * Handle the Booking "created" event.
     */
    public function created(Booking $booking): void
    {
        $this->invalidateAvailabilityCache($booking->property_id);
        app(BookingDailyRevenueService::class)->syncBookingRevenue($booking);
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

        if ($booking->isDirty(['check_in', 'check_out', 'property_id', 'total_amount', 'discount_amount'])) {
            $payments = $booking->payments()->where('payment_status', 'verified')->get();
            $syncService = app(PaymentIncomeSyncService::class);
            foreach ($payments as $payment) {
                $syncService->syncOnVerified($payment);
            }
        }

        // Auto-sync daily revenue breakdown on date, price, status, or paid amount changes
        if ($booking->isDirty(['check_in', 'check_out', 'property_id', 'total_amount', 'discount_amount', 'booking_status', 'dp_paid_amount'])) {
            app(BookingDailyRevenueService::class)->syncBookingRevenue($booking);
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
    private function invalidateAvailabilityCache(int|string|null $propertyId): void
    {
        if ($propertyId === null) {
            return;
        }

        $propertyId = (int) $propertyId;
        $today = now()->toDateString();
        $endDate = now()->addMonths(3)->toDateString();
        Cache::forget("property_v2_{$propertyId}_avail_{$today}_{$endDate}");
    }
}
