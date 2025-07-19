<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\BookingService;
use App\Services\RateCalculationService;
use App\Services\AvailabilityService;
use App\Services\RateService;
use App\Repositories\BookingRepository;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register services for dependency injection
        $this->app->singleton(BookingService::class, function ($app) {
            return new BookingService(
                $app->make(BookingRepository::class),
                $app->make(RateCalculationService::class),
                $app->make(AvailabilityService::class)
            );
        });

        $this->app->singleton(RateCalculationService::class, function ($app) {
            return new RateCalculationService();
        });

        $this->app->singleton(AvailabilityService::class, function ($app) {
            return new AvailabilityService(
                $app->make(RateCalculationService::class)
            );
        });

        $this->app->singleton(RateService::class, function ($app) {
            return new RateService();
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
