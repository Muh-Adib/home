<?php

use App\Http\Controllers\Staff\CleaningDashboardController;
use Illuminate\Support\Facades\Route;

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

    // Unit Damages and Routine Schedules for Staff
    Route::post('/staff/unit-damages/{unitDamage:uuid}/claim', [CleaningDashboardController::class, 'claimUnitDamage'])
        ->name('staff.unit-damages.claim');
    Route::post('/staff/unit-damages/{unitDamage:uuid}/resolve', [CleaningDashboardController::class, 'resolveUnitDamage'])
        ->name('staff.unit-damages.resolve');
    Route::post('/staff/routine-schedules/{schedule}/complete', [CleaningDashboardController::class, 'completeRoutineSchedule'])
        ->name('staff.routine-schedules.complete');
});
