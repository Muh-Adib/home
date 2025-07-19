<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\RateCalculationService;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Domain\Booking\ValueObjects\RateCalculation;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RateCalculationServiceTest extends TestCase
{
    use RefreshDatabase;

    private RateCalculationService $rateCalculationService;
    private Property $property;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->rateCalculationService = new RateCalculationService();
        
        // Create test property
        $this->property = Property::factory()->create([
            'base_rate' => 500000,
            'weekend_premium_percent' => 20,
            'cleaning_fee' => 100000,
            'extra_bed_rate' => 150000,
            'capacity' => 4,
            'capacity_max' => 6,
            'min_stay_weekday' => 2,
            'min_stay_weekend' => 2,
            'min_stay_peak' => 3,
        ]);
    }

    /** @test */
    public function it_calculates_basic_rate_for_weekdays()
    {
        $checkIn = '2024-01-15'; // Monday
        $checkOut = '2024-01-17'; // Wednesday
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertInstanceOf(RateCalculation::class, $calculation);
        $this->assertEquals(2, $calculation->nights);
        $this->assertEquals(1000000, $calculation->baseAmount); // 2 nights * 500k
        $this->assertEquals(0, $calculation->weekendPremium); // No weekend
        $this->assertEquals(0, $calculation->extraBedAmount); // No extra beds
        $this->assertEquals(100000, $calculation->cleaningFee);
        
        $expectedSubtotal = 1000000 + 100000; // Base + cleaning
        $expectedTax = $expectedSubtotal * 0.11;
        $expectedTotal = $expectedSubtotal + $expectedTax;
        
        $this->assertEquals($expectedTotal, $calculation->totalAmount);
    }

    /** @test */
    public function it_calculates_weekend_premium()
    {
        $checkIn = '2024-01-19'; // Friday
        $checkOut = '2024-01-21'; // Sunday
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertEquals(2, $calculation->nights);
        
        // Weekend premium: Friday + Saturday = 2 nights * 500k * 20% = 200k
        $this->assertEquals(200000, $calculation->weekendPremium);
    }

    /** @test */
    public function it_calculates_extra_bed_charges()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 6; // Property capacity is 4, so 2 extra beds needed

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertEquals(2, $calculation->extraBeds);
        $this->assertEquals(600000, $calculation->extraBedAmount); // 2 extra beds * 150k * 2 nights
    }

    /** @test */
    public function it_applies_minimum_stay_discount_for_three_nights()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-18'; // 3 nights
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $baseAmount = 1500000; // 3 nights * 500k
        $expectedDiscount = $baseAmount * 0.05; // 5% discount for 3+ nights
        
        $breakdown = $calculation->breakdown;
        $this->assertEquals($expectedDiscount, $breakdown['minimum_stay_discount']);
    }

    /** @test */
    public function it_applies_minimum_stay_discount_for_weekly_stays()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-22'; // 7 nights
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $baseAmount = 3500000; // 7 nights * 500k
        $expectedDiscount = $baseAmount * 0.1; // 10% discount for weekly stays
        
        $breakdown = $calculation->breakdown;
        $this->assertEquals($expectedDiscount, $breakdown['minimum_stay_discount']);
    }

    /** @test */
    public function it_calculates_tax_correctly()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $subtotal = 1000000 + 100000; // Base + cleaning
        $expectedTax = $subtotal * 0.11; // 11% VAT
        
        $this->assertEquals($expectedTax, $calculation->taxAmount);
    }

    /** @test */
    public function it_applies_seasonal_rates()
    {
        // Create seasonal rate
        PropertySeasonalRate::factory()->create([
            'property_id' => $this->property->id,
            'name' => 'High Season',
            'start_date' => '2024-01-15',
            'end_date' => '2024-01-20',
            'rate_type' => 'percentage',
            'rate_value' => 50, // 50% increase
            'is_active' => true,
        ]);

        $checkIn = '2024-01-16';
        $checkOut = '2024-01-18';
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        // Seasonal premium should be applied
        $this->assertGreaterThan(0, $calculation->seasonalPremium);
        
        $breakdown = $calculation->breakdown;
        $this->assertGreaterThan(0, $breakdown['seasonal_nights']);
    }

    /** @test */
    public function it_identifies_long_weekend_dates()
    {
        $checkIn = '2024-08-16'; // Day before Independence Day
        $checkOut = '2024-08-18'; // Day after Independence Day
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $breakdown = $calculation->breakdown;
        $this->assertTrue($breakdown['rate_breakdown']['long_weekend_applied']);
    }

    /** @test */
    public function it_identifies_peak_season_dates()
    {
        $checkIn = '2024-12-20'; // December is peak season
        $checkOut = '2024-12-22';
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $breakdown = $calculation->breakdown;
        $this->assertTrue($breakdown['rate_breakdown']['peak_season_applied']);
    }

    /** @test */
    public function it_provides_detailed_daily_breakdown()
    {
        $checkIn = '2024-01-19'; // Friday
        $checkOut = '2024-01-21'; // Sunday
        $guestCount = 2;

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $breakdown = $calculation->breakdown;
        $dailyBreakdown = $breakdown['daily_breakdown'];
        
        $this->assertCount(2, $dailyBreakdown); // 2 nights
        $this->assertArrayHasKey('2024-01-19', $dailyBreakdown);
        $this->assertArrayHasKey('2024-01-20', $dailyBreakdown);
        
        // Check Friday has weekend premium
        $fridayBreakdown = $dailyBreakdown['2024-01-19'];
        $this->assertEquals('Friday', $fridayBreakdown['day_name']);
        $this->assertNotEmpty($fridayBreakdown['premiums']);
        
        // Check Saturday has weekend premium
        $saturdayBreakdown = $dailyBreakdown['2024-01-20'];
        $this->assertEquals('Saturday', $saturdayBreakdown['day_name']);
        $this->assertNotEmpty($saturdayBreakdown['premiums']);
    }

    /** @test */
    public function it_throws_exception_for_invalid_dates()
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Check-out must be after check-in date');

        $this->rateCalculationService->calculateRate(
            $this->property,
            '2024-01-17',
            '2024-01-15', // Check-out before check-in
            2
        );
    }

    /** @test */
    public function it_calculates_formatted_rate_successfully()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $result = $this->rateCalculationService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('rates', $result);
        $this->assertEquals($this->property->id, $result['property_id']);
        $this->assertEquals($checkIn, $result['check_in']);
        $this->assertEquals($checkOut, $result['check_out']);
        $this->assertEquals($guestCount, $result['guest_count']);
    }

    /** @test */
    public function it_handles_rate_calculation_errors_gracefully()
    {
        $checkIn = '2024-01-17';
        $checkOut = '2024-01-15'; // Invalid: check-out before check-in

        $result = $this->rateCalculationService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            2
        );

        $this->assertFalse($result['success']);
        $this->assertEquals('calculation', $result['error_type']);
        $this->assertArrayHasKey('message', $result);
    }

    /** @test */
    public function it_provides_comprehensive_summary()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-20'; // 5 nights including weekend
        $guestCount = 5; // 1 extra bed needed

        $calculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $breakdown = $calculation->breakdown;
        $summary = $breakdown['summary'];

        $this->assertArrayHasKey('average_nightly_rate', $summary);
        $this->assertArrayHasKey('total_nights', $summary);
        $this->assertArrayHasKey('base_nights_rate', $summary);
        $this->assertArrayHasKey('total_premiums', $summary);
        $this->assertArrayHasKey('taxes_and_fees', $summary);

        $this->assertEquals(5, $summary['total_nights']);
        $this->assertEquals(2500000, $summary['base_nights_rate']); // 5 * 500k
        $this->assertGreaterThan(0, $summary['average_nightly_rate']);
    }
}