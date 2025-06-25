<?php

namespace App\Listeners;

use App\Events\PaymentCreated;
use App\Models\User;
use App\Notifications\PaymentCreatedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Notification;

class SendPaymentNotification
{
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
    public function handle(PaymentCreated $event): void
    {
        $payment = $event->payment;
        $user = $event->user;

        // Send notification to the user who created the payment
        if ($user && $user instanceof User) {
            $user->notify(new PaymentCreatedNotification($payment));
        }

        // Send notification to admin users (superadmin, admin, finance)
        $adminUsers = User::whereIn('role', ['superadmin', 'admin', 'finance'])->get();
        
        foreach ($adminUsers as $admin) {
            $admin->notify(new PaymentCreatedNotification($payment));
        }

        // Also send to property owner if applicable
        if ($payment->booking && $payment->booking->property && $payment->booking->property->owner) {
            $propertyOwner = $payment->booking->property->owner;
            if ($propertyOwner->role === 'property_owner') {
                $propertyOwner->notify(new PaymentCreatedNotification($payment));
            }
        }
    }
}
