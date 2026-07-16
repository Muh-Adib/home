<?php

namespace App\Services;

use App\Models\User;

class DashboardRouteService
{
    /**
     * Get the dashboard route name for a specific user based on their role.
     */
    public function getDashboardRoute(User $user): string
    {
        return match ($user->role) {
            'super_admin', 'admin', 'property_manager', 'front_desk', 'content_creator' => 'admin.dashboard',
            'property_owner' => 'admin.dashboard', // Owners share the admin dashboard structure
            'finance' => 'admin.finance.index',
            'housekeeping' => 'staff.cleaning.index',
            'guest' => 'dashboard', // Guest dashboard route name
            default => 'home', // Fallback
        };
    }

    /**
     * Get the redirect URL for a specific user.
     */
    public function getRedirectUrl(User $user): string
    {
        $route = $this->getDashboardRoute($user);

        return route($route);
    }
}
