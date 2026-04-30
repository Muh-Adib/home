<?php

namespace App\Http\Middleware;

use App\Services\SeoService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        if (file_exists($manifest = public_path('build/manifest.json'))) {
            return md5_file($manifest);
        }

        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $seoService = app(SeoService::class);

        $isPublicRoute = ! $request->is('admin/*', 'staff/*', 'dashboard*', 'settings/*', 'my-bookings*', 'my-payments*');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // 'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'locale' => app()->getLocale(),
            // URL dinamis untuk frontend
            'app' => [
                'url' => config('app.url'),
                'asset_url' => config('app.asset_url', config('app.url')),
                'env' => config('app.env'),
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // Share CSRF token untuk frontend (optional, tapi membantu)
            'csrf' => csrf_token(),
            // Flash messages for toast notifications
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
            ],
            // Broadcast driver info for frontend Echo initialization
            'broadcastDriver' => config('broadcasting.default', 'log'),
            // ✨ Global SEO data (always available) — organization schema cached for 24h
            'globalSeo' => [
                'organizationSchema' => Cache::remember('schema_organization', 86400, fn () => $seoService->organizationSchema()),
                'siteName' => 'Homsjogja',
                'defaultImage' => asset('og-image.jpg'),
            ],
            // WebSite schema — enables Google Sitelinks Search Box (public pages only)
            'webSiteSchema' => $isPublicRoute
                ? fn (): string => Cache::remember('schema_website', 86400, fn () => $seoService->webSiteSchema())
                : null,
            // Default SEO (bisa di-override per page)
            'seo' => fn () => $seoService->generate(),
        ];
    }
}
