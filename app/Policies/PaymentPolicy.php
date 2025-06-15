<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;
use App\Models\Booking;
use App\Models\PaymentMethod;
use Illuminate\Auth\Access\Response;

class PaymentPolicy
{
    /**
     * Determine whether the user can view any payments.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'property_manager', 
            'finance',
            'property_owner'
        ]);
    }

    /**
     * Determine whether the user can view the payment.
     */
    public function view(User $user, Payment $payment): bool
    {
        // Super admin dapat melihat semua payment
        if ($user->role === 'super_admin') {
            return true;
        }
        
        // Property owners can view payments for their properties
        if ($user->role === 'property_owner') {
            return $payment->booking->property->owner_id === $user->id;
        }
        
        // Users can view their own booking payments
        return $payment->booking->guest_email === $user->email || 
               $payment->booking->user_id === $user->id;
    }

    /**
     * Determine whether the user can create payments.
     */
    public function create(User $user): bool
    {
        // Guest dapat create payment (submit proof)
        // Staff dapat create payment entries
        return true;
    }

    /**
     * Determine whether the user can update the payment.
     */
    public function update(User $user, Payment $payment): bool
    {
        // Hanya finance yang dapat update payment details
        return in_array($user->role, [
            'super_admin', 
            'finance'
        ]);
    }

    /**
     * Determine whether the user can delete the payment.
     */
    public function delete(User $user, Payment $payment): bool
    {
        // Hanya super admin yang dapat delete payment
        // Dan hanya jika payment belum verified
        return $user->role === 'super_admin' && 
               $payment->payment_status === 'pending';
    }

    /**
     * Determine whether the user can verify payments.
     */
    public function verify(User $user, Payment $payment): bool
    {
        // Super admin dapat verify semua
        if ($user->role === 'super_admin') {
            return true;
        }
        
            // Finance dapat verify semua payment
        if ($user->role === 'finance') {
            return true;
        }

        // Property owner dapat verify payment untuk property mereka
        if ($user->role === 'property_owner') {
            return $payment->booking->property->owner_id === $user->id;
        }

        // Manager dapat verify dengan approval limit
        if ($user->role === 'property_manager') {
            // TODO: Implement approval limits
            return $payment->amount <= 10000000; // 10 juta rupiah limit
        }

        return false;
    }

    /**
     * Determine whether the user can manage rejected payments.
     */
    public function manageRejectedPayments(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'finance'
        ]);
    }

    /**
     * Determine whether the user can make payment for a booking.
     */
    public function makePayment(User $user, Booking $booking): bool
    {
        // User must be the guest who made the booking
        return $booking->guest_email === $user->email || 
               $booking->user_id === $user->id;
    }

    /**
     * Standard Laravel Policy method to create payment for booking
     */
    public function createForBooking(User $user, Booking $booking): bool
    {
        // User must be the guest who made the booking
        return $booking->guest_email === $user->email || 
               $booking->user_id === $user->id;
    }

    /**
     * Determine whether the user can manage payment methods.
     */
    public function managePaymentMethods(User $user): bool
    {
        return $user->role === 'super_admin' ? Response::allow() : Response::deny('You are not authorized to manage payment methods.');
    }

    /**
     * Determine whether the user can download payment proof.
     */
    public function downloadProof(User $user, Payment $payment): bool
    {
        // Super admin dapat download semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya payment untuk property mereka
        if ($user->role === 'property_owner') {
            return $payment->booking->property->owner_id === $user->id;
        }

        // Staff dapat download payment proof
        return in_array($user->role, [
            'property_manager', 
            'finance',
            'front_desk'
        ]);
    }

    /**
     * Determine whether the user can refund payments.
     */
    public function refund(User $user, Payment $payment): bool
    {
        // Hanya super admin dan finance yang dapat refund
        return in_array($user->role, [
            'super_admin', 
            'finance'
        ]);
    }

    /**
     * Determine whether the user can view payment reports.
     */
    public function viewReports(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'property_manager', 
            'finance',
            'property_owner'
        ]);
    }

    /**
     * Determine whether the user can export payment data.
     */
    public function export(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'finance'
        ]);
    }

    /**
     * Determine whether the user can process bulk payments.
     */
    public function bulkProcess(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'finance'
        ]);
    }
}
