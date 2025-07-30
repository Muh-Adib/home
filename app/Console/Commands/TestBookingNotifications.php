<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\User;
use App\Models\Property;
use App\Events\BookingCreated;
use Illuminate\Console\Command;

class TestBookingNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:booking-notifications {--user-id=} {--property-id=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test booking notifications for admin and staff users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧪 Testing Booking Notifications...');

        // Get or create test user
        $userId = $this->option('user-id');
        $user = $userId ? User::find($userId) : User::where('role', 'guest')->first();
        
        if (!$user) {
            $this->error('❌ No guest user found. Please create a guest user first.');
            return 1;
        }

        // Get or create test property
        $propertyId = $this->option('property-id');
        $property = $propertyId ? Property::find($propertyId) : Property::first();
        
        if (!$property) {
            $this->error('❌ No property found. Please create a property first.');
            return 1;
        }

        // Create test booking
        $booking = Booking::create([
            'booking_number' => 'TEST-' . time(),
            'property_id' => $property->id,
            'guest_name' => 'Test Guest',
            'guest_email' => 'test@example.com',
            'guest_phone' => '08123456789',
            'check_in' => now()->addDays(1),
            'check_out' => now()->addDays(3),
            'guest_count' => 2,
            'total_amount' => 500000,
            'booking_status' => 'pending',
            'created_by' => $user->id,
        ]);

        $this->info("✅ Created test booking: {$booking->booking_number}");

        // Get admin and staff users
        $adminUsers = User::whereIn('role', [
            'super_admin',
            'property_manager',
            'front_desk',
            'finance',
            'housekeeping'
        ])->where('status', 'active')->get();

        $this->info("📋 Found {$adminUsers->count()} admin/staff users:");

        foreach ($adminUsers as $adminUser) {
            $this->line("  - {$adminUser->name} ({$adminUser->role})");
        }

        // Trigger booking created event
        $this->info('🔔 Triggering BookingCreated event...');
        event(new BookingCreated($booking, $user));

        $this->info('✅ Booking notification test completed!');
        $this->info('📧 Check admin/staff notification panels for new notifications.');

        return 0;
    }
}