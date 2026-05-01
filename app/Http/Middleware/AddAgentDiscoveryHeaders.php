<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Add RFC 8288 Link response headers for AI agent discoverability.
 *
 * Only applied to public-facing HTML responses (not admin, API, assets).
 * Relation types follow IANA Link Relations registry.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8288
 * @see https://www.rfc-editor.org/rfc/rfc9727#section-3
 */
class AddAgentDiscoveryHeaders
{
    /**
     * Routes that should NOT receive agent discovery headers.
     */
    private const EXCLUDED_PREFIXES = [
        'admin', 'staff', 'dashboard', 'settings',
        'my-bookings', 'my-payments', 'api',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only add to public HTML responses
        if ($this->shouldSkip($request, $response)) {
            return $response;
        }

        $base = rtrim(config('app.url'), '/');

        // RFC 8288 Link headers — each points agents to a useful resource
        $links = [
            // API catalog — machine-readable list of available APIs
            "<{$base}/.well-known/api-catalog>; rel=\"api-catalog\"",
            // Agent capabilities — what this site can do for AI agents
            "<{$base}/.well-known/agent.json>; rel=\"agent\"",
            // Sitemap — structured content index for crawlers
            "<{$base}/sitemap.xml>; rel=\"sitemap\"; type=\"application/xml\"",
            // Canonical service description
            "<{$base}>; rel=\"canonical\"",
        ];

        $response->headers->set('Link', implode(', ', $links));

        return $response;
    }

    private function shouldSkip(Request $request, Response $response): bool
    {
        // Skip non-HTML responses (JSON, XML, assets, etc.)
        $contentType = $response->headers->get('Content-Type', '');
        if (! str_contains($contentType, 'text/html') && ! empty($contentType)) {
            return true;
        }

        // Skip admin/API routes
        foreach (self::EXCLUDED_PREFIXES as $prefix) {
            if ($request->is("{$prefix}/*") || $request->is($prefix)) {
                return true;
            }
        }

        return false;
    }
}
