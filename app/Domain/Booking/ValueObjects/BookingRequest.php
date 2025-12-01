<?php

namespace App\Domain\Booking\ValueObjects;

use Carbon\Carbon;

class BookingRequest
{
    public array $rateCalculation = [];
    public float $totalAmount = 0;

    public function __construct(
        // Property Information
        public readonly int $propertyId,
        
        // Dates and Times
        public readonly string $checkInDate,
        public readonly string $checkOutDate,
        public readonly string $checkInTime,
                
        // Guest Information
        public readonly int $guestCount,
        public readonly int $guestMale,
        public readonly int $guestFemale,
        public readonly int $guestChildren,
        public readonly string $guestName,
        public readonly string $guestEmail,
        public readonly string $guestPhone,
        public readonly string $guestCountry,
        public readonly ?string $guestIdNumber,
        public readonly string $guestGender,
        public readonly string $relationshipType,
        public readonly ?array $guests = [],

        // Booking Details
        public readonly ?string $specialRequests,
        public readonly ?string $internalNotes,
        public readonly string $bookingStatus,
        public readonly string $paymentStatus,
        public readonly int $dpPercentage,
        public readonly bool $autoConfirm
    ) {}

    public function getNights(): int
    {
        return Carbon::parse($this->checkInDate)->diffInDays(Carbon::parse($this->checkOutDate));
    }

    public function getTotalGuests(): int
    {
        return $this->guestMale + $this->guestFemale + $this->guestChildren;
    }

    public function getEffectiveGuestCount(int $capacity, int $capacityMax): int
    {
        // If capacity < capacityMax, apply special child logic (floor(children / 2))
        // Otherwise (capacity == capacityMax), children count as 1
        if ($capacity < $capacityMax) {
            return $this->guestMale + $this->guestFemale + (int) floor($this->guestChildren / 2);
        }

        return $this->guestMale + $this->guestFemale + $this->guestChildren;
    }

    public function toArray(): array
    {
        return [
            // Property Information
            'property_id' => $this->propertyId,
            
            // Dates and Times
            'check_in' => $this->checkInDate,
            'check_out' => $this->checkOutDate,
            'check_in_time' => $this->checkInTime,
            
            // Guest Information
            'guest_count' => $this->guestCount,
            'guest_male' => $this->guestMale,
            'guest_female' => $this->guestFemale,
            'guest_children' => $this->guestChildren,
            'guest_name' => $this->guestName,
            'guest_email' => $this->guestEmail,
            'guest_phone' => $this->guestPhone,
            'guest_country' => $this->guestCountry,
            'guest_id_number' => $this->guestIdNumber,
            'guest_gender' => $this->guestGender,
            'relationship_type' => $this->relationshipType,
            'guests' => $this->guests,

            // Booking Details
            'special_requests' => $this->specialRequests,
            'internal_notes' => $this->internalNotes,
            'booking_status' => $this->bookingStatus,
            'payment_status' => $this->paymentStatus,
            'dp_percentage' => $this->dpPercentage,
            'auto_confirm' => $this->autoConfirm,
        ];
    }

    public static function fromArray(array $data): self
    {
        // ✅ FIX: Better field mapping and validation
        $required = ['property_id', 'check_in', 'check_out', 'guest_name', 'guest_email', 'guest_phone'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                throw new \InvalidArgumentException("Required field '{$field}' is missing or empty");
            }
        }

        // ✅ FIX: Handle different field name variations
        $checkIn = $data['check_in'] ?? $data['check_in_date'] ?? null;
        $checkOut = $data['check_out'] ?? $data['check_out_date'] ?? null;
        $checkInTime = $data['check_in_time'] ?? '15:00';
        
        if (!$checkIn || !$checkOut) {
            throw new \InvalidArgumentException("Check-in and check-out dates are required");
        }

        // ✅ FIX: Validate dates
        if (!strtotime($checkIn) || !strtotime($checkOut)) {
            throw new \InvalidArgumentException("Invalid date format in check_in or check_out");
        }

        if (strtotime($checkIn) >= strtotime($checkOut)) {
            throw new \InvalidArgumentException("Check-out date must be after check-in date");
        }

        // ✅ FIX: Better guest count handling
        $guestMale = (int)($data['guest_male'] ?? 0);
        $guestFemale = (int)($data['guest_female'] ?? 0);
        $guestChildren = (int)($data['guest_children'] ?? 0);
        $totalGuests = $guestMale + $guestFemale + $guestChildren;
        
        if ($totalGuests <= 0) {
            throw new \InvalidArgumentException("Total guest count must be greater than 0");
        }

        // ✅ FIX: Use total guests if guest_count not provided
        $guestCount = (int)($data['guest_count'] ?? $totalGuests);

        return new self(
            propertyId: (int)$data['property_id'],
            checkInDate: $checkIn,
            checkOutDate: $checkOut,
            checkInTime: $checkInTime,
            guestCount: $guestCount,
            guestMale: $guestMale,
            guestFemale: $guestFemale,
            guestChildren: $guestChildren,
            guestName: trim($data['guest_name']),
            guestEmail: trim($data['guest_email']),
            guestPhone: trim($data['guest_phone']),
            guestCountry: $data['guest_country'] ?? 'Indonesia',
            guestIdNumber: $data['guest_id_number'] ?? null,
            guestGender: $data['guest_gender'] ?? 'male',
            relationshipType: $data['relationship_type'] ?? 'keluarga',
            guests: $data['guests'] ?? [],
            specialRequests: $data['special_requests'] ?? null,
            internalNotes: $data['internal_notes'] ?? null,
            bookingStatus: $data['booking_status'] ?? 'pending_verification',
            paymentStatus: $data['payment_status'] ?? 'dp_pending',
            dpPercentage: (int)($data['dp_percentage'] ?? 50),
            autoConfirm: (bool)($data['auto_confirm'] ?? false)
        );
    }

    public function setRateCalculation(array $rateCalculation): void
    {
        $this->rateCalculation = $rateCalculation;
    }

    public function setTotalAmount(float $totalAmount): void
    {
        $this->totalAmount = $totalAmount;
    }
} 