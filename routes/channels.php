<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// User private channel for notifications
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// General bookings channel (for admins and staff)
Broadcast::channel('bookings', function ($user) {
    return in_array($user->role, [
        'super_admin',
        'property_manager',
        'front_desk',
        'finance',
        'housekeeping'
    ]);
});

// Property specific channel
Broadcast::channel('property.{propertyId}', function ($user, $propertyId) {
    // Allow property owners and managers to listen to their property updates
    if ($user->role === 'super_admin') {
        return true;
    }
    
    if ($user->role === 'property_owner') {
        // Check if user owns this property
        return \App\Models\Property::where('id', $propertyId)
            ->where('owner_id', $user->id)
            ->exists();
    }
    
    if (in_array($user->role, ['property_manager', 'front_desk', 'finance', 'housekeeping'])) {
        return true;
    }
    
    return false;
});

// Admin notification channel
Broadcast::channel('admin-notifications', function ($user) {
    return in_array($user->role, [
        'super_admin',
        'property_manager',
        'front_desk',
        'finance'
    ]);
});

// Presence channel for online users (optional)
Broadcast::channel('online-users', function ($user) {
    return [
        'id' => $user->id,
        'name' => $user->name,
        'role' => $user->role,
    ];
}); 