<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\SeoLandingController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\LegalViewController;
use App\Http\Controllers\PaymentGatewayController;
use App\Http\Controllers\ReviewController;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
| Routes accessible by anyone
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    // Check if user is authenticated
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
})->name('home');

// Properties
Route::controller(PropertyController::class)->group(function () {
    Route::get('/properties', 'index')->name('properties.index');
    Route::get('/properties/{property:slug}', 'show')->name('properties.show');
});

// Reviews (Public read-only)
Route::controller(ReviewController::class)->group(function () {
    Route::get('/properties/{property:slug}/reviews', 'index')->name('properties.reviews.index');
});

// Articles (Public)
Route::controller(ArticleController::class)->prefix('articles')->name('articles.')->group(function () {
    Route::get('/', 'indexPublic')->name('public.index');
    Route::get('/{article:slug}', 'showPublic')->name('public.show');
});

// Support Pages
Route::controller(SupportController::class)->group(function () {
    Route::get('/help', 'index')->name('help.index');
    Route::get('/help/article/{slug}', 'article')->name('help.article');
    Route::get('/support', 'contact')->name('support.contact');
    Route::post('/support', 'send')->name('support.send');
    Route::get('/faq', 'faq')->name('support.faq');
});

// Legal Pages
Route::controller(LegalViewController::class)->group(function () {
    Route::get('/legal/{slug}', 'show')->name('legal.show');
    Route::get('/privacy-policy', 'privacy')->name('legal.privacy');
    Route::get('/terms-of-service', 'terms')->name('legal.terms');
});

// Sitemap
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');

/*
|--------------------------------------------------------------------------
| BOOKING FLOW (Public/Guest)
|--------------------------------------------------------------------------
*/

// Booking Resume/Lookup
Route::controller(BookingController::class)->group(function () {
    Route::get('/booking/lookup', 'lookup')->name('booking.lookup');
    Route::post('/booking/lookup', 'find')->name('booking.find');
    Route::get('/booking/resume/{booking:booking_number}', 'resume')->name('booking.resume')
        ->middleware('signed'); // URL must be signed for security
});

/*
|--------------------------------------------------------------------------
| PAYMENT GATEWAY HANDLERS (Public/Callback)
|--------------------------------------------------------------------------
*/
Route::controller(PaymentGatewayController::class)
    ->prefix('payment/gateway')
    ->name('payment.gateway.')
    ->group(function () {
        Route::any('/callback', 'callback')->name('callback');
        Route::post('/webhook', 'webhook')->name('webhook');
        // Return URL is usually handling auth session if possible, but kept public just in case
        Route::get('/return', 'callback')->name('return'); // Map return to callback handling or specific method
    });

/*
|--------------------------------------------------------------------------
| UTILITY ROUTES
|--------------------------------------------------------------------------
*/

// Image Optimization Route (Public or Protected?)
// Ideally should be protected or signed, but for now specific controller
Route::get('/img/{path}', [\App\Services\ImageService::class, 'serve'])
    ->where('path', '.*')
    ->name('image.serve');

// Optimize Clear (Dev only - restricted in prod usually)
Route::get('/optimize-clear', function () {
    if (app()->environment('local')) {
        \Illuminate\Support\Facades\Artisan::call('optimize:clear');
        return 'Optimized cleared';
    }
    abort(404);
});

/*
|--------------------------------------------------------------------------
| AUTH ROUTES (Laravel Breeze)
|--------------------------------------------------------------------------
*/
require __DIR__ . '/auth.php';

/*
|--------------------------------------------------------------------------
| CATCH-ALL SEO ROUTE
|--------------------------------------------------------------------------
| Must be the very last route to avoid capturing other valid routes.
*/
Route::get('/{slug}', [SeoLandingController::class, 'show'])
    ->where('slug', '([a-zA-Z0-9\-\/]+)')
    ->fallback()
    ->name('seo.landing');
