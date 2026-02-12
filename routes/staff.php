<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Staff\CleaningDashboardController;

/*
|--------------------------------------------------------------------------
| STAFF ROUTES - CLEANING & HOUSEKEEPING
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:super_admin,housekeeping,front_desk'])->group(function () {
    Route::get('/staff/cleaning', [CleaningDashboardController::class, 'index'])
        ->name('staff.cleaning.index');
    Route::patch('/staff/cleaning/{booking}/mark-cleaned', [CleaningDashboardController::class, 'markAsCleaned'])
        ->name('staff.cleaning.mark-cleaned');
    Route::get('/staff/cleaning/property/{property}/keybox', [CleaningDashboardController::class, 'getKeyboxCode'])
        ->name('staff.cleaning.keybox');
});
