<?php

namespace App\Policies;

use App\Models\Property;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PropertyPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Semua authenticated user dapat melihat list properties
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Property $property): bool
    {
        // Semua authenticated user dapat melihat property detail
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Authenticated user dapat membuat property
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Property $property): bool
    {
        // User dapat update property yang mereka miliki atau sebagai admin
        return $user->isAdmin() || $property->owner_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Property $property): bool
    {
        // User dapat delete property yang mereka miliki atau sebagai admin
        return $user->isAdmin() || $property->owner_id === $user->id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Property $property): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Property $property): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can manage property media.
     */
    public function manageMedia(User $user, Property $property): bool
    {
        // User dapat manage media property yang mereka miliki atau sebagai admin
        return $user->isAdmin() || $property->owner_id === $user->id;
    }

    /**
     * Determine whether the user can manage property amenities.
     */
    public function manageAmenities(User $user, Property $property): bool
    {
        // Super admin dapat manage semua amenities
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat manage amenities property mereka
        if ($user->role === 'property_owner') {
            return $property->owner_id === $user->id;
        }

        // Manager dapat manage amenities
        return $user->role === 'property_manager';
    }

    /**
     * Determine whether the user can manage property pricing.
     */
    public function managePricing(User $user, Property $property): bool
    {
        // Super admin dapat manage semua pricing
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat manage pricing property mereka
        if ($user->role === 'property_owner') {
            return $property->owner_id === $user->id;
        }

        // Manager dapat manage pricing
        return $user->role === 'property_manager';
    }

    /**
     * Determine whether the user can view property reports.
     */
    public function viewReports(User $user, Property $property): bool
    {
        // Super admin dapat view semua reports
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner hanya dapat view reports property mereka
        if ($user->role === 'property_owner') {
            return $property->owner_id === $user->id;
        }

        // Manager dan finance dapat view reports
        return in_array($user->role, [
            'property_manager', 
            'finance'
        ]);
    }

    /**
     * Determine whether the user can change property status.
     */
    public function changeStatus(User $user, Property $property): bool
    {
        // Super admin dapat change semua status
        if ($user->role === 'super_admin') {
            return true;
        }

        // Property owner dapat change status property mereka (dengan restrictions)
        if ($user->role === 'property_owner') {
            // Tidak bisa disable jika ada booking confirmed
            if ($property->status === 'active') {
                $hasConfirmedBookings = $property->bookings()
                    ->whereIn('booking_status', ['confirmed', 'checked_in'])
                    ->where('check_out', '>', now())
                    ->exists();
                    
                return $property->owner_id === $user->id && !$hasConfirmedBookings;
            }
            
            return $property->owner_id === $user->id;
        }

        // Manager dapat change status
        return $user->role === 'property_manager';
    }

    /**
     * Determine whether the user can access admin features.
     */
    public function admin(User $user): bool
    {
        return in_array($user->role, [
            'super_admin', 
            'property_manager', 
            'property_owner'
        ]);
    }

    /**
     * Determine whether the user can export property data.
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
