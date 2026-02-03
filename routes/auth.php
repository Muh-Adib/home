<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    // Auto-registration for booking guests
    Route::post('register/auto', [RegisteredUserController::class, 'autoRegister'])
        ->name('register.auto');

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');

    // Set password for new users
    Route::get('set-password/{user}', [NewPasswordController::class, 'showSetPassword'])
        ->middleware('signed')
        ->name('password.set');

    Route::post('set-password/{user}', [NewPasswordController::class, 'storeSetPassword']);

    // WhatsApp Authentication Routes
    Route::post('auth/whatsapp/check-number', [\App\Http\Controllers\Auth\WhatsappAuthController::class, 'checkNumber'])
        ->name('auth.whatsapp.check-number');

    Route::post('auth/whatsapp/request-otp', [\App\Http\Controllers\Auth\WhatsappAuthController::class, 'requestOtp'])
        ->name('auth.whatsapp.request-otp');

    Route::post('auth/whatsapp/verify-otp', [\App\Http\Controllers\Auth\WhatsappAuthController::class, 'verifyOtp'])
        ->name('auth.whatsapp.verify-otp');

    Route::post('auth/whatsapp/resend-otp', [\App\Http\Controllers\Auth\WhatsappAuthController::class, 'resendOtp'])
        ->name('auth.whatsapp.resend-otp');

});

/**
 * Email Verification Route
 * 
 * This route is OUTSIDE the 'auth' middleware group to allow guest users
 * to verify their email. The 'verify.signature.auth' middleware will
 * auto-login users with valid signed URLs.
 */
Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['verify.signature.auth', 'signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
