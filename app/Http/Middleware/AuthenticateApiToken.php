<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    /**
     * Validate Bearer token against api_tokens table.
     *
     * Security: token is looked up by SHA-256 hash, not plaintext.
     * This prevents timing attacks and ensures raw tokens are never
     * stored in a way that allows bulk extraction.
     */
    public function handle(Request $request, Closure $next, string ...$scopes): Response
    {
        $bearerToken = $request->bearerToken();

        if (! $bearerToken) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'AUTH_TOKEN_MISSING',
                    'message' => 'Authorization token is required. Use: Authorization: Bearer <token>',
                ],
            ], 401);
        }

        // Validate token format to avoid unnecessary DB queries
        if (! preg_match('/^hjg_(prod|dev)_[A-Za-z0-9]{32}$/', $bearerToken)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'AUTH_TOKEN_INVALID',
                    'message' => 'Invalid or expired API token.',
                ],
            ], 401);
        }

        // Hash-based lookup — raw token never compared directly
        $apiToken = ApiToken::findByRawToken($bearerToken);

        if (! $apiToken) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'AUTH_TOKEN_INVALID',
                    'message' => 'Invalid or expired API token.',
                ],
            ], 401);
        }

        // Check scope requirements
        foreach ($scopes as $scope) {
            if (! $apiToken->hasScope($scope)) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'AUTH_INSUFFICIENT_SCOPE',
                        'message' => "Token does not have required scope: {$scope}",
                    ],
                ], 403);
            }
        }

        // Track usage (quiet — no model events)
        $apiToken->markAsUsed();

        // Attach token to request for downstream use
        $request->attributes->set('api_token', $apiToken);

        return $next($request);
    }
}
