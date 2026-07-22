<?php

namespace Tests\Unit;

use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Domain\Booking\ValueObjects\RateCalculation;
use App\Events\BookingCreated;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Repositories\BookingRepository;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\RateCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingServiceRefactoredTest extends TestCase
{
    use RefreshDatabase;

    private BookingService $bookingService;

    private Property $property;

    private User $user;

    private BookingRepository $bookingRepository;

    private RateCalculationService $rateCalculationService;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test data
        $this->property = Property::factory()->create([
            'base_rate' => 500000,
            'capacity' => 4,
            'capacity_max' => 6,
            'min_stay_weekday' => 2,
        ]);

        $this->user = User::factory()->create();

        // Create mock dependencies
        $this->bookingRepository = Mockery::mock(BookingRepository::class);
        $this->rateCalculationService = Mockery::mock(RateCalculationService::class);
        $availabilityService = Mockery::mock(AvailabilityService::class);
        $availabilityService->shouldReceive('checkAvailability')
            ->andReturn(['available' => true, 'booked_dates' => []]);
        $availabilityService->shouldReceive('getBookedDatesInRange')
            ->andReturn([]);

        // Create service with mocked dependencies
        $this->bookingService = new BookingService(
            $this->bookingRepository,
            $this->rateCalculationService,
            $availabilityService
        );

        Event::fake();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    #[Test]
    public function it_creates_booking_successfully()
    {
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'guest_male' => 2,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '081234567890',
            'special_requests' => 'Late check-in please',
        ]);

        $rateCalculation = new RateCalculation(
            nights: 2,
            baseAmount: 1000000,
            weekendPremium: 0,
            seasonalPremium: 0,
            extraBedAmount: 0,
            cleaningFee: 100000,
            taxAmount: 0,
            totalAmount: 1100000,
            extraBeds: 0,
            breakdown: [],
            seasonalRatesApplied: []
        );

        $expectedBooking = Booking::factory()->make([
            'id' => 1,
            'property_id' => $this->property->id,
            'user_id' => $this->user->id,
        ]);

        $this->rateCalculationService
            ->shouldReceive('calculateRate')
            ->once()
            ->with(Mockery::type(Property::class), '2024-01-15', '2024-01-17', Mockery::type('int'), Mockery::any())
            ->andReturn($rateCalculation);

        // Mock booking creation
        $this->bookingRepository
            ->shouldReceive('create')
            ->once()
            ->with(
                Mockery::type(BookingRequest::class),
                Mockery::type(Property::class),
                Mockery::type('int'),
                Mockery::type(RateCalculation::class)
            )
            ->andReturn($expectedBooking);

        $result = $this->bookingService->createBooking($bookingRequest, $this->user);

        $this->assertInstanceOf(Booking::class, $result);
        $this->assertEquals($this->property->id, $result->property_id);
        $this->assertEquals($this->user->id, $result->user_id);

        // Verify event was dispatched
        Event::assertDispatched(BookingCreated::class);
    }

    #[Test]
    public function it_creates_booking_from_array_data()
    {
        $data = [
            'check_in_date' => '2024-01-15',
            'check_out_date' => '2024-01-17',
            'guest_count_adults' => 2,
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '081234567891',
            'special_requests' => 'Early check-in',
        ];

        $rateCalculation = new RateCalculation(
            nights: 2,
            baseAmount: 1000000,
            weekendPremium: 0,
            seasonalPremium: 0,
            extraBedAmount: 0,
            cleaningFee: 100000,
            taxAmount: 0,
            totalAmount: 1100000,
            extraBeds: 0,
            breakdown: [],
            seasonalRatesApplied: []
        );

        $expectedBooking = Booking::factory()->make([
            'id' => 1,
            'property_id' => $this->property->id,
        ]);

        $this->rateCalculationService
            ->shouldReceive('calculateRate')
            ->once()
            ->andReturn($rateCalculation);

        $this->bookingRepository
            ->shouldReceive('create')
            ->once()
            ->andReturn($expectedBooking);

        $result = $this->bookingService->createBookingFromArray($this->property, $data, $this->user);

        $this->assertInstanceOf(Booking::class, $result);
    }

    #[Test]
    public function it_creates_booking_request_from_array()
    {
        $data = [
            'property_id' => $this->property->id,
            'check_in_date' => '2024-01-15',
            'check_out_date' => '2024-01-17',
            'guest_count_adults' => 2,
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '081234567890',
            'special_requests' => null,
        ];

        $bookingRequest = $this->bookingService->createBookingRequest($data);

        $this->assertInstanceOf(BookingRequest::class, $bookingRequest);
        $this->assertEquals($this->property->id, $bookingRequest->propertyId);
        $this->assertEquals('2024-01-15', $bookingRequest->checkInDate);
        $this->assertEquals('2024-01-17', $bookingRequest->checkOutDate);
        $this->assertEquals(2, $bookingRequest->guestCount);
        $this->assertEquals('Test User', $bookingRequest->guestName);
        $this->assertEquals('test@example.com', $bookingRequest->guestEmail);
        $this->assertEquals('081234567890', $bookingRequest->guestPhone);
        $this->assertNull($bookingRequest->specialRequests);
    }

    #[Test]
    public function it_calculates_rate_using_rate_service()
    {
        $expectedCalculation = new RateCalculation(
            nights: 2,
            baseAmount: 1000000,
            weekendPremium: 0,
            seasonalPremium: 0,
            extraBedAmount: 0,
            cleaningFee: 100000,
            taxAmount: 0,
            totalAmount: 1100000,
            extraBeds: 0,
            breakdown: [],
            seasonalRatesApplied: []
        );

        $this->rateCalculationService
            ->shouldReceive('calculateRate')
            ->once()
            ->with($this->property, '2024-01-15', '2024-01-17', 2, Mockery::any())
            ->andReturn($expectedCalculation);

        $result = $this->bookingService->calculateRate(
            $this->property,
            '2024-01-15',
            '2024-01-17',
            2
        );

        $this->assertInstanceOf(RateCalculation::class, $result);
        $this->assertEquals(2, $result->nights);
        $this->assertEquals(1000000, $result->baseAmount);
        $this->assertEquals(1100000, $result->totalAmount);
    }

    #[Test]
    public function it_validates_minimum_stay_requirements()
    {
        // Valid stay (meets minimum)
        $isValid = $this->bookingService->validateMinimumStay(
            $this->property,
            '2024-01-15',
            '2024-01-17' // 2 nights, meets min_stay_weekday
        );
        $this->assertTrue($isValid);

        // Invalid stay (below minimum)
        $isInvalid = $this->bookingService->validateMinimumStay(
            $this->property,
            '2024-01-15',
            '2024-01-16' // 1 night, below min_stay_weekday
        );
        $this->assertFalse($isInvalid);
    }

    #[Test]
    public function it_validates_guest_count()
    {
        // Valid guest count (within limits)
        $isValid = $this->bookingService->validateGuestCount($this->property, 4);
        $this->assertTrue($isValid);

        // Valid guest count (at maximum)
        $isValidMax = $this->bookingService->validateGuestCount($this->property, 6);
        $this->assertTrue($isValidMax);

        // Invalid guest count (exceeds maximum)
        $isInvalid = $this->bookingService->validateGuestCount($this->property, 8);
        $this->assertFalse($isInvalid);

        // Invalid guest count (zero)
        $isInvalidZero = $this->bookingService->validateGuestCount($this->property, 0);
        $this->assertFalse($isInvalidZero);
    }

    #[Test]
    public function it_gets_user_bookings()
    {
        $expectedBookings = collect([
            Booking::factory()->make(['user_id' => $this->user->id]),
            Booking::factory()->make(['user_id' => $this->user->id]),
        ]);

        $this->bookingRepository
            ->shouldReceive('getUserBookings')
            ->once()
            ->with($this->user)
            ->andReturn($expectedBookings);

        $result = $this->bookingService->getUserBookings($this->user);

        $this->assertCount(2, $result);
        $this->assertEquals($expectedBookings, $result);
    }

    #[Test]
    public function it_cancels_booking()
    {
        $booking = Booking::factory()->make(['id' => 1]);
        $reason = 'Customer request';
        $cancelledBy = $this->user;

        $this->bookingRepository
            ->shouldReceive('cancel')
            ->once()
            ->with($booking, $reason, $cancelledBy)
            ->andReturn(true);

        $result = $this->bookingService->cancelBooking($booking, $reason, $cancelledBy);

        $this->assertTrue($result);
    }

    #[Test]
    public function it_gets_booked_dates_for_property()
    {
        $expectedDates = ['2024-01-15', '2024-01-16'];

        // Since we're testing the integration with AvailabilityService,
        // we need to use the real implementation
        $realBookingService = app(BookingService::class);

        // Create actual booking to test with
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'booking_status' => 'confirmed',
        ]);

        $result = $realBookingService->getBookedDates(
            $this->property,
            '2024-01-10',
            '2024-01-20'
        );

        $this->assertIsArray($result);
        $this->assertContains('2024-01-15', $result);
        $this->assertContains('2024-01-16', $result);
    }

    #[Test]
    public function it_handles_booking_creation_transaction_rollback()
    {
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'guest_male' => 2,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '081234567890',
        ]);

        // Mock rate calculation to succeed
        $rateCalculation = new RateCalculation(
            nights: 2,
            baseAmount: 1000000,
            weekendPremium: 0,
            seasonalPremium: 0,
            extraBedAmount: 0,
            cleaningFee: 100000,
            taxAmount: 0,
            totalAmount: 1100000,
            extraBeds: 0,
            breakdown: [],
            seasonalRatesApplied: []
        );

        $this->rateCalculationService
            ->shouldReceive('calculateRate')
            ->once()
            ->andReturn($rateCalculation);

        // Mock repository to throw exception
        $this->bookingRepository
            ->shouldReceive('create')
            ->once()
            ->andThrow(new \Exception('Database error'));

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Database error');

        $this->bookingService->createBooking($bookingRequest, $this->user);

        // Verify no event was dispatched due to transaction rollback
        Event::assertNotDispatched(BookingCreated::class);
    }

    #[Test]
    public function it_creates_booking_without_user()
    {
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'guest_male' => 2,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'Guest User',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
        ]);

        $rateCalculation = new RateCalculation(
            nights: 2,
            baseAmount: 1000000,
            weekendPremium: 0,
            seasonalPremium: 0,
            extraBedAmount: 0,
            cleaningFee: 100000,
            taxAmount: 0,
            totalAmount: 1100000,
            extraBeds: 0,
            breakdown: [],
            seasonalRatesApplied: []
        );

        $expectedBooking = Booking::factory()->make([
            'id' => 1,
            'property_id' => $this->property->id,
            'user_id' => null, // Guest booking
        ]);

        $this->rateCalculationService
            ->shouldReceive('calculateRate')
            ->never()
            ->andReturn($rateCalculation);

        $this->bookingRepository
            ->shouldReceive('create')
            ->never();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('User is required for booking creation');

        $result = $this->bookingService->createBooking($bookingRequest, null);
    }

    #[Test]
    public function it_includes_rate_calculation_in_booking_data()
    {
        $bookingRequest = BookingRequest::fromArray([
            'property_id' => $this->property->id,
            'check_in' => '2024-01-15',
            'check_out' => '2024-01-17',
            'guest_male' => 2,
            'guest_female' => 0,
            'guest_children' => 0,
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '081234567890',
        ]);

        $rateCalculation = new RateCalculation(
            nights: 2,
            baseAmount: 1000000,
            weekendPremium: 200000,
            seasonalPremium: 100000,
            extraBedAmount: 0,
            cleaningFee: 100000,
            taxAmount: 0,
            totalAmount: 1400000,
            extraBeds: 0,
            breakdown: ['test' => 'data'],
            seasonalRatesApplied: []
        );

        $expectedBooking = Booking::factory()->make();

        $this->rateCalculationService
            ->shouldReceive('calculateRate')
            ->once()
            ->andReturn($rateCalculation);

        // Verify create() is called with the RateCalculation VO directly
        $this->bookingRepository
            ->shouldReceive('create')
            ->once()
            ->with(
                Mockery::type(BookingRequest::class),
                Mockery::type(Property::class),
                Mockery::type('int'),
                Mockery::on(function ($rc) use ($rateCalculation) {
                    return $rc instanceof RateCalculation &&
                           $rc->totalAmount === $rateCalculation->totalAmount;
                })
            )
            ->andReturn($expectedBooking);

        $result = $this->bookingService->createBooking($bookingRequest, $this->user);

        $this->assertInstanceOf(Booking::class, $result);
    }
}
