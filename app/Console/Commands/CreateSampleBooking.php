<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Property;
use App\Models\Booking;
use Carbon\Carbon;

class CreateSampleBooking extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'booking:create-sample';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create sample booking for testing payment flow';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $property = Property::first();
        
        if (!$property) {
            $this->error('No property found. Please run property seeder first.');
            return;
        }

        // Check if sample booking already exists
        $existingBooking = Booking::where('booking_number', 'LIKE', 'BKG-' . date('Ymd') . '%')->first();
        if ($existingBooking) {
            $this->info('Sample booking already exists: ' . $existingBooking->booking_number);
            $this->info('Payment URL: /booking/' . $existingBooking->booking_number . '/payment');
            return;
        }

        $booking = Booking::create([
            'property_id' => $property->id,
            'booking_number' => 'BKG-' . date('Ymd') . '-0001',
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '+6281234567890',
            'guest_count' => 3,
            'guest_male' => 2,
            'guest_female' => 1,
            'guest_children' => 0,
            'relationship_type' => 'teman',
            'check_in' => Carbon::tomorrow(),
            'check_out' => Carbon::tomorrow()->addDays(2),
            'nights' => 2,
            'base_amount' => 500000,
            'extra_bed_amount' => 100000,
            'service_amount' => 0,
            'total_amount' => 600000,
            'dp_percentage' => 30,
            'dp_amount' => 180000,
            'remaining_amount' => 420000,
            'dp_deadline' => Carbon::tomorrow()->addDays(1),
            'booking_status' => 'confirmed', // Ready for payment
            'payment_status' => 'dp_pending',
            'verification_status' => 'approved',
            'special_requests' => 'Early check-in if possible',
        ]);

        $this->info('✅ Sample booking created successfully!');
        $this->info('Booking Number: ' . $booking->booking_number);
        $this->info('Property: ' . $property->name);
        $this->info('Guest: ' . $booking->guest_name);
        $this->info('DP Amount: Rp ' . number_format($booking->dp_amount));
        $this->info('');
        $this->info('🔗 Test URLs:');
        $this->info('Booking Confirmation: /booking/' . $booking->id . '/confirmation');
        $this->info('Payment Form: /booking/' . $booking->booking_number . '/payment');
        $this->info('');
        $this->info('💡 The booking status is "confirmed" so payment button should be available.');
    }
}
