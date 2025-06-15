<?php

namespace App\Policies;

use App\Models\User;

class SettingsPolicy
{
    /**
     * Create a new policy instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Determine whether the user can manage settings.
     */
    public function manageSettings(User $user): bool
    {
        return $user->role === 'super_admin';
    }
}
