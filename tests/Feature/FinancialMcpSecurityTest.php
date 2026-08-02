<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialMcpSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_to_finance_mcp_api_is_rejected(): void
    {
        // 1. Without Bearer token -> 401 Unauthorized
        $response = $this->getJson('/api/v1/finance/report');
        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'AUTH_TOKEN_MISSING',
                ],
            ]);

        // 2. With invalid Bearer token -> 401 Unauthorized
        $responseWithInvalidToken = $this->withHeader('Authorization', 'Bearer hjg_prod_invalidtoken123456789012345678')
            ->getJson('/api/v1/finance/report');
        $responseWithInvalidToken->assertStatus(401)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'AUTH_TOKEN_INVALID',
                ],
            ]);

        // 3. Diagnose endpoint also protected -> 401 Unauthorized
        $diagnoseResponse = $this->getJson('/api/v1/finance/diagnose');
        $diagnoseResponse->assertStatus(401);
    }
}
