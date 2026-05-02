<?php

namespace Tests\Feature\AvailabilityService;

use App\Models\Property;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Bug Condition Exploration Tests — Task 1 (Bugfix: seo-repair-p0-critical-fixes)
 *
 * CRITICAL: These tests MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * Goal: Surface counterexamples that demonstrate the bug for each of the six
 * affected property slugs, and confirm the root cause via a unit test.
 *
 * Validates: Requirements 1.1, 1.2
 */
class PropertyDetail500BugConditionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Create a property with weekend_premium_percent = NULL by bypassing the DB constraint.
     *
     * In production (MySQL with permissive SQL mode) these properties have NULL stored
     * in the weekend_premium_percent column. We replicate this via a raw UPDATE after
     * factory creation to bypass the SQLite NOT NULL default.
     */
    private function createPropertyWithNullWeekendPremium(string $slug): Property
    {
        $property = Property::factory()->create([
            'slug' => $slug,
            'status' => 'active',
        ]);

        // Force weekend_premium_percent to NULL — replicates the production bug condition.
        // Raw SQL bypasses the Eloquent cast and DB default so we can test the null path.
        DB::table('properties')
            ->where('id', $property->id)
            ->update(['weekend_premium_percent' => null]);

        // Reload from DB so the model reflects the null value
        $property->refresh();

        return $property;
    }

    // =========================================================================
    // Feature Tests — Six Affected Slugs Must Return HTTP 200
    // Validates: Requirements 1.1, 1.2
    // =========================================================================

    /**
     * Provides the six affected property slugs.
     *
     * @return array<string, array{string}>
     */
    public static function affectedSlugsProvider(): array
    {
        return [
            'villahoms' => ['villahoms'],
            'cubic-villa' => ['cubic-villa'],
            'sun-emerald' => ['sun-emerald'],
            'toscana-malioboro' => ['toscana-malioboro'],
            'abrenara-malioboro' => ['abrenara-malioboro'],
            'sapphire' => ['sapphire'],
        ];
    }

    /**
     * For each of the six affected slugs, GET /properties/{slug} MUST return HTTP 200.
     *
     * On UNFIXED code this test FAILS with HTTP 500 (TypeError or DivisionByZeroError
     * originating from RateCalculationService::calculateRate() called inside
     * AvailabilityService::getAvailabilityData()) — confirming the bug exists.
     *
     * Counterexample documented:
     *   GET /properties/villahoms → 500
     *   TypeError: null / 100 in RateCalculationService::calculateRate()
     *   via AvailabilityService::getAvailabilityData()
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    #[Test]
    #[DataProvider('affectedSlugsProvider')]
    public function property_detail_returns_200_for_affected_slug(string $slug): void
    {
        $this->createPropertyWithNullWeekendPremium($slug);

        $response = $this->get("/properties/{$slug}");

        $response->assertStatus(200);
    }

    // =========================================================================
    // Unit Test — AvailabilityService::getAvailabilityData() With Null Column
    // Validates: Requirements 1.2
    // =========================================================================

    /**
     * When a Property has weekend_premium_percent = null,
     * AvailabilityService::getAvailabilityData() MUST return a valid array without throwing.
     *
     * On UNFIXED code this test FAILS with TypeError because
     * RateCalculationService::calculateRate() executes:
     *   (int) round($baseRate * ($property->weekend_premium_percent / 100))
     * where null / 100 = null, and $baseRate * null throws TypeError in PHP 8.4.
     *
     * Counterexample documented:
     *   Property with weekend_premium_percent = null
     *   → TypeError: Unsupported operand types: int * null
     *   in RateCalculationService::calculateRate()
     *
     * **Validates: Requirements 1.2**
     */
    #[Test]
    public function availability_service_does_not_throw_when_weekend_premium_percent_is_null(): void
    {
        $property = Property::factory()->create([
            'status' => 'active',
            'base_rate' => 500000,
        ]);

        // Force weekend_premium_percent to NULL — replicates the production bug condition.
        DB::table('properties')
            ->where('id', $property->id)
            ->update(['weekend_premium_percent' => null]);

        $property->refresh();

        $service = app(AvailabilityService::class);

        $startDate = Carbon::today()->format('Y-m-d');
        $endDate = Carbon::today()->addDays(90)->format('Y-m-d');

        // On unfixed code this throws TypeError — confirming the bug.
        $result = $service->getAvailabilityData($property, $startDate, $endDate);

        // Assert the result is a valid array (not an exception)
        $this->assertIsArray($result);
        $this->assertTrue($result['success'] ?? false, 'getAvailabilityData() must return success=true');
        $this->assertArrayHasKey('availability_data', $result);
        $this->assertArrayHasKey('rates', $result['availability_data']);
        $this->assertNotEmpty($result['availability_data']['rates'], 'rates array must not be empty');
    }
}
