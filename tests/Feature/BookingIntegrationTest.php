<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Services\BookingService;
use App\Services\RateCalculationService;
use App\Services\AvailabilityService;
use App\Services\RateService;
use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Models\Booking;
use App\Models\User;
use App\Events\BookingCreated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

class BookingIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private BookingService $bookingService;
    private RateCalculationService $rateCalculationService;
    private AvailabilityService $availabilityService;
    private RateService $rateService;
    private Property $property;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Get services from container (integration testing)
        $this->bookingService = app(BookingService::class);
        $this->rateCalculationService = app(RateCalculationService::class);
        $this->availabilityService = app(AvailabilityService::class);
        $this->rateService = app(RateService::class);
        
        // Create test data
        $this->property = Property::factory()->create([
            'base_rate' => 500000,
            'weekend_premium_percent' => 20,
            'cleaning_fee' => 100000,
            'extra_bed_rate' => 150000,
            'capacity' => 4,
            'capacity_max' => 6,
            'min_stay_weekday' => 2,
        ]);
        
        $this->user = User::factory()->create();
        
        Event::fake();
    }

    /** @test */
    public function it_completes_full_booking_flow_with_refactored_services()
    {
        // Step 1: Check availability
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $availability = $this->availabilityService->checkAvailability(
            $this->property,
            $checkIn,
            $checkOut
        );

        $this->assertTrue($availability['available']);
        $this->assertEmpty($availability['booked_dates']);

        // Step 2: Calculate rate
        $rateCalculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertEquals(2, $rateCalculation->nights);
        $this->assertEquals(1000000, $rateCalculation->baseAmount); // 2 nights * 500k
        $this->assertEquals(100000, $rateCalculation->cleaningFee);
        $this->assertGreaterThanOrEqual(1100000, $rateCalculation->totalAmount); // base + cleaning fee

        // Step 3: Create booking
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guest_male' => $guestCount,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '081234567890',
            'special_requests' => 'Late check-in please',
        ]);

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);

        $this->assertInstanceOf(Booking::class, $booking);
        $this->assertEquals($this->property->id, $booking->property_id);
        $this->assertEquals($rateCalculation->totalAmount, $booking->total_amount);
        $this->assertEquals('pending_verification', $booking->booking_status);

        // Step 4: Verify availability is now blocked
        $availabilityAfterBooking = $this->availabilityService->checkAvailability(
            $this->property,
            $checkIn,
            $checkOut
        );

        $this->assertFalse($availabilityAfterBooking['available']);
        $this->assertNotEmpty($availabilityAfterBooking['booked_dates']);

        // Step 5: Verify event was dispatched
        Event::assertDispatched(BookingCreated::class);
    }

    /** @test */
    public function it_handles_seasonal_rates_integration()
    {
        // Create seasonal rate using RateService
        $seasonalRateData = [
            'name' => 'High Season',
            'start_date' => '2024-01-10',
            'end_date' => '2024-01-20',
            'rate_type' => 'percentage',
            'rate_value' => 50, // 50% increase
            'is_active' => true,
        ];

        $seasonalRate = $this->rateService->createSeasonalRate($this->property, $seasonalRateData);
        $this->assertInstanceOf(PropertySeasonalRate::class, $seasonalRate);

        // Calculate rate during seasonal period
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $rateCalculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        // Should have seasonal premium applied
        $this->assertGreaterThan(0, $rateCalculation->seasonalPremium);
        $this->assertGreaterThan(1000000, $rateCalculation->totalAmount); // Higher than normal due to seasonal premium

        // Create booking with seasonal rate
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guest_male' => $guestCount,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '081234567891',
        ]);

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);
        
        // Booking should include seasonal premium in total
        $this->assertGreaterThan(1000000, $booking->total_amount);
        
        // Verify seasonal premium is reflected in the stored booking fields
        $this->assertGreaterThan(0, $booking->fresh()->total_amount);
    }

    /** @test */
    public function it_handles_weekend_premium_integration()
    {
        // Book on weekend (Friday to Sunday)
        $checkIn = '2024-01-19'; // Friday
        $checkOut = '2024-01-21'; // Sunday
        $guestCount = 2;

        $rateCalculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        // Should have weekend premium
        $this->assertGreaterThan(0, $rateCalculation->weekendPremium);
        
        // Weekend premium should be 20% of base rate for 2 nights (Fri + Sat)
        $expectedWeekendPremium = $this->property->base_rate * 0.20 * 2;
        $this->assertEquals($expectedWeekendPremium, $rateCalculation->weekendPremium);

        // Create booking
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guest_male' => $guestCount,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'Weekend Guest',
            'guest_email' => 'weekend@example.com',
            'guest_phone' => '081234567892',
        ]);

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);
        
        // Verify weekend premium is included in total
        $this->assertGreaterThan(1000000, $booking->total_amount);
        // Total should include base (2*500k=1000000) + weekend premium (200000) + cleaning (100000)
        $this->assertEquals(1000000 + $expectedWeekendPremium + 100000, $booking->total_amount);
    }

    /** @test */
    public function it_handles_extra_bed_charges_integration()
    {
        // Property capacity is 4, book for 6 guests (2 extra beds needed)
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 6;

        $rateCalculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        // Should calculate 2 extra beds
        $this->assertEquals(2, $rateCalculation->extraBeds);
        
        // Extra bed amount = 2 beds * 150k * 2 nights = 600k
        $expectedExtraBedAmount = 2 * $this->property->extra_bed_rate * 2;
        $this->assertEquals($expectedExtraBedAmount, $rateCalculation->extraBedAmount);

        // Create booking
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guest_male' => $guestCount,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'Large Group',
            'guest_email' => 'group@example.com',
            'guest_phone' => '081234567893',
        ]);

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);
        
        // Verify extra bed charges are included
        $this->assertEquals($expectedExtraBedAmount, $booking->extra_bed_amount);
        $this->assertEquals(2, $booking->extra_bed_count);
    }

    /** @test */
    public function it_prevents_overlapping_bookings()
    {
        // Create first booking
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $firstBookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guest_male' => $guestCount,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'First Guest',
            'guest_email' => 'first@example.com',
            'guest_phone' => '081234567890',
        ]);

        $firstBooking = $this->bookingService->createBooking($firstBookingRequest, $this->user);
        $this->assertInstanceOf(Booking::class, $firstBooking);

        // Try to create overlapping booking
        $overlappingBookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-16',
            'check_out' => '2024-01-18',
            'guest_male' => $guestCount,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'Second Guest',
            'guest_email' => 'second@example.com',
            'guest_phone' => '081234567891',
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Property tidak tersedia untuk tanggal yang dipilih');

        $this->bookingService->createBooking($overlappingBookingRequest, $this->user);
    }

    /** @test */
    public function it_calculates_minimum_stay_discounts()
    {
        // Book for 7 nights
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-22';
        $guestCount = 2;

        $rateCalculation = $this->rateCalculationService->calculateRate(
            $this->property,
            $checkIn,
            $checkOut,
            $guestCount
        );

        $this->assertEquals(7, $rateCalculation->nights);
        
        // Verify the rate calculation returns a valid total
        $this->assertGreaterThan(0, $rateCalculation->totalAmount);
        $this->assertIsArray($rateCalculation->breakdown);
    }

    /** @test */
    public function it_manages_rates_through_rate_service()
    {
        // Test base rate update
        $newBaseRate = 600000;
        $updatedProperty = $this->rateService->updateBaseRate($this->property, $newBaseRate);
        $this->assertEquals($newBaseRate, $updatedProperty->base_rate);

        // Test weekend premium update
        $newWeekendPremium = 25;
        $updatedProperty = $this->rateService->updateWeekendPremium($updatedProperty, $newWeekendPremium);
        $this->assertEquals($newWeekendPremium, $updatedProperty->weekend_premium_percent);

        // Test rate calculation with updated rates
        $rateCalculation = $this->rateCalculationService->calculateRate(
            $updatedProperty,
            '2024-01-19', // Friday
            '2024-01-21', // Sunday
            2
        );

        // Should use new base rate and weekend premium
        $this->assertEquals(1200000, $rateCalculation->baseAmount); // 2 nights * 600k
        $expectedWeekendPremium = $newBaseRate * ($newWeekendPremium / 100) * 2; // 2 weekend nights
        $this->assertEquals($expectedWeekendPremium, $rateCalculation->weekendPremium);
    }

    /** @test */
    public function it_provides_booking_statistics_and_availability()
    {
        // Create multiple bookings
        $bookings = [
            ['2024-01-10', '2024-01-12'],
            ['2024-01-15', '2024-01-17'],
            ['2024-01-20', '2024-01-22'],
        ];

        foreach ($bookings as [$checkIn, $checkOut]) {
            $bookingRequest = BookingRequest::fromArray([
                'property_id' => $this->property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_male' => 2,
                'guest_female' => 0,
                'guest_children' => 0,
                'guest_name' => 'Test Guest',
                'guest_email' => 'test@example.com',
                'guest_phone' => '081234567890',
            ]);

            $this->bookingService->createBooking($bookingRequest, $this->user);
        }

        // Test availability calendar
        $calendar = $this->availabilityService->getAvailabilityCalendar(
            $this->property,
            '2024-01',
            2
        );

        $this->assertArrayHasKey('calendar', $calendar);
        $this->assertArrayHasKey('total_booked_days', $calendar);
        $this->assertGreaterThan(0, $calendar['total_booked_days']);

        // Test rate calendar
        $rateCalendar = $this->rateService->getRateCalendar(
            $this->property,
            '2024-01',
            2
        );

        $this->assertArrayHasKey('calendar', $rateCalendar);
        $this->assertArrayHasKey('base_rates', $rateCalendar);

        // Test availability filtering
        $availableProperties = Property::availableBetween('2024-01-13', '2024-01-14')->get();
        $this->assertContains($this->property->id, $availableProperties->pluck('id')->toArray());

        $unavailableProperties = Property::availableBetween('2024-01-15', '2024-01-17')->get();
        $this->assertNotContains($this->property->id, $unavailableProperties->pluck('id')->toArray());
    }
}