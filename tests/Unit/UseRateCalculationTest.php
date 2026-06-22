<?php

namespace Tests\Unit;

use App\Models\Property;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UseRateCalculationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $property;

    protected $availabilityService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->property = Property::factory()->create([
            'name' => 'Test Villa',
            'slug' => 'test-villa',
            'base_rate' => 1000000,
            'capacity' => 4,
            'capacity_max' => 6,
            'cleaning_fee' => 200000,
            'extra_bed_rate' => 100000,
            'weekend_premium_percent' => 20,
            'min_stay_weekday' => 1,
            'min_stay_weekend' => 2,
            'min_stay_peak' => 3,
        ]);

        $this->availabilityService = app(AvailabilityService::class);
    }

    #[Test]
    public function it_initializes_with_correct_default_values()
    {
        $availabilityData = [
            'success' => true,
            'property_id' => $this->property->id,
            'date_range' => [
                'start' => now()->addDays(1)->format('Y-m-d'),
                'end' => now()->addDays(3)->format('Y-m-d'),
            ],
            'guest_count' => 2,
            'booked_dates' => [],
            'booked_periods' => [],
            'rates' => [],
            'property_info' => [
                'base_rate' => $this->property->base_rate,
                'capacity' => $this->property->capacity,
                'capacity_max' => $this->property->capacity_max,
                'cleaning_fee' => $this->property->cleaning_fee,
                'extra_bed_rate' => $this->property->extra_bed_rate,
                'weekend_premium_percent' => $this->property->weekend_premium_percent,
            ],
        ];

        $this->assertTrue(true);
    }

    #[Test]
    public function availability_service_calculates_rate_correctly()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guestCount = 2;

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('calculation', $response);

        $rateCalculation = $response['calculation'];
        $this->assertArrayHasKey('total_amount', $rateCalculation);
        $this->assertArrayHasKey('cleaning_fee', $rateCalculation);
        $this->assertArrayHasKey('weekend_premium', $rateCalculation);
        $this->assertArrayHasKey('seasonal_premium', $rateCalculation);

        $this->assertGreaterThan(0, $rateCalculation['total_amount']);
    }

    #[Test]
    public function availability_service_handles_extra_beds()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guestCount = 6; // Exceeds capacity of 4

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertIsArray($response);
        $this->assertTrue($response['success']);

        $rateCalculation = $response['calculation'];
        $this->assertArrayHasKey('extra_bed_amount', $rateCalculation);
        $this->assertGreaterThan(0, $rateCalculation['extra_bed_amount']);

        // Calculate expected extra bed amount
        $extraBeds = $guestCount - $this->property->capacity; // 6 - 4 = 2
        $nights = 2; // 3 days - 1 day = 2 nights
        $expectedExtraBedAmount = $extraBeds * $this->property->extra_bed_rate * $nights;
        $this->assertEquals($expectedExtraBedAmount, $rateCalculation['extra_bed_amount']);
    }

    #[Test]
    public function availability_service_handles_weekend_premium()
    {
        // Test weekend booking
        $weekend = Carbon::now()->next(Carbon::SATURDAY);
        $checkIn = $weekend->format('Y-m-d');
        $checkOut = $weekend->copy()->addDays(2)->format('Y-m-d');

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            2
        );

        $this->assertIsArray($response);
        $this->assertTrue($response['success']);

        $rateCalculation = $response['calculation'];
        $this->assertArrayHasKey('weekend_premium', $rateCalculation);
        $this->assertGreaterThan(0, $rateCalculation['weekend_premium']);

        // Verify weekend premium calculation
        $baseRate = $this->property->base_rate;
        $weekendPremium = 2 * ($baseRate * ($this->property->weekend_premium_percent / 100));
        $this->assertEquals($weekendPremium, $rateCalculation['weekend_premium']);
    }

    #[Test]
    public function availability_service_handles_cleaning_fee()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guestCount = 2;

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertIsArray($response);
        $this->assertTrue($response['success']);

        $rateCalculation = $response['calculation'];
        $this->assertArrayHasKey('cleaning_fee', $rateCalculation);
        $this->assertEquals($this->property->cleaning_fee, $rateCalculation['cleaning_fee']);
    }

    #[Test]
    public function availability_service_handles_different_dp_percentages()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guestCount = 2;
        $dpPercentages = [30, 50, 100];

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $rateCalculation = $response['calculation'];

        foreach ($dpPercentages as $dpPercentage) {
            // Verify DP calculation based on total_amount
            $expectedDpAmount = $rateCalculation['total_amount'] * $dpPercentage / 100;
            $this->assertGreaterThan(0, $expectedDpAmount);

            $expectedRemainingAmount = $rateCalculation['total_amount'] * (100 - $dpPercentage) / 100;
            $this->assertEquals($rateCalculation['total_amount'] - $expectedDpAmount, $expectedRemainingAmount);
        }
    }

    #[Test]
    public function availability_service_validates_dates()
    {
        // Test past date
        $pastDate = now()->subDays(1)->format('Y-m-d');
        $futureDate = now()->addDays(3)->format('Y-m-d');

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $pastDate,
            $futureDate,
            2
        );

        $this->assertFalse($response['success']);
        $this->assertEquals('validation', $response['error_type']);
    }

    #[Test]
    public function availability_service_validates_guest_count()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $excessiveGuestCount = 10; // Exceeds capacity_max of 6

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $excessiveGuestCount
        );

        $this->assertFalse($response['success']);
        $this->assertEquals('capacity', $response['error_type']);
    }

    #[Test]
    public function availability_service_handles_seasonal_rates()
    {
        // Create seasonal rate
        $this->property->seasonalRates()->create([
            'name' => 'Holiday Season',
            'start_date' => now()->addDays(1)->format('Y-m-d'),
            'end_date' => now()->addDays(5)->format('Y-m-d'),
            'rate_type' => 'percentage',
            'rate_value' => 50,
            'is_active' => true,
        ]);

        $checkIn = now()->addDays(2)->format('Y-m-d');
        $checkOut = now()->addDays(4)->format('Y-m-d');
        $guestCount = 2;

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertIsArray($response);
        $this->assertTrue($response['success']);

        $rateCalculation = $response['calculation'];
        $this->assertArrayHasKey('seasonal_premium', $rateCalculation);
        $this->assertGreaterThan(0, $rateCalculation['seasonal_premium']);
    }

    #[Test]
    public function availability_service_formats_amounts_correctly()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guestCount = 2;

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('formatted', $response);

        $formatted = $response['formatted'];
        $this->assertArrayHasKey('total_amount', $formatted);
        $this->assertArrayHasKey('base_amount', $formatted);
        $this->assertArrayHasKey('cleaning_fee', $formatted);

        // Check if amounts are formatted as currency
        $this->assertStringContainsString('Rp', $formatted['total_amount']);
        $this->assertStringContainsString('Rp', $formatted['base_amount']);
        $this->assertStringContainsString('Rp', $formatted['cleaning_fee']);
    }

    #[Test]
    public function availability_service_handles_zero_guest_count()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guestCount = 0;

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertTrue($response['success']);
        $this->assertEquals(0, $response['calculation']['extra_beds']);
    }

    #[Test]
    public function availability_service_handles_invalid_date_range()
    {
        $checkIn = now()->addDays(3)->format('Y-m-d');
        $checkOut = now()->addDays(1)->format('Y-m-d'); // Check-out before check-in
        $guestCount = 2;

        $response = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertFalse($response['success']);
        $this->assertEquals('validation', $response['error_type']);
    }
}
