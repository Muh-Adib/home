<?php

namespace App\Console\Commands;

use App\Events\PaymentCreated;
use App\Events\PaymentStatusChanged;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Console\Command;

class TestPaymentNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:payment-notifications';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test payment notification system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing Payment Notification System...');

        // Get test users
        $admin = User::where('role', 'super_admin')->first();
        $finance = User::where('role', 'finance')->first();
        $guest = User::where('role', 'guest')->first();

        if (!$admin || !$finance || !$guest) {
            $this->error('Test users not found. Please ensure you have super_admin, finance, and guest users.');
            $this->info('Available roles: ' . User::distinct()->pluck('role')->implode(', '));
            return 1;
        }

        // Get a test payment
        $payment = Payment::with('booking')->first();
        
        if (!$payment) {
            $this->error('No payment found for testing.');
            return 1;
        }

        $this->info("Using payment: {$payment->payment_number}");

        // Test PaymentCreated event
        $this->info('1. Testing PaymentCreated Event...');
        event(new PaymentCreated($payment, $admin));
        $this->info('✅ PaymentCreated event dispatched');

        // Test PaymentStatusChanged event
        $this->info('2. Testing PaymentStatusChanged Event...');
        event(new PaymentStatusChanged($payment, $admin, 'pending', 'verified'));
        $this->info('✅ PaymentStatusChanged event dispatched');

        // Check notification counts
        $this->info('3. Checking notification counts...');
        
        foreach ([$admin, $finance, $guest] as $user) {
            $totalNotifications = $user->notifications()->count();
            $unreadNotifications = $user->unreadNotifications()->count();
            $latestNotification = $user->notifications()->latest()->first();
            
            $this->info("User: {$user->name} ({$user->role})");
            $this->info("  - Total notifications: {$totalNotifications}");
            $this->info("  - Unread notifications: {$unreadNotifications}");
            
            if ($latestNotification) {
                $this->info("  - Latest: " . get_class($latestNotification) . " at " . $latestNotification->created_at);
                $this->info("  - Data: " . json_encode($latestNotification->data));
                $this->info("  - Read at: " . ($latestNotification->read_at ?? 'NULL'));
            }
            $this->info('');
        }

        // Check queue status
        $this->info('4. Checking queue status...');
        $pendingJobs = \Queue::size('default');
        $this->info("Pending jobs in queue: {$pendingJobs}");

        $this->info('✅ Payment notification test completed!');
        return 0;
    }
} 