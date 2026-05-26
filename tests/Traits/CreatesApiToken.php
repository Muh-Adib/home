<?php

namespace Tests\Traits;

use App\Models\ApiToken;

trait CreatesApiToken
{
    /**
     * Create a test API token and return the raw token string.
     * Stores token_hash for middleware lookup, token field as preview.
     */
    protected function createTestApiToken(string $name = 'Test Token'): string
    {
        $rawToken = ApiToken::generateToken();

        ApiToken::create([
            'name' => $name,
            'token' => substr($rawToken, 0, 12).'...', // preview only
            'token_hash' => ApiToken::hashToken($rawToken),
            'client_name' => 'Test Client',
            'is_active' => true,
        ]);

        return $rawToken;
    }

    protected function apiAuthHeader(string $rawToken): array
    {
        return ['Authorization' => "Bearer {$rawToken}"];
    }
}
