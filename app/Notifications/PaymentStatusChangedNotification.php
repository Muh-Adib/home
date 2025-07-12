<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PaymentStatusChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Payment $payment;
    protected string $oldStatus;
    protected string $newStatus;

    /**
     * Create a new notification instance.
     */
    public function __construct(Payment $payment, string $oldStatus, string $newStatus)
    {
        $this->payment = $payment;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
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
        
        $statusMessages = [
            'verified' => 'Your payment has been verified successfully.',
            'failed' => 'Your payment has been rejected.',
            'cancelled' => 'Your payment has been cancelled.',
            'pending' => 'Your payment is pending verification.',
        ];
        
        $message = $statusMessages[$this->newStatus] ?? "Your payment status has been updated to {$this->newStatus}.";
        
        return (new MailMessage)
                    ->subject("Payment Status Updated - {$paymentNumber}")
                    ->line("Payment status for booking {$bookingNumber} has been updated.")
                    ->line("Payment Number: {$paymentNumber}")
                    ->line("Amount: " . number_format($this->payment->amount, 0, ',', '.'))
                    ->line("Status: {$this->oldStatus} → {$this->newStatus}")
                    ->line($message)
                    ->action('View Payment', url("/my-payments/{$paymentNumber}"))
                    ->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $statusColors = [
            'verified' => 'green',
            'failed' => 'red',
            'cancelled' => 'gray',
            'pending' => 'yellow',
        ];

        $statusIcons = [
            'verified' => 'check-circle',
            'failed' => 'x-circle',
            'cancelled' => 'x-circle',
            'pending' => 'clock',
        ];

        return [
            'type' => 'payment_status_changed',
            'title' => 'Payment Status Updated',
            'payment_id' => $this->payment->id,
            'payment_number' => $this->payment->payment_number,
            'booking_id' => $this->payment->booking_id,
            'booking_number' => $this->payment->booking->booking_number,
            'amount' => $this->payment->amount,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'message' => "Payment {$this->payment->payment_number} status changed from {$this->oldStatus} to {$this->newStatus}",
            'action_url' => "/my-payments/{$this->payment->payment_number}",
            'icon' => $statusIcons[$this->newStatus] ?? 'credit-card',
            'color' => $statusColors[$this->newStatus] ?? 'blue',
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type' => 'payment_status_changed',
            'payment_number' => $this->payment->payment_number,
            'booking_number' => $this->payment->booking->booking_number,
            'amount' => number_format($this->payment->amount, 0, ',', '.'),
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'message' => "Payment {$this->payment->payment_number} status changed from {$this->oldStatus} to {$this->newStatus}",
            'action_url' => "/my-payments/{$this->payment->payment_number}",
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