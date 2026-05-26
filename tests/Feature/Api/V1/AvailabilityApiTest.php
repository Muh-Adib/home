<?php

namespace Tests\Feature\Api\V1;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesApiToken;

class AvailabilityApiTest extends TestCase
{
    use CreatesApiToken, RefreshDatabase;

    private string $token;

    private Property $property;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->token = $this->createTestApiToken('Availability Test Token');

        $this->owner = User::factory()->create();

        $this->property = Property::factory()->create([
            'owner_id' => $this->owner->id,
            'name' => 'Villahoms',
            'slug' => 'villahoms',
            'status' => 'active',
            'base_rate' => 2150000,
            'capacity' => 6,
            'capacity_max' => 8,
            'cleaning_fee' => 0,
            'extra_bed_rate' => 150000,
            'weekend_premium_percent' => 20,
            'min_stay_weekday' => 1,
            'min_stay_weekend' => 2,
        ]);
    }

    private function authHeader(): array
    {
        return $this->apiAuthHeader($this->token);
    }

    // =========================================================================
    // POST /api/v1/availability/check
    // =========================================================================

    #[Test]
    public function it_returns_available_when_no_bookings_exist(): void
    {
        $checkIn = now()->addDays(10)->format('Y-m-d');
        $checkOut = now()->addDays(13)->format('Y-m-d');

        $response = $this->postJson('/api/v1/availability/check', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 6,
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.unit_name', 'Villahoms')
            ->assertJsonStructure([
                'data' => [
                    'unit_id', 'unit_name', 'check_in', 'check_out',
                    'nights', 'guests', 'available', 'capacity_ok',
                    'per_night_breakdown', 'total_price', 'formatted_total', 'currency',
                ],
            ]);

        $this->assertEquals(3, $response->json('data.nights'));
        $this->assertGreaterThan(0, $response->json('data.total_price'));
    }

    #[Test]
    public function it_returns_unavailable_when_dates_are_booked(): void
    {
        $checkIn = now()->addDays(10)->format('Y-m-d');
        $checkOut = now()->addDays(13)->format('Y-m-d');

        // Create a confirmed booking that blocks these dates
        $guest = User::factory()->create();
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'booking_status' => 'confirmed',
            'guest_count' => 4,
            'created_by' => $guest->id,
        ]);

        $response = $this->postJson('/api/v1/availability/check', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 4,
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.reason', 'BOOKED');

        $this->assertNotEmpty($response->json('data.blocked_dates'));
    }

    #[Test]
    public function it_returns_capacity_exceeded_when_guests_too_many(): void
    {
        $checkIn = now()->addDays(10)->format('Y-m-d');
        $checkOut = now()->addDays(12)->format('Y-m-d');

        $response = $this->postJson('/api/v1/availability/check', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 20, // Way over capacity_max=8
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.reason', 'CAPACITY_EXCEEDED');
    }

    #[Test]
    public function it_accepts_unit_id_instead_of_slug(): void
    {
        $checkIn = now()->addDays(5)->format('Y-m-d');
        $checkOut = now()->addDays(7)->format('Y-m-d');

        $response = $this->postJson('/api/v1/availability/check', [
            'unit_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.available', true);
    }

    #[Test]
    public function it_validates_required_fields_for_check(): void
    {
        $response = $this->postJson('/api/v1/availability/check', [
            'unit_slug' => 'villahoms',
            // missing check_in and check_out
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    #[Test]
    public function it_suggests_alternative_units_when_unavailable(): void
    {
        // Create another property
        Property::factory()->create([
            'owner_id' => $this->owner->id,
            'slug' => 'cubic-villa',
            'status' => 'active',
            'base_rate' => 1800000,
            'capacity' => 6,
            'capacity_max' => 8,
        ]);

        $checkIn = now()->addDays(10)->format('Y-m-d');
        $checkOut = now()->addDays(13)->format('Y-m-d');

        // Block villahoms
        $guest = User::factory()->create();
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'booking_status' => 'confirmed',
            'guest_count' => 4,
            'created_by' => $guest->id,
        ]);

        $response = $this->postJson('/api/v1/availability/check', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 4,
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.available', false);

        // Should suggest cubic-villa as alternative
        $alternatives = $response->json('data.alternative_units');
        $this->assertNotEmpty($alternatives);
    }

    // =========================================================================
    // POST /api/v1/availability/search
    // =========================================================================

    #[Test]
    public function it_searches_available_units_by_criteria(): void
    {
        $checkIn = now()->addDays(14)->format('Y-m-d');
        $checkOut = now()->addDays(17)->format('Y-m-d');

        $response = $this->postJson('/api/v1/availability/search', [
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 6,
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'search_criteria' => ['check_in', 'check_out', 'nights', 'guests'],
                    'matches' => [
                        '*' => [
                            'unit' => ['id', 'slug', 'name', 'max_guests'],
                            'match_score',
                            'match_reasons',
                            'pricing' => ['total_price', 'nights', 'per_night_avg', 'formatted_total'],
                            'available',
                        ],
                    ],
                    'total_matches',
                    'no_match_alternatives',
                ],
            ]);

        $this->assertGreaterThanOrEqual(1, $response->json('data.total_matches'));
    }

    #[Test]
    public function it_excludes_booked_units_from_search(): void
    {
        $checkIn = now()->addDays(14)->format('Y-m-d');
        $checkOut = now()->addDays(17)->format('Y-m-d');

        // Block villahoms
        $guest = User::factory()->create();
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'booking_status' => 'confirmed',
            'guest_count' => 4,
            'created_by' => $guest->id,
        ]);

        $response = $this->postJson('/api/v1/availability/search', [
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 4,
        ], $this->authHeader());

        $response->assertStatus(200);

        // Villahoms should not appear in results
        $slugs = collect($response->json('data.matches'))->pluck('unit.slug')->toArray();
        $this->assertNotContains('villahoms', $slugs);
    }

    #[Test]
    public function it_filters_by_max_price_total(): void
    {
        $checkIn = now()->addDays(14)->format('Y-m-d');
        $checkOut = now()->addDays(17)->format('Y-m-d');

        $response = $this->postJson('/api/v1/availability/search', [
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 4,
            'filters' => [
                'max_price_total' => 1000, // Impossibly low — should return 0 matches
            ],
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonPath('data.total_matches', 0);
    }

    #[Test]
    public function it_validates_required_fields_for_search(): void
    {
        $response = $this->postJson('/api/v1/availability/search', [
            'check_in' => now()->addDays(5)->format('Y-m-d'),
            // missing check_out and guests
        ], $this->authHeader());

        $response->assertStatus(422);
    }

    // =========================================================================
    // POST /api/v1/quotes/calculate
    // =========================================================================

    #[Test]
    public function it_calculates_quote_correctly(): void
    {
        // Use a weekday range to avoid weekend premium variability
        $checkIn = now()->next('Monday')->format('Y-m-d');
        $checkOut = now()->next('Monday')->addDays(3)->format('Y-m-d');

        $response = $this->postJson('/api/v1/quotes/calculate', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 6,
        ], $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'unit_id', 'unit_slug', 'unit_name', 'nights',
                    'check_in', 'check_out', 'guests', 'extra_beds',
                    'breakdown', 'extras_breakdown',
                    'subtotal', 'tax', 'total',
                    'deposit_required' => ['percent', 'amount', 'due_within_hours', 'formatted'],
                    'currency',
                    'formatted' => ['subtotal', 'total', 'per_night_avg'],
                    'rate_details' => ['weekday_nights', 'weekend_nights', 'seasonal_nights', 'daily_breakdown'],
                    'quote_id',
                    'expires_at',
                ],
            ]);

        $this->assertEquals(3, $response->json('data.nights'));
        $this->assertEquals('villahoms', $response->json('data.unit_slug'));
        $this->assertGreaterThan(0, $response->json('data.total'));

        // DP should be 50% of total
        $total = $response->json('data.total');
        $dp = $response->json('data.deposit_required.amount');
        $this->assertEquals((int) ($total * 0.5), $dp);
    }

    #[Test]
    public function it_includes_extra_bed_in_quote_when_guests_exceed_capacity(): void
    {
        $checkIn = now()->next('Monday')->format('Y-m-d');
        $checkOut = now()->next('Monday')->addDays(2)->format('Y-m-d');

        // 8 guests, capacity=6, so 2 extra beds needed
        $response = $this->postJson('/api/v1/quotes/calculate', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 8,
        ], $this->authHeader());

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('data.extra_beds'));
        $this->assertGreaterThan(0, $response->json('data.total'));
    }

    #[Test]
    public function it_rejects_quote_when_guests_exceed_max_capacity(): void
    {
        $checkIn = now()->addDays(5)->format('Y-m-d');
        $checkOut = now()->addDays(7)->format('Y-m-d');

        $response = $this->postJson('/api/v1/quotes/calculate', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 15, // Over capacity_max=8
        ], $this->authHeader());

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_CAPACITY_EXCEEDED');
    }

    #[Test]
    public function it_calculates_extras_in_quote(): void
    {
        $checkIn = now()->next('Monday')->format('Y-m-d');
        $checkOut = now()->next('Monday')->addDays(2)->format('Y-m-d');

        $response = $this->postJson('/api/v1/quotes/calculate', [
            'unit_slug' => 'villahoms',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => 4,
            'extras' => [
                ['code' => 'early_checkin', 'quantity' => 1],
                ['code' => 'late_checkout', 'quantity' => 1],
            ],
        ], $this->authHeader());

        $response->assertStatus(200);

        $extrasBreakdown = $response->json('data.extras_breakdown');
        $this->assertCount(2, $extrasBreakdown);

        // early_checkin = 200k, late_checkout = 200k
        $extrasTotal = collect($extrasBreakdown)->sum('amount');
        $this->assertEquals(400000, $extrasTotal);
    }

    #[Test]
    public function it_returns_extras_list(): void
    {
        $response = $this->getJson('/api/v1/extras', $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'extras' => [
                        '*' => ['code', 'label', 'description', 'price', 'unit', 'available_for'],
                    ],
                ],
            ]);

        $codes = collect($response->json('data.extras'))->pluck('code')->toArray();
        $this->assertContains('extra_bed', $codes);
        $this->assertContains('early_checkin', $codes);
        $this->assertContains('late_checkout', $codes);
    }
}
