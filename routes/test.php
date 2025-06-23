<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TestCleaningController;

// Test routes for debugging
Route::get('/test/cleaning-data', [TestCleaningController::class, 'testData']);
Route::get('/test/cleaning-tasks', [TestCleaningController::class, 'index']); 