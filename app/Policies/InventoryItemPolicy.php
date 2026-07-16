<?php

namespace App\Policies;

use App\Models\InventoryItem;
use App\Models\User;

class InventoryItemPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            'super_admin',
            'admin',
            'property_manager',
            'housekeeping',
            'front_desk',
            'finance',
        ]);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, InventoryItem $inventoryItem): bool
    {
        return in_array($user->role, [
            'super_admin',
            'admin',
            'property_manager',
            'housekeeping',
            'front_desk',
            'finance',
        ]);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role !== 'guest';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InventoryItem $inventoryItem): bool
    {
        return $user->role !== 'guest';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InventoryItem $inventoryItem): bool
    {
        return $user->role !== 'guest';
    }
}
