<?php

use App\Http\Controllers\Dev\CodeVisController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| DEV ROUTES — local environment only
|--------------------------------------------------------------------------
*/

if (! app()->environment('local')) {
    return;
}

Route::prefix('dev')->name('dev.')->group(function () {
    Route::get('codevis/api', [CodeVisController::class, 'index'])->name('codevis.api');
    Route::get('codevis', function () {
        return view('dev.codevis');
    })->name('codevis');
});
