<?php

namespace App\Services;

use App\Models\Property;
use App\Domain\Booking\ValueObjects\RateCalculation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RateCalculationService
{
    public function __construct(
        private AvailabilityService $availabilityService
    ) {}

    /**
     * Calculate rate for property and dates
     */
    public function calculateRate(Property $property, string $checkIn, string $checkOut, int $guestCount): RateCalculation
    {
        // Check availability first
        $availability = $this->availabilityService->checkAvailability($property, $checkIn, $checkOut);
        
        if (!$availability['available']) {
            throw new \Exception('Property tidak tersedia untuk tanggal yang dipilih');
        }

        // Calculate nights
        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));
        
        // Calculate base amount
        $baseAmount = $this->calculateBaseAmount($property, $checkIn, $checkOut, $nights);
        
        // Calculate weekend premium
        $weekendPremium = $this->calculateWeekendPremium($property, $checkIn, $checkOut, $baseAmount);
        
        // Calculate seasonal premium
        $seasonalPremium = $this->calculateSeasonalPremium($property, $checkIn, $checkOut, $nights);
        
        // Calculate extra beds
        $extraBeds = $this->calculateExtraBeds($property, $guestCount);
        $extraBedAmount = $extraBeds * $property->extra_bed_rate * $nights;
        
        // Cleaning fee
        $cleaningFee = $property->cleaning_fee;
        
        // Calculate subtotal
        $subtotal = $baseAmount + $weekendPremium + $seasonalPremium + $extraBedAmount + $cleaningFee;
        
        // Calculate tax (11%)
        $taxAmount = $subtotal * 0.11;
        
        // Calculate total
        $totalAmount = $subtotal + $taxAmount;

        return new RateCalculation(
            nights: $nights,
            baseAmount: $baseAmount,
            weekendPremium: $weekendPremium,
            seasonalPremium: $seasonalPremium,
            extraBedAmount: $extraBedAmount,
            cleaningFee: $cleaningFee,
            taxAmount: $taxAmount,
            totalAmount: $totalAmount,
            extraBeds: $extraBeds,
            breakdown: $this->getBreakdown($property, $checkIn, $checkOut),
            seasonalRatesApplied: $this->getSeasonalRatesApplied($property, $checkIn, $checkOut)
        );
    }

    /**
     * Calculate base amount for the entire period
     */
    private function calculateBaseAmount(Property $property, string $checkIn, string $checkOut, int $nights): float
    {
        $baseAmount = 0;
        $currentDate = Carbon::parse($checkIn);
        $endDate = Carbon::parse($checkOut);

        while ($currentDate->lt($endDate)) {
            $dateStr = $currentDate->format('Y-m-d');
            
            // Get daily rate (base rate + any seasonal adjustments)
            $dailyRate = $this->getDailyRate($property, $dateStr);
            $baseAmount += $dailyRate;
            
            $currentDate->addDay();
        }

        return $baseAmount;
    }

    /**
     * Calculate weekend premium
     */
    private function calculateWeekendPremium(Property $property, string $checkIn, string $checkOut, float $baseAmount): float
    {
        $weekendPremium = 0;
        $currentDate = Carbon::parse($checkIn);
        $endDate = Carbon::parse($checkOut);

        while ($currentDate->lt($endDate)) {
            if ($currentDate->isWeekend()) {
                $dailyBaseRate = $this->getDailyRate($property, $currentDate->format('Y-m-d'));
                $premiumAmount = $dailyBaseRate * ($property->weekend_premium_percent / 100);
                $weekendPremium += $premiumAmount;
            }
            
            $currentDate->addDay();
        }

        return $weekendPremium;
    }

    /**
     * Calculate seasonal premium
     */
    private function calculateSeasonalPremium(Property $property, string $checkIn, string $checkOut, int $nights): float
    {
        $seasonalPremium = 0;
        $currentDate = Carbon::parse($checkIn);
        $endDate = Carbon::parse($checkOut);

        while ($currentDate->lt($endDate)) {
            $dateStr = $currentDate->format('Y-m-d');
            $seasonalRate = $this->getSeasonalRate($property, $dateStr);
            
            if ($seasonalRate) {
                $seasonalPremium += $seasonalRate['premium_amount'];
            }
            
            $currentDate->addDay();
        }

        return $seasonalPremium;
    }

    /**
     * Calculate extra beds needed
     */
    private function calculateExtraBeds(Property $property, int $guestCount): int
    {
        $effectiveGuestCount = $guestCount; // Children count as full guests for extra bed calculation
        return max(0, $effectiveGuestCount - $property->capacity);
    }

    /**
     * Get daily rate for specific date
     */
    private function getDailyRate(Property $property, string $date): float
    {
        // Check for seasonal rates first
        $seasonalRate = $this->getSeasonalRate($property, $date);
        
        if ($seasonalRate) {
            return $seasonalRate['rate'];
        }

        return $property->base_rate;
    }

    /**
     * Get seasonal rate for specific date
     */
    private function getSeasonalRate(Property $property, string $date): ?array
    {
        // This would integrate with your seasonal rates system
        // For now, return null (no seasonal rate)
        return null;
    }

    /**
     * Get rate breakdown for detailed analysis
     */
    private function getBreakdown(Property $property, string $checkIn, string $checkOut): array
    {
        $currentDate = Carbon::parse($checkIn);
        $endDate = Carbon::parse($checkOut);
        $breakdown = [];

        while ($currentDate->lt($endDate)) {
            $dateStr = $currentDate->format('Y-m-d');
            $breakdown[$dateStr] = [
                'base_rate' => $this->getDailyRate($property, $dateStr),
                'is_weekend' => $currentDate->isWeekend(),
                'weekend_premium' => $currentDate->isWeekend() ? $property->weekend_premium_percent : 0,
                'seasonal_rate' => $this->getSeasonalRate($property, $dateStr),
            ];
            
            $currentDate->addDay();
        }

        return $breakdown;
    }

    /**
     * Get seasonal rates applied during the period
     */
    private function getSeasonalRatesApplied(Property $property, string $checkIn, string $checkOut): array
    {
        // This would return the seasonal rates that were applied
        // For now, return empty array
        return [];
    }

    /**
     * Calculate rate with formatted response for API
     */
    public function calculateRateFormatted(Property $property, string $checkIn, string $checkOut, int $guestCount): array
    {
        try {
            $calculation = $this->calculateRate($property, $checkIn, $checkOut, $guestCount);
            
            return [
                'success' => true,
                'calculation' => $calculation->toArray(),
                'property_id' => $property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_count' => $guestCount,
            ];
        } catch (\Exception $e) {
            Log::error('Rate calculation failed', [
                'property_id' => $property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_count' => $guestCount,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error_type' => 'calculation',
                'message' => $e->getMessage(),
                'property_id' => $property->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guest_count' => $guestCount,
            ];
        }
    }
} 