<?php

use App\Http\Controllers\AmenityController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AUTHENTICATED USER ROUTES
|--------------------------------------------------------------------------
| Routes for logged-in users (Guests, etc.)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Guest Bookings
    Route::get('/my-bookings', [DashboardController::class, 'myBookings'])->name('my-bookings');
    Route::get('/booking/{booking:booking_number}', [BookingController::class, 'show'])->name('booking.show');

    // User Payments
    Route::controller(PaymentController::class)->group(function () {
        Route::get('/my-payments', 'myPayments')->name('my-payments');
        Route::get('/my-payments/{payment}', 'myPaymentShow')->name('my-payments.show');
    });

    // Authenticated API Routes
    Route::prefix('api')->name('api.')->group(function () {
        Route::controller(PropertyController::class)->group(function () {
            Route::get('properties/search', 'search')->name('properties.search');
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

    // Profile Routes (user area)
    // Gunakan nama berbeda agar tidak bentrok dengan routes di routes/settings.php
    Route::controller(ProfileController::class)->group(function () {
        Route::get('/profile', 'edit')->name('user.profile.edit');
        Route::patch('/profile', 'update')->name('user.profile.update');
        Route::delete('/profile', 'destroy')->name('user.profile.destroy');
    });

    // Booking Resume
    Route::get('/booking/resume', [BookingController::class, 'resumeBooking'])
        ->name('bookings.resume');
});
