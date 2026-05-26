<?php

use App\Http\Controllers\Api\V1\AvailabilityApiController;
use App\Http\Controllers\Api\V1\ConversationApiController;
use App\Http\Controllers\Api\V1\EscalationApiController;
use App\Http\Controllers\Api\V1\FaqApiController;
use App\Http\Controllers\Api\V1\LeadApiController;
use App\Http\Controllers\Api\V1\PropertyApiController;
use App\Http\Controllers\Api\V1\QuoteApiController;
use App\Http\Controllers\Api\V1\WebhookApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — v1
|--------------------------------------------------------------------------
|
| External API for AI Agent (Mbak Homs) and other integrations.
| All routes require Bearer token authentication via api_tokens table.
|
| Base URL: /api/v1/
| Auth: Authorization: Bearer hjg_<env>_<random32>
|
| Generate token: php artisan api:token:generate "Mbak Homs AI Agent" --client="AI Agent"
|
*/

Route::prefix('v1')->name('api.v1.')->middleware(['api', 'auth.api'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Properties — Read-only catalog
    |--------------------------------------------------------------------------
    */
    Route::prefix('properties')->name('properties.')->middleware('throttle:api-v1-read')->group(function () {
        Route::get('/', [PropertyApiController::class, 'index'])->name('index');
        Route::get('/{property:slug}', [PropertyApiController::class, 'show'])->name('show');
    });

    /*
    |--------------------------------------------------------------------------
    | Availability — Real-time booking availability
    |--------------------------------------------------------------------------
    */
    Route::prefix('availability')->name('availability.')->middleware('throttle:api-v1-read')->group(function () {
        Route::post('/check', [AvailabilityApiController::class, 'check'])->name('check');
        Route::post('/search', [AvailabilityApiController::class, 'search'])->name('search');
    });

    /*
    |--------------------------------------------------------------------------
    | Quotes & Pricing — Rate calculation with extras
    |--------------------------------------------------------------------------
    */
    Route::prefix('quotes')->name('quotes.')->middleware('throttle:api-v1-read')->group(function () {
        Route::post('/calculate', [QuoteApiController::class, 'calculate'])->name('calculate');
    });

    Route::get('/extras', [QuoteApiController::class, 'extras'])->name('extras')->middleware('throttle:api-v1-read');

    /*
    |--------------------------------------------------------------------------
    | Leads — CRM lead capture from AI conversations
    |--------------------------------------------------------------------------
    */
    Route::prefix('leads')->name('leads.')->middleware('throttle:api-v1-write')->group(function () {
        Route::post('/', [LeadApiController::class, 'store'])->name('store');
        Route::patch('/{lead}', [LeadApiController::class, 'update'])->name('update');
    });

    /*
    |--------------------------------------------------------------------------
    | Conversations — Logging AI conversation turns
    |--------------------------------------------------------------------------
    */
    Route::prefix('conversations')->name('conversations.')->group(function () {
        Route::get('/', [ConversationApiController::class, 'index'])->name('index')->middleware('throttle:api-v1-read');
        Route::post('/', [ConversationApiController::class, 'upsert'])->name('upsert')->middleware('throttle:api-v1-write');
        Route::get('/{conversationId}', [ConversationApiController::class, 'show'])->name('show')->middleware('throttle:api-v1-read');
        Route::post('/{conversationId}/messages', [ConversationApiController::class, 'appendMessage'])->name('messages.append')->middleware('throttle:api-v1-write');
    });

    /*
    |--------------------------------------------------------------------------
    | Escalations — Human admin handoff
    |--------------------------------------------------------------------------
    */
    Route::prefix('escalations')->name('escalations.')->middleware('throttle:api-v1-write')->group(function () {
        Route::post('/', [EscalationApiController::class, 'store'])->name('store');
        Route::patch('/{escalationId}', [EscalationApiController::class, 'update'])->name('update');
    });

    /*
    |--------------------------------------------------------------------------
    | FAQ / Knowledge Base
    |--------------------------------------------------------------------------
    */
    Route::prefix('faq')->name('faq.')->middleware('throttle:api-v1-read')->group(function () {
        Route::post('/search', [FaqApiController::class, 'search'])->name('search');
        Route::get('/categories', [FaqApiController::class, 'categories'])->name('categories');
        Route::get('/categories/{categorySlug}', [FaqApiController::class, 'byCategory'])->name('by-category');
    });

    /*
    |--------------------------------------------------------------------------
    | Webhooks
    |--------------------------------------------------------------------------
    */
    Route::prefix('webhooks')->name('webhooks.')->middleware('throttle:api-v1-write')->group(function () {
        Route::get('/', [WebhookApiController::class, 'index'])->name('index');
        Route::post('/register', [WebhookApiController::class, 'register'])->name('register');
        Route::delete('/', [WebhookApiController::class, 'destroy'])->name('destroy');
    });
});

// Health check without auth
Route::get('/v1/health', function (Request $request) {
    return response()->json([
        'success' => true,
        'data' => [
            'status' => 'healthy',
            'version' => 'v1',
            'timestamp' => now()->toISOString(),
        ],
    ]);
})->name('api.v1.health');
