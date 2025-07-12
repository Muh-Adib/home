<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Booking;
use App\Models\Payment;
use App\Events\BookingCreated;
use App\Events\BookingStatusChanged;
use App\Events\PaymentCreated;

class TestNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:notifications';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test notification system for BookingCreated, PaymentCreated, and BookingStatusChanged';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing Notification System...');

        // Get test user
        $user = User::first();
        if (!$user) {
            $this->error('No users found in database');
            return;
        }

        // Test 1: BookingCreated Event
        $this->info('1. Testing BookingCreated Event...');
        $booking = Booking::with('property')->first();
        if ($booking) {
            event(new BookingCreated($booking, $user));
            $this->info('✅ BookingCreated event dispatched');
        } else {
            $this->warn('⚠️ No bookings found for testing');
        }

        // Test 2: PaymentCreated Event  
        $this->info('2. Testing PaymentCreated Event...');
        $payment = Payment::with('booking.property')->first();
        if ($payment) {
            event(new PaymentCreated($payment, $user));
            $this->info('✅ PaymentCreated event dispatched');
        } else {
            $this->warn('⚠️ No payments found for testing');
        }

        // Test 3: BookingStatusChanged Event
        $this->info('3. Testing BookingStatusChanged Event...');
        if ($booking) {
            event(new BookingStatusChanged($booking, 'pending_verification', 'confirmed', $user));
            $this->info('✅ BookingStatusChanged event dispatched');
        }

        // Check notification count
        $this->info('4. Checking notification counts...');
        $adminUsers = User::whereIn('role', ['super_admin', 'property_manager', 'front_desk', 'finance'])->get();
        
        foreach ($adminUsers as $admin) {
            $count = $admin->notifications()->count();
            $recent = $admin->notifications()->latest()->first();
            
            $this->info("User: {$admin->name} ({$admin->role})");
            $this->info("  - Total notifications: {$count}");
            if ($recent) {
                $this->info("  - Latest: {$recent->type} at {$recent->created_at}");
                
                // Debug: Show notification data structure
                $this->info("  - Data structure:");
                $this->info("    * ID: {$recent->id}");
                $this->info("    * Type: {$recent->type}");
                $this->info("    * Data: " . json_encode($recent->data));
                $this->info("    * Read at: " . ($recent->read_at ?? 'NULL'));
            }
        }

        // Check if queue is working
        $this->info('5. Checking queue status...');
        $pendingJobs = \DB::table('jobs')->count();
        $this->info("Pending jobs in queue: {$pendingJobs}");

        if ($pendingJobs > 0) {
            $this->warn('⚠️ There are pending jobs. Run: php artisan queue:work');
        }

        $this->info('✅ Notification test completed!');
    }
}
