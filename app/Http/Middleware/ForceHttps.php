<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceHttps
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Force HTTPS only if explicitly configured
        if (app()->environment('production') && 
            config('app.force_https', false) && 
            !$request->secure()) {
            return redirect()->secure($request->getRequestUri());
        }

        // Set secure headers
        $response = $next($request);
        
        if ($response instanceof Response) {
            // Only set HSTS header if HTTPS is forced
            if (config('app.force_https', false)) {
                $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            }
            $response->headers->set('X-Content-Type-Options', 'nosniff');
            $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
            $response->headers->set('X-XSS-Protection', '1; mode=block');
        }

        return $response;
    }
}
