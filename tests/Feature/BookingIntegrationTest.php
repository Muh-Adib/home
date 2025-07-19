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
        $this->assertGreaterThan(1100000, $rateCalculation->totalAmount); // Including tax

        // Step 3: Create booking
        $bookingRequest = new BookingRequest(
            propertyId: $this->property->id,
            checkInDate: $checkIn,
            checkOutDate: $checkOut,
            guestCount: $guestCount,
            guestName: 'John Doe',
            guestEmail: 'john@example.com',
            guestPhone: '081234567890',
            specialRequests: 'Late check-in please'
        );

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);

        $this->assertInstanceOf(Booking::class, $booking);
        $this->assertEquals($this->property->id, $booking->property_id);
        $this->assertEquals($this->user->id, $booking->user_id);
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
        $this->assertGreaterThan(1000000, $rateCalculation->baseAmount); // Higher than normal

        // Create booking with seasonal rate
        $bookingRequest = new BookingRequest(
            propertyId: $this->property->id,
            checkInDate: $checkIn,
            checkOutDate: $checkOut,
            guestCount: $guestCount,
            guestName: 'Jane Doe',
            guestEmail: 'jane@example.com',
            guestPhone: '081234567891'
        );

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);
        
        // Booking should include seasonal premium in total
        $this->assertGreaterThan(1000000, $booking->total_amount);
        
        // Rate calculation should be stored in booking
        $storedRateCalculation = $booking->rate_calculation;
        $this->assertIsArray($storedRateCalculation);
        $this->assertArrayHasKey('seasonal_premium', $storedRateCalculation);
        $this->assertGreaterThan(0, $storedRateCalculation['seasonal_premium']);
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
        $bookingRequest = new BookingRequest(
            propertyId: $this->property->id,
            checkInDate: $checkIn,
            checkOutDate: $checkOut,
            guestCount: $guestCount,
            guestName: 'Weekend Guest',
            guestEmail: 'weekend@example.com',
            guestPhone: '081234567892'
        );

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);
        
        // Verify weekend premium is included in total
        $storedRateCalculation = $booking->rate_calculation;
        $this->assertEquals($expectedWeekendPremium, $storedRateCalculation['weekend_premium']);
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
        $bookingRequest = new BookingRequest(
            propertyId: $this->property->id,
            checkInDate: $checkIn,
            checkOutDate: $checkOut,
            guestCount: $guestCount,
            guestName: 'Large Group',
            guestEmail: 'group@example.com',
            guestPhone: '081234567893'
        );

        $booking = $this->bookingService->createBooking($bookingRequest, $this->user);
        
        // Verify extra bed charges are included
        $storedRateCalculation = $booking->rate_calculation;
        $this->assertEquals($expectedExtraBedAmount, $storedRateCalculation['extra_bed_amount']);
        $this->assertEquals(2, $storedRateCalculation['extra_beds']);
    }

    /** @test */
    public function it_prevents_overlapping_bookings()
    {
        // Create first booking
        $checkIn = '2024-01-15';
        $checkOut = '2024-01-17';
        $guestCount = 2;

        $firstBookingRequest = new BookingRequest(
            propertyId: $this->property->id,
            checkInDate: $checkIn,
            checkOutDate: $checkOut,
            guestCount: $guestCount,
            guestName: 'First Guest',
            guestEmail: 'first@example.com',
            guestPhone: '081234567890'
        );

        $firstBooking = $this->bookingService->createBooking($firstBookingRequest, $this->user);
        $this->assertInstanceOf(Booking::class, $firstBooking);

        // Try to create overlapping booking
        $overlappingBookingRequest = new BookingRequest(
            propertyId: $this->property->id,
            checkInDate: '2024-01-16', // Overlaps with first booking
            checkOutDate: '2024-01-18',
            guestCount: $guestCount,
            guestName: 'Second Guest',
            guestEmail: 'second@example.com',
            guestPhone: '081234567891'
        );

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Property tidak tersedia untuk tanggal yang dipilih');

        $this->bookingService->createBooking($overlappingBookingRequest, $this->user);
    }

    /** @test */
    public function it_calculates_minimum_stay_discounts()
    {
        // Book for 7 nights (should get 10% discount)
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
        
        // Check minimum stay discount is applied
        $breakdown = $rateCalculation->breakdown;
        $this->assertArrayHasKey('minimum_stay_discount', $breakdown);
        $this->assertGreaterThan(0, $breakdown['minimum_stay_discount']);
        
        // 10% discount for 7+ nights
        $expectedDiscount = $breakdown['total_base_amount'] * 0.1;
        $this->assertEquals($expectedDiscount, $breakdown['minimum_stay_discount']);
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
            $bookingRequest = new BookingRequest(
                propertyId: $this->property->id,
                checkInDate: $checkIn,
                checkOutDate: $checkOut,
                guestCount: 2,
                guestName: 'Test Guest',
                guestEmail: 'test@example.com',
                guestPhone: '081234567890'
            );

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