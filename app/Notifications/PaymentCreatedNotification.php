<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PaymentCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Payment $payment;

    /**
     * Create a new notification instance.
     */
    public function __construct(Payment $payment)
    {
        $this->payment = $payment;
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
        $bookingNumber = $this->payment->booking->booking_number;
        $paymentNumber = $this->payment->payment_number;
        
        return (new MailMessage)
                    ->subject("Payment Created - {$paymentNumber}")
                    ->line("A new payment has been created for booking {$bookingNumber}.")
                    ->line("Payment Number: {$paymentNumber}")
                    ->line("Amount: " . number_format($this->payment->amount, 0, ',', '.'))
                    ->line("Status: {$this->payment->payment_status}")
                    ->action('View Payment', url("/admin/payments/{$paymentNumber}"))
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
            'type' => 'payment_created',
            'title' => 'Payment Created',
            'payment_id' => $this->payment->id,
            'payment_number' => $this->payment->payment_number,
            'booking_id' => $this->payment->booking_id,
            'booking_number' => $this->payment->booking->booking_number,
            'amount' => $this->payment->amount,
            'payment_status' => $this->payment->payment_status,
            'message' => "Payment {$this->payment->payment_number} created for booking {$this->payment->booking->booking_number}",
            'action_url' => "/admin/payments/{$this->payment->payment_number}",
            'icon' => 'credit-card',
            'color' => 'green',
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type' => 'payment_created',
            'payment_number' => $this->payment->payment_number,
            'booking_number' => $this->payment->booking->booking_number,
            'amount' => number_format($this->payment->amount, 0, ',', '.'),
            'message' => "Payment {$this->payment->payment_number} created for booking {$this->payment->booking->booking_number}",
            'action_url' => "/admin/payments/{$this->payment->payment_number}",
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
