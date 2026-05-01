<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

/**
 * Serves /.well-known/* endpoints for agent and API discoverability.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8288
 * @see https://www.rfc-editor.org/rfc/rfc9727
 */
class WellKnownController extends Controller
{
    /**
     * GET /.well-known/agent.json
     *
     * Describes what this site can do for AI agents.
     * Follows emerging agent.json convention.
     */
    public function agent(): JsonResponse
    {
        $base = rtrim(config('app.url'), '/');

        return response()->json([
            'name' => 'Homsjogja',
            'description' => 'Platform booking homestay, villa, dan penginapan terbaik di Yogyakarta.',
            'url' => $base,
            'locale' => 'id-ID',
            'capabilities' => [
                'search' => [
                    'endpoint' => "{$base}/properties",
                    'parameters' => ['search', 'guests', 'check_in', 'check_out', 'amenities', 'sort'],
                    'description' => 'Search available properties by keyword, dates, and guest count.',
                ],
                'booking' => [
                    'endpoint' => "{$base}/booking/create",
                    'description' => 'Book a property online with instant confirmation.',
                ],
                'faq' => [
                    'endpoint' => "{$base}/faq",
                    'description' => 'Frequently asked questions about booking and properties.',
                ],
            ],
            'contact' => [
                'whatsapp' => 'https://wa.me/628112500082',
                'email' => 'no-reply@homsjogja.com',
            ],
            'sitemap' => "{$base}/sitemap.xml",
            'api_catalog' => "{$base}/.well-known/api-catalog",
        ], 200, [
            'Content-Type' => 'application/json',
            'Cache-Control' => 'public, max-age=86400',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }

    /**
     * GET /.well-known/api-catalog
     *
     * Machine-readable catalog of public API endpoints.
     * Relation type: api-catalog (RFC 9727 §3)
     */
    public function apiCatalog(): JsonResponse
    {
        $base = rtrim(config('app.url'), '/');

        return response()->json([
            'apis' => [
                [
                    'title' => 'Property Search',
                    'description' => 'List and filter available properties.',
                    'url' => "{$base}/properties",
                    'methods' => ['GET'],
                    'parameters' => [
                        'search' => 'string — keyword search',
                        'guests' => 'integer — minimum guest capacity',
                        'check_in' => 'date (Y-m-d) — check-in date',
                        'check_out' => 'date (Y-m-d) — check-out date',
                        'sort' => 'string — featured|price_low|price_high|name',
                    ],
                ],
                [
                    'title' => 'Property Detail',
                    'description' => 'Get full details of a specific property.',
                    'url' => "{$base}/properties/{slug}",
                    'methods' => ['GET'],
                ],
                [
                    'title' => 'Rate Calculator',
                    'description' => 'Calculate total price for a stay.',
                    'url' => "{$base}/api/properties/{slug}/calculate-rate",
                    'methods' => ['GET', 'POST'],
                    'parameters' => [
                        'check_in' => 'date (Y-m-d)',
                        'check_out' => 'date (Y-m-d)',
                        'guest_count' => 'integer',
                    ],
                ],
                [
                    'title' => 'Availability Check',
                    'description' => 'Check if a property is available for given dates.',
                    'url' => "{$base}/api/properties/{slug}/availability",
                    'methods' => ['GET'],
                    'parameters' => [
                        'check_in' => 'date (Y-m-d)',
                        'check_out' => 'date (Y-m-d)',
                    ],
                ],
                [
                    'title' => 'Articles / Blog',
                    'description' => 'Travel guides and tips about Yogyakarta.',
                    'url' => "{$base}/articles",
                    'methods' => ['GET'],
                ],
            ],
            'contact' => 'no-reply@homsjogja.com',
            'documentation' => "{$base}/.well-known/agent.json",
        ], 200, [
            'Content-Type' => 'application/json',
            'Cache-Control' => 'public, max-age=86400',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }
}
