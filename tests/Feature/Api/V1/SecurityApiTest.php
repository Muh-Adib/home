<?php

namespace Tests\Feature\Api\V1;

use App\Models\AiConversation;
use App\Models\AiEscalation;
use App\Models\ApiToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesApiToken;

/**
 * Security and edge case tests for API v1.
 * Covers: auth, rate limiting, input validation, status transitions.
 */
class SecurityApiTest extends TestCase
{
    use CreatesApiToken, RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->token = $this->createTestApiToken('Security Test Token');
    }

    private function authHeader(): array
    {
        return $this->apiAuthHeader($this->token);
    }

    // =========================================================================
    // Token format validation
    // =========================================================================

    #[Test]
    public function it_rejects_token_with_wrong_format(): void
    {
        $badTokens = [
            'not-a-token',
            'hjg_prod_short',                          // too short
            'hjg_staging_'.str_repeat('a', 32),      // wrong env
            'Bearer hjg_dev_'.str_repeat('a', 32),   // includes Bearer prefix
            '',
        ];

        foreach ($badTokens as $bad) {
            $response = $this->getJson('/api/v1/properties', [
                'Authorization' => "Bearer {$bad}",
            ]);
            $this->assertContains(
                $response->status(),
                [401],
                "Expected 401 for token: '{$bad}'"
            );
        }
    }

    #[Test]
    public function it_rejects_valid_format_but_unknown_token(): void
    {
        // Correct format but not in DB
        $unknownToken = 'hjg_dev_'.str_repeat('z', 32);

        $response = $this->getJson('/api/v1/properties', [
            'Authorization' => "Bearer {$unknownToken}",
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'AUTH_TOKEN_INVALID');
    }

    #[Test]
    public function it_rejects_expired_token(): void
    {
        $expiredRaw = ApiToken::generateToken();
        ApiToken::create([
            'name' => 'Expired Token',
            'token' => substr($expiredRaw, 0, 12).'...',
            'token_hash' => ApiToken::hashToken($expiredRaw),
            'is_active' => true,
            'expires_at' => now()->subDay(), // expired yesterday
        ]);

        $response = $this->getJson('/api/v1/properties', [
            'Authorization' => "Bearer {$expiredRaw}",
        ]);

        $response->assertStatus(401);
    }

    // =========================================================================
    // Past date validation
    // =========================================================================

    #[Test]
    public function it_rejects_past_check_in_for_availability_check(): void
    {
        $response = $this->postJson('/api/v1/availability/check', [
            'unit_slug' => 'any-unit',
            'check_in' => now()->subDay()->format('Y-m-d'),
            'check_out' => now()->addDay()->format('Y-m-d'),
            'guests' => 2,
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    #[Test]
    public function it_rejects_past_check_in_for_availability_search(): void
    {
        $response = $this->postJson('/api/v1/availability/search', [
            'check_in' => now()->subDay()->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'guests' => 2,
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    #[Test]
    public function it_rejects_past_check_in_for_quote(): void
    {
        $response = $this->postJson('/api/v1/quotes/calculate', [
            'unit_slug' => 'any-unit',
            'check_in' => now()->subDay()->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'guests' => 2,
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    // =========================================================================
    // Escalation status transition
    // =========================================================================

    #[Test]
    public function it_prevents_backwards_status_transition_on_escalation(): void
    {
        AiConversation::create([
            'conversation_id' => 'conv_transition_test',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);

        // Create escalation already in 'resolved' state
        $escalation = AiEscalation::create([
            'escalation_id' => 'esc_transition_test',
            'conversation_id' => 'conv_transition_test',
            'trigger' => 'closing_intent',
            'urgency' => 'high',
            'summary' => 'Test',
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);

        // Try to move back to 'claimed' — should fail
        $response = $this->patchJson('/api/v1/escalations/esc_transition_test', [
            'status' => 'claimed',
        ], $this->authHeader());

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'BUSINESS_INVALID_STATUS_TRANSITION');
    }

    #[Test]
    public function it_allows_forward_status_transition_on_escalation(): void
    {
        AiConversation::create([
            'conversation_id' => 'conv_forward_test',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);

        AiEscalation::create([
            'escalation_id' => 'esc_forward_test',
            'conversation_id' => 'conv_forward_test',
            'trigger' => 'complaint',
            'urgency' => 'medium',
            'summary' => 'Test forward',
            'status' => 'created',
        ]);

        $response = $this->patchJson('/api/v1/escalations/esc_forward_test', [
            'status' => 'resolved',
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'resolved');
    }

    // =========================================================================
    // Input size limits
    // =========================================================================

    #[Test]
    public function it_rejects_oversized_message_content(): void
    {
        AiConversation::create([
            'conversation_id' => 'conv_size_test',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/conversations/conv_size_test/messages', [
            'role' => 'user',
            'content' => str_repeat('a', 10001), // Over 10000 char limit
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    #[Test]
    public function it_rejects_too_many_guests(): void
    {
        $response = $this->postJson('/api/v1/availability/search', [
            'check_in' => now()->addDays(5)->format('Y-m-d'),
            'check_out' => now()->addDays(7)->format('Y-m-d'),
            'guests' => 51, // Over max:50
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    // =========================================================================
    // Health check (no auth)
    // =========================================================================

    #[Test]
    public function health_endpoint_is_accessible_without_auth(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'healthy');
    }
}
