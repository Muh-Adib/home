<?php

namespace App\Providers;

use App\Events\BookingCreated;
use App\Events\PaymentCreated;
use App\Listeners\SendBookingNotification;
use App\Listeners\SendPaymentNotification;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
        
        // Booking Events
        BookingCreated::class => [
            SendBookingNotification::class,
        ],

        // Payment Events
        PaymentCreated::class => [
            SendPaymentNotification::class,
        ],
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
        parent::boot();

        // Register additional event listeners dynamically if needed
        Event::listen('notification.*', function ($eventName, $data) {
            \Log::info("Notification event fired: {$eventName}", $data);
        });
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
