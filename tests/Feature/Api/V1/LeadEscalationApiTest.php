<?php

namespace Tests\Feature\Api\V1;

use App\Models\AiConversation;
use App\Models\AiEscalation;
use App\Models\AiLead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesApiToken;

class LeadEscalationApiTest extends TestCase
{
    use CreatesApiToken, RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->token = $this->createTestApiToken('Lead Test Token');
    }

    private function authHeader(): array
    {
        return $this->apiAuthHeader($this->token);
    }

    // =========================================================================
    // POST /api/v1/leads
    // =========================================================================

    #[Test]
    public function it_creates_a_new_lead(): void
    {
        $response = $this->postJson('/api/v1/leads', [
            'name' => 'Budi Santoso',
            'phone' => '+6281234567890',
            'email' => 'budi@example.com',
            'intent' => [
                'type' => 'booking_ready',
                'summary' => 'Family 6 orang cari villa weekend 10-13 Juni',
                'units_inquired' => ['villahoms', 'cubic-villa'],
                'preferred_dates' => [
                    'check_in' => '2026-06-10',
                    'check_out' => '2026-06-13',
                ],
                'guests' => 6,
            ],
            'tags' => ['family', 'weekend'],
            'urgency' => 'this_week',
            'persona_tag' => 'family',
            'channel' => 'web_chat',
            'conversation_id' => 'conv_test_001',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['lead_id', 'status', 'assigned_to', 'created_at', 'next_follow_up_suggested'],
            ]);

        $this->assertDatabaseHas('ai_leads', [
            'phone' => '+6281234567890',
            'name' => 'Budi Santoso',
            'intent_type' => 'booking_ready',
            'urgency' => 'this_week',
            'persona_tag' => 'family',
            'status' => 'new',
        ]);
    }

    #[Test]
    public function it_requires_phone_to_create_lead(): void
    {
        $response = $this->postJson('/api/v1/leads', [
            'name' => 'Budi Santoso',
            // missing phone
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    #[Test]
    public function it_is_idempotent_for_same_conversation_and_phone(): void
    {
        $payload = [
            'phone' => '+6281234567890',
            'conversation_id' => 'conv_idempotent_001',
            'intent' => ['type' => 'researching'],
        ];

        // First request — creates lead
        $first = $this->postJson('/api/v1/leads', $payload, $this->authHeader());
        $first->assertStatus(201);
        $leadId = $first->json('data.lead_id');

        // Second request — should update, not create duplicate
        $second = $this->postJson('/api/v1/leads', array_merge($payload, [
            'intent' => ['type' => 'booking_ready'],
        ]), $this->authHeader());

        $second->assertStatus(200)
            ->assertJsonPath('data.lead_id', $leadId)
            ->assertJsonPath('data.updated', true);

        // Only 1 lead should exist
        $this->assertEquals(1, AiLead::where('phone', '+6281234567890')->count());
    }

    #[Test]
    public function it_updates_an_existing_lead(): void
    {
        $lead = AiLead::create([
            'phone' => '+6281234567890',
            'intent_type' => 'researching',
            'status' => 'new',
            'urgency' => 'flexible',
        ]);

        $response = $this->patchJson("/api/v1/leads/{$lead->id}", [
            'intent' => [
                'type' => 'booking_ready',
                'preferred_unit' => 'villahoms',
            ],
            'tags_add' => ['high_value'],
            'urgency' => 'urgent',
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.lead_id', $lead->id);

        $lead->refresh();
        $this->assertEquals('booking_ready', $lead->intent_type);
        $this->assertEquals('urgent', $lead->urgency);
        $this->assertContains('high_value', $lead->tags);
        $this->assertContains('villahoms', $lead->units_inquired);
    }

    // =========================================================================
    // POST /api/v1/conversations
    // =========================================================================

    #[Test]
    public function it_creates_a_conversation(): void
    {
        $response = $this->postJson('/api/v1/conversations', [
            'conversation_id' => 'conv_test_abc123',
            'channel' => 'web_chat',
            'user_identifier' => 'anon_session_xyz',
            'status' => 'active',
            'summary' => 'Tanya villa 8 orang weekend',
            'tags' => ['family', 'villa_inquiry'],
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonPath('data.conversation_id', 'conv_test_abc123')
            ->assertJsonPath('data.created', true);

        $this->assertDatabaseHas('ai_conversations', [
            'conversation_id' => 'conv_test_abc123',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);
    }

    #[Test]
    public function it_updates_existing_conversation_on_upsert(): void
    {
        AiConversation::create([
            'conversation_id' => 'conv_existing_001',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/conversations', [
            'conversation_id' => 'conv_existing_001',
            'status' => 'escalated',
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.created', false);

        $this->assertDatabaseHas('ai_conversations', [
            'conversation_id' => 'conv_existing_001',
            'status' => 'escalated',
        ]);
    }

    #[Test]
    public function it_appends_messages_to_conversation(): void
    {
        AiConversation::create([
            'conversation_id' => 'conv_msg_test',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/conversations/conv_msg_test/messages', [
            'role' => 'user',
            'content' => 'halo, saya cari villa untuk 8 orang',
            'metadata' => [
                'latency_ms' => 0,
            ],
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['message_id', 'conversation_id', 'sent_at']]);

        $this->assertDatabaseHas('ai_conversation_messages', [
            'role' => 'user',
            'content' => 'halo, saya cari villa untuk 8 orang',
        ]);
    }

    #[Test]
    public function it_retrieves_conversation_with_messages(): void
    {
        $conv = AiConversation::create([
            'conversation_id' => 'conv_retrieve_test',
            'channel' => 'whatsapp',
            'status' => 'active',
        ]);

        $conv->messages()->create([
            'role' => 'user',
            'content' => 'halo',
            'sent_at' => now(),
        ]);

        $conv->messages()->create([
            'role' => 'assistant',
            'content' => 'Halo kak! Saya Mbak Homs.',
            'sent_at' => now()->addSecond(),
        ]);

        $response = $this->getJson('/api/v1/conversations/conv_retrieve_test', $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.conversation_id', 'conv_retrieve_test')
            ->assertJsonPath('data.message_count', 2);
    }

    // =========================================================================
    // POST /api/v1/escalations
    // =========================================================================

    #[Test]
    public function it_creates_an_escalation(): void
    {
        AiConversation::create([
            'conversation_id' => 'conv_escalate_001',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/escalations', [
            'conversation_id' => 'conv_escalate_001',
            'trigger' => 'closing_intent',
            'urgency' => 'high',
            'summary' => 'Tamu siap booking Villahoms 10-13 Jun. Butuh konfirmasi DP.',
            'context' => [
                'preferred_unit' => 'villahoms',
                'dates' => '10-13 Jun 2026',
                'total_price' => 6450000,
            ],
            'channel_preference' => 'whatsapp',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'escalation_id',
                    'case_url',
                    'notification_sent' => ['dashboard', 'whatsapp_group', 'email'],
                    'estimated_response_time_minutes',
                    'created_at',
                ],
            ]);

        $escalationId = $response->json('data.escalation_id');
        $this->assertStringStartsWith('esc_', $escalationId);

        // Conversation should be marked as escalated
        $this->assertDatabaseHas('ai_conversations', [
            'conversation_id' => 'conv_escalate_001',
            'status' => 'escalated',
        ]);

        // High urgency should trigger WA notification
        $this->assertTrue($response->json('data.notification_sent.whatsapp_group'));
        $this->assertEquals(5, $response->json('data.estimated_response_time_minutes'));
    }

    #[Test]
    public function it_sets_correct_response_time_by_urgency(): void
    {
        AiConversation::create([
            'conversation_id' => 'conv_urgency_test',
            'channel' => 'web_chat',
            'status' => 'active',
        ]);

        $urgencyExpected = [
            'critical' => 2,
            'high' => 5,
            'medium' => 15,
            'low' => 60,
        ];

        foreach ($urgencyExpected as $urgency => $expectedMinutes) {
            $convId = "conv_urgency_{$urgency}";
            AiConversation::create([
                'conversation_id' => $convId,
                'channel' => 'web_chat',
                'status' => 'active',
            ]);

            $response = $this->postJson('/api/v1/escalations', [
                'conversation_id' => $convId,
                'trigger' => 'complaint',
                'urgency' => $urgency,
                'summary' => "Test {$urgency} urgency",
            ], $this->authHeader());

            $response->assertStatus(201);
            $this->assertEquals(
                $expectedMinutes,
                $response->json('data.estimated_response_time_minutes'),
                "Expected {$expectedMinutes} minutes for urgency={$urgency}"
            );
        }
    }

    #[Test]
    public function it_updates_escalation_status(): void
    {
        $escalation = AiEscalation::create([
            'escalation_id' => 'esc_update_test',
            'conversation_id' => 'conv_x',
            'trigger' => 'closing_intent',
            'urgency' => 'high',
            'summary' => 'Test',
            'status' => 'created',
        ]);

        $response = $this->patchJson('/api/v1/escalations/esc_update_test', [
            'status' => 'resolved',
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'resolved');

        $escalation->refresh();
        $this->assertEquals('resolved', $escalation->status);
        $this->assertNotNull($escalation->resolved_at);
    }

    #[Test]
    public function it_requires_trigger_and_urgency_for_escalation(): void
    {
        $response = $this->postJson('/api/v1/escalations', [
            'conversation_id' => 'conv_x',
            'summary' => 'Test',
            // missing trigger and urgency
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    // =========================================================================
    // POST /api/v1/faq/search
    // =========================================================================

    #[Test]
    public function it_searches_faq_by_query(): void
    {
        $response = $this->postJson('/api/v1/faq/search', [
            'query' => 'jam check-in',
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'results' => [
                        '*' => ['id', 'category', 'question', 'answer', 'score', 'tags'],
                    ],
                ],
            ]);

        $results = $response->json('data.results');
        $this->assertNotEmpty($results);

        // Top result should be about check-in time
        $topQuestion = $results[0]['question'];
        $this->assertStringContainsStringIgnoringCase('check', $topQuestion);
    }

    #[Test]
    public function it_searches_faq_for_pet_policy(): void
    {
        $response = $this->postJson('/api/v1/faq/search', [
            'query' => 'boleh bawa anjing',
        ], $this->authHeader());

        $response->assertStatus(200);

        $results = $response->json('data.results');
        $this->assertNotEmpty($results);

        // Should find the pet policy FAQ
        $found = collect($results)->first(fn ($r) => str_contains(strtolower($r['question']), 'hewan'));
        $this->assertNotNull($found, 'Should find FAQ about pets');
    }

    #[Test]
    public function it_returns_faq_categories(): void
    {
        $response = $this->getJson('/api/v1/faq/categories', $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'categories' => [
                        '*' => ['slug', 'name', 'count'],
                    ],
                ],
            ]);

        $slugs = collect($response->json('data.categories'))->pluck('slug')->toArray();
        $this->assertContains('checkin-checkout-identitas', $slugs);
        $this->assertContains('konfirmasi-pembayaran', $slugs);
    }

    #[Test]
    public function it_returns_faq_by_category(): void
    {
        $response = $this->getJson('/api/v1/faq/categories/checkin-checkout-identitas', $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.category_slug', 'checkin-checkout-identitas');

        $faqs = $response->json('data.faqs');
        $this->assertNotEmpty($faqs);

        // All FAQs should be from this category
        foreach ($faqs as $faq) {
            $this->assertEquals('checkin-checkout-identitas', $faq['category_slug']);
        }
    }

    #[Test]
    public function it_returns_404_for_unknown_faq_category(): void
    {
        $response = $this->getJson('/api/v1/faq/categories/non-existent-category', $this->authHeader());

        $response->assertStatus(404);
    }
}
