<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiLead;
use App\Models\ApiToken;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * API v1 — Webhooks (Outbound from this system to AI Agent)
 *
 * The AI Agent registers its endpoint here; this system pushes events to it.
 * Events: booking.created, booking.confirmed, booking.cancelled, property.updated
 */
class WebhookApiController extends Controller
{
    private const CACHE_PREFIX = 'webhook_config_token_';

    private const CACHE_TTL_SECONDS = 365 * 24 * 3600; // 1 year

    /**
     * POST /api/v1/webhooks/register
     *
     * AI Agent registers its webhook endpoint to receive events.
     * Config stored in cache keyed by api_token_id.
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'url' => 'required|url|max:500',
            'events' => 'required|array|min:1|max:10',
            'events.*' => 'in:booking.created,booking.confirmed,booking.cancelled,property.updated,property.availability_blocked',
            'secret' => 'required|string|min:16|max:128',
        ]);

        $apiToken = $request->attributes->get('api_token');
        $cacheKey = self::CACHE_PREFIX.$apiToken->id;

        $config = [
            'url' => $request->input('url'),
            'events' => $request->input('events'),
            // Store secret hashed — never expose raw secret after registration
            'secret_hash' => hash('sha256', $request->input('secret')),
            // Keep raw secret only for signing outbound requests (encrypted in cache)
            'secret' => encrypt($request->input('secret')),
            'registered_at' => now()->toISOString(),
            'api_token_id' => $apiToken->id,
        ];

        Cache::put($cacheKey, $config, self::CACHE_TTL_SECONDS);

        Log::info('Webhook registered', [
            'url' => $request->input('url'),
            'events' => $request->input('events'),
            'token_id' => $apiToken->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'webhook_id' => "wh_{$apiToken->id}",
                'url' => $request->input('url'),
                'events' => $request->input('events'),
                'registered_at' => now()->toISOString(),
            ],
            'meta' => $this->meta($request),
        ], 201);
    }

    /**
     * DELETE /api/v1/webhooks
     *
     * Remove registered webhook for this token.
     */
    public function destroy(Request $request): JsonResponse
    {
        $apiToken = $request->attributes->get('api_token');
        Cache::forget(self::CACHE_PREFIX.$apiToken->id);

        return response()->json([
            'success' => true,
            'data' => ['message' => 'Webhook unregistered.'],
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * GET /api/v1/webhooks
     *
     * List registered webhooks for this token (without secret).
     */
    public function index(Request $request): JsonResponse
    {
        $apiToken = $request->attributes->get('api_token');
        $config = Cache::get(self::CACHE_PREFIX.$apiToken->id);

        $webhooks = [];
        if ($config) {
            $webhooks[] = [
                'webhook_id' => "wh_{$apiToken->id}",
                'url' => $config['url'],
                'events' => $config['events'],
                'registered_at' => $config['registered_at'],
                // Never expose secret
            ];
        }

        return response()->json([
            'success' => true,
            'data' => ['webhooks' => $webhooks],
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * Dispatch a booking event to all registered AI Agent webhooks.
     * Called internally when booking status changes.
     * Should be dispatched via a queued job in production.
     */
    public static function dispatchBookingEvent(string $event, Booking $booking): void
    {
        $configs = self::getAllWebhookConfigs();

        foreach ($configs as $config) {
            if (! in_array($event, $config['events'])) {
                continue;
            }

            $payload = [
                'event' => $event,
                'timestamp' => now()->toISOString(),
                'data' => [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'lead_id' => null,
                    'conversation_id' => null,
                    'unit_id' => $booking->property_id,
                    'unit_slug' => $booking->property?->slug,
                    'amount' => $booking->total_amount,
                    // PII: only include what AI Agent needs for context
                    'guest_phone' => $booking->guest_phone,
                    'check_in' => $booking->check_in?->format('Y-m-d'),
                    'check_out' => $booking->check_out?->format('Y-m-d'),
                    'booking_status' => $booking->booking_status,
                ],
            ];

            // Link to AI lead by phone if exists
            $lead = AiLead::where('phone', $booking->guest_phone)->latest()->first();
            if ($lead) {
                $payload['data']['lead_id'] = $lead->id;
                $payload['data']['conversation_id'] = $lead->conversation_id;

                if ($event === 'booking.confirmed') {
                    $lead->update(['status' => 'converted']);
                }
            }

            self::sendWebhook($config['url'], $config['secret'], $payload);
        }
    }

    /**
     * Dispatch a property update event.
     */
    public static function dispatchPropertyEvent(string $event, Property $property): void
    {
        foreach (self::getAllWebhookConfigs() as $config) {
            if (! in_array($event, $config['events'])) {
                continue;
            }

            self::sendWebhook($config['url'], $config['secret'], [
                'event' => $event,
                'timestamp' => now()->toISOString(),
                'data' => [
                    'property_id' => $property->id,
                    'property_slug' => $property->slug,
                    'property_name' => $property->name,
                    'updated_at' => $property->updated_at?->toISOString(),
                ],
            ]);
        }
    }

    /**
     * Send webhook with HMAC-SHA256 signature.
     * Uses Laravel HTTP client (not raw Factory instantiation).
     */
    private static function sendWebhook(string $url, string $encryptedSecret, array $payload): void
    {
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $deliveryId = 'del_'.uniqid('', true);

        try {
            $secret = decrypt($encryptedSecret);
            $signature = 'sha256='.hash_hmac('sha256', $body, $secret);

            Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-Hjg-Signature' => $signature,
                'X-Hjg-Event' => $payload['event'],
                'X-Hjg-Delivery-Id' => $deliveryId,
            ])
                ->timeout(5)
                ->retry(2, 500) // 2 retries, 500ms delay
                ->post($url, $payload);

            Log::info('Webhook dispatched', [
                'event' => $payload['event'],
                'url' => $url,
                'delivery_id' => $deliveryId,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Webhook dispatch failed', [
                'event' => $payload['event'],
                'url' => $url,
                'delivery_id' => $deliveryId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get all registered webhook configs from cache.
     * Scans known token IDs — in production, use a webhooks DB table instead.
     */
    private static function getAllWebhookConfigs(): array
    {
        // TODO: Replace with DB query when webhook volume grows.
        // For now, collect all active token IDs and check their cache entries.
        $configs = [];

        try {
            $tokenIds = ApiToken::active()->pluck('id');

            foreach ($tokenIds as $tokenId) {
                $config = Cache::get(self::CACHE_PREFIX.$tokenId);
                if ($config) {
                    $configs[] = $config;
                }
            }
        } catch (\Throwable $e) {
            Log::error('Failed to load webhook configs', ['error' => $e->getMessage()]);
        }

        return $configs;
    }

    private function meta(Request $request): array
    {
        return [
            'request_id' => $request->header('X-Request-Id', uniqid('req_')),
            'timestamp' => now()->toISOString(),
            'api_version' => 'v1',
        ];
    }
}
