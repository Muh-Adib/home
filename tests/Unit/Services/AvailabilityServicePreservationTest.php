<?php

namespace Tests\Unit\Services;

use App\Models\Property;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Preservation tests for TASK-001 — Property Detail 500s.
 *
 * These tests assert that `AvailabilityService::getAvailabilityData()` produces correct,
 * non-null rate data for properties with VALID (non-null, non-zero) rate columns.
 *
 * They MUST PASS on unfixed code — this establishes the baseline behavior that the fix
 * must preserve. If these tests fail after the fix is applied, the fix has introduced
 * a regression.
 *
 * The real `RateCalculationService` is used (not mocked) to verify end-to-end behavior
 * with valid property data.
 *
 * Validates: Requirements 3.1, 3.2
 */
class AvailabilityServicePreservationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Build an in-memory Property model with the given attributes.
     * Using new Property() bypasses the DB NOT NULL constraint on weekend_premium_percent,
     * which exists in the local schema but not in production — the exact bug condition.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function makeProperty(array $attributes): Property
    {
        $defaults = [
            'id' => 999,
            'name' => 'Test Villa',
            'slug' => 'test-villa',
            'base_rate' => 500000,
            'weekend_premium_percent' => 20,
            'weekend_premium_type' => 'percentage',
            'weekend_premium_fixed' => null,
            'cleaning_fee' => 100000,
            'extra_bed_rate' => 150000,
            'capacity' => 4,
            'capacity_max' => 6,
        ];

        $merged = array_merge($defaults, $attributes);
        $property = new Property($merged);
        // Force-set id since it is not in $fillable
        $property->id = $merged['id'];

        return $property;
    }

    /**
     * Test case A: Property with valid base_rate = 500000 and weekend_premium_percent = 20.
     *
     * Preservation: For a property with well-formed rate columns, getAvailabilityData()
     * must return a non-empty rates array where every day has a non-null total_rate.
     * This is the happy path that must continue working after the fix is applied.
     *
     * Uses the REAL RateCalculationService (not mocked) to verify end-to-end behavior.
     *
     * Validates: Requirements 3.1, 3.2
     */
    #[Test]
    public function it_returns_non_empty_rates_with_non_null_total_rate_for_valid_property_data(): void
    {
        $property = $this->makeProperty([
            'base_rate' => 500000,
            'weekend_premium_percent' => 20,
            'weekend_premium_type' => 'percentage',
        ]);

        $rateCalculationService = new RateCalculationService;
        $availabilityService = new AvailabilityService($rateCalculationService);

        $startDate = Carbon::today()->format('Y-m-d');
        $endDate = Carbon::today()->addDays(3)->format('Y-m-d');

        $result = $availabilityService->getAvailabilityData($property, $startDate, $endDate);

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('availability_data', $result);
        $this->assertArrayHasKey('rates', $result['availability_data']);
        $this->assertNotEmpty($result['availability_data']['rates']);

        // Every day in the rates array must have a non-null total_rate
        foreach ($result['availability_data']['rates'] as $dateString => $rateEntry) {
            $this->assertArrayHasKey('total_rate', $rateEntry, "Day {$dateString} is missing total_rate");
            $this->assertNotNull($rateEntry['total_rate'], "Day {$dateString} has null total_rate");
            $this->assertGreaterThan(0, $rateEntry['total_rate'], "Day {$dateString} has zero or negative total_rate");
        }
    }

    /**
     * Test case B: Property with valid data and no seasonal rates.
     *
     * Preservation: For a property with valid base_rate and weekend_premium_percent and no
     * seasonal rate records in the DB, getAvailabilityData() must return a valid result
     * with the correct structure. This confirms the baseline behavior to preserve after the fix.
     *
     * Uses the REAL RateCalculationService (not mocked) to verify end-to-end behavior.
     *
     * Validates: Requirements 3.1, 3.2
     */
    #[Test]
    public function it_returns_valid_result_for_property_with_no_seasonal_rates(): void
    {
        $property = $this->makeProperty([
            'base_rate' => 750000,
            'weekend_premium_percent' => 15,
            'weekend_premium_type' => 'percentage',
            'cleaning_fee' => 150000,
        ]);

        $rateCalculationService = new RateCalculationService;
        $availabilityService = new AvailabilityService($rateCalculationService);

        $startDate = Carbon::today()->format('Y-m-d');
        $endDate = Carbon::today()->addDays(3)->format('Y-m-d');

        $result = $availabilityService->getAvailabilityData($property, $startDate, $endDate);

        // Top-level structure must be valid
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('property', $result);
        $this->assertArrayHasKey('date_range', $result);
        $this->assertArrayHasKey('booked_dates', $result);
        $this->assertArrayHasKey('availability_data', $result);
        $this->assertArrayHasKey('rates', $result['availability_data']);

        // Property data must be passed through correctly
        $this->assertEquals(750000, $result['property']['base_rate']);
        $this->assertEquals(15, $result['property']['weekend_premium_percent']);

        // Date range must match the requested range
        $this->assertEquals($startDate, $result['date_range']['start']);
        $this->assertEquals($endDate, $result['date_range']['end']);

        // Rates array must have exactly 3 entries (one per day in the 3-day range)
        $this->assertCount(3, $result['availability_data']['rates']);

        // Each day must have the required rate fields
        foreach ($result['availability_data']['rates'] as $dateString => $rateEntry) {
            $this->assertArrayHasKey('base_rate', $rateEntry, "Day {$dateString} is missing base_rate");
            $this->assertArrayHasKey('total_rate', $rateEntry, "Day {$dateString} is missing total_rate");
            $this->assertArrayHasKey('is_weekend', $rateEntry, "Day {$dateString} is missing is_weekend");
            $this->assertNotNull($rateEntry['total_rate'], "Day {$dateString} has null total_rate");
            // No seasonal rates in DB for this in-memory property, so seasonal_rate_applied must be null
            $this->assertNull($rateEntry['seasonal_rate_applied'], "Day {$dateString} should have no seasonal rate applied");
        }
    }
}
