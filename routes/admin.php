<?php

use App\Http\Controllers\Admin\AdminCustomTaskController;
use App\Http\Controllers\Admin\AdminRoutineScheduleController;
use App\Http\Controllers\Admin\AdminSeoLandingController;
use App\Http\Controllers\Admin\AiAgentController;
use App\Http\Controllers\Admin\BankAccountController;
use App\Http\Controllers\Admin\Booking\BookingApiController;
use App\Http\Controllers\Admin\BookingManagementController;
use App\Http\Controllers\Admin\CheckInOutController;
use App\Http\Controllers\Admin\ExtraServiceController;
use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\GowaAdminController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\LegalPageController;
use App\Http\Controllers\Admin\LostAndFoundController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\PayrollController;
use App\Http\Controllers\Admin\PropertyManagementController;
use App\Http\Controllers\Admin\PropertySeasonalRateController;
use App\Http\Controllers\Admin\RateManagementController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\UnitDamageController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AIProviderKeyController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\ArticleAIController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\ContentPlanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ICalController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ReviewController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
| Routes for property managers, owners, and super admins
|--------------------------------------------------------------------------
*/

// Property Management - Create/Edit/Delete restricted to managers/owners
Route::middleware(['auth', 'role:super_admin,property_manager,property_owner'])->prefix('admin')->name('admin.')->group(function () {
    Route::controller(PropertyManagementController::class)->group(function () {
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
        Route::get('properties/{property:slug}/financial', 'financial')->name('properties.financial');
        Route::post('properties/{property}/sync-ical', [ICalController::class, 'sync'])->name('properties.sync-ical');
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
        Route::resource('extra-services', ExtraServiceController::class)->parameters([
            'extra-services' => 'service',
        ])->names([
            'index' => 'extra-services.index',
            'create' => 'extra-services.create',
            'store' => 'extra-services.store',
            'show' => 'extra-services.show',
            'edit' => 'extra-services.edit',
            'update' => 'extra-services.update',
            'destroy' => 'extra-services.destroy',
        ]);

        Route::controller(ExtraServiceController::class)->prefix('extra-services')->name('extra-services.')->group(function () {
            Route::patch('{service}/toggle', 'toggleStatus')->name('toggle');
            Route::post('{service}/thumbnail', 'uploadThumbnail')->name('thumbnail.upload');
        });
    });

    // Article Management (All authenticated users except guests)
    Route::controller(ArticleController::class)
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
            Route::get('/media', 'getMedia')->name('media');
        });

    // AI Article Assistance API
    Route::controller(ArticleAIController::class)
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
    Route::controller(ContentPlanController::class)
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
    Route::controller(AIProviderKeyController::class)
        ->prefix('settings/ai-keys')
        ->name('ai-keys.')
        ->middleware(['can:manage-ai-keys'])
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::post('/sync', 'sync')->name('sync');
            Route::get('/{aiKey}/edit', 'edit')->name('edit');
            Route::put('/{aiKey}', 'update')->name('update');
            Route::delete('/{aiKey}', 'destroy')->name('destroy');
            Route::post('/{aiKey}/reset-stats', 'resetStats')->name('reset-stats');
            Route::post('/{aiKey}/toggle-active', 'toggleActive')->name('toggle-active');
        });
});

Route::middleware(['auth', 'role:super_admin,property_manager,property_owner,front_desk'])->prefix('admin')->name('admin.')->group(function () {
    // Property Management - Now using dedicated PropertyManagementController
    Route::controller(PropertyManagementController::class)->group(function () {
        Route::get('properties', 'index')->name('properties.index');
        Route::get('properties/{property:slug}', 'show')->name('properties.show');
        Route::get('properties/{property}/media', 'media')->name('properties.media');
    });

    // Rate Management - accessible to front_desk
    Route::controller(RateManagementController::class)
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
    Route::controller(PropertySeasonalRateController::class)
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

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES - BOOKING MANAGEMENT
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,property_manager,property_owner,front_desk'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'admin'])->name('dashboard');

    // SEO Pages
    Route::resource('seo-pages', AdminSeoLandingController::class);
    Route::get('seo-pages/{seo_page}/check-health', [AdminSeoLandingController::class, 'checkHealth'])->name('seo-pages.check-health');

    // Check-In/Out Dashboard
    Route::controller(CheckInOutController::class)->group(function () {
        Route::get('bookings/check-in-out', 'index')->name('bookings.check-in-out');
        Route::get('bookings/check-in-out/generate-text', 'generateText')->name('bookings.check-in-out.generate-text');
    });

    // Booking Management - Consolidated under BookingManagementController
    Route::controller(BookingManagementController::class)->group(function () {
        // Main booking routes
        Route::get('bookings', 'index')->name('bookings.index');
        Route::get('bookings/daily-operations', 'dailyOperations')->name('bookings.daily-operations');
        Route::get('bookings/staff-tracking', 'staffTracking')->name('bookings.staff-tracking')->middleware('role:super_admin,property_manager,front_desk');
        Route::put('bookings/{booking}/staff-tracking', 'updateStaffTracking')->name('bookings.staff-tracking.update')->middleware('role:super_admin,property_manager,front_desk');

        Route::get('bookings/create', 'create')->name('bookings.create');
        Route::post('bookings', 'store')->name('bookings.store');

        Route::get('bookings/{booking:booking_number}', 'show')->name('bookings.show');
        Route::get('bookings/{booking:booking_number}/edit', 'edit')->name('bookings.edit');
        Route::put('bookings/{booking:booking_number}', 'update')->name('bookings.update');
        Route::delete('bookings/{booking:booking_number}', 'destroy')->name('bookings.destroy');

        Route::patch('bookings/{booking:booking_number}/verify', 'verify')->name('bookings.verify');
        Route::patch('bookings/{booking:booking_number}/reject', 'reject')->name('bookings.reject');
        Route::patch('bookings/{booking:booking_number}/cancel', 'cancel')->name('bookings.cancel');
        Route::patch('bookings/{booking:booking_number}/checkin', 'checkin')->name('bookings.checkin');
        Route::patch('bookings/{booking:booking_number}/checkout', 'checkout')->name('bookings.checkout');
        Route::get('bookings/{booking:booking_number}/whatsapp', 'sendWhatsApp')->name('bookings.whatsapp');
        Route::get('bookings/{booking:booking_number}/invoice', 'invoice')->name('bookings.invoice');

        // Import/Export
        Route::get('bookings/export/download', 'export')->name('bookings.export');
        Route::post('bookings/import/preview', 'importPreview')->name('bookings.import.preview');
        Route::post('bookings/import/confirmed', 'importConfirmed')->name('bookings.import.confirmed');
    });
});

// Booking Management API (Authenticated but custom prefix)
Route::middleware(['auth', 'role:super_admin,property_manager,front_desk'])->prefix('api/admin/booking-management')->name('api.admin.booking-management.')->group(function () {
    $controller = BookingApiController::class;
    Route::get('timeline', [$controller, 'timeline']);
    Route::get('timeline-data', [$controller, 'timelineData']); // For infinite scroll lazy loading
    Route::get('bookings/{booking}', [$controller, 'detail']); // Fetch full booking details for modal
    Route::post('bookings/{booking}/payments', [$controller, 'storePayment']); // Store payment directly from modal
    Route::get('payment-methods', [$controller, 'paymentMethods']); // Get active payment methods
    Route::get('bank-accounts', [$controller, 'bankAccounts']);
    Route::get('search', [$controller, 'search']); // For search bar
    Route::post('check-availability', [$controller, 'checkAvailability']);
    Route::post('calculate-rate', [$controller, 'calculateRate']);
    Route::post('availability-and-rates', [$controller, 'availabilityAndRates']);
    Route::get('property-date-range', [$controller, 'getPropertyDateRange']);

});

// Property Management API (outside admin prefix to match /api/admin/properties path)
Route::middleware(['auth', 'role:super_admin,property_manager,property_owner,front_desk'])->prefix('api/admin/properties')->name('api.admin.properties.')->group(function () {
    $controller = PropertyManagementController::class;
    Route::get('{property:id}/stats', [$controller, 'stats'])->name('stats');
    Route::patch('{property:id}/color', [$controller, 'updateColor'])->name('update-color');
    Route::patch('{property:id}/short-name', [$controller, 'updateShortName'])->name('update-short-name');
});

// Payment Gateway Routes (Admin)
Route::middleware(['auth', 'role:super_admin,property_manager,finance'])->prefix('admin')->name('admin.')->group(function () {
    Route::post(
        '/bookings/{booking:booking_number}/payment-gateway/send-link',
        [BookingManagementController::class, 'sendPaymentLink']
    )->name('bookings.send-payment-link');
});

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES - PAYMENT & FINANCE
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,property_manager,finance,front_desk,property_owner'])->prefix('admin/payments')->name('admin.payments.')->group(function () {
    Route::controller(PaymentController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/manual-payment', 'manualCreate')->name('manual-create');
        Route::post('/manual-payment', 'manualStore')->name('manual-store');

        // Payment Reconciliation
        Route::get('/reconciliation', 'reconciliation')->name('reconciliation');
        Route::post('/reconciliation/match', 'manualMatch')->name('reconciliation.match');
        Route::post('/reconciliation/ignore-mutation/{id}', 'ignoreMutation')->name('reconciliation.ignore-mutation');

        Route::get('/{payment:payment_number}', 'show')->name('show');
        Route::get('/{payment:payment_number}/edit', 'edit')->name('edit');
        Route::put('/{payment:payment_number}', 'update')->name('update');
        Route::patch('/{payment:payment_number}', 'update')->name('update.patch');
        Route::delete('/{payment:payment_number}', 'destroy')->name('destroy');
        Route::patch('/{payment:payment_number}/verify', 'verify')->name('verify');
        Route::patch('/{payment:payment_number}/reject', 'reject')->name('reject');
        Route::patch('/{payment:payment_number}/reverify-accept', 'reverifyAccept')->name('reverify-accept');
        Route::patch('/{payment:payment_number}/reverify-reject', 'reverifyReject')->name('reverify-reject');

        // Booking-specific payment routes
        Route::get('/booking/{booking:booking_number}/create', 'createForBooking')->name('create-for-booking');
        Route::post('/booking/{booking:booking_number}/create', 'storeForBooking')->name('store-for-booking');
        Route::get('/booking/{booking:booking_number}/additional', 'createAdditional')->name('create-additional');
        Route::post('/booking/{booking:booking_number}/additional', 'storeAdditional')->name('store-additional');
    });
});

// Finance Management
Route::middleware(['auth', 'role:super_admin,property_owner,property_manager,finance'])->prefix('admin')->name('admin.')->group(function () {
    Route::controller(FinanceController::class)->group(function () {
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

        // Employee Loans (Casbon)
        Route::get('finance/loans', 'loans')->name('finance.loans');
        Route::post('finance/loans', 'storeLoan')->name('finance.loans.store');
        Route::post('finance/loans/{loan}/payments', 'storeLoanPayment')->name('finance.loans.payments.store');
    });
});

// Payroll Management
Route::middleware(['auth', 'role:super_admin,finance'])->prefix('admin/finance')->name('admin.finance.')->group(function () {
    Route::controller(PayrollController::class)->group(function () {
        Route::get('payroll', 'index')->name('payroll.index');
        Route::post('payroll/attendance', 'uploadAttendance')->name('payroll.attendance');
        Route::post('payroll/store', 'store')->name('payroll.store');
        Route::post('payroll/user-settings', 'updateUserSettings')->name('payroll.user-settings');
    });
});

// Housekeeping Routine Schedules
Route::middleware(['auth', 'role:super_admin,property_manager'])->prefix('admin/housekeeping-schedules')->name('admin.housekeeping-schedules.')->group(function () {
    Route::controller(AdminRoutineScheduleController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/generate', 'generate')->name('generate');
        Route::patch('/{schedule}', 'update')->name('update');
        Route::delete('/{schedule}', 'destroy')->name('destroy');
    });
});

// Custom Tasks
Route::middleware(['auth', 'role:super_admin,property_manager'])->prefix('admin/custom-tasks')->name('admin.custom-tasks.')->group(function () {
    Route::controller(AdminCustomTaskController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::delete('/{customTask}', 'destroy')->name('destroy');
    });
});

// Inventory/Operational Management
Route::middleware(['auth', 'role:super_admin,property_owner,property_manager,housekeeping,front_desk,finance'])->prefix('admin/inventory')->name('admin.inventory.')->group(function () {
    $controller = InventoryController::class;

    // Exports
    Route::get('items/export', [$controller, 'exportItems'])->name('items.export');
    Route::get('purchases/export', [$controller, 'exportPurchases'])->name('purchases.export');
    Route::get('usages/export', [$controller, 'exportUsages'])->name('usages.export');

    Route::get('items', [$controller, 'itemsIndex'])->name('items.index');
    Route::post('items', [$controller, 'itemsStore'])->name('items.store');
    Route::get('items/{item}/edit', [$controller, 'itemsEdit'])->name('items.edit');
    Route::put('items/{item}', [$controller, 'itemsUpdate'])->name('items.update');
    Route::post('items/{item}', [$controller, 'itemsUpdate'])->name('items.update.post'); // For FormData with _method
    Route::delete('items/{item}', [$controller, 'itemsDestroy'])->name('items.destroy');
    Route::get('items/{item}', [$controller, 'itemsShow'])->name('items.show');

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
*/

Route::middleware(['auth', 'role:super_admin,property_manager,finance,front_desk,property_owner'])->prefix('admin/reports')->name('admin.reports.')->group(function () {
    Route::controller(ReportController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/financial', 'financial')->name('financial');
        Route::get('/occupancy', 'occupancy')->name('occupancy');
        Route::get('/property-performance', 'propertyPerformance')->name('property-performance');
        Route::get('/staff-performance', 'staffPerformance')->name('staff-performance');
        Route::post('/export', 'export')->name('export');
    });
});

/*
|--------------------------------------------------------------------------
| SUPER ADMIN ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin'])->prefix('admin')->name('admin.')->group(function () {
    // AI Agent Management (API tokens, leads, escalations, conversations)
    Route::prefix('ai-agent')->name('ai-agent.')->controller(AiAgentController::class)->group(function () {
        Route::get('/', 'index')->name('index');

        // Tokens
        Route::get('/tokens', 'tokens')->name('tokens');
        Route::post('/tokens', 'storeToken')->name('tokens.store');
        Route::patch('/tokens/{token}/toggle', 'toggleToken')->name('tokens.toggle');
        Route::delete('/tokens/{token}', 'destroyToken')->name('tokens.destroy');

        // Leads
        Route::get('/leads', 'leads')->name('leads');
        Route::patch('/leads/{lead}/status', 'updateLeadStatus')->name('leads.status');

        // Escalations
        Route::get('/escalations', 'escalations')->name('escalations');
        Route::patch('/escalations/{escalation}/claim', 'claimEscalation')->name('escalations.claim');
        Route::patch('/escalations/{escalation}/resolve', 'resolveEscalation')->name('escalations.resolve');

        // Conversations
        Route::get('/conversations', 'conversations')->name('conversations');
        Route::get('/conversations/{conversationId}', 'showConversation')->name('conversations.show');
    });

    // User Management
    Route::resource('users', UserController::class)
        ->names([
            'index' => 'users.index',
            'create' => 'users.create',
            'store' => 'users.store',
            'show' => 'users.show',
            'edit' => 'users.edit',
            'update' => 'users.update',
            'destroy' => 'users.destroy',
        ]);

    Route::patch('users/{user}/status', [UserController::class, 'toggleStatus'])
        ->name('users.status');

    // Payment Methods Management
    Route::controller(PaymentMethodController::class)
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

    // Bank Accounts Management
    Route::controller(BankAccountController::class)
        ->prefix('bank-accounts')
        ->name('bank-accounts.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('{bankAccount}/edit', 'edit')->name('edit');
            Route::patch('{bankAccount}', 'update')->name('update');
            Route::delete('{bankAccount}', 'destroy')->name('destroy');
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

        // System Logs
        Route::get('system/logs', 'systemLogs')->name('system.logs');
        Route::get('system/logs/download', 'downloadLog')->name('system.logs.download');
        Route::post('system/logs/clear', 'clearLogs')->name('system.logs.clear');

        // Booking Settings
        Route::get('booking', 'booking')->name('booking');
        Route::post('booking', 'updateBooking')->name('booking.update');

        // Property Settings
        Route::get('property', 'property')->name('property');
        Route::post('property', 'updateProperty')->name('property.update');
    });

    // GOWA WhatsApp Management
    Route::prefix('gowa')->name('gowa.')->group(function () {
        Route::controller(GowaAdminController::class)->group(function () {
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
    Route::controller(LegalPageController::class)->prefix('legal')->name('legal.')->group(function () {
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

    /*
    |--------------------------------------------------------------------------
    | Admin Review Management
    |--------------------------------------------------------------------------
    */
    Route::prefix('reviews')->as('reviews.')->group(function () {
        Route::match(['post', 'patch'], '/{review}/approve', [ReviewController::class, 'adminApprove'])->name('approve');
        Route::match(['post', 'put'], '/{review}', [ReviewController::class, 'adminUpdate'])->name('update');
    });
});

// Unit Damages Routes
Route::middleware(['auth', 'role:super_admin,property_manager,front_desk,housekeeping,property_owner'])
    ->prefix('admin/unit-damages')
    ->name('admin.unit-damages.')
    ->controller(UnitDamageController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('/{unitDamage}/assign', 'assign')->name('assign');
        Route::patch('/{unitDamage}/resolve', 'resolve')->name('resolve');
        Route::delete('/{unitDamage}', 'destroy')->name('destroy');
    });

// Lost and Found Routes
Route::middleware(['auth', 'role:super_admin,property_manager,front_desk,housekeeping,property_owner'])
    ->prefix('admin/lost-and-founds')
    ->name('admin.lost-and-founds.')
    ->controller(LostAndFoundController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('/{lostAndFound}/claim', 'claim')->name('claim');
        Route::get('/suggest-bookings', 'suggestBookings')->name('suggest-bookings');
        Route::delete('/{lostAndFound}', 'destroy')->name('destroy');
    });
