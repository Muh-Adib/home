<?php

namespace App\Listeners;

use App\Events\BookingStatusChanged;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Notification;

class SendBookingStatusNotification implements ShouldQueue
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
    public function handle(BookingStatusChanged $event): void
    {
        $booking = $event->booking;
        $oldStatus = $event->oldStatus;
        $newStatus = $event->newStatus;
        $changedBy = $event->changedBy;

        // Get users who should receive notifications
        $notifiableUsers = $this->getNotifiableUsers($booking);

        // Create notification data
        $notificationData = [
            'type' => 'booking_status_changed',
            'booking_id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'property_name' => $booking->property->name,
            'guest_name' => $booking->guest_name,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'changed_by' => [
                'id' => $changedBy->id,
                'name' => $changedBy->name,
            ],
            'message' => "Booking {$booking->booking_number} status changed from {$oldStatus} to {$newStatus} by {$changedBy->name}",
            'action_url' => "/admin/bookings/{$booking->booking_number}",
            'icon' => $this->getStatusIcon($newStatus),
            'color' => $this->getStatusColor($newStatus),
        ];

        // Send notification to each user
        foreach ($notifiableUsers as $user) {
            $user->notify(new \App\Notifications\BookingStatusChangedNotification($notificationData));
        }
    }

    /**
     * Get users who should receive booking status change notifications
     */
    private function getNotifiableUsers($booking): \Illuminate\Database\Eloquent\Collection
    {
        // Get admins, property managers, and front desk staff
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
     * Get icon based on status
     */
    private function getStatusIcon(string $status): string
    {
        return match($status) {
            'confirmed' => 'check-circle',
            'checked_in' => 'log-in',
            'checked_out' => 'log-out',
            'cancelled' => 'x-circle',
            'no_show' => 'user-x',
            default => 'bell',
        };
    }

    /**
     * Get color based on status
     */
    private function getStatusColor(string $status): string
    {
        return match($status) {
            'confirmed' => 'green',
            'checked_in' => 'blue',
            'checked_out' => 'gray',
            'cancelled' => 'red',
            'no_show' => 'red',
            default => 'blue',
        };
    }

    /**
     * Handle a job failure.
     */
    public function failed(BookingStatusChanged $event, \Throwable $exception): void
    {
        \Log::error('Failed to send booking status change notification', [
            'booking_id' => $event->booking->id,
            'old_status' => $event->oldStatus,
            'new_status' => $event->newStatus,
            'error' => $exception->getMessage(),
        ]);
    }
}
