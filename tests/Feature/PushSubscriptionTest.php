<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'webpush.vapid.public_key' => 'mock_public_key',
            'webpush.vapid.private_key' => 'mock_private_key',
        ]);

        $this->admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
    }

    #[Test]
    public function it_returns_the_vapid_public_key_without_authentication(): void
    {
        $response = $this->getJson('/push/vapid-public-key');

        $response->assertOk()
            ->assertJsonStructure(['vapid_public_key']);

        $this->assertNotEmpty($response->json('vapid_public_key'));
    }

    #[Test]
    public function it_stores_a_push_subscription_for_authenticated_user(): void
    {
        $payload = [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
            'keys' => [
                'p256dh' => 'BNcRdreALRFXTkOOUHK1EtK2wtwe',
                'auth' => 'tBHItJI5svbpez7KI4CCXg',
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/push/subscribe', $payload);

        $response->assertOk()
            ->assertJson(['message' => 'Subscribed successfully']);

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $this->admin->id,
            'endpoint' => $payload['endpoint'],
            'p256dh_key' => $payload['keys']['p256dh'],
            'auth_key' => $payload['keys']['auth'],
        ]);
    }

    #[Test]
    public function it_replaces_existing_subscription_with_same_endpoint(): void
    {
        $endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint-456';

        // First subscription
        PushSubscription::create([
            'user_id' => $this->admin->id,
            'endpoint' => $endpoint,
            'p256dh_key' => 'old-key',
            'auth_key' => 'old-auth',
        ]);

        // Subscribe again with same endpoint but new keys
        $response = $this->actingAs($this->admin)->postJson('/push/subscribe', [
            'endpoint' => $endpoint,
            'keys' => ['p256dh' => 'new-key', 'auth' => 'new-auth'],
        ]);

        $response->assertOk();

        $this->assertDatabaseCount('push_subscriptions', 1);
        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $this->admin->id,
            'endpoint' => $endpoint,
            'p256dh_key' => 'new-key',
            'auth_key' => 'new-auth',
        ]);
    }

    #[Test]
    public function it_requires_authentication_to_subscribe(): void
    {
        $response = $this->postJson('/push/subscribe', [
            'endpoint' => 'https://example.com/push',
            'keys' => ['p256dh' => 'key', 'auth' => 'auth'],
        ]);

        $response->assertUnauthorized();
    }

    #[Test]
    public function it_validates_required_subscription_fields(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/push/subscribe', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['endpoint', 'keys.p256dh', 'keys.auth']);
    }

    #[Test]
    public function it_deletes_a_push_subscription(): void
    {
        $endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint-789';

        PushSubscription::create([
            'user_id' => $this->admin->id,
            'endpoint' => $endpoint,
            'p256dh_key' => 'key',
            'auth_key' => 'auth',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson('/push/unsubscribe', [
            'endpoint' => $endpoint,
        ]);

        $response->assertOk()
            ->assertJson(['message' => 'Unsubscribed successfully']);

        $this->assertDatabaseMissing('push_subscriptions', [
            'user_id' => $this->admin->id,
            'endpoint' => $endpoint,
        ]);
    }

    #[Test]
    public function it_only_deletes_subscriptions_belonging_to_authenticated_user(): void
    {
        $otherUser = User::factory()->create(['role' => 'front_desk', 'status' => 'active']);
        $endpoint = 'https://fcm.googleapis.com/fcm/send/other-user-endpoint';

        PushSubscription::create([
            'user_id' => $otherUser->id,
            'endpoint' => $endpoint,
            'p256dh_key' => 'key',
            'auth_key' => 'auth',
        ]);

        // Admin tries to unsubscribe another user's endpoint — should succeed silently without deleting
        $this->actingAs($this->admin)->deleteJson('/push/unsubscribe', [
            'endpoint' => $endpoint,
        ]);

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $otherUser->id,
            'endpoint' => $endpoint,
        ]);
    }

    #[Test]
    public function it_requires_authentication_to_unsubscribe(): void
    {
        $response = $this->deleteJson('/push/unsubscribe', [
            'endpoint' => 'https://example.com/push',
        ]);

        $response->assertUnauthorized();
    }
}
