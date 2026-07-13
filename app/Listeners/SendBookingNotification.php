<?php

namespace App\Listeners;

use App\Events\BookingCreated;
use App\Models\User;
use App\Notifications\BookingCreatedNotification;
use App\Services\WebPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;

class SendBookingNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(private readonly WebPushService $webPush) {}

    /**
     * Handle the event.
     */
    public function handle(BookingCreated $event): void
    {
        // Create workflow entry for the booking
        $this->createWorkflowEntry($event->booking, $event->user);

        // Get users who should receive notifications
        $notifiableUsers = $this->getNotifiableUsers($event->booking);

        // Send database + broadcast notification to each user
        foreach ($notifiableUsers as $user) {
            $user->notify(new BookingCreatedNotification($event->booking, $event->user));
        }

        // Send background web push to all admin/staff subscribers
        $this->webPush->sendToRoles(['super_admin', 'property_manager', 'front_desk', 'finance', 'housekeeping'], [
            'title' => '🏠 Booking Baru',
            'body' => "Booking {$event->booking->booking_number} dari {$event->booking->guest_name}",
            'icon' => '/logo.svg',
            'badge' => '/logo.svg',
            'tag' => 'booking-'.$event->booking->id,
            'url' => '/admin/bookings/'.$event->booking->booking_number,
        ]);
    }

    /**
     * Create workflow entry for the booking
     */
    private function createWorkflowEntry($booking, $user): void
    {
        try {
            $booking->workflow()->create([
                'step' => 'submitted',
                'status' => 'completed',
                'processed_by' => Auth::check() ? Auth::id() : $user?->id,
                'processed_at' => now(),
                'notes' => 'Booking created successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create workflow entry', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get users who should receive booking notifications
     * Mengirim notifikasi ke semua admin dan staff yang aktif
     */
    private function getNotifiableUsers($booking): Collection
    {
        // Get all admin and staff users who should receive booking notifications
        return User::whereIn('role', [
            'super_admin',
            'property_manager',
            'front_desk',
            'finance',
            'housekeeping',
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
