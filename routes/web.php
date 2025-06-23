<?php

use App\Http\Controllers\PropertyController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\Admin\SettingsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $featuredProperties = \App\Models\Property::active()
        ->featured()
        ->with(['media'])
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
                'media' => $property->media->map(function ($media) {
                    return [
                        'id' => $media->id,
                        'file_path' => $media->file_path,
                        'is_cover' => $media->is_cover,
                    ];
                }),
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

// Payment Routes (Public - for guest payment with booking number)
Route::get('/booking/{booking:booking_number}/payment', [PaymentController::class, 'create'])->name('payments.show');
Route::post('/booking/{booking:booking_number}/payment', [PaymentController::class, 'store'])->name('payments.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');
    
    // Guest Bookings (untuk users yang login)
    Route::get('my-bookings', [BookingController::class, 'myBookings'])->name('my-bookings');

    // Payment Routes for Users (with secure payment links)
    Route::middleware(['auth'])->group(function () {
        // Existing payment routes...
        
        // Secure payment link for verified bookings
        Route::get('booking/{booking:booking_number}/payment/{token}', [PaymentController::class, 'securePayment'])
            ->name('booking.secure-payment')
            ->where('token', '[a-zA-Z0-9]{32}'); // 32 character token
        
        Route::post('booking/{booking:booking_number}/payment/{token}', [PaymentController::class, 'securePaymentStore'])
            ->name('booking.secure-payment.store')
            ->where('token', '[a-zA-Z0-9]{32}');
    });

    // Payment history for authenticated users
    Route::get('/my-payments', [App\Http\Controllers\PaymentController::class, 'myPayments'])->name('my-payments');
    Route::get('/my-payments/{payment}', [App\Http\Controllers\PaymentController::class, 'myPaymentShow'])->name('my-payments.show');
});

// Admin Routes - Memerlukan role tertentu
Route::middleware(['auth', 'role:super_admin,property_manager,property_owner'])->group(function () {
    // Property Management Routes
    Route::get('admin/properties', [PropertyController::class, 'admin_index'])->name('admin.properties.index');
    Route::get('admin/properties/create', [PropertyController::class, 'create'])->name('admin.properties.create');
    Route::post('admin/properties', [PropertyController::class, 'store'])->name('admin.properties.store');
    Route::get('admin/properties/{property:slug}', [PropertyController::class, 'admin_show'])->name('admin.properties.show');
    Route::get('admin/properties/{property:slug}/edit', [PropertyController::class, 'edit'])->name('admin.properties.edit');
    Route::put('admin/properties/{property:slug}', [PropertyController::class, 'update'])->name('admin.properties.update');
    Route::delete('admin/properties/{property:slug}', [PropertyController::class, 'destroy'])->name('admin.properties.destroy');
    
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
        
    // Seasonal rates management
    Route::get('admin/properties/{property}/seasonal-rates', [App\Http\Controllers\Admin\PropertySeasonalRateController::class, 'index'])->name('admin.properties.seasonal-rates.index');
    Route::post('admin/properties/{property}/seasonal-rates', [App\Http\Controllers\Admin\PropertySeasonalRateController::class, 'store'])->name('admin.properties.seasonal-rates.store');
    Route::put('admin/properties/{property}/seasonal-rates/{seasonalRate}', [App\Http\Controllers\Admin\PropertySeasonalRateController::class, 'update'])->name('admin.properties.seasonal-rates.update');
    Route::delete('admin/properties/{property}/seasonal-rates/{seasonalRate}', [App\Http\Controllers\Admin\PropertySeasonalRateController::class, 'destroy'])->name('admin.properties.seasonal-rates.destroy');
    Route::post('admin/properties/{property}/seasonal-rates/preview', [App\Http\Controllers\Admin\PropertySeasonalRateController::class, 'preview'])->name('admin.properties.seasonal-rates.preview');

    // Amenities Management
    Route::resource('admin/amenities', AmenityController::class, [
        'as' => 'admin'
    ]);
    Route::patch('admin/amenities/{amenity}/status', [AmenityController::class, 'toggleStatus'])->name('admin.amenities.toggle-status');
    Route::post('admin/amenities/bulk-status', [AmenityController::class, 'bulkStatus'])->name('admin.amenities.bulk-status');
    Route::post('admin/amenities/reorder', [AmenityController::class, 'reorder'])->name('admin.amenities.reorder');
});

// Booking Management Routes - Staff only
Route::middleware(['auth', 'role:super_admin,property_manager,front_desk'])->group(function () {
    Route::get('admin/bookings', [BookingController::class, 'admin_index'])->name('admin.bookings.index');
    Route::get('admin/bookings/calendar', [BookingController::class, 'calendar'])->name('admin.bookings.calendar');
    Route::get('admin/bookings/{booking:booking_number}', [BookingController::class, 'admin_show'])->name('admin.bookings.show');
    Route::patch('admin/bookings/{booking:booking_number}/verify', [BookingController::class, 'verify'])->name('admin.bookings.verify');
    Route::patch('admin/bookings/{booking:booking_number}/cancel', [BookingController::class, 'cancel'])->name('admin.bookings.cancel');
    Route::patch('admin/bookings/{booking:booking_number}/checkin', [BookingController::class, 'checkin'])->name('admin.bookings.checkin');
    Route::patch('admin/bookings/{booking:booking_number}/checkout', [BookingController::class, 'checkout'])->name('admin.bookings.checkout');

    // Admin Booking Management Routes (for manual booking creation)
    Route::get('admin/booking-management', [App\Http\Controllers\Admin\BookingManagementController::class, 'index'])->name('admin.booking-management.index');
    Route::get('admin/booking-management/calendar', [App\Http\Controllers\Admin\BookingManagementController::class, 'calendar'])->name('admin.booking-management.calendar');
    Route::get('admin/booking-management/create', [App\Http\Controllers\Admin\BookingManagementController::class, 'create'])->name('admin.booking-management.create');
    Route::post('admin/booking-management', [App\Http\Controllers\Admin\BookingManagementController::class, 'store'])->name('admin.booking-management.store');
    
    // API Routes for booking management
    Route::prefix('api/admin/booking-management')->name('api.admin.booking-management.')->group(function () {
        Route::get('timeline', [App\Http\Controllers\Admin\BookingManagementController::class, 'timeline']);
        Route::post('check-availability', [App\Http\Controllers\Admin\BookingManagementController::class, 'checkAvailability']);
        Route::post('calculate-rate', [App\Http\Controllers\Admin\BookingManagementController::class, 'calculateRate']);
    });
});

// User Management Routes - Super Admin only
Route::middleware(['auth', 'role:super_admin'])->group(function () {
    Route::resource('admin/users', App\Http\Controllers\Admin\UserController::class, [
        'as' => 'admin'
    ]);
    Route::patch('admin/users/{user}/status', [App\Http\Controllers\Admin\UserController::class, 'toggleStatus'])->name('admin.users.status');
});

// Payment Management Routes - Finance & Admin
Route::middleware(['auth', 'role:super_admin,property_manager,finance'])->group(function () {
    Route::prefix('admin/payments')->name('admin.payments.')->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\PaymentController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Admin\PaymentController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Admin\PaymentController::class, 'store'])->name('store');
        Route::get('/manual-payment', [App\Http\Controllers\Admin\PaymentController::class, 'manualCreate'])->name('manual-create');
        Route::post('/manual-payment', [App\Http\Controllers\Admin\PaymentController::class, 'manualStore'])->name('manual-store');
        Route::get('/{payment:payment_number}', [App\Http\Controllers\Admin\PaymentController::class, 'show'])->name('show');
        Route::get('/{payment:payment_number}/edit', [App\Http\Controllers\Admin\PaymentController::class, 'edit'])->name('edit');
        Route::put('/{payment:payment_number}', [App\Http\Controllers\Admin\PaymentController::class, 'update'])->name('update');
        Route::patch('/{payment:payment_number}/verify', [App\Http\Controllers\Admin\PaymentController::class, 'verify'])->name('verify');
        Route::patch('/{payment:payment_number}/reject', [App\Http\Controllers\Admin\PaymentController::class, 'reject'])->name('reject');
        
        // Additional payment creation routes with booking reference
        Route::get('/booking/{booking:booking_number}/create', [App\Http\Controllers\Admin\PaymentController::class, 'createForBooking'])->name('create-for-booking');
        Route::post('/booking/{booking:booking_number}/create', [App\Http\Controllers\Admin\PaymentController::class, 'storeForBooking'])->name('store-for-booking');
        Route::get('/booking/{booking:booking_number}/additional', [App\Http\Controllers\Admin\PaymentController::class, 'createAdditional'])->name('create-additional');
        Route::post('/booking/{booking:booking_number}/additional', [App\Http\Controllers\Admin\PaymentController::class, 'storeAdditional'])->name('store-additional');
    });
});

// Reports & Analytics Routes - Management & Finance
Route::middleware(['auth', 'role:super_admin,property_manager,finance,property_owner'])->group(function () {
    Route::get('admin/reports', [App\Http\Controllers\Admin\ReportController::class, 'index'])->name('admin.reports.index');
    Route::get('admin/reports/financial', [App\Http\Controllers\Admin\ReportController::class, 'financial'])->name('admin.reports.financial');
    Route::get('admin/reports/occupancy', [App\Http\Controllers\Admin\ReportController::class, 'occupancy'])->name('admin.reports.occupancy');
    Route::get('admin/reports/property-performance', [App\Http\Controllers\Admin\ReportController::class, 'propertyPerformance'])->name('admin.reports.property-performance');
    Route::post('admin/reports/export', [App\Http\Controllers\Admin\ReportController::class, 'export'])->name('admin.reports.export');
});

// Payment Methods Management & Settings - Super Admin only
Route::middleware(['auth', 'role:super_admin'])->group(function () {
    Route::prefix('admin/payment-methods')->name('admin.payment-methods.')->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\PaymentMethodController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Admin\PaymentMethodController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Admin\PaymentMethodController::class, 'store'])->name('store');
        Route::get('/{paymentMethod}', [App\Http\Controllers\Admin\PaymentMethodController::class, 'show'])->name('show');
        Route::get('/{paymentMethod}/edit', [App\Http\Controllers\Admin\PaymentMethodController::class, 'edit'])->name('edit');
        Route::put('/{paymentMethod}', [App\Http\Controllers\Admin\PaymentMethodController::class, 'update'])->name('update');
        Route::delete('/{paymentMethod}', [App\Http\Controllers\Admin\PaymentMethodController::class, 'destroy'])->name('destroy');
        Route::put('/{paymentMethod}/toggle', [App\Http\Controllers\Admin\PaymentMethodController::class, 'toggle'])->name('toggle');
        Route::put('/order', [App\Http\Controllers\Admin\PaymentMethodController::class, 'updateOrder'])->name('update-order');
    });
    
    // Settings Management (Super Admin only)
    Route::prefix('admin/settings')->name('admin.settings.')->group(function () {
        Route::get('/', [SettingsController::class, 'index'])->name('index');
        
        Route::get('/general', [SettingsController::class, 'general'])->name('general');
        Route::post('/general', [SettingsController::class, 'updateGeneral'])->name('general.update');
        
        Route::get('/payment', [SettingsController::class, 'payment'])->name('payment');
        Route::post('/payment', [SettingsController::class, 'updatePayment'])->name('payment.update');
        
        Route::get('/email', [SettingsController::class, 'email'])->name('email');
        Route::post('/email', [SettingsController::class, 'updateEmail'])->name('email.update');
        Route::post('/email/test', [SettingsController::class, 'testEmail'])->name('email.test');
        
        Route::get('/system', [SettingsController::class, 'system'])->name('system');
        Route::post('/system', [SettingsController::class, 'updateSystem'])->name('system.update');
        Route::post('/system/clear-cache', [SettingsController::class, 'clearCache'])->name('system.clear-cache');
        Route::post('/system/backup', [SettingsController::class, 'backupDatabase'])->name('system.backup');
        
        Route::get('/booking', [SettingsController::class, 'booking'])->name('booking');
        Route::post('/booking', [SettingsController::class, 'updateBooking'])->name('booking.update');
        
        Route::get('/property', [SettingsController::class, 'property'])->name('property');
        Route::post('/property', [SettingsController::class, 'updateProperty'])->name('property.update');
    });
});

// API Routes for authenticated users
Route::middleware(['auth'])->group(function () {
    Route::prefix('api')->group(function () {
        Route::get('properties/search', [PropertyController::class, 'search'])->name('api.properties.search');
        Route::get('properties/{property}/availability', [PropertyController::class, 'availability'])->name('api.properties.availability');
        Route::get('amenities', [AmenityController::class, 'api_index'])->name('api.amenities.index');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
