<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Service untuk mengelola daily revenue breakdown booking.
 *
 * Bertanggung jawab untuk sync revenue harian berdasarkan:
 * - Rate calculation breakdown (dari RateCalculationService)
 * - Manual override yang didistribusikan merata per malam
 */
class BookingDailyRevenueService
{
    public function __construct(
        private RateCalculationService $rateCalculationService
    ) {}

    /**
     * Sync daily revenue from rate calculation breakdown.
     */
    public function syncFromRateBreakdown(Booking $booking, Property $property, object $rateCalculation): void
    {
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

        $totalCalculated = 0;
        $items = [];
        $i = 0;

        // Collect daily revenues from breakdown first
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
            $totalCalculated += $dailyAmount;

            $items[] = [
                'tanggal' => $dailyData['date'] ?? $date,
                'amount' => $dailyAmount,
                'base_amount' => $baseAmount,
                'weekend_premium' => $weekendPremium,
                'seasonal_premium' => $seasonalPremium,
                'extra_bed_amount' => $extraBedTotal,
                'extra_bed_count' => $extraBedCount,
                'rate_type' => $rateType,
                'rate_name' => $rateName,
                'is_weekend' => $isWeekend,
            ];

            $i++;
        }

        // Scale to match target amount: actual verified payments for cancelled bookings, or booking total amount for active bookings
        $totalPaid = (float) $booking->getTotalPaidAmount();
        $targetAmount = $booking->booking_status === 'cancelled' ? $totalPaid : (float) $booking->total_amount;
        $scaleFactor = $totalCalculated > 0 ? ($targetAmount / $totalCalculated) : 0;

        DB::transaction(function () use ($booking, $property, $items, $scaleFactor) {
            // Hapus existing daily revenues
            $booking->dailyRevenues()->delete();

            foreach ($items as $item) {
                BookingDailyRevenue::create([
                    'booking_id' => $booking->id,
                    'property_id' => $property->id,
                    'tanggal' => $item['tanggal'],
                    'amount' => (int) round($item['amount'] * $scaleFactor),
                    'base_amount' => $item['base_amount'],
                    'weekend_premium' => $item['weekend_premium'],
                    'seasonal_premium' => $item['seasonal_premium'],
                    'extra_bed_amount' => $item['extra_bed_amount'],
                    'extra_bed_count' => $item['extra_bed_count'],
                    'rate_type' => $item['rate_type'],
                    'rate_name' => $item['rate_name'],
                    'is_weekend' => $item['is_weekend'],
                ]);
            }
        });
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
        // Hitung jumlah malam
        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));

        // Jika tidak ada malam (same day checkout?), skip
        if ($nights <= 0) {
            return;
        }

        // Scale target amount based on cancellation status
        $totalPaid = (float) $booking->getTotalPaidAmount();
        $targetAmount = $booking->booking_status === 'cancelled' ? $totalPaid : $totalAmount;

        // Distribusi amount merata per malam menggunakan pembagian sisa presisi Rupiah
        $dailyAmountBase = (int) floor($targetAmount / $nights);
        $remainder = (int) ($targetAmount - ($dailyAmountBase * $nights));
        $startDate = Carbon::parse($checkIn);

        DB::transaction(function () use ($booking, $property, $nights, $dailyAmountBase, $remainder, $startDate) {
            // Hapus existing daily revenues
            $booking->dailyRevenues()->delete();

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
        });
    }

    /**
     * Unify, calculate and sync daily revenue for a single booking based on its status and paid amount.
     */
    public function syncBookingRevenue(Booking $booking): void
    {
        $booking->loadMissing('property');
        $property = $booking->property;
        if (! $property) {
            return;
        }

        $totalPaid = (float) $booking->getTotalPaidAmount();
        $targetAmount = $booking->booking_status === 'cancelled' ? $totalPaid : (float) $booking->total_amount;

        // Check if we have existing daily revenues in database
        $existingRevenues = $booking->dailyRevenues()->get();

        if ($existingRevenues->isNotEmpty()) {
            $totalCalculated = (float) $existingRevenues->sum('amount');
            $scaleFactor = $totalCalculated > 0 ? ($targetAmount / $totalCalculated) : 0;

            DB::transaction(function () use ($existingRevenues, $scaleFactor) {
                foreach ($existingRevenues as $rev) {
                    $rev->update([
                        'amount' => (int) round($rev->amount * $scaleFactor),
                    ]);
                }
            });

            return;
        }

        // Fallback: If no existing records, calculate them from scratch
        $checkIn = Carbon::parse($booking->check_in);
        $checkOut = Carbon::parse($booking->check_out);

        // Get seasonal rates for the period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $property->id,
            $checkIn,
            $checkOut
        );

        $nights = $booking->nights;

        // Get guest count and calculate extra beds using single source of truth
        $guestCount = $booking->guest_count;
        $extraBeds = RateCalculationService::calculateExtraBedCount($guestCount, $property->capacity);

        // Fetch dynamic extra bed services
        $extraBedServices = $booking->services()
            ->where('service_type', 'extra_bed')
            ->get();

        // Get the booking discount to distribute evenly across nights
        $totalDiscount = (float) ($booking->discount_amount ?? 0);
        $dailyDiscountBase = $nights > 0 ? (int) floor($totalDiscount / $nights) : 0;
        $remainderDiscount = $nights > 0 ? (int) ($totalDiscount - ($dailyDiscountBase * $nights)) : 0;

        // Get seasonal rates day by day
        $revenueData = [];
        $totalCalculated = 0;
        $i = 0;

        for ($date = $checkIn->copy(); $date->lt($checkOut); $date->addDay()) {
            $dateString = $date->format('Y-m-d');
            $isWeekend = $date->isFriday() || $date->isSaturday() || $date->isSunday();

            $baseAmount = $property->base_rate;
            $weekendPremium = 0;
            $seasonalPremium = 0;
            $rateType = 'base';
            $rateName = null;

            // Check for seasonal rate
            $seasonalRate = $seasonalRates[$dateString] ?? null;

            if ($seasonalRate) {
                // Seasonal rate applies - no weekend premium
                $calculatedRate = $seasonalRate->calculateRate($property->base_rate);
                $seasonalPremium = $calculatedRate - $property->base_rate;
                $rateType = 'seasonal';
                $rateName = $seasonalRate->name;
            } elseif ($isWeekend) {
                // Weekend premium applies
                if ($property->weekend_premium_type === 'fixed' && $property->weekend_premium_fixed) {
                    $weekendPremium = $property->weekend_premium_fixed;
                } else {
                    $weekendPremium = $property->base_rate * ($property->weekend_premium_percent / 100);
                }
                $rateType = 'weekend';
            }

            // Calculate extra bed for this day dynamically
            $dayExtraBeds = null;
            $effectiveExtraBedRate = null;

            // 1. Look for service on this specific date
            $dateService = $extraBedServices->first(function ($s) use ($dateString) {
                return $s->service_date && $s->service_date->format('Y-m-d') === $dateString;
            });

            if ($dateService) {
                $dayExtraBeds = (int) $dateService->quantity;
                $effectiveExtraBedRate = (float) $dateService->unit_price;
            } else {
                // 2. Fall back to generic/no-date extra_bed service
                $genericService = $extraBedServices->first(function ($s) {
                    return is_null($s->service_date);
                });

                if ($genericService) {
                    $dayExtraBeds = (int) $genericService->quantity;
                    $effectiveExtraBedRate = (float) $genericService->unit_price;
                }
            }

            // 3. Fallback to booking level columns or static calculation
            if (is_null($dayExtraBeds)) {
                $dayExtraBeds = $booking->extra_bed_count !== null ? (int) $booking->extra_bed_count : $extraBeds;
                $effectiveExtraBedRate = RateCalculationService::calculateEffectiveExtraBedRate($property, $seasonalRate);
            }

            $extraBedAmount = $dayExtraBeds * $effectiveExtraBedRate;

            // Calculate current daily discount
            $currentDailyDiscount = $dailyDiscountBase;
            if ($i < $remainderDiscount) {
                $currentDailyDiscount += 1;
            }

            // Total amount for the day includes lodging + extra beds - distributed discount
            $dayAmount = ($baseAmount + $weekendPremium + $seasonalPremium + $extraBedAmount) - $currentDailyDiscount;
            $totalCalculated += $dayAmount;

            $revenueData[] = [
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tanggal' => $dateString,
                'amount' => $dayAmount,
                'base_amount' => $baseAmount,
                'weekend_premium' => $weekendPremium,
                'seasonal_premium' => $seasonalPremium,
                'extra_bed_amount' => $extraBedAmount,
                'extra_bed_count' => $dayExtraBeds,
                'rate_type' => $rateType,
                'rate_name' => $rateName,
                'is_weekend' => $isWeekend,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $i++;
        }

        // Scale to match target amount: actual verified payments for cancelled bookings, or booking total amount for active bookings
        $scaleFactor = $totalCalculated > 0 ? ($targetAmount / $totalCalculated) : 0;

        foreach ($revenueData as $key => $data) {
            $revenueData[$key]['amount'] = (int) round($data['amount'] * $scaleFactor);
        }

        // Use transaction for data integrity
        DB::transaction(function () use ($booking, $revenueData) {
            // Delete existing records
            BookingDailyRevenue::where('booking_id', $booking->id)->delete();

            // Insert new records
            if (! empty($revenueData)) {
                BookingDailyRevenue::insert($revenueData);
            }
        });
    }
}
