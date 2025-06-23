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

// Broadcasting authentication route
Route::post('/broadcasting/auth', function (Request $request) {
    return response()->json(['authenticated' => true]);
})->middleware(['auth']);

// Test notification route for debugging
Route::post('/test-notification', function (Request $request) {
    if (!auth()->check()) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $user = auth()->user();
    
    // Create a test notification
    $user->notify(new \App\Notifications\BookingCreatedNotification([
        'title' => $request->input('title', 'Test Notification'),
        'message' => $request->input('message', 'This is a test notification'),
        'action_url' => '/dashboard',
        'booking_number' => 'TEST-' . time(),
    ]));
    
    return response()->json(['success' => true, 'message' => 'Test notification sent']);
})->middleware(['auth']);

// Notification routes
Route::middleware(['auth'])->prefix('notifications')->name('notifications.')->group(function () {
    Route::get('/', [App\Http\Controllers\NotificationController::class, 'index'])->name('index');
    Route::get('/unread', [App\Http\Controllers\NotificationController::class, 'unread'])->name('unread');
    Route::get('/recent', [App\Http\Controllers\NotificationController::class, 'recent'])->name('recent');
    Route::get('/count', [App\Http\Controllers\NotificationController::class, 'count'])->name('count');
    Route::patch('/{id}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('mark-read');
    Route::patch('/mark-all-read', [App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('mark-all-read');
    Route::delete('/{id}', [App\Http\Controllers\NotificationController::class, 'destroy'])->name('destroy');
    Route::delete('/clear/read', [App\Http\Controllers\NotificationController::class, 'clearRead'])->name('clear-read');
});

Route::middleware(['auth', 'role:super_admin,property_manager,front_desk'])->prefix('admin')->name('admin.')->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'admin'])->name('dashboard');
    
    // Users Management  
    // Route::resource('users', Admin\UserController::class);
    
    // Properties Management
    // Route::resource('properties', App\Http\Controllers\Admin\PropertyController::class);
    Route::get('properties/{property}/seasonal-rates', [Admin\PropertySeasonalRateController::class, 'index'])->name('properties.seasonal-rates.index');
    Route::post('properties/{property}/seasonal-rates', [Admin\PropertySeasonalRateController::class, 'store'])->name('properties.seasonal-rates.store');
    Route::put('properties/{property}/seasonal-rates/{seasonalRate}', [Admin\PropertySeasonalRateController::class, 'update'])->name('properties.seasonal-rates.update');
    Route::delete('properties/{property}/seasonal-rates/{seasonalRate}', [Admin\PropertySeasonalRateController::class, 'destroy'])->name('properties.seasonal-rates.destroy');
    
    // Bookings Management
    Route::resource('bookings', Admin\BookingController::class);
    Route::get('booking-management', [Admin\BookingManagementController::class, 'index'])->name('booking-management.index');
    Route::get('booking-management/create', [Admin\BookingManagementController::class, 'create'])->name('booking-management.create');
    Route::post('booking-management', [Admin\BookingManagementController::class, 'store'])->name('booking-management.store');
    Route::get('booking-management/calendar', [Admin\BookingManagementController::class, 'calendar'])->name('booking-management.calendar');
    
    // Payments Management
    Route::resource('payments', Admin\PaymentController::class);
    Route::post('payments/{payment}/verify', [Admin\PaymentController::class, 'verify'])->name('payments.verify');
    Route::post('payments/{payment}/reject', [Admin\PaymentController::class, 'reject'])->name('payments.reject');
    Route::get('bookings/{booking}/payments/create', [Admin\PaymentController::class, 'createForBooking'])->name('payments.create-for-booking');
    Route::post('bookings/{booking}/payments', [Admin\PaymentController::class, 'storeForBooking'])->name('payments.store-for-booking');
    Route::get('payments/create-additional', [Admin\PaymentController::class, 'createAdditional'])->name('payments.create-additional');
    Route::post('payments/store-additional', [Admin\PaymentController::class, 'storeAdditional'])->name('payments.store-additional');
    
    // Payment Methods Management
    Route::resource('payment-methods', Admin\PaymentMethodController::class);
    
    // Reports
    Route::get('reports', [Admin\ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/financial', [Admin\ReportController::class, 'financial'])->name('reports.financial');
    Route::get('reports/occupancy', [Admin\ReportController::class, 'occupancy'])->name('reports.occupancy');
    Route::get('reports/revenue', [Admin\ReportController::class, 'revenue'])->name('reports.revenue');
    
    // Settings
    Route::get('settings', [Admin\SettingsController::class, 'index'])->name('settings.index');
    Route::get('settings/general', [Admin\SettingsController::class, 'general'])->name('settings.general');
    Route::get('settings/booking', [Admin\SettingsController::class, 'booking'])->name('settings.booking');
    Route::get('settings/payment', [Admin\SettingsController::class, 'payment'])->name('settings.payment');
    Route::get('settings/email', [Admin\SettingsController::class, 'email'])->name('settings.email');
    Route::get('settings/notification', [Admin\SettingsController::class, 'notification'])->name('settings.notification');
    Route::get('settings/property', [Admin\SettingsController::class, 'property'])->name('settings.property');
    
    // Cleaning Management
    Route::resource('cleaning-tasks', Admin\CleaningTaskController::class)->names([
        'index' => 'cleaning-tasks.index',
        'create' => 'cleaning-tasks.create',
        'store' => 'cleaning-tasks.store',
        'show' => 'cleaning-tasks.show',
        'edit' => 'cleaning-tasks.edit',
        'update' => 'cleaning-tasks.update',
        'destroy' => 'cleaning-tasks.destroy',
    ]);
    
    // Cleaning Task Actions
    Route::post('cleaning-tasks/{cleaningTask}/assign', [Admin\CleaningTaskController::class, 'assign'])->name('cleaning-tasks.assign');
    Route::post('cleaning-tasks/{cleaningTask}/start', [Admin\CleaningTaskController::class, 'start'])->name('cleaning-tasks.start');
    Route::post('cleaning-tasks/{cleaningTask}/complete', [Admin\CleaningTaskController::class, 'complete'])->name('cleaning-tasks.complete');
    Route::post('cleaning-tasks/{cleaningTask}/submit-review', [Admin\CleaningTaskController::class, 'submitForReview'])->name('cleaning-tasks.submit-review');
    Route::post('cleaning-tasks/{cleaningTask}/approve', [Admin\CleaningTaskController::class, 'approve'])->name('cleaning-tasks.approve');
    Route::get('cleaning-tasks/calendar/data', [Admin\CleaningTaskController::class, 'calendar'])->name('cleaning-tasks.calendar');
    
    // Cleaning Schedules
    Route::resource('cleaning-schedules', Admin\CleaningScheduleController::class)->names([
        'index' => 'cleaning-schedules.index',
        'create' => 'cleaning-schedules.create',
        'store' => 'cleaning-schedules.store',
        'show' => 'cleaning-schedules.show',
        'edit' => 'cleaning-schedules.edit',
        'update' => 'cleaning-schedules.update',
        'destroy' => 'cleaning-schedules.destroy',
    ]);
    
    // Cleaning Schedule Actions
    Route::post('cleaning-schedules/{cleaningSchedule}/activate', [Admin\CleaningScheduleController::class, 'activate'])->name('cleaning-schedules.activate');
    Route::post('cleaning-schedules/{cleaningSchedule}/deactivate', [Admin\CleaningScheduleController::class, 'deactivate'])->name('cleaning-schedules.deactivate');
    Route::post('cleaning-schedules/{cleaningSchedule}/generate-tasks', [Admin\CleaningScheduleController::class, 'generateTasks'])->name('cleaning-schedules.generate-tasks');
    
    // Inventory Categories
    Route::resource('inventory-categories', Admin\InventoryCategoryController::class)->names([
        'index' => 'inventory-categories.index',
        'create' => 'inventory-categories.create',
        'store' => 'inventory-categories.store',
        'show' => 'inventory-categories.show',
        'edit' => 'inventory-categories.edit',
        'update' => 'inventory-categories.update',
        'destroy' => 'inventory-categories.destroy',
    ]);
    
    // Inventory Items
    Route::resource('inventory-items', Admin\InventoryItemController::class)->names([
        'index' => 'inventory-items.index',
        'create' => 'inventory-items.create',
        'store' => 'inventory-items.store',
        'show' => 'inventory-items.show',
        'edit' => 'inventory-items.edit',
        'update' => 'inventory-items.update',
        'destroy' => 'inventory-items.destroy',
    ]);
    
    // Inventory Item Actions
    Route::post('inventory-items/{inventoryItem}/discontinue', [Admin\InventoryItemController::class, 'discontinue'])->name('inventory-items.discontinue');
    Route::post('inventory-items/{inventoryItem}/reactivate', [Admin\InventoryItemController::class, 'reactivate'])->name('inventory-items.reactivate');
    Route::get('inventory-items/{inventoryItem}/reorder-suggestion', [Admin\InventoryItemController::class, 'reorderSuggestion'])->name('inventory-items.reorder-suggestion');
    Route::get('inventory-items/{inventoryItem}/maintenance-schedule', [Admin\InventoryItemController::class, 'maintenanceSchedule'])->name('inventory-items.maintenance-schedule');
    Route::get('inventory-items/{inventoryItem}/expiry-alerts', [Admin\InventoryItemController::class, 'expiryAlerts'])->name('inventory-items.expiry-alerts');
    
    // Inventory Stock Management
    Route::resource('inventory-stocks', Admin\InventoryStockController::class)->names([
        'index' => 'inventory-stocks.index',
        'create' => 'inventory-stocks.create',
        'store' => 'inventory-stocks.store',
        'show' => 'inventory-stocks.show',
        'edit' => 'inventory-stocks.edit',
        'update' => 'inventory-stocks.update',
        'destroy' => 'inventory-stocks.destroy',
    ]);
    
    // Inventory Stock Actions
    Route::post('inventory-stocks/{inventoryStock}/reserve', [Admin\InventoryStockController::class, 'reserve'])->name('inventory-stocks.reserve');
    Route::post('inventory-stocks/{inventoryStock}/release-reservation', [Admin\InventoryStockController::class, 'releaseReservation'])->name('inventory-stocks.release-reservation');
    Route::post('inventory-stocks/{inventoryStock}/add-stock', [Admin\InventoryStockController::class, 'addStock'])->name('inventory-stocks.add-stock');
    Route::post('inventory-stocks/{inventoryStock}/remove-stock', [Admin\InventoryStockController::class, 'removeStock'])->name('inventory-stocks.remove-stock');
    Route::post('inventory-stocks/{inventoryStock}/use-stock', [Admin\InventoryStockController::class, 'useStock'])->name('inventory-stocks.use-stock');
    Route::post('inventory-stocks/{inventoryStock}/update-condition', [Admin\InventoryStockController::class, 'updateCondition'])->name('inventory-stocks.update-condition');
    Route::post('inventory-stocks/{inventoryStock}/schedule-maintenance', [Admin\InventoryStockController::class, 'scheduleMaintenance'])->name('inventory-stocks.schedule-maintenance');
    Route::post('inventory-stocks/{inventoryStock}/complete-maintenance', [Admin\InventoryStockController::class, 'completeMaintenance'])->name('inventory-stocks.complete-maintenance');
    Route::get('inventory-stocks/{inventoryStock}/alerts', [Admin\InventoryStockController::class, 'getAlerts'])->name('inventory-stocks.alerts');
    
    // Inventory Transactions (Read-only)
    Route::get('inventory-transactions', [Admin\InventoryTransactionController::class, 'index'])->name('inventory-transactions.index');
    Route::get('inventory-transactions/{inventoryTransaction}', [Admin\InventoryTransactionController::class, 'show'])->name('inventory-transactions.show');
    
    // Inventory Reports
    Route::get('inventory/reports', [Admin\InventoryReportController::class, 'index'])->name('inventory.reports.index');
    Route::get('inventory/reports/stock-levels', [Admin\InventoryReportController::class, 'stockLevels'])->name('inventory.reports.stock-levels');
    Route::get('inventory/reports/low-stock', [Admin\InventoryReportController::class, 'lowStock'])->name('inventory.reports.low-stock');
    Route::get('inventory/reports/expiry', [Admin\InventoryReportController::class, 'expiry'])->name('inventory.reports.expiry');
    Route::get('inventory/reports/maintenance', [Admin\InventoryReportController::class, 'maintenance'])->name('inventory.reports.maintenance');
    Route::get('inventory/reports/valuation', [Admin\InventoryReportController::class, 'valuation'])->name('inventory.reports.valuation');
    
    // API endpoints for dynamic data
    Route::get('api/properties/{property}/cleaning-areas', [Admin\CleaningTaskController::class, 'getPropertyCleaningAreas'])->name('api.properties.cleaning-areas');
    Route::get('api/inventory-categories/tree', [Admin\InventoryCategoryController::class, 'getTree'])->name('api.inventory-categories.tree');
    Route::get('api/inventory-items/by-category/{category}', [Admin\InventoryItemController::class, 'getByCategory'])->name('api.inventory-items.by-category');
    Route::get('api/inventory-stocks/by-property/{property}', [Admin\InventoryStockController::class, 'getByProperty'])->name('api.inventory-stocks.by-property');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
