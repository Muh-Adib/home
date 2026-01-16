<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\Property;
use App\Models\BookingDailyRevenue;
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
     * 
     * @param Booking $booking
     * @param Property $property
     * @param object $rateCalculation
     * @return void
     */
    public function syncFromRateBreakdown(Booking $booking, Property $property, object $rateCalculation): void
    {
        // Hapus existing daily revenues
        $booking->dailyRevenues()->delete();
        
        // Jika tidak ada breakdown, skip
        if (!isset($rateCalculation->breakdown['daily_breakdown'])) {
            return;
        }
        
        // Create daily revenue dari breakdown
        foreach ($rateCalculation->breakdown['daily_breakdown'] as $date => $dailyData) {
            BookingDailyRevenue::create([
                'booking_id' => $booking->id,
                'property_id' => $property->id,
                'tanggal' => $dailyData['date'],
                'amount' => $dailyData['final_rate'],
            ]);
        }
    }

    /**
     * Sync daily revenue by distributing amount evenly across nights.
     * 
     * Digunakan untuk manual rate override dimana tidak ada breakdown detail.
     * 
     * @param Booking $booking
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @param float $totalAmount
     * @return void
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
        
        // Distribusi amount merata per malam
        $dailyAmount = $totalAmount / $nights;
        $startDate = Carbon::parse($checkIn);
        
        for ($i = 0; $i < $nights; $i++) {
            BookingDailyRevenue::create([
                'booking_id' => $booking->id,
                'property_id' => $property->id,
                'tanggal' => $startDate->copy()->addDays($i)->format('Y-m-d'),
                'amount' => $dailyAmount,
            ]);
        }
    }
}
