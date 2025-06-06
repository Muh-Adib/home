<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BookingPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'property_manager', 
            'front_desk', 
            'property_owner'
        ]);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Booking $booking): bool
    {
        // Super admin dapat melihat semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat melihat booking properti mereka
        if ($user->role === 'property_owner') {
            return $booking->property->owner_id === $user->id;
        }

        // Staff dapat melihat semua booking
        return in_array($user->role, [
            'property_manager', 
            'front_desk', 
            'finance'
        ]);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'property_manager', 
            'front_desk'
        ]);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Booking $booking): bool
    {
        // Super admin dapat update semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat update booking properti mereka
        if ($user->role === 'property_owner') {
            return $booking->property->owner_id === $user->id;
        }

        // Manager dan front desk dapat update
        return in_array($user->role, [
            'property_manager', 
            'front_desk'
        ]);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Booking $booking): bool
    {
        // Hanya super admin yang dapat menghapus booking
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can verify bookings.
     */
    public function verify(User $user, Booking $booking): bool
    {
        // Super admin dapat verify semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat verify booking properti mereka
        if ($user->role === 'property_owner') {
            return $booking->property->owner_id === $user->id;
        }

        // Manager dan front desk dapat verify
        return in_array($user->role, [
            'property_manager', 
            'front_desk'
        ]);
    }

    /**
     * Determine whether the user can check-in guests.
     */
    public function checkin(User $user, Booking $booking): bool
    {
        // Super admin dapat checkin semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat checkin booking properti mereka
        if ($user->role === 'property_owner') {
            return $booking->property->owner_id === $user->id;
        }

        // Manager dan front desk dapat checkin
        return in_array($user->role, [
            'property_manager', 
            'front_desk'
        ]);
    }

    /**
     * Determine whether the user can check-out guests.
     */
    public function checkout(User $user, Booking $booking): bool
    {
        // Super admin dapat checkout semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat checkout booking properti mereka
        if ($user->role === 'property_owner') {
            return $booking->property->owner_id === $user->id;
        }

        // Manager, front desk, dan housekeeping dapat checkout
        return in_array($user->role, [
            'property_manager', 
            'front_desk',
            'housekeeping'
        ]);
    }

    /**
     * Determine whether the user can cancel bookings.
     */
    public function cancel(User $user, Booking $booking): bool
    {
        // Super admin dapat cancel semua
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat cancel booking properti mereka
        if ($user->role === 'property_owner') {
            return $booking->property->owner_id === $user->id;
        }

        // Hanya manager yang dapat cancel booking
        return $user->role === 'property_manager';
    }

    /**
     * Determine whether the user can access booking reports.
     */
    public function viewReports(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'property_manager', 
            'property_owner',
            'finance'
        ]);
    }

    /**
     * Determine whether the user can export booking data.
     */
    public function export(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'property_manager', 
            'finance'
        ]);
    }
}
