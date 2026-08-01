<?php

namespace Tests\Unit\Payroll;

use App\Models\Booking;
use App\Models\Property;
use App\Services\Payroll\NightOverlapCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NightOverlapCalculatorTest extends TestCase
{
    use RefreshDatabase;

    protected NightOverlapCalculatorService $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new NightOverlapCalculatorService;
    }

    public function test_cross_month_start_booking_staying_into_target_month(): void
    {
        // Property
        $property = Property::factory()->active()->create([
            'location' => 'selatan',
        ]);

        // Booking check-in July 27, check-out August 2
        Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'confirmed',
            'check_in' => '2026-07-27',
            'check_out' => '2026-08-02',
        ]);

        // Calculate for August 2026
        $rates = [
            'bonus_booking_fo' => 3000,
            'bonus_night_fo' => 1000,
            'bonus_booking_hk' => 3000,
            'bonus_night_hk' => 5000,
        ];

        $dtos = $this->calculator->calculateAllProperties(8, 2026, $rates);
        $dto = $dtos->get($property->id);

        $this->assertNotNull($dto);
        // August booking_count should be 0 because check_in was in July
        $this->assertEquals(0, $dto->bookingCount);
        // August occupied_nights should be 1 (night of Aug 1 to Aug 2)
        $this->assertEquals(1, $dto->occupiedNights);
        $this->assertEquals(0, $dto->bonusBooking);
        $this->assertEquals(1, $dto->bonusNight);
    }

    public function test_cross_month_end_booking_starting_in_target_month(): void
    {
        $property = Property::factory()->active()->create([
            'location' => 'utara',
        ]);

        // Booking check-in August 30, check-out September 3
        Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'confirmed',
            'check_in' => '2026-08-30',
            'check_out' => '2026-09-03',
        ]);

        $rates = [
            'bonus_booking_fo' => 3000,
            'bonus_night_fo' => 1000,
            'bonus_booking_hk' => 3000,
            'bonus_night_hk' => 5000,
        ];

        $dtos = $this->calculator->calculateAllProperties(8, 2026, $rates);
        $dto = $dtos->get($property->id);

        $this->assertNotNull($dto);
        // August booking_count should be 1
        $this->assertEquals(1, $dto->bookingCount);
        // August occupied_nights should be 2 (nights 30-31 and 31-1)
        $this->assertEquals(2, $dto->occupiedNights);
        $this->assertEquals(1, $dto->bonusBooking);
        $this->assertEquals(1, $dto->bonusNight);
    }
}
