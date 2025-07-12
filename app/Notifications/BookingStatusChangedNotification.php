<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class BookingStatusChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected array $data;

    /**
     * Create a new notification instance.
     */
    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $bookingNumber = $this->data['booking_number'];
        $guestName = $this->data['guest_name'];
        $propertyName = $this->data['property_name'];
        $oldStatus = $this->data['old_status'];
        $newStatus = $this->data['new_status'];
        $changedBy = $this->data['changed_by']['name'];
        
        return (new MailMessage)
                    ->subject("Booking Status Changed - {$bookingNumber}")
                    ->line("Booking status has been updated.")
                    ->line("Booking Number: {$bookingNumber}")
                    ->line("Guest: {$guestName}")
                    ->line("Property: {$propertyName}")
                    ->line("Status Changed: {$oldStatus} → {$newStatus}")
                    ->line("Changed by: {$changedBy}")
                    ->action('View Booking', url($this->data['action_url']))
            ->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->data['type'],
            'title' => 'Booking Status Changed',
            'booking_id' => $this->data['booking_id'],
            'booking_number' => $this->data['booking_number'],
            'property_name' => $this->data['property_name'],
            'guest_name' => $this->data['guest_name'],
            'old_status' => $this->data['old_status'],
            'new_status' => $this->data['new_status'],
            'changed_by' => $this->data['changed_by'],
            'message' => $this->data['message'],
            'action_url' => $this->data['action_url'],
            'icon' => $this->data['icon'],
            'color' => $this->data['color'],
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'type' => $this->data['type'],
            'title' => 'Booking Status Changed',
            'message' => $this->data['message'],
            'data' => [
                'booking_id' => $this->data['booking_id'],
                'booking_number' => $this->data['booking_number'],
                'property_name' => $this->data['property_name'],
                'guest_name' => $this->data['guest_name'],
                'old_status' => $this->data['old_status'],
                'new_status' => $this->data['new_status'],
                'changed_by' => $this->data['changed_by'],
            ],
            'action_url' => $this->data['action_url'],
            'icon' => $this->data['icon'],
            'color' => $this->data['color'],
            'read_at' => null,
            'created_at' => now()->toISOString(),
        ]);
    }

    /**
     * Get the notification's broadcast channels.
     */
    public function broadcastOn(): array
    {
        return [
            new \Illuminate\Broadcasting\Channel('admin-notifications'),
        ];
    }

    /**
     * Get the type of the notification being broadcast.
     */
    public function broadcastType(): string
    {
        return 'notification.created';
    }
}
