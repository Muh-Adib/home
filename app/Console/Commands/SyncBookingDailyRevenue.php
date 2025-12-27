<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Services\RateCalculationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncBookingDailyRevenue extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'booking:sync-daily-revenue 
                            {--booking= : Sync specific booking by ID}
                            {--property= : Sync all bookings for a property}
                            {--from= : Start date for sync (Y-m-d)}
                            {--to= : End date for sync (Y-m-d)}
                            {--force : Force recalculate even if data exists}';

    /**
     * The console command description.
     */
    protected $description = 'Sync booking daily revenue with detailed breakdown (base, weekend, seasonal)';

    public function __construct(
        private RateCalculationService $rateCalculationService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting booking daily revenue sync...');

        $query = Booking::query()
            ->whereIn('booking_status', ['confirmed', 'checked_in', 'completed'])
            ->with('property');

        // Apply filters
        if ($bookingId = $this->option('booking')) {
            $query->where('id', $bookingId);
        }

        if ($propertyId = $this->option('property')) {
            $query->where('property_id', $propertyId);
        }

        if ($from = $this->option('from')) {
            $query->where('check_in', '>=', $from);
        }

        if ($to = $this->option('to')) {
            $query->where('check_out', '<=', $to);
        }

        $bookings = $query->get();
        $this->info("Found {$bookings->count()} bookings to process.");

        $bar = $this->output->createProgressBar($bookings->count());
        $bar->start();

        $synced = 0;
        $errors = 0;

        foreach ($bookings as $booking) {
            try {
                $this->syncBookingRevenue($booking);
                $synced++;
            } catch (\Exception $e) {
                $errors++;
                Log::error("Failed to sync booking {$booking->id}: {$e->getMessage()}");
                $this->error("\nFailed to sync booking {$booking->id}: {$e->getMessage()}");
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Sync complete! Synced: {$synced}, Errors: {$errors}");

        return Command::SUCCESS;
    }

    /**
     * Sync daily revenue for a single booking
     */
    private function syncBookingRevenue(Booking $booking): void
    {
        $property = $booking->property;
        if (!$property) {
            throw new \Exception("Property not found for booking {$booking->id}");
        }

        $checkIn = Carbon::parse($booking->check_in);
        $checkOut = Carbon::parse($booking->check_out);

        // Get seasonal rates for the period
        $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
            $property->id,
            $checkIn,
            $checkOut
        );

        // Calculate extra beds
        $extraBeds = max(0, $booking->guest_count - $property->capacity);
        
        // Process day by day
        $revenueData = [];
        $totalCalculated = 0;

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
            
            // Calculate extra bed for this day
            $effectiveExtraBedRate = $property->extra_bed_rate;
            if ($seasonalRate && $seasonalRate->extra_bed_rate !== null) {
                $effectiveExtraBedRate = $seasonalRate->extra_bed_rate;
            }
            $extraBedAmount = $extraBeds * $effectiveExtraBedRate;
            
            // Total amount for the day
            $dayAmount = $baseAmount + $weekendPremium + $seasonalPremium + $extraBedAmount;
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
                'rate_type' => $rateType,
                'rate_name' => $rateName,
                'is_weekend' => $isWeekend,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Use transaction for data integrity
        DB::transaction(function () use ($booking, $revenueData) {
            // Delete existing records
            BookingDailyRevenue::where('booking_id', $booking->id)->delete();
            
            // Insert new records
            if (!empty($revenueData)) {
                BookingDailyRevenue::insert($revenueData);
            }
        });
    }
}
