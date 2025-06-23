<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class SetLocale
{
    /** @var array Locale yang didukung */
    private array $supportedLocales = ['id', 'en'];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $locale = session('locale');

        if (!$locale) {
            // Gunakan header browser
            $browserLocale = substr($request->header('Accept-Language'), 0, 2);
            if (in_array($browserLocale, $this->supportedLocales)) {
                $locale = $browserLocale;
            }
        }

        // Fallback ke konfigurasi app.locale
        $locale = $locale ?? config('app.locale', 'id');

        // Pastikan locale didukung
        if (!in_array($locale, $this->supportedLocales)) {
            $locale = 'id';
        }

        App::setLocale($locale);

        // Simpan ke sesi agar konsisten
        session(['locale' => $locale]);

        return $next($request);
    }
} 