<?php

namespace Tests\Feature\Api\V1;

use App\Models\ApiToken;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesApiToken;

class PropertyApiTest extends TestCase
{
    use CreatesApiToken, RefreshDatabase;

    private string $token;

    private Property $property;

    protected function setUp(): void
    {
        parent::setUp();

        $this->token = $this->createTestApiToken('Property Test Token');

        $owner = User::factory()->create();

        $this->property = Property::factory()->create([
            'owner_id' => $owner->id,
            'name' => 'Cubic Villa',
            'slug' => 'cubic-villa',
            'status' => 'active',
            'base_rate' => 1800000,
            'capacity' => 6,
            'capacity_max' => 8,
            'bedroom_count' => 4,
            'bathroom_count' => 3,
            'cleaning_fee' => 200000,
            'extra_bed_rate' => 150000,
            'weekend_premium_percent' => 20,
            'check_in_time' => '14:00',
            'check_out_time' => '11:00',
            'min_stay_weekday' => 1,
            'min_stay_weekend' => 2,
        ]);
    }

    private function authHeader(): array
    {
        return $this->apiAuthHeader($this->token);
    }

    // =========================================================================
    // Authentication
    // =========================================================================

    #[Test]
    public function it_rejects_requests_without_token(): void
    {
        $response = $this->getJson('/api/v1/properties');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'AUTH_TOKEN_MISSING');
    }

    #[Test]
    public function it_rejects_requests_with_invalid_token(): void
    {
        // Token format tidak valid (tidak match hjg_<env>_<32chars>)
        $response = $this->getJson('/api/v1/properties', [
            'Authorization' => 'Bearer invalid-token-format',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'AUTH_TOKEN_INVALID');
    }

    #[Test]
    public function it_rejects_inactive_tokens(): void
    {
        $inactiveRaw = ApiToken::generateToken();
        ApiToken::create([
            'name' => 'Inactive',
            'token' => substr($inactiveRaw, 0, 12).'...',
            'token_hash' => ApiToken::hashToken($inactiveRaw),
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/v1/properties', [
            'Authorization' => "Bearer {$inactiveRaw}",
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function health_endpoint_does_not_require_auth(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'healthy')
            ->assertJsonPath('data.version', 'v1');
    }

    // =========================================================================
    // GET /api/v1/properties
    // =========================================================================

    #[Test]
    public function it_lists_active_properties(): void
    {
        // Create an inactive property that should NOT appear
        Property::factory()->create([
            'owner_id' => User::factory()->create()->id,
            'status' => 'inactive',
        ]);

        $response = $this->getJson('/api/v1/properties', $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'properties' => [
                        '*' => [
                            'id', 'slug', 'name', 'type',
                            'location' => ['area', 'address', 'lat', 'lng'],
                            'capacity' => ['bedrooms', 'bathrooms', 'standard', 'max_guests'],
                            'pricing' => ['base_per_night', 'currency', 'formatted_base'],
                            'facilities',
                            'primary_photo',
                            'url',
                            'rules',
                        ],
                    ],
                    'total',
                    'filter_applied',
                ],
                'meta' => ['request_id', 'timestamp', 'api_version'],
            ]);

        // Only active property should appear
        $response->assertJsonPath('data.total', 1);
        $response->assertJsonPath('data.properties.0.slug', 'cubic-villa');
    }

    #[Test]
    public function it_filters_properties_by_min_capacity(): void
    {
        // Create a small property (capacity 2)
        Property::factory()->create([
            'owner_id' => User::factory()->create()->id,
            'status' => 'active',
            'capacity' => 2,
            'capacity_max' => 2,
        ]);

        $response = $this->getJson('/api/v1/properties?min_capacity=6', $this->authHeader());

        $response->assertStatus(200);

        // Only cubic-villa (capacity_max=8) should match
        $response->assertJsonPath('data.total', 1);
        $response->assertJsonPath('data.properties.0.slug', 'cubic-villa');
    }

    #[Test]
    public function it_filters_properties_by_max_price(): void
    {
        // Create a cheap property
        Property::factory()->create([
            'owner_id' => User::factory()->create()->id,
            'status' => 'active',
            'base_rate' => 500000,
            'capacity_max' => 4,
        ]);

        $response = $this->getJson('/api/v1/properties?max_price_per_night=600000', $this->authHeader());

        $response->assertStatus(200);
        // Only the cheap property (500k) should match, not cubic-villa (1.8M)
        $response->assertJsonPath('data.total', 1);
    }

    #[Test]
    public function it_includes_rate_calculation_when_dates_provided(): void
    {
        $checkIn = now()->addDays(7)->format('Y-m-d');
        $checkOut = now()->addDays(9)->format('Y-m-d');

        $response = $this->getJson(
            "/api/v1/properties?check_in={$checkIn}&check_out={$checkOut}&guests=4",
            $this->authHeader()
        );

        $response->assertStatus(200);

        $property = $response->json('data.properties.0');
        $this->assertArrayHasKey('calculated', $property['pricing']);
        $this->assertArrayHasKey('total_amount', $property['pricing']['calculated']);
        $this->assertArrayHasKey('nights', $property['pricing']['calculated']);
    }

    // =========================================================================
    // GET /api/v1/properties/{slug}
    // =========================================================================

    #[Test]
    public function it_returns_property_detail(): void
    {
        $response = $this->getJson('/api/v1/properties/cubic-villa', $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id', 'slug', 'name', 'type',
                    'location' => ['area', 'address', 'lat', 'lng', 'maps_link'],
                    'capacity' => ['bedrooms', 'bathrooms', 'standard', 'max_guests', 'extra_bed_available'],
                    'pricing' => [
                        'base_per_night', 'weekend_premium_percent', 'cleaning_fee',
                        'extra_bed_rate', 'currency', 'season_rates_available', 'formatted_base',
                    ],
                    'facilities',
                    'rules' => ['check_in', 'check_out', 'min_stay_weekday', 'min_stay_weekend'],
                    'photos',
                    'description_short',
                    'description_full',
                    'url',
                    'is_active',
                    'updated_at',
                ],
            ]);

        $response->assertJsonPath('data.slug', 'cubic-villa');
        $response->assertJsonPath('data.pricing.base_per_night', 1800000);
        $response->assertJsonPath('data.capacity.max_guests', 8);
        $response->assertJsonPath('data.is_active', true);
    }

    #[Test]
    public function it_returns_404_for_unknown_slug(): void
    {
        $response = $this->getJson('/api/v1/properties/non-existent-villa', $this->authHeader());

        $response->assertStatus(404);
    }

    #[Test]
    public function it_does_not_return_inactive_property(): void
    {
        $owner = User::factory()->create();
        Property::factory()->create([
            'owner_id' => $owner->id,
            'slug' => 'inactive-villa',
            'status' => 'inactive',
        ]);

        $response = $this->getJson('/api/v1/properties/inactive-villa', $this->authHeader());

        $response->assertStatus(404);
    }

    #[Test]
    public function it_marks_last_used_at_on_token_after_request(): void
    {
        $tokenHash = ApiToken::hashToken($this->token);
        $token = ApiToken::where('token_hash', $tokenHash)->first();
        $this->assertNull($token->last_used_at);

        $this->getJson('/api/v1/properties', $this->authHeader());

        $token->refresh();
        $this->assertNotNull($token->last_used_at);
    }
}
