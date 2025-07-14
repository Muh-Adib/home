<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\BookingServiceRefactored;
use App\Services\RateCalculationService;
use App\Services\AvailabilityService;
use App\Repositories\BookingRepository;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register services for dependency injection
        $this->app->singleton(BookingServiceRefactored::class, function ($app) {
            return new BookingServiceRefactored(
                $app->make(BookingRepository::class),
                $app->make(RateCalculationService::class)
            );
        });

        $this->app->singleton(RateCalculationService::class, function ($app) {
            return new RateCalculationService(
                $app->make(AvailabilityService::class)
            );
        });

        $this->app->singleton(BookingRepository::class, function ($app) {
            return new BookingRepository();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
