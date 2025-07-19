<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use App\Models\Property;
use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AvailabilityServiceTest extends TestCase
{
    use RefreshDatabase;

    private AvailabilityService $availabilityService;
    private Property $property;

    protected function setUp(): void
    {
        parent::setUp();
        
        $rateCalculationService = new RateCalculationService();
        $this->availabilityService = new AvailabilityService($rateCalculationService);
        
        // Create test property
        $this->property = Property::factory()->create([
            'base_rate' => 500000,
            'capacity' => 4,
            'capacity_max' => 6,
        ]);
    }

    /** @test */
    public function it_returns_available_when_no_bookings_exist()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';

        $result = $this->availabilityService->checkAvailability(
            $this->property,
            $checkIn,
            $checkOut
        );

        $this->assertTrue($result['success']);
        $this->assertTrue($result['available']);
        $this->assertEquals($this->property->id, $result['property_id']);
        $this->assertEquals($checkIn, $result['check_in']);
        $this->assertEquals($checkOut, $result['check_out']);
        $this->assertEmpty($result['booked_dates']);
        $this->assertEmpty($result['booked_periods']);
    }

    /** @test */
    public function it_returns_unavailable_when_property_is_booked()
    {
        // Create overlapping booking
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-14',
            'check_out' => '2024-01-18',
            'booking_status' => 'confirmed',
        ]);

        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';

        $result = $this->availabilityService->checkAvailability(
            $this->property,
            $checkIn,
            $checkOut
        );

        $this->assertTrue($result['success']);
        $this->assertFalse($result['available']);
        $this->assertNotEmpty($result['booked_dates']);
        $this->assertNotEmpty($result['booked_periods']);
    }

    /** @test */
    public function it_correctly_identifies_booked_dates_in_range()
    {
        // Create booking that overlaps with our search range
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-14',
            'check_out' => '2024-01-18',
            'booking_status' => 'confirmed',
        ]);

        $checkIn = '2024-01-15';
        $checkOut = '2024-01-20';

        $bookedDates = $this->availabilityService->getBookedDatesInRange(
            $this->property,
            $checkIn,
            $checkOut
        );

        // Should include dates from 2024-01-15 to 2024-01-17 (within our range)
        $expectedDates = ['2024-01-15', '2024-01-16', '2024-01-17'];
        
        foreach ($expectedDates as $date) {
            $this->assertContains($date, $bookedDates);
        }
    }

    /** @test */
    public function it_returns_booked_periods_in_correct_format()
    {
        // Create two separate bookings
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'booking_status' => 'confirmed',
        ]);

        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-20',
            'check_out' => '2024-01-22',
            'booking_status' => 'confirmed',
        ]);

        $checkIn = '2024-01-10';
        $checkOut = '2024-01-25';

        $bookedPeriods = $this->availabilityService->getBookedPeriodsInRange(
            $this->property,
            $checkIn,
            $checkOut
        );

        $this->assertCount(2, $bookedPeriods);
        
        // Verify format: [[check_in, check_out], ...]
        foreach ($bookedPeriods as $period) {
            $this->assertIsArray($period);
            $this->assertCount(2, $period);
        }
    }

    /** @test */
    public function it_ignores_cancelled_bookings()
    {
        // Create cancelled booking
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'booking_status' => 'cancelled',
        ]);

        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';

        $result = $this->availabilityService->checkAvailability(
            $this->property,
            $checkIn,
            $checkOut
        );

        $this->assertTrue($result['available']);
        $this->assertEmpty($result['booked_dates']);
    }

    /** @test */
    public function it_considers_various_confirmed_booking_statuses()
    {
        $confirmedStatuses = ['pending_verification', 'confirmed', 'checked_in', 'checked_out'];
        
        foreach ($confirmedStatuses as $status) {
            // Clean up previous bookings
            Booking::query()->delete();
            
            Booking::factory()->create([
                'property_id' => $this->property->id,
                'check_in' => '2024-01-15',
                'check_out' => '2024-01-17',
                'booking_status' => $status,
            ]);

            $result = $this->availabilityService->checkAvailability(
                $this->property,
                '2024-01-15',
                '2024-01-17'
            );

            $this->assertFalse($result['available'], "Status {$status} should make property unavailable");
        }
    }

    /** @test */
    public function it_validates_dates_correctly()
    {
        // Test past check-in date
        $pastDate = Carbon::yesterday()->format('Y-m-d');
        $futureDate = Carbon::tomorrow()->format('Y-m-d');
        
        $errors = $this->availabilityService->validateDates($pastDate, $futureDate);
        $this->assertNotNull($errors);
        $this->assertContains('Check-in date cannot be in the past', $errors);

        // Test check-out before check-in
        $checkIn = '2024-01-17';
        $checkOut = '2024-01-15';
        
        $errors = $this->availabilityService->validateDates($checkIn, $checkOut);
        $this->assertNotNull($errors);
        $this->assertContains('Check-out date must be after check-in date', $errors);

        // Test valid dates
        $validCheckIn = Carbon::tomorrow()->format('Y-m-d');
        $validCheckOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');
        
        $errors = $this->availabilityService->validateDates($validCheckIn, $validCheckOut);
        $this->assertNull($errors);
    }

    /** @test */
    public function it_delegates_rate_calculation_to_rate_service()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $result = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        // Should delegate to RateCalculationService and return formatted result
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('rates', $result);
    }

    /** @test */
    public function it_validates_guest_count_against_property_capacity()
    {
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 10; // Exceeds property capacity_max of 6

        $result = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertFalse($result['success']);
        $this->assertEquals('capacity', $result['error_type']);
        $this->assertStringContains('capacity', $result['message']);
    }

    /** @test */
    public function it_returns_availability_error_when_property_is_booked()
    {
        // Create overlapping booking
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'booking_status' => 'confirmed',
        ]);

        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $result = $this->availabilityService->calculateRateFormatted(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertFalse($result['success']);
        $this->assertEquals('availability', $result['error_type']);
        $this->assertArrayHasKey('availability_info', $result);
        $this->assertArrayHasKey('alternative_dates', $result['availability_info']);
    }

    /** @test */
    public function it_filters_properties_by_availability_correctly()
    {
        // Create another property
        $property2 = Property::factory()->create();

        // Book property2 for the dates we're searching
        Booking::factory()->create([
            'property_id' => $property2->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'booking_status' => 'confirmed',
        ]);

        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';

        // Start with query for all properties
        $query = Property::query();
        
        // Apply availability filter
        $filteredQuery = $this->availabilityService->filterPropertiesByAvailability(
            $query,
            $checkIn,
            $checkOut
        );

        $availableProperties = $filteredQuery->get();

        // Should only include property1 (not property2 which is booked)
        $this->assertCount(1, $availableProperties);
        $this->assertEquals($this->property->id, $availableProperties->first()->id);
    }

    /** @test */
    public function it_finds_next_available_dates()
    {
        // Book the next few days
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => Carbon::tomorrow()->format('Y-m-d'),
            'check_out' => Carbon::tomorrow()->addDays(3)->format('Y-m-d'),
            'booking_status' => 'confirmed',
        ]);

        $nights = 2;
        $result = $this->availabilityService->getNextAvailableDates($this->property, $nights);

        $this->assertNotNull($result);
        $this->assertEquals($nights, $result['nights']);
        $this->assertArrayHasKey('check_in', $result);
        $this->assertArrayHasKey('check_out', $result);
        
        // Verify the suggested dates are actually available
        $suggestedCheckIn = $result['check_in'];
        $suggestedCheckOut = $result['check_out'];
        
        $availability = $this->availabilityService->checkAvailability(
            $this->property,
            $suggestedCheckIn,
            $suggestedCheckOut
        );
        
        $this->assertTrue($availability['available']);
    }

    /** @test */
    public function it_provides_debug_availability_information()
    {
        // Create test booking
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'booking_status' => 'confirmed',
        ]);

        $checkIn = '2024-01-16';
        $checkOut = '2024-01-18';

        $debugInfo = $this->availabilityService->debugAvailability(
            $this->property,
            $checkIn,
            $checkOut
        );

        $this->assertArrayHasKey('requested_period', $debugInfo);
        $this->assertArrayHasKey('overlapping_bookings', $debugInfo);
        $this->assertArrayHasKey('booked_dates', $debugInfo);
        $this->assertArrayHasKey('is_available', $debugInfo);
        
        $this->assertFalse($debugInfo['is_available']);
        $this->assertNotEmpty($debugInfo['overlapping_bookings']);
        $this->assertNotEmpty($debugInfo['booked_dates']);
    }

    /** @test */
    public function it_generates_availability_calendar()
    {
        // Create some bookings in the calendar period
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'booking_status' => 'confirmed',
        ]);

        $startMonth = '2024-01';
        $monthsCount = 2;

        $calendar = $this->availabilityService->getAvailabilityCalendar(
            $this->property,
            $startMonth,
            $monthsCount
        );

        $this->assertEquals($this->property->id, $calendar['property_id']);
        $this->assertArrayHasKey('period', $calendar);
        $this->assertArrayHasKey('calendar', $calendar);
        $this->assertArrayHasKey('total_booked_days', $calendar);
        
        $this->assertCount($monthsCount, $calendar['calendar']);
        
        // Check first month structure
        $firstMonth = $calendar['calendar'][0];
        $this->assertArrayHasKey('year', $firstMonth);
        $this->assertArrayHasKey('month', $firstMonth);
        $this->assertArrayHasKey('month_name', $firstMonth);
        $this->assertArrayHasKey('days', $firstMonth);
        
        // Check some days have is_booked = true
        $bookedDays = collect($firstMonth['days'])->filter(fn($day) => $day['is_booked']);
        $this->assertGreaterThan(0, $bookedDays->count());
    }
}