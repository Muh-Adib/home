<?php

use App\Http\Controllers\PropertyController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\AmenityController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $featuredProperties = \App\Models\Property::active()
        ->featured()
        ->with(['coverImage'])
        ->limit(6)
        ->get()
        ->map(function ($property) {
            return [
                'id' => $property->id,
                'name' => $property->name,
                'slug' => $property->slug,
                'description' => $property->description,
                'address' => $property->address,
                'base_rate' => $property->base_rate,
                'formatted_base_rate' => $property->formatted_base_rate,
                'capacity' => $property->capacity,
                'capacity_max' => $property->capacity_max,
                'bedroom_count' => $property->bedroom_count,
                'bathroom_count' => $property->bathroom_count,
                'is_featured' => $property->is_featured,
                'cover_image' => $property->coverImage->first()?->url,
            ];
        });

    return Inertia::render('welcome', [
        'featuredProperties' => $featuredProperties,
    ]);
})->name('home');

// Public Property Listing
Route::get('/properties', [PropertyController::class, 'index'])->name('properties.index');
Route::get('/properties/{property}', [PropertyController::class, 'show'])->name('properties.show');

// API Routes for public access (no auth required)
Route::prefix('api')->group(function () {
    Route::get('properties/{property}/calculate-rate', [PropertyController::class, 'calculateRate'])->name('api.properties.calculate-rate');
});

// Booking Routes (Public - for guests)
Route::get('/properties/{property:slug}/book', [BookingController::class, 'create'])->name('bookings.create');
Route::post('/properties/{property:slug}/book', [BookingController::class, 'store'])->name('bookings.store');
Route::get('/booking/{booking}/confirmation', [BookingController::class, 'confirmation'])->name('bookings.confirmation');

// Payment Routes (Public - for payment process)
Route::get('/booking/{booking:booking_number}/payment', [PaymentController::class, 'create'])->name('payments.show');
Route::post('/booking/{booking:booking_number}/payment', [PaymentController::class, 'store'])->name('payments.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');

    // Property Management Routes
    Route::get('admin/properties', [PropertyController::class, 'admin_index'])->name('admin.properties.index');
    Route::get('admin/properties/create', [PropertyController::class, 'create'])->name('admin.properties.create');
    Route::post('admin/properties', [PropertyController::class, 'store'])->name('admin.properties.store');
    Route::get('admin/properties/{property}', [PropertyController::class, 'admin_show'])->name('admin.properties.show');
    Route::get('admin/properties/{property}/edit', [PropertyController::class, 'edit'])->name('admin.properties.edit');
    Route::put('admin/properties/{property}', [PropertyController::class, 'update'])->name('admin.properties.update');
    Route::delete('admin/properties/{property}', [PropertyController::class, 'destroy'])->name('admin.properties.destroy');

    // Booking Management Routes
    Route::get('admin/bookings', [BookingController::class, 'admin_index'])->name('admin.bookings.index');
    Route::get('admin/bookings/calendar', [BookingController::class, 'calendar'])->name('admin.bookings.calendar');
    Route::get('admin/bookings/{booking}', [BookingController::class, 'admin_show'])->name('admin.bookings.show');
    Route::patch('admin/bookings/{booking}/verify', [BookingController::class, 'verify'])->name('admin.bookings.verify');
    Route::patch('admin/bookings/{booking}/cancel', [BookingController::class, 'cancel'])->name('admin.bookings.cancel');
    Route::patch('admin/bookings/{booking}/checkin', [BookingController::class, 'checkin'])->name('admin.bookings.checkin');
    Route::patch('admin/bookings/{booking}/checkout', [BookingController::class, 'checkout'])->name('admin.bookings.checkout');

    // User Management Routes
    Route::resource('admin/users', App\Http\Controllers\Admin\UserController::class, [
        'as' => 'admin'
    ]);
    Route::patch('admin/users/{user}/status', [App\Http\Controllers\Admin\UserController::class, 'toggleStatus'])->name('admin.users.status');

    // Payment Management Routes
    Route::get('admin/payments', [PaymentController::class, 'admin_index'])->name('admin.payments.index');
    Route::get('admin/payments/{payment}', [PaymentController::class, 'admin_show'])->name('admin.payments.show');
    Route::patch('admin/payments/{payment}/verify', [PaymentController::class, 'verify'])->name('admin.payments.verify');
    Route::patch('admin/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('admin.payments.reject');

    // Reports & Analytics Routes
    Route::get('admin/reports', [App\Http\Controllers\Admin\ReportController::class, 'index'])->name('admin.reports.index');
    Route::get('admin/reports/financial', [App\Http\Controllers\Admin\ReportController::class, 'financial'])->name('admin.reports.financial');
    Route::get('admin/reports/occupancy', [App\Http\Controllers\Admin\ReportController::class, 'occupancy'])->name('admin.reports.occupancy');
    Route::get('admin/reports/property-performance', [App\Http\Controllers\Admin\ReportController::class, 'propertyPerformance'])->name('admin.reports.property-performance');
    Route::post('admin/reports/export', [App\Http\Controllers\Admin\ReportController::class, 'export'])->name('admin.reports.export');

    // Media Management Routes
    Route::get('admin/properties/{property}/media', [PropertyController::class, 'media'])->name('admin.properties.media');
    Route::post('admin/properties/{property}/media/upload', [App\Http\Controllers\MediaController::class, 'upload'])->name('admin.media.upload');
    Route::get('admin/properties/{property}/media/list', [App\Http\Controllers\MediaController::class, 'index'])->name('admin.media.index');
    Route::patch('admin/media/{media}', [App\Http\Controllers\MediaController::class, 'update'])->name('admin.media.update');
    Route::delete('admin/media/{media}', [App\Http\Controllers\MediaController::class, 'destroy'])->name('admin.media.destroy');
    Route::post('admin/properties/{property}/media/reorder', [App\Http\Controllers\MediaController::class, 'reorder'])->name('admin.media.reorder');
    Route::patch('admin/media/{media}/featured', [App\Http\Controllers\MediaController::class, 'setFeatured'])->name('admin.media.featured');
    Route::post('admin/properties/{property}/media/thumbnails', [App\Http\Controllers\MediaController::class, 'generateThumbnails'])->name('admin.media.thumbnails');
    Route::post('admin/properties/{property}/media/optimize', [App\Http\Controllers\MediaController::class, 'optimizeImages'])->name('admin.media.optimize');

    // Amenities Management
    Route::resource('admin/amenities', AmenityController::class, [
        'as' => 'admin'
    ]);
    Route::patch('admin/amenities/{amenity}/status', [AmenityController::class, 'toggleStatus'])->name('admin.amenities.toggle-status');
    Route::post('admin/amenities/bulk-status', [AmenityController::class, 'bulkStatus'])->name('admin.amenities.bulk-status');
    Route::post('admin/amenities/reorder', [AmenityController::class, 'reorder'])->name('admin.amenities.reorder');

    // API Routes for data fetching
    Route::prefix('api')->group(function () {
        Route::get('properties/search', [PropertyController::class, 'search'])->name('api.properties.search');
        Route::get('properties/{property}/availability', [PropertyController::class, 'availability'])->name('api.properties.availability');
        Route::get('amenities', [AmenityController::class, 'api_index'])->name('api.amenities.index');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
