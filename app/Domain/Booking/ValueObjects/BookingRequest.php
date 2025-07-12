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

    public function getEffectiveGuestCount(): float
    {
        // Children count as 0.5 for extra bed calculation
        return $this->guestMale + $this->guestFemale + ($this->guestChildren * 0.5);
    }

    public function toArray(): array
    {
        return [
            // Property Information
            'property_id' => $this->propertyId,
            
            // Dates and Times
            'check_in_date' => $this->checkInDate,
            'check_out_date' => $this->checkOutDate,
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
        return new self(
            // Property Information
            propertyId: $data['property_id'],
            
            // Dates and Times
            checkInDate: $data['check_in_date'],
            checkOutDate: $data['check_out_date'],
            checkInTime: $data['check_in_time'],
            
            // Guest Information
            guestCount: $data['guest_count'] ?? ($data['guest_male'] + $data['guest_female'] + $data['guest_children']),
            guestMale: $data['guest_male'],
            guestFemale: $data['guest_female'],
            guestChildren: $data['guest_children'],
            guestName: $data['guest_name'],
            guestEmail: $data['guest_email'],
            guestPhone: $data['guest_phone'],
            guestCountry: $data['guest_country'],
            guestIdNumber: $data['guest_id_number'] ?? null,
            guestGender: $data['guest_gender'],
            relationshipType: $data['relationship_type'],
            
            // Booking Details
            specialRequests: $data['special_requests'] ?? null,
            internalNotes: $data['internal_notes'] ?? null,
            bookingStatus: $data['booking_status'] ?? 'pending_verification',
            paymentStatus: $data['payment_status'] ?? 'dp_pending',
            dpPercentage: $data['dp_percentage'] ?? 50,
            autoConfirm: $data['auto_confirm'] ?? false
        );
    }
} 