<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\BookingDailyRevenueService;
use App\Services\RateCalculationService;
use Illuminate\Console\Command;
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
            ->confirmedBookings()
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
        app(BookingDailyRevenueService::class)->syncBookingRevenue($booking);
    }
}
