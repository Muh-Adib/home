<?php

namespace App\Listeners;

use App\Events\PaymentCreated;
use App\Models\User;
use App\Notifications\PaymentCreatedNotification;
use App\Services\WebPushService;
use Illuminate\Support\Facades\Notification;

class SendPaymentNotification
{
    public function __construct(private readonly WebPushService $webPush) {}

    /**
     * Handle the event.
     */
    public function handle(PaymentCreated $event): void
    {
        $payment = $event->payment;
        $user = $event->user;

        // Send notification to the user who created the payment
        if ($user && $user instanceof User) {
            $user->notify(new PaymentCreatedNotification($payment));
        }

        // Send notification to admin users (super_admin, property_manager, finance)
        $adminUsers = User::whereIn('role', ['super_admin', 'property_manager', 'finance'])->get();

        foreach ($adminUsers as $admin) {
            $admin->notify(new PaymentCreatedNotification($payment));
        }

        // Send notification to guest based on booking email
        if ($payment->booking && $payment->booking->guest_email) {
            $guestUser = User::where('email', $payment->booking->guest_email)->first();
            if ($guestUser && $guestUser->id !== ($user->id ?? 0)) {
                $guestUser->notify(new PaymentCreatedNotification($payment));
            }
        }

        // Also send to property owner if applicable
        if ($payment->booking && $payment->booking->property && $payment->booking->property->owner) {
            $propertyOwner = $payment->booking->property->owner;
            if ($propertyOwner->role === 'property_owner') {
                $propertyOwner->notify(new PaymentCreatedNotification($payment));
            }
        }

        // Send background web push to admin/finance subscribers
        $amount = 'Rp '.number_format((float) ($payment->expected_amount ?: $payment->amount), 0, ',', '.');
        $this->webPush->sendToRoles(['super_admin', 'property_manager', 'finance'], [
            'title' => '💰 Pembayaran Baru',
            'body' => "{$amount} — Booking {$payment->booking->booking_number}",
            'icon' => '/logo.svg',
            'badge' => '/logo.svg',
            'tag' => 'payment-'.$payment->id,
            'url' => '/admin/payments/'.$payment->payment_number,
        ]);
    }
}
