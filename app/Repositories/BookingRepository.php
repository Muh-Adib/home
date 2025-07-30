<?php

namespace App\Repositories;

use App\Models\Booking;
use App\Models\Property;
use App\Domain\Booking\ValueObjects\BookingRequest;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class BookingRepository
{
    public function create(BookingRequest $request, Property $property, int $userId): Booking
    {
        $bookingNumber = $this->generateBookingNumber();
        
        // ✅ FIX: Better field mapping and validation
        $bookingData = [
            'property_id' => $property->id,
            'user_id' => $userId,
            'booking_number' => $bookingNumber,
            'guest_name' => $request->guestName,
            'guest_email' => $request->guestEmail,
            'guest_phone' => $request->guestPhone,
            'guest_country' => $request->guestCountry,
            'guest_id_number' => $request->guestIdNumber,
            'guest_gender' => $request->guestGender,
            'guest_count' => $request->guestCount,
            'guest_male' => $request->guestMale,
            'guest_female' => $request->guestFemale,
            'guest_children' => $request->guestChildren,
            'relationship_type' => $request->relationshipType,
            'check_in' => $request->checkInDate,
            'check_in_time' => $request->checkInTime,
            'check_out' => $request->checkOutDate,
            'nights' => $request->getNights(),
            
            // ✅ FIX: Better rate calculation field mapping
            'rate_calculation' => $request->rateCalculation,
            'base_amount' => $request->rateCalculation['baseAmount'] ?? $request->rateCalculation['base_amount'] ?? 0,
            'weekend_premium_amount' => $request->rateCalculation['weekendPremium'] ?? $request->rateCalculation['weekend_premium'] ?? 0,
            'seasonal_premium_amount' => $request->rateCalculation['seasonalPremium'] ?? $request->rateCalculation['seasonal_premium'] ?? 0,
            'extra_bed_amount' => $request->rateCalculation['extraBedAmount'] ?? $request->rateCalculation['extra_bed_amount'] ?? 0,
            'cleaning_fee' => $request->rateCalculation['cleaningFee'] ?? $request->rateCalculation['cleaning_fee'] ?? 0,
            'tax_amount' => $request->rateCalculation['taxAmount'] ?? $request->rateCalculation['tax_amount'] ?? 0,
            'total_amount' => $request->totalAmount,
            
            'dp_amount' => ($request->totalAmount * $request->dpPercentage) / 100,
            'remaining_amount' => $request->totalAmount - (($request->totalAmount * $request->dpPercentage) / 100),
            'booking_status' => $request->bookingStatus,
            'payment_status' => $request->paymentStatus,
            'dp_percentage' => $request->dpPercentage,
            'dp_deadline' => now()->addDays(3),
            'special_requests' => $request->specialRequests,
            'internal_notes' => $request->internalNotes,
        ];

        // ✅ FIX: Add logging for debugging
        \Illuminate\Support\Facades\Log::info('Creating booking', [
            'booking_number' => $bookingNumber,
            'property_id' => $property->id,
            'user_id' => $userId,
            'guest_name' => $request->guestName,
            'guest_email' => $request->guestEmail,
            'check_in' => $request->checkInDate,
            'check_out' => $request->checkOutDate,
            'check_in_time' => $request->checkInTime,
            'total_amount' => $request->totalAmount,
        ]);

        // Create the booking
        $booking = Booking::create($bookingData);

        // ✅ Save booking guests to booking_guests table
        $this->saveBookingGuests($booking, $request->guests);

        return $booking;
    }

    public function update(Booking $booking, BookingRequest $request, Property $property): Booking
    {
        $booking->update([
            'property_id' => $property->id,
            'guest_name' => $request->guestName,
            'guest_email' => $request->guestEmail,
            'guest_phone' => $request->guestPhone,
            'guest_country' => $request->guestCountry,
            'guest_id_number' => $request->guestIdNumber,
            'guest_gender' => $request->guestGender,
            'guest_count' => $request->guestCount,
            'guest_male' => $request->guestMale,
            'guest_female' => $request->guestFemale,
            'guest_children' => $request->guestChildren,
            'relationship_type' => $request->relationshipType,
            'check_in' => $request->checkInDate,
            'check_in_time' => $request->checkInTime,
            'check_out' => $request->checkOutDate,
            'nights' => $request->getNights(),
            // Rate Calculation Fields
            'rate_calculation' => $request->rateCalculation,
            'base_amount' => $request->rateCalculation['baseAmount'] ?? 0,
            'weekend_premium_amount' => $request->rateCalculation['weekendPremium'] ?? 0,
            'seasonal_premium_amount' => $request->rateCalculation['seasonalPremium'] ?? 0,
            'extra_bed_amount' => $request->rateCalculation['extraBedAmount'] ?? 0,
            'cleaning_fee' => $request->rateCalculation['cleaningFee'] ?? 0,
            'tax_amount' => $request->rateCalculation['taxAmount'] ?? 0,
            'total_amount' => $request->totalAmount,
            'booking_status' => $request->bookingStatus,
            'payment_status' => $request->paymentStatus,
            'dp_percentage' => $request->dpPercentage,
            'special_requests' => $request->specialRequests,
            'internal_notes' => $request->internalNotes,
        ]);

        // ✅ Update booking guests
        $this->updateBookingGuests($booking, $request->guests);

        return $booking->fresh();
    }

    public function findByBookingNumber(string $bookingNumber): ?Booking
    {
        return Booking::where('booking_number', $bookingNumber)->first();
    }

    public function findByUser(int $userId): Collection
    {
        return Booking::where('user_id', $userId)
            ->with(['property', 'payments'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getUserBookings(\App\Models\User $user): Collection
    {
        return Booking::where('user_id', $user->id)
            ->with(['property', 'payments'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findOverlappingBookings(Property $property, string $checkIn, string $checkOut): Collection
    {
        return Booking::where('property_id', $property->id)
            ->where('booking_status', '!=', 'cancelled')
            ->where(function ($query) use ($checkIn, $checkOut) {
                $query->where(function ($q) use ($checkIn, $checkOut) {
                    $q->where('check_in', '<', $checkOut)
                      ->where('check_out', '>', $checkIn);
                });
            })
            ->get();
    }

    public function getBookedDatesInRange(Property $property, string $startDate, string $endDate): array
    {
        $bookings = $this->findOverlappingBookings($property, $startDate, $endDate);
        $bookedDates = [];

        foreach ($bookings as $booking) {
            $checkIn = Carbon::parse($booking->check_in);
            $checkOut = Carbon::parse($booking->check_out);
            
            $current = $checkIn->copy();
            while ($current->lt($checkOut)) {
                $bookedDates[] = $current->format('Y-m-d');
                $current->addDay();
            }
        }

        return array_unique($bookedDates);
    }
    //✅ FIXED: Correct logic for overlapping bookings in date range
    public function getBookingsByDateRange(Property $property, string $startDate, string $endDate): Collection
    {
        return Booking::where('property_id', $property->id)
            ->where('booking_status', '!=', 'cancelled')
            ->where(function ($query) use ($startDate, $endDate) {
                // ✅ CORRECT LOGIC: Booking overlaps with date range
                $query->where(function ($q) use ($startDate, $endDate) {
                    // Check-in is within range OR check-out is within range OR booking spans entire range
                    $q->whereBetween('check_in', [$startDate, $endDate])
                      ->orWhereBetween('check_out', [$startDate, $endDate])
                      ->orWhere(function ($q2) use ($startDate, $endDate) {
                          $q2->where('check_in', '<=', $startDate)
                             ->where('check_out', '>=', $endDate);
                      });
                });
            })
            ->with(['user', 'payments'])
            ->get();
    }

    public function updateBookingStatus(Booking $booking, string $status, ?string $notes = null): bool
    {
        return $booking->update([
            'booking_status' => $status,
            'internal_notes' => $notes ? $booking->internal_notes . "\n" . $notes : $booking->internal_notes
        ]);
    }

    public function updatePaymentStatus(Booking $booking, string $status): bool
    {
        return $booking->update(['payment_status' => $status]);
    }

    private function generateBookingNumber(): string
    {
        $date = now()->format('Ymd');
        $count = Booking::whereDate('created_at', today())->count() + 1;
        
        return 'BK' . $date . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    public function getBookingStatistics(Property $property, string $startDate, string $endDate): array
    {
        $bookings = $this->getBookingsByDateRange($property, $startDate, $endDate);
        
        return [
            'total_bookings' => $bookings->count(),
            'total_revenue' => $bookings->sum('total_amount'),
            'average_booking_value' => $bookings->avg('total_amount'),
            'confirmed_bookings' => $bookings->where('booking_status', 'confirmed')->count(),
            'pending_bookings' => $bookings->where('booking_status', 'pending_verification')->count(),
            'cancelled_bookings' => $bookings->where('booking_status', 'cancelled')->count(),
        ];
    }

    /**
     * Save booking guests to booking_guests table
     */
    private function saveBookingGuests(Booking $booking, ?array $guests): void
    {
        if (empty($guests)) {
            return;
        }

        $guestData = [];
        foreach ($guests as $guest) {
            $guestData[] = [
                'booking_id' => $booking->id,
                'guest_type' => $guest['guest_type'] ?? 'additional',
                'full_name' => $guest['full_name'] ?? '',
                'phone' => $guest['phone'] ?? null,
                'email' => $guest['email'] ?? null,
                'gender' => $guest['gender'] ?? null,
                'age_category' => $guest['age_category'] ?? 'adult',
                'relationship_to_primary' => $guest['relationship_to_primary'] ?? null,
                'emergency_contact_name' => $guest['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $guest['emergency_contact_phone'] ?? null,
                'notes' => $guest['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($guestData)) {
            \App\Models\BookingGuest::insert($guestData);
        }
    }

    /**
     * Update booking guests (delete existing and create new)
     */
    private function updateBookingGuests(Booking $booking, ?array $guests): void
    {
        // Delete existing guests
        $booking->guests()->delete();
        
        // Save new guests
        $this->saveBookingGuests($booking, $guests);
    }
} 