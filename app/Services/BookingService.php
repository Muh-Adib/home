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
        // ✅ FIX: Use transaction with retry for SQLite database lock issues
        $maxRetries = 3;
        $retryDelay = 100000; // 100ms in microseconds
        
        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                return DB::transaction(function () use ($request, $user) {
                    // ✅ FIX: For SQLite, avoid lockForUpdate if possible to prevent database locks
                    $property = config('database.default') === 'sqlite' 
                        ? Property::findOrFail($request->propertyId)
                        : Property::lockForUpdate()->findOrFail($request->propertyId);

                    if (!$this->validatePropertyAvailability($property, $request->checkInDate, $request->checkOutDate)) {
                        throw new \Exception('Property tidak tersedia untuk tanggal yang dipilih.');
                    }

                    // ✅ FIX: Handle null user properly
                    $userId = $user?->id;
                    if (!$userId) {
                        throw new \InvalidArgumentException('User is required for booking creation');
                    }

                    $rateCalculation = $this->rateCalculationService->calculateRate(
                        $property,
                        $request->checkInDate,
                        $request->checkOutDate,
                        $request->guestCount
                    );
                    $request->setRateCalculation($rateCalculation->toArray());
                    $request->setTotalAmount($rateCalculation->totalAmount);

                    $booking = $this->bookingRepository->create($request, $property, $userId);

                    // ✅ FIX: Always save daily revenue (not just for paid bookings)
                    // This ensures breakdown is stored immediately
                    $this->insertDailyRevenueFromCalculation($booking, $rateCalculation->toArray());

                    event(new BookingCreated($booking, $user));
                    return $booking;
                }, 5); // 5 attempts for transaction
            } catch (\Illuminate\Database\QueryException $e) {
                // Check if it's a database lock error
                if (str_contains($e->getMessage(), 'database is locked') && $attempt < $maxRetries) {
                    Log::warning("Database lock detected, retrying booking creation (attempt {$attempt}/{$maxRetries})", [
                        'error' => $e->getMessage(),
                        'property_id' => $request->propertyId,
                    ]);
                    usleep($retryDelay * $attempt); // Exponential backoff
                    continue;
                }
                throw $e;
            }
        }
        
        throw new \Exception('Failed to create booking after ' . $maxRetries . ' attempts due to database lock');
    }

    public function updateBooking(Booking $booking, BookingRequest $request): Booking
    {
        // ✅ FIX: Use transaction with retry for SQLite database lock issues
        $maxRetries = 3;
        $retryDelay = 100000; // 100ms in microseconds
        
        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                return DB::transaction(function () use ($booking, $request) {
                    // ✅ FIX: For SQLite, avoid lockForUpdate if possible to prevent database locks
                    $property = config('database.default') === 'sqlite' 
                        ? Property::findOrFail($request->propertyId)
                        : Property::lockForUpdate()->findOrFail($request->propertyId);

                    if (!$this->validatePropertyAvailability($property, $request->checkInDate, $request->checkOutDate)) {
                        throw new \Exception('Property tidak tersedia untuk tanggal yang dipilih.');
                    }

                    $rateCalculation = $this->rateCalculationService->calculateRate(
                        $property,
                        $request->checkInDate,
                        $request->checkOutDate,
                        $request->guestCount
                    );
                    $request->setRateCalculation($rateCalculation->toArray());
                    $request->setTotalAmount($rateCalculation->totalAmount);

                    $booking = $this->bookingRepository->update($booking, $request, $property);

                    // ✅ FIX: Always update daily revenue when booking is updated
                    $this->insertDailyRevenueFromCalculation($booking, $rateCalculation->toArray());

                    return $booking;
                }, 5); // 5 attempts for transaction
            } catch (\Illuminate\Database\QueryException $e) {
                // Check if it's a database lock error
                if (str_contains($e->getMessage(), 'database is locked') && $attempt < $maxRetries) {
                    Log::warning("Database lock detected, retrying booking update (attempt {$attempt}/{$maxRetries})", [
                        'error' => $e->getMessage(),
                        'booking_id' => $booking->id,
                    ]);
                    usleep($retryDelay * $attempt); // Exponential backoff
                    continue;
                }
                throw $e;
            }
        }
        
        throw new \Exception('Failed to update booking after ' . $maxRetries . ' attempts due to database lock');
    }

    /**
     * Insert daily revenue from rate calculation array (used during booking creation)
     */
    private function insertDailyRevenueFromCalculation(Booking $booking, array $rateCalculation): void
    {
        $breakdown = $rateCalculation['breakdown']['daily_breakdown'] ?? null;
        
        if (!$breakdown || !is_array($breakdown)) {
            return;
        }
        
        // Delete existing daily revenue for this booking
        \App\Models\BookingDailyRevenue::where('booking_id', $booking->id)->delete();
        
        // Insert new daily revenue records
        $revenueData = [];
        foreach ($breakdown as $tanggal => $detail) {
            if ($tanggal >= $booking->check_out->format('Y-m-d')) {
                continue;
            }
            
            $finalRate = $detail['final_rate'] ?? $detail['base_rate'] ?? 0;
            // Convert to numeric if it's a string
            if (is_string($finalRate)) {
                $finalRate = (float) str_replace(['.', ','], ['', '.'], $finalRate);
            }
            
            $revenueData[] = [
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tanggal' => $tanggal,
                'amount' => $finalRate,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        if (!empty($revenueData)) {
            \App\Models\BookingDailyRevenue::insert($revenueData);
        }
    }

    /**
     * Insert daily revenue from booking's virtual rate_calculation attribute
     */
    private function insertDailyRevenue(Booking $booking): void
    {
        // Get rate calculation (now a virtual attribute from booking_daily_revenue or recalculated)
        $rateCalculation = $booking->rate_calculation;
        $this->insertDailyRevenueFromCalculation($booking, $rateCalculation);
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
        // ✅ FIX: Standardize field names to check_in/check_out
        $request = new BookingRequest(
            propertyId: $property->id,
            checkInDate: $data['check_in'] ?? $data['check_in_date'],
            checkOutDate: $data['check_out'] ?? $data['check_out_date'],
            checkInTime: $data['check_in_time'] ?? '15:00',
            guestCount: $data['guest_count'] ?? $data['guest_count_adults'],
            guestMale: $data['guest_male'] ?? 1,
            guestFemale: $data['guest_female'] ?? 1,
            guestChildren: $data['guest_children'] ?? 0,
            guestName: $data['guest_name'],
            guestEmail: $data['guest_email'],
            guestPhone: $data['guest_phone'],
            guestCountry: $data['guest_country'] ?? 'Indonesia',
            guestIdNumber: $data['guest_id_number'] ?? null,
            guestGender: $data['guest_gender'] ?? 'male',
            relationshipType: $data['relationship_type'] ?? 'keluarga',
            guests: $data['guests'] ?? [],
            specialRequests: $data['special_requests'] ?? null,
            internalNotes: $data['internal_notes'] ?? null,
            bookingStatus: $data['booking_status'] ?? 'pending_verification',
            paymentStatus: $data['payment_status'] ?? 'dp_pending',
            dpPercentage: $data['dp_percentage'] ?? 50,
            autoConfirm: $data['auto_confirm'] ?? false
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