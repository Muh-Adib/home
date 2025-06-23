<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\NotificationController;

// Existing Admin Controllers
use App\Http\Controllers\Admin\CleaningTaskController;
use App\Http\Controllers\Admin\CleaningScheduleController;
use App\Http\Controllers\Admin\InventoryCategoryController;
use App\Http\Controllers\Admin\InventoryItemController;
use App\Http\Controllers\Admin\InventoryStockController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Admin\BookingManagementController;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Properties
    Route::resource('properties', PropertyController::class);
    
    // Bookings
    Route::resource('bookings', BookingController::class);
    
    // Payments
    Route::resource('payments', PaymentController::class);
});

// Admin routes - ONLY for existing controllers
Route::middleware(['auth', 'role:super_admin,property_manager,front_desk'])->prefix('admin')->name('admin.')->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'admin'])->name('dashboard');
    
    // Bookings Management (Working)
    Route::resource('bookings', AdminBookingController::class);
    Route::get('booking-management', [BookingManagementController::class, 'index'])->name('booking-management.index');
    Route::get('booking-management/create', [BookingManagementController::class, 'create'])->name('booking-management.create');
    Route::post('booking-management', [BookingManagementController::class, 'store'])->name('booking-management.store');
    Route::get('booking-management/calendar', [BookingManagementController::class, 'calendar'])->name('booking-management.calendar');
    
    // Payments Management (Working)
    Route::resource('payments', AdminPaymentController::class);
    Route::post('payments/{payment}/verify', [AdminPaymentController::class, 'verify'])->name('payments.verify');
    Route::post('payments/{payment}/reject', [AdminPaymentController::class, 'reject'])->name('payments.reject');
    
    // Payment Methods Management (Working)
    Route::resource('payment-methods', PaymentMethodController::class);
    
    // 🧹 CLEANING MANAGEMENT (Full Implementation)
    Route::resource('cleaning-tasks', CleaningTaskController::class)->names([
        'index' => 'cleaning-tasks.index',
        'create' => 'cleaning-tasks.create',
        'store' => 'cleaning-tasks.store',
        'show' => 'cleaning-tasks.show',
        'edit' => 'cleaning-tasks.edit',
        'update' => 'cleaning-tasks.update',
        'destroy' => 'cleaning-tasks.destroy',
    ]);
    
    // Cleaning Task Actions
    Route::post('cleaning-tasks/{cleaningTask}/assign', [CleaningTaskController::class, 'assign'])->name('cleaning-tasks.assign');
    Route::post('cleaning-tasks/{cleaningTask}/start', [CleaningTaskController::class, 'start'])->name('cleaning-tasks.start');
    Route::post('cleaning-tasks/{cleaningTask}/complete', [CleaningTaskController::class, 'complete'])->name('cleaning-tasks.complete');
    Route::post('cleaning-tasks/{cleaningTask}/submit-review', [CleaningTaskController::class, 'submitForReview'])->name('cleaning-tasks.submit-review');
    Route::post('cleaning-tasks/{cleaningTask}/approve', [CleaningTaskController::class, 'approve'])->name('cleaning-tasks.approve');
    Route::get('cleaning-tasks/calendar/data', [CleaningTaskController::class, 'calendar'])->name('cleaning-tasks.calendar');
    
    // Cleaning Schedules
    Route::resource('cleaning-schedules', CleaningScheduleController::class)->names([
        'index' => 'cleaning-schedules.index',
        'create' => 'cleaning-schedules.create',
        'store' => 'cleaning-schedules.store',
        'show' => 'cleaning-schedules.show',
        'edit' => 'cleaning-schedules.edit',
        'update' => 'cleaning-schedules.update',
        'destroy' => 'cleaning-schedules.destroy',
    ]);
    
    // 📦 INVENTORY MANAGEMENT (Full Implementation)
    Route::resource('inventory-categories', InventoryCategoryController::class)->names([
        'index' => 'inventory-categories.index',
        'create' => 'inventory-categories.create',
        'store' => 'inventory-categories.store',
        'show' => 'inventory-categories.show',
        'edit' => 'inventory-categories.edit',
        'update' => 'inventory-categories.update',
        'destroy' => 'inventory-categories.destroy',
    ]);
    
    Route::resource('inventory-items', InventoryItemController::class)->names([
        'index' => 'inventory-items.index',
        'create' => 'inventory-items.create',
        'store' => 'inventory-items.store',
        'show' => 'inventory-items.show',
        'edit' => 'inventory-items.edit',
        'update' => 'inventory-items.update',
        'destroy' => 'inventory-items.destroy',
    ]);
    
    Route::resource('inventory-stocks', InventoryStockController::class)->names([
        'index' => 'inventory-stocks.index',
        'create' => 'inventory-stocks.create',
        'store' => 'inventory-stocks.store',
        'show' => 'inventory-stocks.show',
        'edit' => 'inventory-stocks.edit',
        'update' => 'inventory-stocks.update',
        'destroy' => 'inventory-stocks.destroy',
    ]);
});

// Notification routes
Route::middleware(['auth'])->prefix('notifications')->name('notifications.')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('index');
    Route::get('/unread', [NotificationController::class, 'unread'])->name('unread');
    Route::get('/recent', [NotificationController::class, 'recent'])->name('recent');
    Route::get('/count', [NotificationController::class, 'count'])->name('count');
    Route::patch('/{id}/read', [NotificationController::class, 'markAsRead'])->name('mark-read');
    Route::patch('/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('mark-all-read');
    Route::delete('/{id}', [NotificationController::class, 'destroy'])->name('destroy');
    Route::delete('/clear/read', [NotificationController::class, 'clearRead'])->name('clear-read');
});

require __DIR__.'/auth.php'; 