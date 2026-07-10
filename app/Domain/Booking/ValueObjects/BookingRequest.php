<?php

namespace App\Domain\Booking\ValueObjects;

use Carbon\Carbon;

class BookingRequest
{
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
        public readonly ?string $guestPhoneAlternative,
        public readonly string $guestCountry,
        public readonly ?string $guestIdNumber,
        public readonly string $guestGender,
        public readonly string $relationshipType,

        // Booking Details
        public readonly ?string $specialRequests,
        public readonly ?string $internalNotes,
        public readonly string $bookingStatus,
        public readonly string $paymentStatus,
        public readonly int $dpPercentage,
        public readonly bool $autoConfirm = false,
        public readonly ?array $guests = [],
        public readonly bool $forceCapacityOverride = false,
        public readonly ?array $dailyExtraBeds = null,
        public readonly int $discountAmount = 0,
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
            'guest_phone_alternative' => $this->guestPhoneAlternative,
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
            'force_capacity_override' => $this->forceCapacityOverride,
            'daily_extra_beds' => $this->dailyExtraBeds,
            'discount_amount' => $this->discountAmount,
        ];
    }

    public static function fromArray(array $data): self
    {
        $required = ['property_id', 'check_in', 'check_out', 'guest_name', 'guest_email', 'guest_phone'];
        foreach ($required as $field) {
            if (! isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                throw new \InvalidArgumentException("Required field '{$field}' is missing or empty");
            }
        }

        $checkIn = $data['check_in'] ?? $data['check_in_date'] ?? null;
        $checkOut = $data['check_out'] ?? $data['check_out_date'] ?? null;
        $checkInTime = $data['check_in_time'] ?? '15:00';

        if (! $checkIn || ! $checkOut) {
            throw new \InvalidArgumentException('Check-in and check-out dates are required');
        }

        if (! strtotime($checkIn) || ! strtotime($checkOut)) {
            throw new \InvalidArgumentException('Invalid date format in check_in or check_out');
        }

        if (strtotime($checkIn) >= strtotime($checkOut)) {
            throw new \InvalidArgumentException('Check-out date must be after check-in date');
        }

        $guestMale = (int) ($data['guest_male'] ?? 0);
        $guestFemale = (int) ($data['guest_female'] ?? 0);
        $guestChildren = (int) ($data['guest_children'] ?? 0);
        $totalGuests = $guestMale + $guestFemale + $guestChildren;

        if ($totalGuests <= 0) {
            throw new \InvalidArgumentException('Total guest count must be greater than 0');
        }

        $guestCount = (int) ($data['guest_count'] ?? $totalGuests);

        return new self(
            propertyId: (int) $data['property_id'],
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
            guestPhoneAlternative: isset($data['guest_phone_alternative']) ? trim($data['guest_phone_alternative']) : null,
            guestCountry: $data['guest_country'] ?? 'Indonesia',
            guestIdNumber: $data['guest_id_number'] ?? null,
            guestGender: $data['guest_gender'] ?? 'male',
            relationshipType: $data['relationship_type'] ?? 'keluarga',
            guests: $data['guests'] ?? [],
            specialRequests: $data['special_requests'] ?? null,
            internalNotes: $data['internal_notes'] ?? null,
            bookingStatus: $data['booking_status'] ?? 'pending_verification',
            paymentStatus: $data['payment_status'] ?? 'dp_pending',
            dpPercentage: (int) ($data['dp_percentage'] ?? 50),
            autoConfirm: (bool) ($data['auto_confirm'] ?? false),
            forceCapacityOverride: (bool) ($data['force_capacity_override'] ?? false),
            dailyExtraBeds: $data['daily_extra_beds'] ?? null,
            discountAmount: (int) ($data['discount_amount'] ?? 0)
        );
    }
}
