<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PaymentPolicy
{
    /**
     * Determine whether the user can view any models.
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
     * Determine whether the user can view the model.
     */
    public function view(User $user, Payment $payment): bool
    {
        // Super admin dapat melihat semua payment
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat melihat payment untuk property mereka
        if ($user->role === 'property_owner') {
            return $payment->booking->property->owner_id === $user->id;
        }

        // Finance dan manager dapat melihat semua payment
        return in_array($user->role, [
            'property_manager', 
            'finance'
        ]);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Guest dapat create payment (submit proof)
        // Staff dapat create payment entries
        return true;
    }

    /**
     * Determine whether the user can update the model.
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
     * Determine whether the user can delete the model.
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
     * Determine whether the user can reject payments.
     */
    public function reject(User $user, Payment $payment): bool
    {
        // Super admin dapat reject semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Finance dapat reject semua payment
        if ($user->role === 'finance') {
            return true;
        }

        // Property owner dapat reject payment untuk property mereka
        if ($user->role === 'property_owner') {
            return $payment->booking->property->owner_id === $user->id;
        }

        // Manager dapat reject
        return $user->role === 'property_manager';
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
     * Determine whether the user can manage payment methods.
     */
    public function managePaymentMethods(User $user): bool
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
