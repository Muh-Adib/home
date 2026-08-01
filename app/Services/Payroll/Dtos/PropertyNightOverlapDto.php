<?php

declare(strict_types=1);

namespace App\Services\Payroll\Dtos;

class PropertyNightOverlapDto
{
    public function __construct(
        public int $propertyId,
        public string $propertyName,
        public string $location,
        public int $bookingCount,
        public int $occupiedNights,
        public int $bonusBooking,
        public int $bonusNight,
        public float $foBookingFund,
        public float $foNightFund,
        public float $hkBookingFund,
        public float $hkNightFund,
        public float $totalFoFund,
        public float $totalHkFund,
        public array $bookingsBreakdown = []
    ) {}

    public function toArray(): array
    {
        return [
            'property_id' => $this->propertyId,
            'property_name' => $this->propertyName,
            'location' => $this->location,
            'booking_count' => $this->bookingCount,
            'occupied_nights' => $this->occupiedNights,
            'bonus_booking' => $this->bonusBooking,
            'bonus_night' => $this->bonusNight,
            'fo_booking_fund' => $this->foBookingFund,
            'fo_night_fund' => $this->foNightFund,
            'hk_booking_fund' => $this->hkBookingFund,
            'hk_night_fund' => $this->hkNightFund,
            'total_fo_fund' => $this->totalFoFund,
            'total_hk_fund' => $this->totalHkFund,
            'bookings_breakdown' => $this->bookingsBreakdown,
        ];
    }
}
