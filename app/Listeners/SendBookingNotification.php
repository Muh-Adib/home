<?php

namespace App\Listeners;

use App\Events\BookingCreated;
use App\Notifications\BookingCreatedNotification;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Notification;

class SendBookingNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(BookingCreated $event): void
    {
        // Get users who should receive notifications
        $notifiableUsers = $this->getNotifiableUsers($event->booking);

        // Send notification to each user
        foreach ($notifiableUsers as $user) {
            $user->notify(new BookingCreatedNotification($event->booking, $event->user));
        }
    }

    /**
     * Get users who should receive booking notifications
     */
    private function getNotifiableUsers($booking): \Illuminate\Database\Eloquent\Collection
    {
        // Get property managers, front desk staff, and super admins
        return User::whereIn('role', [
            'super_admin',
            'property_manager', 
            'front_desk',
            'finance'
        ])
        ->where('status', 'active')
        ->get();
    }

    /**
     * Handle a job failure.
     */
    public function failed(BookingCreated $event, \Throwable $exception): void
    {
        // Log the failure or send alert to administrators
        \Log::error('Failed to send booking notification', [
            'booking_id' => $event->booking->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
