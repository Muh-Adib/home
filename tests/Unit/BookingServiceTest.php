<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\BookingService;
use App\Services\AvailabilityService;
use App\Models\Property;
use App\Models\User;
use App\Models\Booking;
use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Domain\Booking\ValueObjects\RateCalculation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Carbon\Carbon;

class BookingServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $bookingService;
    protected $availabilityService;
    protected $property;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->bookingService = app(BookingService::class);
        $this->availabilityService = app(AvailabilityService::class);
        
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

        $this->user = User::factory()->create([
            'role' => 'guest',
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }

    /** @test */
    public function it_can_create_booking_request()
    {
        $data = [
            'property_id' => $this->property->id,
            'user_id' => $this->user->id,
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'special_requests' => 'Test request',
            'dp_percentage' => 50,
        ];

        $bookingRequest = $this->bookingService->createBookingRequest($data);

        $this->assertInstanceOf(BookingRequest::class, $bookingRequest);
        $this->assertEquals($this->property->id, $bookingRequest->propertyId);
        $this->assertEquals($this->user->id, $bookingRequest->userId);
        $this->assertEquals('Test Guest', $bookingRequest->guestName);
        $this->assertEquals('guest@example.com', $bookingRequest->guestEmail);
        $this->assertEquals(2, $bookingRequest->totalGuests);
        $this->assertEquals(50, $bookingRequest->dpPercentage);
    }

    /** @test */
    public function it_validates_booking_request_data()
    {
        // Test missing required fields
        $data = [
            'property_id' => $this->property->id,
            // Missing required fields
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->bookingService->createBookingRequest($data);
    }

    /** @test */
    public function it_calculates_rate_correctly()
    {
        $checkIn = now()->addDays(1);
        $checkOut = now()->addDays(3);
        $guestCount = 2;

        $rateCalculation = $this->bookingService->calculateRate(
            $this->property,
            $checkIn->format('Y-m-d'),
            $checkOut->format('Y-m-d'),
            $guestCount
        );

        $this->assertInstanceOf(RateCalculation::class, $rateCalculation);
        $this->assertGreaterThan(0, $rateCalculation->totalAmount);
        $this->assertGreaterThan(0, $rateCalculation->dpAmount);
        $this->assertGreaterThan(0, $rateCalculation->remainingAmount);
    }

    /** @test */
    public function it_calculates_extra_bed_charges()
    {
        $checkIn = now()->addDays(1);
        $checkOut = now()->addDays(3);
        $guestCount = 6; // Exceeds capacity of 4

        $rateCalculation = $this->bookingService->calculateRate(
            $this->property,
            $checkIn->format('Y-m-d'),
            $checkOut->format('Y-m-d'),
            $guestCount
        );

        $this->assertInstanceOf(RateCalculation::class, $rateCalculation);
        $this->assertGreaterThan(0, $rateCalculation->extraBedAmount);
        
        // Calculate expected extra bed amount
        $extraBeds = $guestCount - $this->property->capacity; // 6 - 4 = 2
        $expectedExtraBedAmount = $extraBeds * $this->property->extra_bed_rate * 2; // 2 nights
        $this->assertEquals($expectedExtraBedAmount, $rateCalculation->extraBedAmount);
    }

    /** @test */
    public function it_validates_minimum_stay_requirements()
    {
        // Test weekend minimum stay
        $weekend = Carbon::now()->next(Carbon::SATURDAY);
        $checkIn = $weekend;
        $checkOut = $weekend->copy()->addDay(); // Only 1 night, but weekend requires 2

        $this->expectException(\InvalidArgumentException::class);
        $this->bookingService->validateMinimumStay(
            $this->property,
            $checkIn->format('Y-m-d'),
            $checkOut->format('Y-m-d')
        );
    }

    /** @test */
    public function it_validates_guest_count_limits()
    {
        // Test guest count exceeds maximum
        $guestCount = 8; // Exceeds capacity_max of 6

        $this->expectException(\InvalidArgumentException::class);
        $this->bookingService->validateGuestCount($this->property, $guestCount);
    }

    /** @test */
    public function it_creates_booking_with_workflow()
    {
        $data = [
            'property_id' => $this->property->id,
            'user_id' => $this->user->id,
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'special_requests' => 'Test request',
            'dp_percentage' => 50,
        ];

        $booking = $this->bookingService->createBooking($data);

        $this->assertInstanceOf(Booking::class, $booking);
        $this->assertEquals($this->property->id, $booking->property_id);
        $this->assertEquals($this->user->id, $booking->user_id);
        $this->assertEquals('Test Guest', $booking->guest_name);
        $this->assertEquals('guest@example.com', $booking->guest_email);
        $this->assertEquals(2, $booking->guest_count);
        $this->assertEquals(50, $booking->dp_percentage);
        $this->assertEquals('pending', $booking->booking_status);

        // Check if workflow entry was created
        $this->assertDatabaseHas('booking_workflows', [
            'booking_id' => $booking->id,
            'step' => 'booking_created',
            'status' => 'completed',
        ]);
    }

    /** @test */
    public function it_handles_different_dp_percentages()
    {
        $dpPercentages = [30, 50, 100];

        foreach ($dpPercentages as $dpPercentage) {
            $data = [
                'property_id' => $this->property->id,
                'user_id' => $this->user->id,
                'check_in_date' => now()->addDays(1)->format('Y-m-d'),
                'check_out_date' => now()->addDays(3)->format('Y-m-d'),
                'check_in_time' => '15:00',
                'guest_male' => 1,
                'guest_female' => 1,
                'guest_children' => 0,
                'guest_name' => 'Test Guest',
                'guest_email' => 'guest@example.com',
                'guest_phone' => '081234567890',
                'guest_country' => 'Indonesia',
                'guest_gender' => 'male',
                'relationship_type' => 'keluarga',
                'special_requests' => 'Test request',
                'dp_percentage' => $dpPercentage,
            ];

            $booking = $this->bookingService->createBooking($data);

            $this->assertEquals($dpPercentage, $booking->dp_percentage);
            
            // Verify DP calculation
            $expectedDpAmount = $booking->total_amount * $dpPercentage / 100;
            $this->assertEquals($expectedDpAmount, $booking->dp_amount);
            
            $expectedRemainingAmount = $booking->total_amount * (100 - $dpPercentage) / 100;
            $this->assertEquals($expectedRemainingAmount, $booking->remaining_amount);
        }
    }

    /** @test */
    public function it_handles_guest_details()
    {
        $data = [
            'property_id' => $this->property->id,
            'user_id' => $this->user->id,
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 2,
            'guest_female' => 1,
            'guest_children' => 1,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'special_requests' => 'Test request',
            'dp_percentage' => 50,
            'guests' => [
                [
                    'name' => 'Additional Guest 1',
                    'gender' => 'male',
                    'age_category' => 'adult',
                    'relationship_to_primary' => 'friend',
                ],
                [
                    'name' => 'Additional Guest 2',
                    'gender' => 'female',
                    'age_category' => 'child',
                    'relationship_to_primary' => 'child',
                ],
            ],
        ];

        $booking = $this->bookingService->createBooking($data);

        $this->assertEquals(4, $booking->guest_count); // 2 male + 1 female + 1 child
        
        // Check if guest details were saved
        $this->assertDatabaseHas('booking_guests', [
            'booking_id' => $booking->id,
            'name' => 'Additional Guest 1',
            'gender' => 'male',
        ]);
        
        $this->assertDatabaseHas('booking_guests', [
            'booking_id' => $booking->id,
            'name' => 'Additional Guest 2',
            'gender' => 'female',
        ]);
    }

    /** @test */
    public function it_validates_property_availability()
    {
        // Create existing booking
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'user_id' => $this->user->id,
            'check_in' => now()->addDays(1)->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'booking_status' => 'confirmed',
        ]);

        $data = [
            'property_id' => $this->property->id,
            'user_id' => $this->user->id,
            'check_in_date' => now()->addDays(2)->format('Y-m-d'), // Overlaps
            'check_out_date' => now()->addDays(4)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'special_requests' => 'Test request',
            'dp_percentage' => 50,
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->bookingService->createBooking($data);
    }

    /** @test */
    public function it_generates_booking_number()
    {
        $data = [
            'property_id' => $this->property->id,
            'user_id' => $this->user->id,
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'special_requests' => 'Test request',
            'dp_percentage' => 50,
        ];

        $booking = $this->bookingService->createBooking($data);

        $this->assertNotNull($booking->booking_number);
        $this->assertStringStartsWith('BK', $booking->booking_number);
        $this->assertEquals(12, strlen($booking->booking_number)); // BK + 10 digits
    }

    /** @test */
    public function it_calculates_cleaning_fee()
    {
        $checkIn = now()->addDays(1);
        $checkOut = now()->addDays(3);
        $guestCount = 2;

        $rateCalculation = $this->bookingService->calculateRate(
            $this->property,
            $checkIn->format('Y-m-d'),
            $checkOut->format('Y-m-d'),
            $guestCount
        );

        $this->assertEquals($this->property->cleaning_fee, $rateCalculation->cleaningFee);
    }

    /** @test */
    public function it_handles_weekend_premium()
    {
        // Test weekend booking
        $weekend = Carbon::now()->next(Carbon::SATURDAY);
        $checkIn = $weekend;
        $checkOut = $weekend->copy()->addDays(2);

        $rateCalculation = $this->bookingService->calculateRate(
            $this->property,
            $checkIn->format('Y-m-d'),
            $checkOut->format('Y-m-d'),
            2
        );

        $this->assertGreaterThan(0, $rateCalculation->weekendPremium);
        
        // Verify weekend premium calculation
        $baseRate = $this->property->base_rate;
        $weekendPremium = $baseRate * ($this->property->weekend_premium_percent / 100);
        $this->assertEquals($weekendPremium, $rateCalculation->weekendPremium);
    }
} 