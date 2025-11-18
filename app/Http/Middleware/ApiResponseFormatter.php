<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API Response Formatter Middleware
 * 
 * Middleware untuk memformat semua API responses dengan struktur yang konsisten
 * dan menambahkan security headers
 */
class ApiResponseFormatter
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only format JSON responses
        if ($request->expectsJson() || $request->is('api/*')) {
            // Add security headers
            $response->headers->set('X-Content-Type-Options', 'nosniff');
            $response->headers->set('X-Frame-Options', 'DENY');
            $response->headers->set('X-XSS-Protection', '1; mode=block');
            $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

            // Format JSON response if needed
            if ($response->headers->get('Content-Type') === 'application/json' || 
                str_contains($response->headers->get('Content-Type', ''), 'application/json')) {
                
                $content = $response->getContent();
                $data = json_decode($content, true);

                // If response is already formatted, don't reformat
                if (is_array($data) && (isset($data['success']) || isset($data['data']) || isset($data['message']))) {
                    return $response;
                }

                // Format response structure
                $formatted = [
                    'success' => $response->getStatusCode() >= 200 && $response->getStatusCode() < 300,
                    'data' => $data,
                ];

                // Add message if available
                if (isset($data['message'])) {
                    $formatted['message'] = $data['message'];
                    unset($formatted['data']['message']);
                }

                // Add errors if available
                if (isset($data['errors'])) {
                    $formatted['errors'] = $data['errors'];
                    unset($formatted['data']['errors']);
                }

                $response->setContent(json_encode($formatted));
            }
        }

        return $response;
    }
}



