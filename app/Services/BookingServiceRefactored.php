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

class BookingServiceRefactored
{
    public function __construct(
        private BookingRepository $bookingRepository,
        private RateCalculationService $rateCalculationService
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

            // Create booking record
            $booking = $this->bookingRepository->create($request, $property, $user?->id ?? 0);
            
            // Update booking with calculated amounts
            $booking->update([
                'base_amount' => $rateCalculation->baseAmount,
                'weekend_premium_amount' => $rateCalculation->weekendPremium,
                'seasonal_premium_amount' => $rateCalculation->seasonalPremium,
                'extra_bed_amount' => $rateCalculation->extraBedAmount,
                'cleaning_fee' => $rateCalculation->cleaningFee,
                'tax_amount' => $rateCalculation->taxAmount,
                'total_amount' => $rateCalculation->totalAmount,
                'dp_amount' => $rateCalculation->totalAmount * $request->dpPercentage / 100,
                'remaining_amount' => $rateCalculation->totalAmount * (100 - $request->dpPercentage) / 100,
            ]);

            // Create workflow entry
            $booking->workflow()->create([
                'step' => 'booking_created',
                'status' => 'completed',
                'processed_by' => $user?->id ?? 0,
                'processed_at' => now(),
                'notes' => 'Booking created via ' . ($user && $user->hasRole('admin') ? 'admin interface' : 'guest interface'),
            ]);

            // Dispatch event
            event(new BookingCreated($booking));

            Log::info('Booking created successfully', [
                'booking_number' => $booking->booking_number,
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'user_id' => $user?->id ?? 0,
                'total_amount' => $booking->total_amount,
            ]);

            return $booking->load(['property', 'user', 'payments']);
        }, 5); // Retry up to 5 times for deadlock resolution
    }

    /**
     * Validate property availability for given dates
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @return bool
     */
    private function validatePropertyAvailability(Property $property, string $checkIn, string $checkOut): bool
    {
        return $property->isAvailableForDates($checkIn, $checkOut);
    }

    /**
     * Cancel a booking
     * 
     * @param Booking $booking
     * @param string $reason
     * @param User|null $user
     * @return bool
     */
    public function cancelBooking(Booking $booking, string $reason, ?User $user = null): bool
    {
        try {
            $success = $this->bookingRepository->updateBookingStatus(
                $booking, 
                'cancelled',
                "Cancelled by " . ($user?->name ?? 'Guest') . ": " . $reason
            );

            if ($success) {
                // Create workflow entry
                $booking->workflow()->create([
                    'step' => 'booking_cancelled',
                    'status' => 'completed',
                    'processed_by' => $user?->id ?? 0,
                    'processed_at' => now(),
                    'notes' => "Cancelled: {$reason}",
                ]);

                Log::info('Booking cancelled', [
                    'booking_number' => $booking->booking_number,
                    'reason' => $reason,
                    'cancelled_by' => $user?->id ?? 0,
                ]);
            }

            return $success;
        } catch (\Exception $e) {
            Log::error('Failed to cancel booking', [
                'booking_number' => $booking->booking_number,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get booking statistics
     */
    public function getBookingStatistics(Property $property, string $startDate, string $endDate): array
    {
        return $this->bookingRepository->getBookingStatistics($property, $startDate, $endDate);
    }

    /**
     * Get user bookings
     */
    public function getUserBookings(User $user): \Illuminate\Support\Collection
    {
        return $this->bookingRepository->findByUser($user->id);
    }

    /**
     * Find booking by number
     */
    public function findByBookingNumber(string $bookingNumber): ?Booking
    {
        return $this->bookingRepository->findByBookingNumber($bookingNumber);
    }

    /**
     * Get booked dates for property
     */
    public function getBookedDates(Property $property, string $startDate, string $endDate): array
    {
        return $this->bookingRepository->getBookedDatesInRange($property, $startDate, $endDate);
    }
} 