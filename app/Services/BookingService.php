<?php

namespace App\Services;

use App\Domain\Booking\ValueObjects\BookingRequest;
use App\Domain\Booking\ValueObjects\RateCalculation;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Repositories\BookingRepository;
use App\Events\BookingCreated;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingService
{
    public function __construct(
        private BookingRepository $bookingRepository,
        private RateCalculationService $rateCalculationService,
        private AvailabilityService $availabilityService
    ) {}

    /**
     * Create a new booking
     * 
     * @param BookingRequest $request
     * @param User|null $user
     * @return Booking
     * @throws \Exception
     */
    public function createBooking(BookingRequest $request, ?User $user = null): Booking
    {
        // Get property from request (property_id is added in controller)
        $property = Property::findOrFail($request->propertyId);
        
        // Use database transaction with row-level locking to prevent race conditions
        return DB::transaction(function () use ($request, $property, $user) {
            // Lock the property row to prevent concurrent modifications
            $property = Property::lockForUpdate()->find($request->propertyId);
            
            // Validate property availability within transaction
            if (!$this->validatePropertyAvailability($property, $request->checkInDate, $request->checkOutDate)) {
                throw new \Exception('Property tidak tersedia untuk tanggal yang dipilih.');
            }

            // Calculate rate
            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $request->checkInDate,
                $request->checkOutDate,
                $request->guestCount
            );

            // Create booking data array
            $bookingData = [
                'property_id' => $property->id,
                'user_id' => $user?->id,
                'guest_name' => $request->guestName,
                'guest_email' => $request->guestEmail,
                'guest_phone' => $request->guestPhone,
                'check_in_date' => $request->checkInDate,
                'check_out_date' => $request->checkOutDate,
                'guest_count_adults' => $request->guestCount,
                'guest_count_children' => 0, // Assuming no children for now
                'special_requests' => $request->specialRequests ?? '',
                'booking_status' => 'pending_verification',
                'total_amount' => $rateCalculation->totalAmount,
                'payment_status' => 'pending',
                'rate_calculation' => $rateCalculation->toArray(),
            ];

            // Create booking using repository
            $booking = $this->bookingRepository->create($bookingData);

            // Dispatch booking created event
            event(new BookingCreated($booking));

            return $booking;
        });
    }

    /**
     * Alternative method for backward compatibility
     * @param Property $property
     * @param array $data
     * @param User|null $user
     * @return Booking
     */
    public function createBookingFromArray(Property $property, array $data, ?User $user = null): Booking
    {
        // Convert array data to BookingRequest object
        $request = new BookingRequest(
            propertyId: $property->id,
            checkInDate: $data['check_in_date'],
            checkOutDate: $data['check_out_date'],
            guestCount: $data['guest_count_adults'],
            guestName: $data['guest_name'],
            guestEmail: $data['guest_email'],
            guestPhone: $data['guest_phone'],
            specialRequests: $data['special_requests'] ?? null
        );

        return $this->createBooking($request, $user);
    }

    /**
     * Validate property availability
     */
    private function validatePropertyAvailability(Property $property, string $checkIn, string $checkOut): bool
    {
        $availability = $this->availabilityService->checkAvailability($property, $checkIn, $checkOut);
        
        return $availability['available'];
    }

    /**
     * Get user bookings
     */
    public function getUserBookings(User $user): \Illuminate\Database\Eloquent\Collection
    {
        return $this->bookingRepository->getUserBookings($user);
    }

    /**
     * Get booked dates for property
     */
    public function getBookedDates(Property $property, string $checkIn, string $checkOut): array
    {
        return $this->availabilityService->getBookedDatesInRange($property, $checkIn, $checkOut);
    }

    /**
     * Cancel booking
     */
    public function cancelBooking(Booking $booking, string $reason, ?User $cancelledBy = null): bool
    {
        return $this->bookingRepository->cancel($booking, $reason, $cancelledBy);
    }

    /**
     * Create booking request from data
     */
    public function createBookingRequest(array $data): BookingRequest
    {
        return new BookingRequest(
            propertyId: $data['property_id'],
            checkInDate: $data['check_in_date'],
            checkOutDate: $data['check_out_date'],
            guestCount: $data['guest_count_adults'],
            guestName: $data['guest_name'],
            guestEmail: $data['guest_email'],
            guestPhone: $data['guest_phone'],
            specialRequests: $data['special_requests'] ?? null
        );
    }

    /**
     * Calculate rate using RateCalculationService
     */
    public function calculateRate(Property $property, string $checkIn, string $checkOut, int $guestCount): RateCalculation
    {
        return $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
    }

    /**
     * Validate minimum stay requirements
     */
    public function validateMinimumStay(Property $property, string $checkIn, string $checkOut): bool
    {
        // This logic should also be moved to a dedicated service
        $nights = \Carbon\Carbon::parse($checkIn)->diffInDays(\Carbon\Carbon::parse($checkOut));
        
        // Simple validation - can be enhanced
        return $nights >= $property->min_stay_weekday;
    }

    /**
     * Validate guest count
     */
    public function validateGuestCount(Property $property, int $guestCount): bool
    {
        return $guestCount <= $property->capacity_max && $guestCount > 0;
    }
} 