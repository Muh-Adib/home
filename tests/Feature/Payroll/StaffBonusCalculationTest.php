<?php

namespace Tests\Feature\Payroll;

use App\Models\Booking;
use App\Models\Property;
use App\Models\PropertyHousekeepingAllocation;
use App\Models\User;
use App\Services\Payroll\Dtos\PropertyNightOverlapDto;
use App\Services\Payroll\FrontOfficeBonusCalculatorService;
use App\Services\Payroll\HousekeepingNorthBonusCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class StaffBonusCalculationTest extends TestCase
{
    use RefreshDatabase;

    public function test_fo_bonus_50_50_split_when_input_and_followup_different(): void
    {
        $foStaff1 = User::factory()->create(['role' => 'front_desk', 'status' => 'active']);
        $foStaff2 = User::factory()->create(['role' => 'front_desk', 'status' => 'active']);

        $property = Property::factory()->active()->create(['location' => 'selatan']);

        // Create booking in August 2026 where created_by = foStaff1 and followed_up_by = foStaff2
        Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'confirmed',
            'check_in' => '2026-08-10',
            'check_out' => '2026-08-12', // 2 nights
            'created_by' => $foStaff1->id,
            'followed_up_by' => $foStaff2->id,
        ]);

        $dto = new PropertyNightOverlapDto(
            propertyId: $property->id,
            propertyName: $property->name,
            location: 'selatan',
            bookingCount: 1,
            occupiedNights: 2,
            bonusBooking: 1,
            bonusNight: 1,
            foBookingFund: 3000.0,
            foNightFund: 1000.0,
            hkBookingFund: 3000.0,
            hkNightFund: 5000.0,
            totalFoFund: 4000.0,
            totalHkFund: 8000.0,
            bookingsBreakdown: [
                [
                    'booking_id' => 1,
                    'created_by' => $foStaff1->id,
                    'followed_up_by' => $foStaff2->id,
                    'is_starting_in_month' => true,
                ],
            ]
        );

        $dtos = collect([$property->id => $dto]);
        $activeFoStaff = collect([$foStaff1, $foStaff2]);

        $service = new FrontOfficeBonusCalculatorService;
        $results = $service->calculate($dtos, $activeFoStaff, 3000.0);

        // Shared night pool = 1000 total / 2 FO staff = 500 each
        // Personal booking bonus = 3000 / 2 = 1500 each
        $this->assertEquals(1500.0, $results[$foStaff1->id]['personal_booking_bonus']);
        $this->assertEquals(500.0, $results[$foStaff1->id]['shared_night_bonus']);
        $this->assertEquals(2000.0, $results[$foStaff1->id]['total_bonus']);

        $this->assertEquals(1500.0, $results[$foStaff2->id]['personal_booking_bonus']);
        $this->assertEquals(500.0, $results[$foStaff2->id]['shared_night_bonus']);
        $this->assertEquals(2000.0, $results[$foStaff2->id]['total_bonus']);
    }

    public function test_hk_north_validation_fails_if_total_percentage_not_100(): void
    {
        $hkStaff1 = User::factory()->create(['role' => 'housekeeping', 'status' => 'active']);
        $hkStaff2 = User::factory()->create(['role' => 'housekeeping', 'status' => 'active']);

        $property = Property::factory()->active()->create(['location' => 'utara']);

        // Set allocations to 60% and 30% (total 90%)
        PropertyHousekeepingAllocation::create([
            'property_id' => $property->id,
            'user_id' => $hkStaff1->id,
            'percentage' => 60.0,
        ]);
        PropertyHousekeepingAllocation::create([
            'property_id' => $property->id,
            'user_id' => $hkStaff2->id,
            'percentage' => 30.0,
        ]);

        $dto = new PropertyNightOverlapDto(
            propertyId: $property->id,
            propertyName: $property->name,
            location: 'utara',
            bookingCount: 1,
            occupiedNights: 2,
            bonusBooking: 1,
            bonusNight: 1,
            foBookingFund: 3000.0,
            foNightFund: 1000.0,
            hkBookingFund: 3000.0,
            hkNightFund: 5000.0,
            totalFoFund: 4000.0,
            totalHkFund: 8000.0
        );

        $dtos = collect([$property->id => $dto]);
        $activeHkStaff = collect([$hkStaff1, $hkStaff2]);

        $service = new HousekeepingNorthBonusCalculatorService;

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('harus 100%');

        $service->calculate($dtos, $activeHkStaff);
    }
}
