<?php

namespace App\Domain\Booking\ValueObjects;

use Carbon\Carbon;

class RateCalculation
{
    public function __construct(
        public readonly int $nights,
        public readonly float $baseAmount,
        public readonly float $weekendPremium,
        public readonly float $seasonalPremium,
        public readonly float $extraBedAmount,
        public readonly float $cleaningFee,
        public readonly float $taxAmount,
        public readonly float $totalAmount,
        public readonly int $extraBeds,
        public readonly array $breakdown = [],
        public readonly array $seasonalRatesApplied = []
    ) {}

    public function toArray(): array
    {
        return [
            'nights' => $this->nights,
            'base_amount' => $this->baseAmount,
            'weekend_premium' => $this->weekendPremium,
            'seasonal_premium' => $this->seasonalPremium,
            'extra_bed_amount' => $this->extraBedAmount,
            'cleaning_fee' => $this->cleaningFee,
            'tax_amount' => $this->taxAmount,
            'total_amount' => $this->totalAmount,
            'extra_beds' => $this->extraBeds,
            'breakdown' => $this->breakdown,
            'seasonal_rates_applied' => $this->seasonalRatesApplied,
            'formatted' => [
                'total_amount' => 'Rp ' . number_format($this->totalAmount, 0, ',', '.'),
                'per_night' => 'Rp ' . number_format($this->totalAmount / $this->nights, 0, ',', '.')
            ]
        ];
    }

    public function getSubtotal(): float
    {
        return $this->baseAmount + $this->weekendPremium + $this->seasonalPremium + $this->extraBedAmount + $this->cleaningFee;
    }

    public function getTaxPercentage(): float
    {
        return 11.0; // 11% tax
    }

    public function hasSeasonalRates(): bool
    {
        return $this->seasonalPremium > 0;
    }

    public function hasWeekendPremium(): bool
    {
        return $this->weekendPremium > 0;
    }

    public function requiresExtraBeds(): bool
    {
        return $this->extraBeds > 0;
    }
} 