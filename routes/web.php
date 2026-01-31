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
use App\Http\Controllers\LegalViewController;
use Illuminate\Support\Facades\Route;
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

// Health check route untuk supervisor monitoring
Route::get('/health', function () {
    return response('healthy', 200)
        ->header('Content-Type', 'text/plain');
});

// Dynamic Sitemap (Next.js style) - Auto-updates on property changes
Route::get('/sitemap.xml', [\App\Http\Controllers\SitemapController::class, 'index'])->name('sitemap');
Route::get('/sitemap-articles.xml', [\App\Http\Controllers\SitemapController::class, 'articles'])->name('sitemap.articles');

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

//route dokumen penting
Route::get('/about', function () {
    return Inertia::render('About');
})->name('about');

Route::get('/faq', function () {
    return Inertia::render('FAQ');
})->name('faq');

Route::get('/support', function () {
    return Inertia::render('Support');
})->name('support');


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

// Public Article Routes
Route::controller(App\Http\Controllers\ArticleController::class)->group(function () {
    Route::get('/articles', 'publicIndex')->name('articles.index');
    Route::get('/articles/{article:slug}', 'show')->name('articles.show');
});

// Public Booking Routes
Route::controller(BookingController::class)->group(function () {
    // Ubah booking create menjadi POST (atau GET+POST jika ingin support keduanya)
    // Route::get('/properties/{property:slug}/book', 'create')->name('bookings.create'); // HAPUS
    Route::get('/properties/{property:slug}/book', 'create')->name('bookings.create'); // Gunakan GET+POST jika ingin support keduanya
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
Route::post('/payment-gateway/webhook', [App\Http\Controllers\PaymentGatewayController::class, 'webhook'])
    ->name('payment-gateway.webhook')
    ->withoutMiddleware(['csrf', 'auth']);

// Payment Gateway Routes (Guest & Authenticated Users)
Route::middleware(['auth'])->group(function () {
    Route::post(
        '/bookings/{booking:booking_number}/payment-gateway/initiate',
        [App\Http\Controllers\PaymentGatewayController::class, 'initiate']
    )
        ->name('payment-gateway.initiate');
});

// Payment Gateway Callback (Public - redirect dari iPaymu)
Route::get(
    '/payment-gateway/callback',
    [App\Http\Controllers\PaymentGatewayController::class, 'callback']
)
    ->name('payment-gateway.callback');

// Payment Gateway Routes (Admin)
Route::middleware(['auth', 'role:super_admin,property_manager,finance'])->prefix('admin')->name('admin.')->group(function () {
    Route::post(
        '/bookings/{booking:booking_number}/payment-gateway/generate-link',
        [App\Http\Controllers\PaymentGatewayController::class, 'generateLink']
    )
        ->name('payment-gateway.generate-link');
    Route::post(
        '/bookings/{booking:booking_number}/payment-gateway/send-link',
        [App\Http\Controllers\Admin\BookingManagementController::class, 'sendPaymentLink']
    )
        ->name('bookings.send-payment-link');
});

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
| AUTHENTICATED USER ROUTES
|--------------------------------------------------------------------------
| Routes for logged-in users
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // User Bookings
    Route::get('/booking/{booking:booking_number}', [BookingController::class, 'show'])->name('booking.show');

    // User Payments
    Route::controller(PaymentController::class)->group(function () {
        // Route::get('/my-payments', 'myPayments')->name('my-payments'); // Deprecated

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

Route::middleware(['auth', 'role:super_admin,property_manager,property_owner,front_desk'])->prefix('admin')->name('admin.')->group(function () {
    // Property Management - Now using dedicated PropertyManagementController
    Route::controller(App\Http\Controllers\Admin\PropertyManagementController::class)->group(function () {
        Route::get('properties', 'index')->name('properties.index');
        Route::get('properties/{property:slug}', 'show')->name('properties.show');
        Route::get('properties/{property}/media', 'media')->name('properties.media');
    });

    // Rate Management - accessible to front_desk
    Route::controller(App\Http\Controllers\Admin\RateManagementController::class)
        ->prefix('rate-management')
        ->name('rate-management.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/properties/{property}', 'show')->name('show');
            Route::post('/properties/{property}/seasonal-rates', 'createSeasonalRate')->name('seasonal-rates.create');
            Route::put('/seasonal-rates/{seasonalRate}', 'updateSeasonalRate')->name('seasonal-rates.update');
            Route::delete('/seasonal-rates/{seasonalRate}', 'deleteSeasonalRate')->name('seasonal-rates.delete');
            Route::put('/properties/{property}/base-rates', 'updateBaseRates')->name('base-rates.update');
            Route::post('/properties/{property}/bulk-update', 'bulkUpdateRates')->name('bulk-update');
            Route::get('/properties/{property}/calendar', 'getRateCalendar')->name('calendar');
        });

    // Seasonal Rates Management (Legacy - keeping for backward compatibility)
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
});

// Property Management - Create/Edit/Delete restricted to managers/owners
Route::middleware(['auth', 'role:super_admin,property_manager,property_owner'])->prefix('admin')->name('admin.')->group(function () {
    Route::controller(App\Http\Controllers\Admin\PropertyManagementController::class)->group(function () {
        Route::get('properties/create', 'create')->name('properties.create');
        Route::post('properties', 'store')->name('properties.store');
        Route::get('properties/{property:slug}/edit', 'edit')->name('properties.edit');
        Route::put('properties/{property:slug}', 'update')->name('properties.update');
        Route::delete('properties/{property:slug}', 'destroy')->name('properties.destroy');

        // Additional property management features
        Route::post('properties/bulk-status', 'bulkStatus')->name('properties.bulk-status');
        Route::patch('properties/{property:slug}/toggle-featured', 'toggleFeatured')->name('properties.toggle-featured');
        Route::post('properties/{property:slug}/duplicate', 'duplicate')->name('properties.duplicate');
        Route::get('properties/{property:slug}/analytics', 'analytics')->name('properties.analytics');
        Route::post('properties/{property}/sync-ical', [\App\Http\Controllers\ICalController::class, 'sync'])->name('properties.sync-ical');
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

    // Extra Services Management (only for super_admin and property_owner)
    Route::middleware(['role:super_admin,property_owner'])->group(function () {
        Route::resource('extra-services', App\Http\Controllers\Admin\ExtraServiceController::class)->names([
            'index' => 'extra-services.index',
            'create' => 'extra-services.create',
            'store' => 'extra-services.store',
            'show' => 'extra-services.show',
            'edit' => 'extra-services.edit',
            'update' => 'extra-services.update',
            'destroy' => 'extra-services.destroy',
        ]);

        Route::controller(App\Http\Controllers\Admin\ExtraServiceController::class)->prefix('extra-services')->name('extra-services.')->group(function () {
            Route::patch('{service}/toggle', 'toggleStatus')->name('toggle');
            Route::post('{service}/thumbnail', 'uploadThumbnail')->name('thumbnail.upload');
        });
    });

    // Article Management (All authenticated users except guests)
    Route::controller(App\Http\Controllers\ArticleController::class)
        ->prefix('articles')
        ->name('articles.')
        ->middleware(['role:super_admin,property_owner,property_manager,front_desk,housekeeping,finance'])
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{article:slug}/edit', 'edit')->name('edit');
            Route::put('/{article:slug}', 'update')->name('update');
            Route::delete('/{article:slug}', 'destroy')->name('destroy');

            // Publishing actions
            Route::post('/{article:slug}/publish', 'publish')->name('publish');
            Route::post('/{article:slug}/schedule', 'schedule')->name('schedule');
            Route::post('/{article:slug}/duplicate', 'duplicate')->name('duplicate');

            // Image management
            Route::post('/upload-image', 'uploadImage')->name('upload-image');
            Route::delete('/delete-image', 'deleteImage')->name('delete-image');
        });

    // AI Article Assistance API
    Route::controller(App\Http\Controllers\ArticleAIController::class)
        ->prefix('api/articles/ai')
        ->name('api.articles.ai.')
        ->middleware(['role:super_admin,property_owner,property_manager,front_desk,housekeeping,finance'])
        ->group(function () {
            Route::post('/generate-title', 'generateTitle')->name('generate-title');
            Route::post('/generate-outline', 'generateOutline')->name('generate-outline');
            Route::post('/generate-content', 'generateContent')->name('generate-content');
            Route::post('/improve-content', 'improveContent')->name('improve-content');
            Route::post('/web-search', 'webSearch')->name('web-search');
            Route::post('/seo-analysis', 'seoAnalysis')->name('seo-analysis');
            Route::post('/suggest-links', 'suggestInternalLinks')->name('suggest-links');
        });

    // Content Planner Management
    Route::controller(App\Http\Controllers\ContentPlanController::class)
        ->prefix('content-plans')
        ->name('content-plans.')
        ->middleware(['role:super_admin,property_owner,property_manager,front_desk,housekeeping,finance'])
        ->group(function () {
            // Standard CRUD
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{contentPlan}', 'show')->name('show');
            Route::get('/{contentPlan}/edit', 'edit')->name('edit');
            Route::put('/{contentPlan}', 'update')->name('update');
            Route::delete('/{contentPlan}', 'destroy')->name('destroy');

            // AI Features
            Route::post('/generate-calendar', 'generateCalendar')->name('generate-calendar');
            Route::post('/{contentPlan}/ai-research', 'aiResearch')->name('ai-research');
            Route::post('/{contentPlan}/generate-outline', 'generateOutline')->name('generate-outline');
            Route::post('/{contentPlan}/convert-to-article', 'convertToArticle')->name('convert-to-article');

            // Bulk Operations
            Route::post('/bulk-status', 'bulkUpdateStatus')->name('bulk-status');
        });

    // AI Provider Keys Management (super_admin only)
    Route::controller(App\Http\Controllers\AIProviderKeyController::class)
        ->prefix('settings/ai-keys')
        ->name('ai-keys.')
        ->middleware(['can:manage-ai-keys'])
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{aiKey}/edit', 'edit')->name('edit');
            Route::put('/{aiKey}', 'update')->name('update');
            Route::delete('/{aiKey}', 'destroy')->name('destroy');
            Route::post('/{aiKey}/reset-stats', 'resetStats')->name('reset-stats');
            Route::post('/{aiKey}/toggle-active', 'toggleActive')->name('toggle-active');
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

    // Check-In/Out Dashboard
    Route::controller(App\Http\Controllers\Admin\CheckInOutController::class)->group(function () {
        Route::get('bookings/check-in-out', 'index')->name('bookings.check-in-out');
        Route::get('bookings/check-in-out/generate-text', 'generateText')->name('bookings.check-in-out.generate-text');
    });

    // Booking Management - Consolidated under BookingManagementController
    Route::controller(App\Http\Controllers\Admin\BookingManagementController::class)->group(function () {
        // Main booking routes
        Route::get('bookings', 'index')->name('bookings.index');
        Route::get('bookings/calendar', 'calendar')->name('bookings.calendar');

        Route::get('bookings/create', 'create')->name('bookings.create');
        Route::post('bookings', 'store')->name('bookings.store');

        Route::get('bookings/{booking:booking_number}', 'show')->name('bookings.show');
        Route::get('bookings/{booking:booking_number}/edit', 'edit')->name('bookings.edit');
        Route::put('bookings/{booking:booking_number}', 'update')->name('bookings.update');
        Route::get('bookings/timeline', 'timelineView')->name('bookings.timeline');
        Route::get('bookings/timeline/{booking:booking_number}', 'timeline')->name('bookings.timeline.show');

        Route::patch('bookings/{booking:booking_number}/verify', 'verify')->name('bookings.verify');
        Route::patch('bookings/{booking:booking_number}/reject', 'reject')->name('bookings.reject');
        Route::patch('bookings/{booking:booking_number}/cancel', 'cancel')->name('bookings.cancel');
        Route::patch('bookings/{booking:booking_number}/checkin', 'checkin')->name('bookings.checkin');
        Route::patch('bookings/{booking:booking_number}/checkout', 'checkout')->name('bookings.checkout');
        Route::get('bookings/{booking:booking_number}/whatsapp', 'sendWhatsApp')->name('bookings.whatsapp');

        // Booking management routes
        Route::get('booking-management', 'index')->name('booking-management.index');
        Route::get('booking-management/calendar', 'calendar')->name('booking-management.calendar');
        Route::get('booking-management/create', 'create')->name('booking-management.create');
        Route::post('booking-management', 'store')->name('booking-management.store');
        Route::get('booking-management/{booking:booking_number}', 'show')->name('booking-management.show');
        Route::get('booking-management/{booking:booking_number}/edit', 'edit')->name('booking-management.edit');
        Route::patch('booking-management/{booking:booking_number}', 'update')->name('booking-management.update');
        Route::delete('booking-management/{booking:booking_number}', 'destroy')->name('booking-management.destroy');
        Route::patch('booking-management/{booking:booking_number}/status', 'updateStatus')->name('booking-management.update-status');

        // Import/Export
        Route::get('bookings/export/download', 'export')->name('bookings.export');
        Route::post('bookings/import/preview', 'importPreview')->name('bookings.import.preview');
        Route::post('bookings/import/confirmed', 'importConfirmed')->name('bookings.import.confirmed');
    });


});

// Booking Management API (Authenticated but custom prefix)
Route::middleware(['auth', 'role:super_admin,property_manager,front_desk'])->prefix('api/admin/booking-management')->name('api.admin.booking-management.')->group(function () {
    $controller = App\Http\Controllers\Admin\BookingManagementController::class;
    Route::get('timeline', [$controller, 'timeline']);
    Route::get('timeline-data', [$controller, 'timelineData']); // For infinite scroll lazy loading
    Route::get('search', [$controller, 'search']); // For search bar
    Route::post('check-availability', [$controller, 'checkAvailability']);
    Route::post('calculate-rate', [$controller, 'calculateRate']);
    Route::post('availability-and-rates', [$controller, 'availabilityAndRates']);
    Route::post('property-date-range', [$controller, 'getPropertyDateRange']);

});

// Property Management API (outside admin prefix to match /api/admin/properties path)
Route::middleware(['auth', 'role:super_admin,property_manager,property_owner,front_desk'])->prefix('api/admin/properties')->name('api.admin.properties.')->group(function () {
    $controller = App\Http\Controllers\Admin\PropertyManagementController::class;
    Route::get('{property:id}/stats', [$controller, 'stats'])->name('stats');
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
        Route::post('/{payment:payment_number}', 'update')->name('update.patch');
        Route::delete('/{payment:payment_number}', 'destroy')->name('destroy');
        Route::patch('/{payment:payment_number}/verify', 'verify')->name('verify');
        Route::patch('/{payment:payment_number}/reject', 'reject')->name('reject');

        // Booking-specific payment routes
        Route::get('/booking/{booking:booking_number}/create', 'createForBooking')->name('create-for-booking');
        Route::post('/booking/{booking:booking_number}/create', 'storeForBooking')->name('store-for-booking');
        Route::get('/booking/{booking:booking_number}/additional', 'createAdditional')->name('create-additional');
        Route::post('/booking/{booking:booking_number}/additional', 'storeAdditional')->name('store-additional');
    });
});

// Finance Management
Route::middleware(['auth', 'role:super_admin,property_owner,property_manager,finance'])->prefix('admin')->name('admin.')->group(function () {
    Route::controller(App\Http\Controllers\Admin\FinanceController::class)->group(function () {
        Route::get('finance', 'index')->name('finance.index');
        Route::get('finance/incomes', 'incomes')->name('finance.incomes');
        Route::get('finance/expenses', 'expenses')->name('finance.expenses');
        Route::get('finance/wallets', 'wallets')->name('finance.wallets');
        Route::get('finance/report', 'financialReport')->name('finance.report');
        Route::post('finance/incomes', 'storeIncome')->name('finance.incomes.store');
        Route::post('finance/expenses', 'storeExpense')->name('finance.expenses.store');
        Route::post('finance/wallets', 'storeWallet')->name('finance.wallets.store');
        Route::post('finance/wallets/transfer', 'transferWallet')->name('finance.wallets.transfer');
        Route::post('finance/wallets/{wallet}/transactions', 'storeWalletTransaction')->name('finance.wallets.transactions.store');
        Route::get('finance/wallets/{wallet}/report', 'walletReport')->name('finance.wallets.report');
        Route::patch('finance/payment-methods/{paymentMethod}/wallet', 'mapPaymentMethodToWallet')->name('finance.payment-methods.map-wallet');
    });
});

// Inventory/Operational Management
Route::middleware(['auth', 'role:super_admin,property_manager,housekeeping,front_desk,finance'])->prefix('admin/inventory')->name('admin.inventory.')->group(function () {
    $controller = App\Http\Controllers\Admin\InventoryController::class;
    Route::get('items', [$controller, 'itemsIndex'])->name('items.index');
    Route::post('items', [$controller, 'itemsStore'])->name('items.store');
    Route::get('items/{item}/edit', [$controller, 'itemsEdit'])->name('items.edit');
    Route::put('items/{item}', [$controller, 'itemsUpdate'])->name('items.update');
    Route::post('items/{item}', [$controller, 'itemsUpdate'])->name('items.update.post'); // For FormData with _method
    Route::delete('items/{item}', [$controller, 'itemsDestroy'])->name('items.destroy');
    Route::get('purchases', [$controller, 'purchasesIndex'])->name('purchases.index');
    Route::post('purchases', [$controller, 'purchasesStore'])->name('purchases.store');
    Route::put('purchases/{purchase}', [$controller, 'purchasesUpdate'])->name('purchases.update');
    Route::delete('purchases/{purchase}', [$controller, 'purchasesDestroy'])->name('purchases.destroy');

    Route::get('usages', [$controller, 'usagesIndex'])->name('usages.index');
    Route::post('usages', [$controller, 'usagesStore'])->name('usages.store');
    Route::put('usages/{usage}', [$controller, 'usagesUpdate'])->name('usages.update');
    Route::delete('usages/{usage}', [$controller, 'usagesDestroy'])->name('usages.destroy');
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
            Route::patch('{paymentMethod}', 'update')->name('update');
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

    // GOWA WhatsApp Management
    Route::prefix('gowa')->name('gowa.')->group(function () {
        Route::controller(App\Http\Controllers\Admin\GowaAdminController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/qr-code', 'getQRCode')->name('qr-code');
            Route::post('/send-message', 'sendMessage')->name('send-message');
            Route::post('/logout', 'logout')->name('logout');
            Route::post('/reconnect', 'reconnect')->name('reconnect');
            Route::get('/status', 'getStatus')->name('status');
            Route::put('/config', 'updateConfig')->name('config.update');
            Route::get('/test-connection', 'testConnection')->name('test-connection');
            Route::get('/debug-status', 'debugStatus')->name('debug-status');
        });
    });


    // Legal Management
    Route::controller(App\Http\Controllers\Admin\LegalPageController::class)->prefix('legal')->name('legal.')->group(function () {
        // Main CRUD
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/{slug}/edit', 'edit')->name('edit');
        Route::put('/{slug}', 'update')->name('update');

        // History & Archive
        Route::get('/{slug}/history', 'history')->name('history');
        Route::get('/archived/{id}', 'showArchived')->name('archived.show');
        Route::post('/restore/{id}', 'restore')->name('restore');

        // Archive actions
        Route::post('/{slug}/archive', 'archive')->name('archive');
        Route::get('/trash', 'trash')->name('trash');

        // Delete actions
        Route::delete('/archived/{id}/force', 'forceDelete')->name('archived.force-delete');
        Route::delete('/{slug}/destroy-all', 'destroyAll')->name('destroy-all');
    });
});

/*
|--------------------------------------------------------------------------
| STAFF ROUTES - CLEANING MANAGEMENT
|--------------------------------------------------------------------------
| Routes for staff cleaning operations
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,housekeeping,front_desk'])->group(function () {
    Route::get('/staff/cleaning', [App\Http\Controllers\Staff\CleaningDashboardController::class, 'index'])
        ->name('staff.cleaning.index');
    Route::patch('/staff/cleaning/{booking}/mark-cleaned', [App\Http\Controllers\Staff\CleaningDashboardController::class, 'markAsCleaned'])
        ->name('staff.cleaning.mark-cleaned');
    Route::get('/staff/cleaning/property/{property}/keybox', [App\Http\Controllers\Staff\CleaningDashboardController::class, 'getKeyboxCode'])
        ->name('staff.cleaning.keybox');
});

/*
|--------------------------------------------------------------------------
| BOOKING RESUME ROUTES
|--------------------------------------------------------------------------
| Routes for booking resume after login
|--------------------------------------------------------------------------
*/

Route::middleware(['auth'])->group(function () {
    Route::get('/booking/resume', [App\Http\Controllers\BookingController::class, 'resumeBooking'])
        ->name('bookings.resume');
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

/*
|--------------------------------------------------------------------------
| INCLUDE ADDITIONAL ROUTE FILES
|--------------------------------------------------------------------------
*/

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
/*
|--------------------------------------------------------------------------
| PROGRAMMATIC SEO LANDING PAGES - CATCH-ALL ROUTE
|--------------------------------------------------------------------------
| IMPORTANT: This MUST be the LAST route in the file!
| Acts as fallback for SEO landing pages (villa-jogja, homestay-murah, etc.)
*/

Route::get('/{seoSlug}', [\App\Http\Controllers\SeoLandingController::class, 'show'])
    ->where('seoSlug', '[a-z0-9-]+')
    ->name('seo.landing');
