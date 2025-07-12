<?php

use App\Http\Controllers\PropertyController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MediaController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Inertia\Inertia;

// Health check endpoint for Docker
Route::get('/health', function () {
    return response()->json(['status' => 'healthy', 'timestamp' => now()]);
})->name('health');

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
| Routes accessible without authentication
|--------------------------------------------------------------------------
*/

// Locale switcher
Route::get('/locale/{locale}', function (string $locale) {
    if (in_array($locale, ['en', 'id'])) {
        session(['locale' => $locale]);
    }
    return back();
})->name('locale.switch');

// CSRF token refresh for AJAX requests
Route::get('/csrf-token', function () {
    return response()->json(['token' => csrf_token()]);
})->name('csrf.token');

// Homepage
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

// Public Property Routes
Route::controller(PropertyController::class)->group(function () {
    Route::get('/properties', 'index')->name('properties.index');
    Route::get('/properties/{property:slug}', 'show')->name('properties.show');
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

// Public API Routes
Route::prefix('api')->name('api.')->group(function () {
    Route::get('properties/{property:slug}/calculate-rate', [BookingController::class, 'calculateRate'])
        ->name('properties.calculate-rate');
    Route::get('properties/{property:slug}/availability', [BookingController::class, 'getAvailability'])
        ->name('properties.availability');
    Route::get('properties/{property:slug}/availability-and-rates', [BookingController::class, 'getAvailabilityAndRates'])
        ->name('properties.availability-and-rates');
    Route::post('check-email', [BookingController::class, 'checkEmailExists'])
        ->name('check-email');
});

/*
|--------------------------------------------------------------------------
| AUTHENTICATED USER ROUTES
|--------------------------------------------------------------------------
| Routes for logged-in users
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // User Bookings
    Route::get('my-bookings', [BookingController::class, 'myBookings'])->name('my-bookings');
    
    // User Payments
    Route::controller(PaymentController::class)->group(function () {
        Route::get('/my-payments', 'myPayments')->name('my-payments');
        Route::get('/my-payments/{payment}', 'myPaymentShow')->name('my-payments.show');
        
        // Secure payment routes
        Route::get('booking/{booking:booking_number}/payment/{token}', 'securePayment')
            ->name('booking.secure-payment')
            ->where('token', '[a-zA-Z0-9]{32}');
        Route::post('booking/{booking:booking_number}/payment/{token}', 'securePaymentStore')
            ->name('booking.secure-payment.store')
            ->where('token', '[a-zA-Z0-9]{32}');
    });
    
    // Authenticated API Routes
    Route::prefix('api')->name('api.')->group(function () {
        Route::controller(PropertyController::class)->group(function () {
            Route::get('properties/search', 'search')->name('properties.search');
            // Availability endpoint removed to avoid conflict with public route
        });
        Route::get('amenities', [AmenityController::class, 'api_index'])->name('amenities.index');
    });
    
    // Notification Routes
    Route::prefix('notifications')->name('notifications.')->controller(NotificationController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/unread', 'unread')->name('unread');
        Route::get('/recent', 'recent')->name('recent');
        Route::get('/count', 'count')->name('count');
        Route::patch('/{id}/read', 'markAsRead')->name('mark-read');
        Route::patch('/mark-all-read', 'markAllAsRead')->name('mark-all-read');
        Route::delete('/{id}', 'destroy')->name('destroy');
        Route::delete('/clear/read', 'clearRead')->name('clear-read');
    });
});

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES - PROPERTY MANAGEMENT
|--------------------------------------------------------------------------
| Routes for property managers, owners, and super admins
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,property_manager,property_owner'])->prefix('admin')->name('admin.')->group(function () {
    // Property Management - Now using dedicated PropertyManagementController
    Route::controller(App\Http\Controllers\Admin\PropertyManagementController::class)->group(function () {
        Route::get('properties', 'index')->name('properties.index');
        Route::get('properties/create', 'create')->name('properties.create');
        Route::post('properties', 'store')->name('properties.store');
        Route::get('properties/{property:slug}', 'show')->name('properties.show');
        Route::get('properties/{property:slug}/edit', 'edit')->name('properties.edit');
        Route::put('properties/{property:slug}', 'update')->name('properties.update');
        Route::delete('properties/{property:slug}', 'destroy')->name('properties.destroy');
        Route::get('properties/{property}/media', 'media')->name('properties.media');
        
        // Additional property management features
        Route::post('properties/bulk-status', 'bulkStatus')->name('properties.bulk-status');
        Route::patch('properties/{property:slug}/toggle-featured', 'toggleFeatured')->name('properties.toggle-featured');
        Route::post('properties/{property:slug}/duplicate', 'duplicate')->name('properties.duplicate');
        Route::get('properties/{property:slug}/analytics', 'analytics')->name('properties.analytics');
    });
    
    // Media Management
    Route::controller(MediaController::class)->prefix('properties/{property}/media')->name('media.')->group(function () {
        Route::post('upload', 'upload')->name('upload');
        Route::get('list', 'index')->name('index');
        Route::post('reorder', 'reorder')->name('reorder');
        Route::post('thumbnails', 'generateThumbnails')->name('thumbnails');
        Route::post('optimize', 'optimizeImages')->name('optimize');
    });
    
    Route::controller(MediaController::class)->prefix('media')->name('media.')->group(function () {
        Route::patch('{media}', 'update')->name('update');
        Route::delete('{media}', 'destroy')->name('destroy');
        Route::patch('{media}/featured', 'setFeatured')->name('featured');
    });
    
    // Seasonal Rates Management
    Route::controller(App\Http\Controllers\Admin\PropertySeasonalRateController::class)
        ->prefix('properties/{property}/seasonal-rates')
        ->name('properties.seasonal-rates.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{seasonalRate}', 'update')->name('update');
            Route::delete('{seasonalRate}', 'destroy')->name('destroy');
            Route::post('preview', 'preview')->name('preview');
        });
    
    // Amenities Management
    Route::resource('amenities', AmenityController::class)->names([
        'index' => 'amenities.index',
        'create' => 'amenities.create',
        'store' => 'amenities.store',
        'show' => 'amenities.show',
        'edit' => 'amenities.edit',
        'update' => 'amenities.update',
        'destroy' => 'amenities.destroy',
    ]);
    
    Route::controller(AmenityController::class)->prefix('amenities')->name('amenities.')->group(function () {
        Route::patch('{amenity}/status', 'toggleStatus')->name('toggle-status');
        Route::post('bulk-status', 'bulkStatus')->name('bulk-status');
        Route::post('reorder', 'reorder')->name('reorder');
    });
});

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES - BOOKING MANAGEMENT
|--------------------------------------------------------------------------
| Routes for booking management staff
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,property_manager,front_desk'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'admin'])->name('dashboard');
    
    // Booking Management - Consolidated under BookingManagementController
    Route::controller(App\Http\Controllers\Admin\BookingManagementController::class)->group(function () {
        // Main booking routes
        Route::get('bookings', 'index')->name('bookings.index');
        Route::get('bookings/calendar', 'calendar')->name('bookings.calendar');

        Route::get('bookings/create', 'create')->name('bookings.create');
        Route::post('bookings', 'store')->name('bookings.store');
        
        Route::get('bookings/{booking:booking_number}', 'show')->name('bookings.show');
        Route::get('bookings/timeline', 'timeline')->name('bookings.timeline');
        Route::get('bookings/timeline/{booking:booking_number}', 'timeline')->name('bookings.timeline.show');
        
        Route::patch('bookings/{booking:booking_number}/verify', 'verify')->name('bookings.verify');
        Route::patch('bookings/{booking:booking_number}/cancel', 'cancel')->name('bookings.cancel');
        Route::patch('bookings/{booking:booking_number}/checkin', 'checkin')->name('bookings.checkin');
        Route::patch('bookings/{booking:booking_number}/checkout', 'checkout')->name('bookings.checkout');
        
        // Booking management routes
        Route::get('booking-management', 'index')->name('booking-management.index');
        Route::get('booking-management/calendar', 'calendar')->name('booking-management.calendar');
        Route::get('booking-management/create', 'create')->name('booking-management.create');
        Route::post('booking-management', 'store')->name('booking-management.store');
        Route::get('booking-management/{booking:booking_number}', 'show')->name('booking-management.show');
    });
    
    // Booking Management API
    Route::prefix('api/admin/booking-management')->name('api.admin.booking-management.')->group(function () {
        $controller = App\Http\Controllers\Admin\BookingManagementController::class;
        Route::get('timeline', [$controller, 'timeline']);
        Route::post('check-availability', [$controller, 'checkAvailability']);
        Route::post('calculate-rate', [$controller, 'calculateRate']);
        Route::get('property-date-range', [$controller, 'getPropertyDateRange']);
    });
    
    // Cleaning Management
    Route::resource('cleaning-tasks', App\Http\Controllers\Admin\CleaningTaskController::class)
        ->names([
            'index' => 'cleaning-tasks.index',
            'create' => 'cleaning-tasks.create',
            'store' => 'cleaning-tasks.store',
            'show' => 'cleaning-tasks.show',
            'edit' => 'cleaning-tasks.edit',
            'update' => 'cleaning-tasks.update',
            'destroy' => 'cleaning-tasks.destroy',
        ]);
    
    Route::controller(App\Http\Controllers\Admin\CleaningTaskController::class)
        ->prefix('cleaning-tasks')
        ->name('cleaning-tasks.')
        ->group(function () {
            Route::post('{cleaningTask}/assign', 'assign')->name('assign');
            Route::post('{cleaningTask}/start', 'start')->name('start');
            Route::post('{cleaningTask}/complete', 'complete')->name('complete');
            Route::post('{cleaningTask}/submit-review', 'submitForReview')->name('submit-review');
            Route::post('{cleaningTask}/approve', 'approve')->name('approve');
            Route::get('calendar/data', 'calendar')->name('calendar');
            Route::post('bulk-action', 'bulkAction')->name('bulk-action');
        });
    
    // Cleaning Staff Management
    Route::controller(App\Http\Controllers\Admin\CleaningStaffController::class)
        ->prefix('cleaning-staff')
        ->name('cleaning-staff.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('{bookingId}/mark-cleaned', 'markAsCleaned')->name('mark-cleaned');
            Route::get('{bookingId}/generate-keybox', 'generateKeyboxCode')->name('generate-keybox');
            Route::get('stats', 'getCleaningStats')->name('stats');
        });
    
    // Cleaning Schedules
    Route::resource('cleaning-schedules', App\Http\Controllers\Admin\CleaningScheduleController::class)
        ->names([
            'index' => 'cleaning-schedules.index',
            'create' => 'cleaning-schedules.create',
            'store' => 'cleaning-schedules.store',
            'show' => 'cleaning-schedules.show',
            'edit' => 'cleaning-schedules.edit',
            'update' => 'cleaning-schedules.update',
            'destroy' => 'cleaning-schedules.destroy',
        ]);
    
    Route::controller(App\Http\Controllers\Admin\CleaningScheduleController::class)
        ->prefix('cleaning-schedules')
        ->name('cleaning-schedules.')
        ->group(function () {
            Route::post('{cleaningSchedule}/activate', 'activate')->name('activate');
            Route::post('{cleaningSchedule}/deactivate', 'deactivate')->name('deactivate');
            Route::post('{cleaningSchedule}/generate-tasks', 'generateTasks')->name('generate-tasks');
        });
});

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES - PAYMENT & FINANCE
|--------------------------------------------------------------------------
| Routes for payment and finance management
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,property_manager,finance'])->prefix('admin/payments')->name('admin.payments.')->group(function () {
    Route::controller(App\Http\Controllers\Admin\PaymentController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/manual-payment', 'manualCreate')->name('manual-create');
        Route::post('/manual-payment', 'manualStore')->name('manual-store');
        Route::get('/{payment:payment_number}', 'show')->name('show');
        Route::get('/{payment:payment_number}/edit', 'edit')->name('edit');
        Route::put('/{payment:payment_number}', 'update')->name('update');
        Route::patch('/{payment:payment_number}/verify', 'verify')->name('verify');
        Route::patch('/{payment:payment_number}/reject', 'reject')->name('reject');
        
        // Booking-specific payment routes
        Route::get('/booking/{booking:booking_number}/create', 'createForBooking')->name('create-for-booking');
        Route::post('/booking/{booking:booking_number}/create', 'storeForBooking')->name('store-for-booking');
        Route::get('/booking/{booking:booking_number}/additional', 'createAdditional')->name('create-additional');
        Route::post('/booking/{booking:booking_number}/additional', 'storeAdditional')->name('store-additional');
    });
});

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES - REPORTS & ANALYTICS
|--------------------------------------------------------------------------
| Routes for reports and analytics
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,property_manager,finance,property_owner'])->prefix('admin/reports')->name('admin.reports.')->group(function () {
    Route::controller(App\Http\Controllers\Admin\ReportController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/financial', 'financial')->name('financial');
        Route::get('/occupancy', 'occupancy')->name('occupancy');
        Route::get('/property-performance', 'propertyPerformance')->name('property-performance');
        Route::post('/export', 'export')->name('export');
    });
});

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES - INVENTORY MANAGEMENT
|--------------------------------------------------------------------------
| Routes for inventory management
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,property_manager,front_desk'])->prefix('admin')->name('admin.')->group(function () {
    // Inventory Categories
    Route::resource('inventory-categories', App\Http\Controllers\Admin\InventoryCategoryController::class)
        ->names([
            'index' => 'inventory-categories.index',
            'create' => 'inventory-categories.create',
            'store' => 'inventory-categories.store',
            'show' => 'inventory-categories.show',
            'edit' => 'inventory-categories.edit',
            'update' => 'inventory-categories.update',
            'destroy' => 'inventory-categories.destroy',
        ]);
    
    // Inventory Items
    Route::resource('inventory-items', App\Http\Controllers\Admin\InventoryItemController::class)
        ->names([
            'index' => 'inventory-items.index',
            'create' => 'inventory-items.create',
            'store' => 'inventory-items.store',
            'show' => 'inventory-items.show',
            'edit' => 'inventory-items.edit',
            'update' => 'inventory-items.update',
            'destroy' => 'inventory-items.destroy',
        ]);
    
    Route::controller(App\Http\Controllers\Admin\InventoryItemController::class)
        ->prefix('inventory-items')
        ->name('inventory-items.')
        ->group(function () {
            Route::post('{inventoryItem}/discontinue', 'discontinue')->name('discontinue');
            Route::post('{inventoryItem}/reactivate', 'reactivate')->name('reactivate');
            Route::get('{inventoryItem}/reorder-suggestion', 'reorderSuggestion')->name('reorder-suggestion');
            Route::get('{inventoryItem}/maintenance-schedule', 'maintenanceSchedule')->name('maintenance-schedule');
            Route::get('{inventoryItem}/expiry-alerts', 'expiryAlerts')->name('expiry-alerts');
        });
    
    // Inventory Stock Management
    Route::resource('inventory-stocks', App\Http\Controllers\Admin\InventoryStockController::class)
        ->names([
            'index' => 'inventory-stocks.index',
            'create' => 'inventory-stocks.create',
            'store' => 'inventory-stocks.store',
            'show' => 'inventory-stocks.show',
            'edit' => 'inventory-stocks.edit',
            'update' => 'inventory-stocks.update',
            'destroy' => 'inventory-stocks.destroy',
        ]);
    
    Route::controller(App\Http\Controllers\Admin\InventoryStockController::class)
        ->prefix('inventory-stocks')
        ->name('inventory-stocks.')
        ->group(function () {
            Route::post('{inventoryStock}/reserve', 'reserve')->name('reserve');
            Route::post('{inventoryStock}/release-reservation', 'releaseReservation')->name('release-reservation');
            Route::post('{inventoryStock}/add-stock', 'addStock')->name('add-stock');
            Route::post('{inventoryStock}/remove-stock', 'removeStock')->name('remove-stock');
            Route::post('{inventoryStock}/use-stock', 'useStock')->name('use-stock');
            Route::post('{inventoryStock}/update-condition', 'updateCondition')->name('update-condition');
            Route::post('{inventoryStock}/schedule-maintenance', 'scheduleMaintenance')->name('schedule-maintenance');
            Route::post('{inventoryStock}/complete-maintenance', 'completeMaintenance')->name('complete-maintenance');
            Route::get('{inventoryStock}/alerts', 'getAlerts')->name('alerts');
        });
    
    // Inventory Reports - DISABLED: Controller does not exist
    /*
    Route::controller(App\Http\Controllers\Admin\InventoryReportController::class)
        ->prefix('inventory/reports')
        ->name('inventory.reports.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('stock-levels', 'stockLevels')->name('stock-levels');
            Route::get('low-stock', 'lowStock')->name('low-stock');
            Route::get('expiry', 'expiry')->name('expiry');
            Route::get('maintenance', 'maintenance')->name('maintenance');
            Route::get('valuation', 'valuation')->name('valuation');
        });
    */
    
    // Inventory API endpoints - DISABLED: Controllers may not exist
    /*
    Route::prefix('api')->name('api.')->group(function () {
        Route::get('properties/{property}/cleaning-areas', [App\Http\Controllers\Admin\CleaningTaskController::class, 'getPropertyCleaningAreas'])
            ->name('properties.cleaning-areas');
        Route::get('inventory-categories/tree', [App\Http\Controllers\Admin\InventoryCategoryController::class, 'getTree'])
            ->name('inventory-categories.tree');
        Route::get('inventory-items/by-category/{category}', [App\Http\Controllers\Admin\InventoryItemController::class, 'getByCategory'])
            ->name('inventory-items.by-category');
        Route::get('inventory-stocks/by-property/{property}', [App\Http\Controllers\Admin\InventoryStockController::class, 'getByProperty'])
            ->name('inventory-stocks.by-property');
    });
    */
});

/*
|--------------------------------------------------------------------------
| SUPER ADMIN ROUTES
|--------------------------------------------------------------------------
| Routes restricted to super admin only
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin'])->prefix('admin')->name('admin.')->group(function () {
    // User Management
    Route::resource('users', App\Http\Controllers\Admin\UserController::class)
        ->names([
            'index' => 'users.index',
            'create' => 'users.create',
            'store' => 'users.store',
            'show' => 'users.show',
            'edit' => 'users.edit',
            'update' => 'users.update',
            'destroy' => 'users.destroy',
        ]);
    
    Route::patch('users/{user}/status', [App\Http\Controllers\Admin\UserController::class, 'toggleStatus'])
        ->name('users.status');
    
    // Payment Methods Management
    Route::controller(App\Http\Controllers\Admin\PaymentMethodController::class)
        ->prefix('payment-methods')
        ->name('payment-methods.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('{paymentMethod}', 'show')->name('show');
            Route::get('{paymentMethod}/edit', 'edit')->name('edit');
            Route::put('{paymentMethod}', 'update')->name('update');
            Route::delete('{paymentMethod}', 'destroy')->name('destroy');
            Route::put('{paymentMethod}/toggle', 'toggle')->name('toggle');
            Route::put('order', 'updateOrder')->name('update-order');
        });
    
    // Settings Management
    Route::controller(SettingsController::class)->prefix('settings')->name('settings.')->group(function () {
        Route::get('/', 'index')->name('index');
        
        // General Settings
        Route::get('general', 'general')->name('general');
        Route::post('general', 'updateGeneral')->name('general.update');
        
        // Payment Settings
        Route::get('payment', 'payment')->name('payment');
        Route::post('payment', 'updatePayment')->name('payment.update');
        
        // Email Settings
        Route::get('email', 'email')->name('email');
        Route::post('email', 'updateEmail')->name('email.update');
        Route::post('email/test', 'testEmail')->name('email.test');
        
        // System Settings
        Route::get('system', 'system')->name('system');
        Route::post('system', 'updateSystem')->name('system.update');
        Route::post('system/clear-cache', 'clearCache')->name('system.clear-cache');
        Route::post('system/backup', 'backupDatabase')->name('system.backup');
        
        // Booking Settings
        Route::get('booking', 'booking')->name('booking');
        Route::post('booking', 'updateBooking')->name('booking.update');
        
        // Property Settings
        Route::get('property', 'property')->name('property');
        Route::post('property', 'updateProperty')->name('property.update');
    });
});

/*
|--------------------------------------------------------------------------
| UTILITY ROUTES
|--------------------------------------------------------------------------
| Utility routes for broadcasting, testing, etc.
|--------------------------------------------------------------------------
*/

// Broadcasting authentication
Route::post('/broadcasting/auth', function (Request $request) {
    return response()->json(['authenticated' => true]);
})->middleware(['auth']);

// Test notification route for debugging
Route::post('/test-notification', function (Request $request) {
    if (!auth()->check()) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $user = auth()->user();
    
    $user->notify(new \App\Notifications\BookingCreatedNotification([
        'title' => $request->input('title', 'Test Notification'),
        'message' => $request->input('message', 'This is a test notification'),
        'action_url' => '/dashboard',
        'booking_number' => 'TEST-' . time(),
    ]));
    
    return response()->json(['success' => true, 'message' => 'Test notification sent']);
})->middleware(['auth']);

/*
|--------------------------------------------------------------------------
| INCLUDE ADDITIONAL ROUTE FILES
|--------------------------------------------------------------------------
*/

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';