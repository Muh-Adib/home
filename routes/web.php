<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\SeoLandingController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\LegalViewController;
use App\Http\Controllers\PaymentGatewayController;
use App\Http\Controllers\ReviewController;
use Illuminate\Http\Request;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
| Routes accessible without authentication
|--------------------------------------------------------------------------
*/

// CSRF Token endpoint for refreshing token (prevents 419 errors)
Route::get('/csrf-token', function (Request $request) {
    return response()->json(['token' => csrf_token()]);
})->middleware('web')->name('csrf.token');

// Locale switcher
Route::get('/locale/{locale}', function (string $locale) {
    if (in_array($locale, ['en', 'id'])) {
        session(['locale' => $locale]);
    }
    return back();
})->name('locale.switch');

// Health check endpoint for Docker
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'version' => config('app.version', '1.0.0'),
        'environment' => config('app.env'),
    ]);
})->name('health');

// Dynamic Sitemap
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/sitemap-articles.xml', [SitemapController::class, 'articles'])->name('sitemap.articles');

// iCal Export (Public but protected by token)
Route::get('/property/{slug}/ical/{token}', [\App\Http\Controllers\ICalController::class, 'export'])->name('ical.export');

// Homepage
Route::get('/', function () {
    $seoService = app(\App\Services\SeoService::class);

    $featuredProperties = \App\Models\Property::active()
        ->featured()
        ->with(['media', 'amenities'])
        ->limit(6)
        ->get();

    return Inertia::render('welcome', [
        'featuredProperties' => $featuredProperties,
        'seo' => $seoService->forHomepage(),
    ]);
})->name('home');

// Static Pages
Route::get('/about', function () {
    return Inertia::render('About');
})->name('about');

Route::get('/faq', function () {
    return Inertia::render('FAQ');
})->name('faq');

Route::get('/support', function () {
    return Inertia::render('Support');
})->name('support');

// Legal Pages (specific slugs)
Route::get('/{slug}', [LegalViewController::class, 'show'])
    ->whereIn('slug', [
        'tos',
        'privacy',
        'cookies',
        'refundpolicy',
        'paymentpolicy',
        'copyrightpolicy',
        'disclaimer'
    ]);

// Public Property Routes
Route::controller(PropertyController::class)->group(function () {
    Route::get('/properties', 'index')->name('properties.index');
    Route::get('/properties/{property:slug}', 'show')->name('properties.show');
});

// Reviews (Public read-only)
Route::controller(ReviewController::class)->group(function () {
    Route::get('/properties/{property:slug}/reviews', 'index')->name('properties.reviews.index');
});

// Public Article Routes
Route::controller(ArticleController::class)->group(function () {
    Route::get('/articles', 'publicIndex')->name('articles.index');
    Route::get('/articles/{article:slug}', 'show')->name('articles.show');
});

// Public Booking Routes
Route::controller(BookingController::class)->group(function () {
    Route::get('/properties/{property:slug}/book', 'create')->name('bookings.create');
    Route::post('/properties/{property:slug}/book', 'store')->name('bookings.store');
    Route::get('/booking/{booking:booking_number}/confirmation', 'confirmation')->name('bookings.confirmation');
});

// Public Payment Routes
Route::controller(PaymentController::class)->group(function () {
    Route::get('/booking/{booking:booking_number}/payment', 'create')->name('payments.create');
    Route::post('/booking/{booking:booking_number}/payment', 'store')->name('payments.store');
});

/*
|--------------------------------------------------------------------------
| PAYMENT GATEWAY ROUTES
|--------------------------------------------------------------------------
| Routes for payment gateway integration (iPaymu)
|--------------------------------------------------------------------------
*/

// Webhook route (public, no auth required)
Route::post('/payment-gateway/webhook', [PaymentGatewayController::class, 'webhook'])
    ->name('payment-gateway.webhook')
    ->withoutMiddleware(['csrf', 'auth']);

// Payment Gateway Callback (Public - redirect dari iPaymu)
Route::get(
    '/payment-gateway/callback',
    [PaymentGatewayController::class, 'callback']
)
    ->name('payment-gateway.callback');

// Public API Routes
Route::prefix('api')->name('api.')->group(function () {
    Route::get('properties/{property:slug}/calculate-rate', [BookingController::class, 'calculateRate'])
        ->name('properties.calculate-rate');
    Route::get('properties/{property:slug}/availability', [BookingController::class, 'getAvailability'])
        ->name('properties.availability');
    Route::get('properties/{property:slug}/availability-and-rates', [BookingController::class, 'getAvailabilityAndRates'])
        ->name('properties.availability-and-rates');
    Route::get('properties/map-coordinates', [PropertyController::class, 'mapCoordinates'])
        ->name('properties.map-coordinates');
    Route::post('check-email', [BookingController::class, 'checkEmailExists'])
        ->name('check-email');
    Route::get('properties', function () {
        $properties = \App\Models\Property::active()
            ->with(['media', 'amenities'])
            ->get();
        return response()->json([
            'status' => 'success',
            'data' => $properties,
        ]);
    });
});

/*
|--------------------------------------------------------------------------
| UTILITY ROUTES
|--------------------------------------------------------------------------
*/

// Image Optimization Route
Route::get('/img/{path}', [\App\Services\ImageService::class, 'serve'])
    ->where('path', '.*')
    ->name('image.serve');

// Optimize Clear (Dev only)
Route::get('/optimize-clear', function () {
    if (app()->environment('local')) {
        \Illuminate\Support\Facades\Artisan::call('optimize:clear');
        return 'Optimized cleared';
    }
    abort(404);
});

// Broadcasting authentication
Route::post('/broadcasting/auth', function (Request $request) {
    return response()->json(['authenticated' => true]);
})->middleware(['auth']);

/*
|--------------------------------------------------------------------------
| INCLUDE ADDITIONAL ROUTE FILES
|--------------------------------------------------------------------------
*/

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

/*
|--------------------------------------------------------------------------
| PROGRAMMATIC SEO LANDING PAGES
|--------------------------------------------------------------------------
| Prefixed under /s/ for clean URL hierarchy and to avoid route conflicts.
| 301 redirect from old /{slug} URLs to preserve SEO rankings.
*/

Route::get('/s/{slug}', [SeoLandingController::class, 'show'])
    ->where('slug', '[a-z0-9-]+')
    ->name('seo.landing');

// 301 Redirect: old /{slug} → /s/{slug} for backward compatibility
// IMPORTANT: Exclude known application routes to avoid conflicts
Route::get('/{oldSlug}', function (string $oldSlug) {
    $exists = Cache::remember(
        "seo_slug_{$oldSlug}",
        3600,
        fn() => \App\Models\SeoLandingPage::where('slug',$oldSlug)->exists()
    );
    if ($exists) {
        return redirect("/s/{$oldSlug}", 301);
    }
    abort(410);
})->where('oldSlug', '(?!dashboard|admin|properties|booking|bookings|api|my-bookings|my-payments|profile|notifications|about|faq|support|health|sitemap|locale|csrf-token|login|register|password|email|verify-email|logout|settings|up)[a-z0-9-]+');
