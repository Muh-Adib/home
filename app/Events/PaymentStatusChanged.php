<?php

namespace App\Events;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Payment $payment;
    public User $user;
    public string $oldStatus;
    public string $newStatus;

    /**
     * Create a new event instance.
     */
    public function __construct(Payment $payment, User $user, string $oldStatus, string $newStatus)
    {
        $this->payment = $payment;
        $this->user = $user;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('admin-notifications'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'payment.status.changed';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'payment_id' => $this->payment->id,
            'payment_number' => $this->payment->payment_number,
            'amount' => $this->payment->amount,
            'booking_number' => $this->payment->booking->booking_number,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'message' => "Payment {$this->payment->payment_number} status changed from {$this->oldStatus} to {$this->newStatus}",
        ];
    }
} 