<?php

namespace App\Listeners;

use App\Events\PaymentStatusChanged;
use App\Models\User;
use App\Notifications\PaymentStatusChangedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Notification;

class SendPaymentStatusChangedNotification
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
    public function handle(PaymentStatusChanged $event): void
    {
        $payment = $event->payment;
        $user = $event->user;
        $oldStatus = $event->oldStatus;
        $newStatus = $event->newStatus;

        // Send notification to the booking owner (guest) based on email
        if ($payment->booking && $payment->booking->guest_email) {
            $guestUser = User::where('email', $payment->booking->guest_email)->first();
            if ($guestUser) {
                $guestUser->notify(new PaymentStatusChangedNotification($payment, $oldStatus, $newStatus));
            }
        }

        // Send notification to admin users (super_admin, property_manager, finance)
        $adminUsers = User::whereIn('role', ['super_admin', 'property_manager', 'finance'])->get();
        
        foreach ($adminUsers as $admin) {
            // Don't send to the user who made the change
            if ($admin->id !== $user->id) {
                $admin->notify(new PaymentStatusChangedNotification($payment, $oldStatus, $newStatus));
            }
        }

        // Also send to property owner if applicable
        if ($payment->booking && $payment->booking->property && $payment->booking->property->owner) {
            $propertyOwner = $payment->booking->property->owner;
            if ($propertyOwner->role === 'property_owner' && $propertyOwner->id !== $user->id) {
                $propertyOwner->notify(new PaymentStatusChangedNotification($payment, $oldStatus, $newStatus));
            }
        }
    }
} 