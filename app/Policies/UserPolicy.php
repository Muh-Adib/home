<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        // Super admin can view all users
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->role === 'admin') {
            // Admin cannot view details of super admin
            if ($model->role === 'super_admin') {
                return false;
            }

            return true;
        }

        // Users can view their own profile
        return $user->id === $model->id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        // Super admin can update all users except cannot demote themselves
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->role === 'admin') {
            // Admin cannot edit super admin users
            if ($model->role === 'super_admin') {
                return false;
            }
            // Admin cannot change anyone's role to super_admin
            if (request()->has('role') && request()->input('role') === 'super_admin') {
                return false;
            }

            return true;
        }

        // Users can update their own profile (except role and status)
        return $user->id === $model->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        if ($user->role === 'super_admin') {
            return $user->id !== $model->id;
        }

        if ($user->role === 'admin') {
            // Admin cannot delete super admin users
            if ($model->role === 'super_admin') {
                return false;
            }

            return $user->id !== $model->id;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return $user->role === 'super_admin' && $user->id !== $model->id;
    }
}
