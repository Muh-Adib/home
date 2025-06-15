<?php

namespace App\Providers;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use App\Policies\BookingPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\PaymentMethodPolicy;
use App\Policies\PropertyPolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Auth\Access\Response;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Booking::class => BookingPolicy::class,
        Property::class => PropertyPolicy::class,
        Payment::class => PaymentPolicy::class,
        PaymentMethod::class => PaymentMethodPolicy::class,
        User::class => UserPolicy::class,
    ];

    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Register custom policy methods manually
        Gate::define('makePayment', function (User $user, Booking $booking) {
            return app(PaymentPolicy::class)->makePayment($user, $booking);
        });

        // Define additional gates if needed
        Gate::define('admin-access', function (User $user) {
            return in_array($user->role, [
                'super_admin',
                'property_manager',
                'front_desk',
                'finance'
            ]);
        });

        Gate::define('property-owner-access', function (User $user) {
            return $user->role === 'property_owner';
        });

        Gate::define('staff-access', function (User $user) {
            return in_array($user->role, [
                'super_admin',
                'property_manager',
                'front_desk',
                'finance',
                'housekeeping'
            ]);
        });

        Gate::define('financial-access', function (User $user) {
            return in_array($user->role, [
                'super_admin',
                'property_manager',
                'finance'
            ]);
        });

        Gate::define('super-admin-only', function (User $user) {
            return $user->role === 'super_admin';
        });

        Gate::define('manageSettings', function (User $user) {
            return $user->role === 'super_admin' ? Response::allow() : Response::deny('You are not authorized to manage settings.');
        });

        
        
    }
}
