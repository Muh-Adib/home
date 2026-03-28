<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class GoogleIndexingService
{
    private const INDEXING_API_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
    private const SCOPE = 'https://www.googleapis.com/auth/indexing';
    private const TOKEN_CACHE_KEY = 'google_indexing_access_token';

    /**
     * Notify Google to index or update a URL.
     *
     * @param string $url      The full URL to notify Google about
     * @param string $type     'URL_UPDATED' atau 'URL_DELETED'
     * @return bool
     */
    public function notifyUrl(string $url, string $type = 'URL_UPDATED'): bool
    {
        try {
            $accessToken = $this->getAccessToken();

            if (!$accessToken) {
                Log::warning('[GoogleIndexing] Failed to get access token, skipping notification.', ['url' => $url]);
                return false;
            }

            $response = Http::withToken($accessToken)
                ->timeout(15)
                ->post(self::INDEXING_API_URL, [
                    'url'  => $url,
                    'type' => $type,
                ]);

            if ($response->successful()) {
                Log::info('[GoogleIndexing] URL notified successfully.', [
                    'url'      => $url,
                    'type'     => $type,
                    'response' => $response->json(),
                ]);
                return true;
            }

            Log::warning('[GoogleIndexing] API returned non-success status.', [
                'url'    => $url,
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('[GoogleIndexing] Exception during URL notification.', [
                'url'       => $url,
                'exception' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Get a cached or fresh OAuth2 access token using the service account private key.
     */
    private function getAccessToken(): ?string
    {
        // Cache token for 50 minutes (tokens are valid 60 min)
        return Cache::remember(self::TOKEN_CACHE_KEY, 3000, function () {
            try {
                $now     = time();
                $expiry  = $now + 3600;

                $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));

                $claimSet = base64_encode(json_encode([
                    'iss'   => config('services.google_indexing.client_email'),
                    'scope' => self::SCOPE,
                    'aud'   => 'https://oauth2.googleapis.com/token',
                    'exp'   => $expiry,
                    'iat'   => $now,
                ]));

                $headerClaims = $this->base64UrlEncode($header) . '.' . $this->base64UrlEncode($claimSet);

                $privateKey = config('services.google_indexing.private_key');
                if (!$privateKey) {
                    Log::error('[GoogleIndexing] Private key not configured.');
                    return null;
                }

                // Normalize the private key (replace literal \n with actual newlines)
                $normalizedKey = str_replace('\\n', "\n", $privateKey);

                $signature = '';
                $pkeyResource = openssl_pkey_get_private($normalizedKey);
                if (!$pkeyResource) {
                    Log::error('[GoogleIndexing] Failed to parse private key.');
                    return null;
                }

                openssl_sign($headerClaims, $signature, $pkeyResource, 'SHA256');

                $jwt = $headerClaims . '.' . $this->base64UrlEncode(base64_encode($signature));

                $tokenResponse = Http::asForm()
                    ->timeout(15)
                    ->post('https://oauth2.googleapis.com/token', [
                        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                        'assertion'  => $jwt,
                    ]);

                if ($tokenResponse->successful()) {
                    return $tokenResponse->json('access_token');
                }

                Log::error('[GoogleIndexing] Failed to get access token.', [
                    'status' => $tokenResponse->status(),
                    'body'   => $tokenResponse->body(),
                ]);

                return null;
            } catch (\Throwable $e) {
                Log::error('[GoogleIndexing] Exception while generating JWT.', [
                    'exception' => $e->getMessage(),
                ]);
                return null;
            }
        });
    }

    /**
     * URL-safe Base64 encoding (RFC 4648).
     */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
