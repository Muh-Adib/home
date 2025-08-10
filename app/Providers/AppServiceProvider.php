<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
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
        // Force HTTPS URLs when X-Forwarded-Proto is https (Traefik -> Nginx -> Laravel)
        if (request()->header('x-forwarded-proto') === 'https') {
            URL::forceScheme('https');
        }
        
        // Fallback: Force HTTPS in production if APP_URL is https
        if (app()->environment('production') && 
            config('app.url') && 
            str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
