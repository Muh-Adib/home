<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ICalController;
use App\Http\Controllers\LegalViewController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SeoLandingController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\StaticPageController;
use App\Http\Controllers\WellKnownController;
use App\Models\Property;
use App\Models\SeoLandingPage;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
| Routes accessible without authentication
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| 410 GONE ROUTES (WordPress & Legacy URLs)
|--------------------------------------------------------------------------
| Instructs search engines to drop these URLs from index.
*/

/* / Legacy prefixes
Route::get('/{legacyPrefix}/{any?}', function () {
    abort(410);
})->whereIn('legacyPrefix', [
    'produk', 'fasilitas-utama', 'fasilitas', 'author', 'tag', '2025',
    'product-category', 'property', 'proprtey', 'akomodasi', 'tipe-unit',
    'jet-popup', 'search', 'shop', 'blog',
])->where('any', '.*');

// Specific standalone legacy pages
$legacyStandalone = [
    'home',
    'tentang-kami',
    'perbedaan-jenis-akomodasi-villa-guesthouse-dan-homestay',
    'refund_returns',
    'keunggulan-homestay-alternatif-penginapan-yang-serasa-di-rumah',
    'help',
    'petualangan-tak-terlupakan-jelajahi-pesona-jogja-dari-sunrise-hingga-midnight',
    'keunikan-menginap-di-homestay-lebih-dari-sekadar-akomodasi',
    'akun',
    'terms',
    'contact',
    'lebaran-seru-bersama-homsjogja-nikmati-momen-spesial-di-akomodasi-terbaik-yogyakarta',
];

foreach ($legacyStandalone as $url) {
    Route::any("/{$url}", function () {
        abort(410);
    });
}*/

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

// Dynamic Sitemaps (Index & Chunks for 100k+ Pages)
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap.index');
Route::get('/sitemap-core.xml', [SitemapController::class, 'core'])->name('sitemap.core');
Route::get('/sitemap-articles.xml', [SitemapController::class, 'articles'])->name('sitemap.articles');
Route::get('/sitemap-pseo-{chunk}.xml', [SitemapController::class, 'pseo'])->name('sitemap.pseo');

// Agent & API discoverability (RFC 8288 / RFC 9727)
Route::prefix('.well-known')->name('well-known.')->group(function () {
    Route::get('/agent.json', [WellKnownController::class, 'agent'])->name('agent');
    Route::get('/api-catalog', [WellKnownController::class, 'apiCatalog'])->name('api-catalog');
});

// iCal Export (Public but protected by token)
Route::get('/property/{slug}/ical/{token}', [ICalController::class, 'export'])->name('ical.export');

// Homepage
Route::get('/', [StaticPageController::class, 'home'])->name('home');

// Static Pages
Route::get('/about', [StaticPageController::class, 'about'])->name('about');
Route::get('/faq', [StaticPageController::class, 'faq'])->name('faq');
Route::get('/support', [StaticPageController::class, 'support'])->name('support');

// Legal Pages (specific slugs)
Route::get('/{slug}', [LegalViewController::class, 'show'])
    ->whereIn('slug', [
        'tos',
        'privacy',
        'cookies',
        'refundpolicy',
        'paymentpolicy',
        'copyrightpolicy',
        'disclaimer',
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
    Route::get('/booking/{booking:booking_number}/invoice', 'invoice')->name('bookings.guest-invoice');
});

// Public Payment Routes
Route::controller(PaymentController::class)->group(function () {
    Route::get('/booking/{booking:booking_number}/payment', 'create')->name('payments.create');
    Route::post('/booking/{booking:booking_number}/payment', 'store')->name('payments.store');
    Route::post('/booking/{booking:booking_number}/payment/cancel-pending', 'cancelPending')->name('payments.cancel-pending');
});

/*
|--------------------------------------------------------------------------
| PAYMENT GATEWAY ROUTES
|--------------------------------------------------------------------------
| Routes for payment gateway integration (iPaymu)
|--------------------------------------------------------------------------
*/

// Webhook route (public, no auth required) - Moota Webhook Route
Route::post('/payment-gateway/moota/webhook', [PaymentController::class, 'mootaWebhook'])
    ->name('payment-gateway.moota.webhook');

// Public API Routes
Route::prefix('api')->name('api.')->group(function () {
    Route::get('properties/{property:slug}/calculate-rate', [BookingController::class, 'calculateRate'])
        ->name('properties.calculate-rate');
    Route::post('properties/{property:slug}/calculate-rate', [BookingController::class, 'calculateRate'])
        ->name('properties.calculate-rate.post');
    Route::get('properties/{property:slug}/availability', [BookingController::class, 'getAvailability'])
        ->name('properties.availability');
    Route::get('properties/{property:slug}/availability-and-rates', [BookingController::class, 'getAvailabilityAndRates'])
        ->name('properties.availability-and-rates');
    Route::get('properties/map-coordinates', [PropertyController::class, 'mapCoordinates'])
        ->name('properties.map-coordinates');
    Route::post('check-email', [BookingController::class, 'checkEmailExists'])
        ->name('check-email');
    Route::get('properties', [PropertyController::class, 'apiIndex'])
        ->name('properties.api-index');
});

/*
|--------------------------------------------------------------------------
| UTILITY ROUTES
|--------------------------------------------------------------------------
*/

// Image Optimization Route
Route::get('/img/{path}', [ImageService::class, 'serve'])
    ->where('path', '.*')
    ->name('image.serve');

// Optimize Clear (Dev only)
Route::get('/optimize-clear', function () {
    if (app()->environment('local')) {
        Artisan::call('optimize:clear');

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

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/dev.php';

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
        fn () => SeoLandingPage::where('slug', $oldSlug)->exists()
    );
    if ($exists) {
        return redirect("/s/{$oldSlug}", 301);
    }
    abort(410);
})->where('oldSlug', '(?!dashboard|admin|properties|booking|bookings|api|my-bookings|my-payments|profile|notifications|about|faq|support|health|sitemap|locale|csrf-token|login|register|password|email|verify-email|logout|settings|up)[a-z0-9-]+');

Route::get('/debug-props', function () {
    return Property::active()->featured()->with(['media', 'amenities'])->limit(6)->get();
});
