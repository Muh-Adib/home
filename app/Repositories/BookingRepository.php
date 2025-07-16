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
        
        return Booking::create([
            // Property and User Information
            'property_id' => $property->id,
            'user_id' => $userId,
            'booking_number' => $bookingNumber,
            
            // Guest Information
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
            
            // Dates and Times
            'check_in' => $request->checkInDate,
            'check_in_time' => $request->checkInTime,
            'check_out' => $request->checkOutDate,
            'nights' => $request->getNights(),
            
            // Rate Calculation Fields (will be updated by service)
            'base_amount' => 0,
            'weekend_premium_amount' => 0,
            'seasonal_premium_amount' => 0,
            'extra_bed_amount' => 0,
            'cleaning_fee' => 0,
            'tax_amount' => 0,
            'total_amount' => 0,
            'dp_amount' => 0,
            'remaining_amount' => 0,
            
            // Booking Status and Payment
            'booking_status' => $request->bookingStatus,
            'payment_status' => $request->paymentStatus,
            'dp_percentage' => $request->dpPercentage,
            'dp_deadline' => now()->addDays(3),
            
            // Additional Information
            'special_requests' => $request->specialRequests,
            'internal_notes' => $request->internalNotes,
        ]);
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
    //potensi error kehilangan data jika booking berada di akhir dan awal bulan lainnya
    public function getBookingsByDateRange(Property $property, string $startDate, string $endDate): Collection
    {
        return Booking::where('property_id', $property->id)
            ->where('booking_status', '!=', 'cancelled')
            ->where('check_in', '>=', $startDate)
            ->where('check_out', '<=', $endDate)
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
} 