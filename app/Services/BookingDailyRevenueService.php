<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Property;
use Carbon\Carbon;

/**
 * Service untuk mengelola daily revenue breakdown booking.
 *
 * Bertanggung jawab untuk sync revenue harian berdasarkan:
 * - Rate calculation breakdown (dari RateCalculationService)
 * - Manual override yang didistribusikan merata per malam
 */
class BookingDailyRevenueService
{
    /**
     * Sync daily revenue from rate calculation breakdown.
     */
    public function syncFromRateBreakdown(Booking $booking, Property $property, object $rateCalculation): void
    {
        // Hapus existing daily revenues
        $booking->dailyRevenues()->delete();

        // Jika tidak ada breakdown, skip
        if (! isset($rateCalculation->breakdown['daily_breakdown'])) {
            return;
        }

        $dailyBreakdown = $rateCalculation->breakdown['daily_breakdown'];
        $nights = count($dailyBreakdown);

        if ($nights <= 0) {
            return;
        }

        // Get the booking discount to distribute evenly across nights
        $totalDiscount = (int) ($booking->discount_amount ?? 0);
        $dailyDiscountBase = (int) floor($totalDiscount / $nights);
        $remainderDiscount = $totalDiscount - ($dailyDiscountBase * $nights);

        $i = 0;
        // Create daily revenue dari breakdown
        foreach ($dailyBreakdown as $date => $dailyData) {
            $baseAmount = $dailyData['base_rate'] ?? $property->base_rate ?? 0;
            $finalRate = $dailyData['final_rate'] ?? $baseAmount;

            $weekendPremium = 0;
            $seasonalPremium = 0;
            $rateType = 'base';
            $rateName = null;

            if (isset($dailyData['premiums']) && is_array($dailyData['premiums'])) {
                foreach ($dailyData['premiums'] as $premium) {
                    if ($premium['type'] === 'weekend') {
                        $weekendPremium = $premium['amount'] ?? 0;
                        $rateType = 'weekend';
                    } elseif ($premium['type'] === 'holiday') {
                        $rateType = 'holiday';
                    } elseif ($premium['type'] === 'seasonal') {
                        $seasonalPremium = $premium['amount'] ?? 0;
                        $rateType = 'seasonal';
                        $rateName = $premium['name'] ?? null;
                    }
                }
            }

            if (isset($dailyData['seasonal_rate']) && $dailyData['seasonal_rate']) {
                $rateType = 'seasonal';
                $rateName = $dailyData['seasonal_rate']['name'] ?? null;
            }

            $extraBedAmount = $dailyData['extra_bed_rate'] ?? 0;
            $extraBedCount = $dailyData['extra_bed_count'] ?? 0;
            $extraBedTotal = $extraBedCount * $extraBedAmount;

            $dayName = $dailyData['day_name'] ?? '';
            $isWeekend = in_array($dayName, ['Friday', 'Saturday', 'Sunday']);

            // Calculate daily discount to subtract
            $currentDailyDiscount = $dailyDiscountBase;
            if ($i < $remainderDiscount) {
                $currentDailyDiscount += 1;
            }

            // Daily amount includes lodging rate + extra beds - distributed discount
            $dailyAmount = ($finalRate + $extraBedTotal) - $currentDailyDiscount;

            BookingDailyRevenue::create([
                'booking_id' => $booking->id,
                'property_id' => $property->id,
                'tanggal' => $dailyData['date'],
                'amount' => $dailyAmount,
                'base_amount' => $baseAmount,
                'weekend_premium' => $weekendPremium,
                'seasonal_premium' => $seasonalPremium,
                'extra_bed_amount' => $extraBedTotal,
                'extra_bed_count' => $extraBedCount,
                'rate_type' => $rateType,
                'rate_name' => $rateName,
                'is_weekend' => $isWeekend,
            ]);

            $i++;
        }
    }

    /**
     * Sync daily revenue by distributing amount evenly across nights.
     *
     * Digunakan untuk manual rate override dimana tidak ada breakdown detail.
     */
    public function syncEvenlyDistributed(
        Booking $booking,
        Property $property,
        string $checkIn,
        string $checkOut,
        float $totalAmount
    ): void {
        // Hapus existing daily revenues
        $booking->dailyRevenues()->delete();

        // Hitung jumlah malam
        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));

        // Jika tidak ada malam (same day checkout?), skip
        if ($nights <= 0) {
            return;
        }

        // Distribusi amount merata per malam menggunakan pembagian sisa presisi Rupiah
        $dailyAmountBase = (int) floor($totalAmount / $nights);
        $remainder = (int) ($totalAmount - ($dailyAmountBase * $nights));
        $startDate = Carbon::parse($checkIn);

        for ($i = 0; $i < $nights; $i++) {
            $currentDailyAmount = $dailyAmountBase;
            if ($i < $remainder) {
                $currentDailyAmount += 1;
            }

            BookingDailyRevenue::create([
                'booking_id' => $booking->id,
                'property_id' => $property->id,
                'tanggal' => $startDate->copy()->addDays($i)->format('Y-m-d'),
                'amount' => $currentDailyAmount,
                'base_amount' => $currentDailyAmount,
            ]);
        }
    }
}
