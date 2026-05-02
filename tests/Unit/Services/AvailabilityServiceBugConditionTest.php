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
 * Bug condition exploration tests for TASK-001 — Property Detail 500s.
 *
 * These tests assert the EXPECTED (fixed) behavior. They MUST FAIL on unfixed code,
 * confirming that AvailabilityService::getAvailabilityData() throws when a property
 * has null/zero rate columns. They will pass after the fix is applied.
 *
 * The root bug: getAvailabilityData() calls RateCalculationService::calculateRate()
 * inside a bare for-loop with no per-iteration try/catch. Any exception thrown by
 * calculateRate() (e.g. \TypeError from null column arithmetic, \InvalidArgumentException
 * from malformed seasonal rate data) propagates out of the loop and causes a 500.
 *
 * Validates: Requirements 1.1, 1.2
 */
class AvailabilityServiceBugConditionTest extends TestCase
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
     * Build a mock RateCalculationService that throws \TypeError for every calculateRate() call.
     *
     * This simulates the production failure where a null/zero column causes an unhandled
     * exception inside the per-day loop of getAvailabilityData().
     */
    private function makeThrowingRateService(): RateCalculationService
    {
        $mock = $this->createMock(RateCalculationService::class);
        $mock->method('calculateRate')
            ->willThrowException(new \TypeError('Unsupported operand types: null / int'));

        return $mock;
    }

    /**
     * Test case A: Property with weekend_premium_percent = null and valid base_rate.
     *
     * Bug condition: In production, weekend_premium_percent is null for the six affected
     * properties. RateCalculationService::calculateRate() performs arithmetic on this null
     * value, which throws \TypeError. The per-day loop in getAvailabilityData() has no
     * try/catch, so the exception propagates and causes a 500.
     *
     * Expected (fixed) behavior: getAvailabilityData() does NOT throw and returns a valid
     * array with a non-empty rates entry for each day, falling back to base_rate.
     *
     * Validates: Requirements 1.1, 1.2
     */
    #[Test]
    public function it_does_not_throw_when_weekend_premium_percent_is_null_with_valid_base_rate(): void
    {
        $property = $this->makeProperty([
            'base_rate' => 500000,
            'weekend_premium_percent' => null,
        ]);

        // Use a mock that throws \TypeError to simulate the production failure caused by
        // null column arithmetic — the same exception type that occurs in production.
        $availabilityService = new AvailabilityService($this->makeThrowingRateService());

        $startDate = Carbon::today()->format('Y-m-d');
        $endDate = Carbon::today()->addDays(3)->format('Y-m-d');

        // On unfixed code: \TypeError propagates out of the bare for-loop → 500.
        // After the fix: per-iteration try/catch catches it; days fall back to base_rate.
        $result = $availabilityService->getAvailabilityData($property, $startDate, $endDate);

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('availability_data', $result);
        $this->assertArrayHasKey('rates', $result['availability_data']);
        $this->assertNotEmpty($result['availability_data']['rates']);
    }

    /**
     * Test case B: Property with base_rate = 0 and weekend_premium_percent = null.
     *
     * Bug condition: Both base_rate = 0 and weekend_premium_percent = null are present.
     * This combination causes \TypeError or \DivisionByZeroError inside calculateRate().
     * The missing per-iteration guard lets the exception propagate as a 500.
     *
     * Expected (fixed) behavior: getAvailabilityData() does NOT throw.
     *
     * Validates: Requirements 1.1, 1.2
     */
    #[Test]
    public function it_does_not_throw_when_base_rate_is_zero_and_weekend_premium_percent_is_null(): void
    {
        $property = $this->makeProperty([
            'base_rate' => 0,
            'weekend_premium_percent' => null,
            'cleaning_fee' => 0,
        ]);

        // Use a mock that throws \TypeError to simulate the production failure.
        $availabilityService = new AvailabilityService($this->makeThrowingRateService());

        $startDate = Carbon::today()->format('Y-m-d');
        $endDate = Carbon::today()->addDays(3)->format('Y-m-d');

        // On unfixed code: \TypeError propagates out of the bare for-loop → 500.
        // After the fix: per-iteration try/catch catches it; days fall back to base_rate (0).
        $result = $availabilityService->getAvailabilityData($property, $startDate, $endDate);

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('availability_data', $result);
        $this->assertArrayHasKey('rates', $result['availability_data']);
    }

    /**
     * Test case C: RateCalculationService::calculateRate() throws \TypeError for a specific date.
     *
     * Bug condition: The per-day loop in getAvailabilityData() has no try/catch. A single
     * day where calculateRate() throws unwinds the entire loop and propagates as a 500.
     * This is the core structural bug — independent of which specific exception is thrown.
     *
     * Expected (fixed) behavior: getAvailabilityData() does NOT throw; the failing day
     * falls back to base_rate and the loop continues for all remaining days.
     *
     * Validates: Requirements 1.1, 1.2
     */
    #[Test]
    public function it_does_not_throw_when_calculate_rate_throws_type_error_for_a_specific_date(): void
    {
        $property = $this->makeProperty([
            'base_rate' => 500000,
            'weekend_premium_percent' => 20,
        ]);

        // Mock RateCalculationService to throw \TypeError on every call,
        // simulating a malformed seasonal rate or null column on one specific day.
        $availabilityService = new AvailabilityService($this->makeThrowingRateService());

        $startDate = Carbon::today()->format('Y-m-d');
        $endDate = Carbon::today()->addDays(3)->format('Y-m-d');

        // On unfixed code: \TypeError propagates out of the bare for-loop → 500.
        // After the fix: per-iteration try/catch catches it; each failing day falls back to base_rate.
        $result = $availabilityService->getAvailabilityData($property, $startDate, $endDate);

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('availability_data', $result);
        $this->assertArrayHasKey('rates', $result['availability_data']);
        $this->assertNotEmpty($result['availability_data']['rates']);

        // Every day in the rates array must have a non-null total_rate (fallback to base_rate).
        foreach ($result['availability_data']['rates'] as $dateString => $rateEntry) {
            $this->assertArrayHasKey('total_rate', $rateEntry, "Day {$dateString} is missing total_rate");
            $this->assertNotNull($rateEntry['total_rate'], "Day {$dateString} has null total_rate");
        }
    }
}
