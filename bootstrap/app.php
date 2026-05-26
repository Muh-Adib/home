<?php

use App\Http\Middleware\AddAgentDiscoveryHeaders;
use App\Http\Middleware\ApiResponseFormatter;
use App\Http\Middleware\EnsureEmailVerificationSignature;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\ServeMarkdownForAgents;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('web')
                ->group(base_path('routes/user.php'));
            Route::middleware('web')
                ->group(base_path('routes/admin.php'));
            Route::middleware('web')
                ->group(base_path('routes/staff.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->validateCsrfTokens(except: [
            'payment/gateway/*',
        ]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            AddAgentDiscoveryHeaders::class,
            ServeMarkdownForAgents::class,
            SetLocale::class,
        ]);

        // API response formatting for API routes
        $middleware->api(prepend: [
            ApiResponseFormatter::class,
        ]);

        // Register custom middleware
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'locale' => SetLocale::class,
            'verify.signature.auth' => EnsureEmailVerificationSignature::class,
            'auth.api' => \App\Http\Middleware\AuthenticateApiToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
