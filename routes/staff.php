<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Staff\CleaningTaskController;

/*
|--------------------------------------------------------------------------
| STAFF ROUTES - CLEANING & HOUSEKEEPING
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:housekeeping,property_manager,super_admin,front_desk'])->prefix('staff')->name('staff.')->group(function () {
    // Cleaning Tasks
    Route::controller(CleaningTaskController::class)->prefix('cleaning-tasks')->name('cleaning-tasks.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/{task}', 'show')->name('show');
        Route::post('/{task}/start', 'start')->name('start');
        Route::post('/{task}/complete', 'complete')->name('complete');
        Route::post('/{task}/upload-photo', 'uploadPhoto')->name('upload-photo');
    });
});
