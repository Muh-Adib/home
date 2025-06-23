<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class BookingCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $booking;
    protected $createdBy;

    /**
     * Create a new notification instance.
     */
    public function __construct(Booking $booking, User $createdBy)
    {
        $this->booking = $booking;
        $this->createdBy = $createdBy;
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
        return (new MailMessage)
                    ->subject('New Booking Created')
                    ->line('A new booking has been created.')
                    ->line('Booking Number: ' . $this->booking->booking_number)
                    ->line('Guest: ' . $this->booking->guest_name)
                    ->line('Property: ' . $this->booking->property->name)
                    ->line('Check-in: ' . $this->booking->check_in)
                    ->line('Check-out: ' . $this->booking->check_out)
                    ->action('View Booking', url('/admin/bookings/' . $this->booking->id))
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
            'type' => 'booking_created',
            'title' => 'New Booking Created',
            'message' => "New booking {$this->booking->booking_number} from {$this->booking->guest_name}",
            'data' => [
                'booking_id' => $this->booking->id,
                'booking_number' => $this->booking->booking_number,
                'guest_name' => $this->booking->guest_name,
                'property_name' => $this->booking->property->name,
                'check_in' => $this->booking->check_in,
                'check_out' => $this->booking->check_out,
                'total_amount' => $this->booking->total_amount,
                'status' => $this->booking->booking_status,
                'created_by' => [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ],
            ],
            'action_url' => '/admin/bookings/' . $this->booking->id,
            'icon' => 'calendar',
            'color' => 'blue',
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'booking_created',
            'title' => 'New Booking Created',
            'message' => "New booking {$this->booking->booking_number} from {$this->booking->guest_name}",
            'data' => [
                'booking_id' => $this->booking->id,
                'booking_number' => $this->booking->booking_number,
                'guest_name' => $this->booking->guest_name,
                'property_name' => $this->booking->property->name,
                'check_in' => $this->booking->check_in,
                'check_out' => $this->booking->check_out,
                'total_amount' => $this->booking->total_amount,
                'status' => $this->booking->booking_status,
                'created_by' => [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ],
            ],
            'action_url' => '/admin/bookings/' . $this->booking->id,
            'icon' => 'calendar',
            'color' => 'blue',
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
            new \Illuminate\Broadcasting\PrivateChannel('user.' . $this->notifiable->id),
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
