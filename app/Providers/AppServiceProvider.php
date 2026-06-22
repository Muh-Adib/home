<?php

namespace App\Providers;

use App\Models\Article;
use App\Models\Booking;
use App\Models\ContentPlan;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Observers\ArticleObserver;
use App\Observers\BookingObserver;
use App\Observers\ContentPlanObserver;
use App\Observers\PropertyObserver;
use App\Observers\PropertySeasonalRateObserver;
use App\Repositories\BookingRepository;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\RateCalculationService;
use App\Services\RateService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

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
            return new RateCalculationService;
        });

        $this->app->singleton(AvailabilityService::class, function ($app) {
            return new AvailabilityService(
                $app->make(RateCalculationService::class)
            );
        });

        $this->app->singleton(RateService::class, function ($app) {
            return new RateService;
        });

        $this->app->singleton(BookingRepository::class, function ($app) {
            return new BookingRepository;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS in production, staging, or if configured
        if (app()->environment('production', 'staging') || (filter_var(config('app.url'), FILTER_VALIDATE_URL) && str_starts_with(config('app.url'), 'https://'))) {
            \URL::forceScheme('https');
            request()->server->set('HTTPS', 'on');
        }

        Article::observe(ArticleObserver::class);
        ContentPlan::observe(ContentPlanObserver::class);
        Property::observe(PropertyObserver::class);
        Booking::observe(BookingObserver::class);
        PropertySeasonalRate::observe(PropertySeasonalRateObserver::class);

        // Rate limiters for API v1
        RateLimiter::for('api-v1-read', function (Request $request) {
            $token = $request->attributes->get('api_token');
            $key = $token ? "api_read_{$token->id}" : "api_read_{$request->ip()}";

            return Limit::perMinute(120)->by($key);
        });

        RateLimiter::for('api-v1-write', function (Request $request) {
            $token = $request->attributes->get('api_token');
            $key = $token ? "api_write_{$token->id}" : "api_write_{$request->ip()}";

            return Limit::perMinute(30)->by($key);
        });
    }
}
