<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Property;
use App\Models\Booking;
use App\Models\User;
use App\Http\Controllers\Admin\BookingManagementController;
use App\Notifications\GuestWelcomeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

class BugFixTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that Property::getNextCheckIn() method exists and works
     */
    public function test_property_get_next_checkin_method_exists()
    {
        // Create a property
        $property = Property::factory()->create();
        
        // Create a future booking
        $futureBooking = Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => now()->addDays(3),
            'guest_name' => 'John Doe',
            'booking_status' => 'confirmed'
        ]);
        
        // Test the method
        $nextCheckIn = $property->getNextCheckIn();
        
        $this->assertNotNull($nextCheckIn);
        $this->assertEquals($futureBooking->check_in->toDateString(), 
                           \Carbon\Carbon::parse($nextCheckIn['check_in'])->toDateString());
        $this->assertEquals('John Doe', $nextCheckIn['guest_name']);
    }

    /**
     * Test that Property::getNextCheckIn() returns null when no future bookings
     */
    public function test_property_get_next_checkin_returns_null_when_no_future_bookings()
    {
        $property = Property::factory()->create();
        
        // Create only past bookings
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => now()->subDays(3),
            'booking_status' => 'confirmed'
        ]);
        
        $nextCheckIn = $property->getNextCheckIn();
        
        $this->assertNull($nextCheckIn);
    }

    /**
     * Test that WhatsApp message generation uses correct user identification
     */
    public function test_whatsapp_message_uses_correct_user_identification()
    {
        // Create a guest user
        $guestUser = User::factory()->create([
            'email' => 'guest@example.com',
            'role' => 'guest',
            'created_at' => now()->subMinutes(30) // Recently created
        ]);
        
        // Create a booking
        $booking = Booking::factory()->create([
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+6281234567890',
            'payment_status' => 'pending'
        ]);
        
        $controller = new BookingManagementController();
        
        // Use reflection to access private method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('generateWhatsAppMessage');
        $method->setAccessible(true);
        
        $result = $method->invoke($controller, $booking);
        
        // Verify the message contains login info for new user
        $this->assertStringContainsString('Akun Login Anda:', $result['message']);
        $this->assertStringContainsString($guestUser->email, $result['message']);
        $this->assertEquals('+6281234567890', $result['phone']);
        $this->assertTrue($result['can_send']);
    }

    /**
     * Test that WhatsApp message handles existing users correctly
     */
    public function test_whatsapp_message_handles_existing_users_correctly()
    {
        // Create an existing user (created more than 1 hour ago)
        $existingUser = User::factory()->create([
            'email' => 'existing@example.com',
            'role' => 'guest',
            'created_at' => now()->subDays(5)
        ]);
        
        $booking = Booking::factory()->create([
            'guest_email' => 'existing@example.com',
            'guest_phone' => '+6281234567890',
            'payment_status' => 'fully_paid'
        ]);
        
        $controller = new BookingManagementController();
        
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('generateWhatsAppMessage');
        $method->setAccessible(true);
        
        $result = $method->invoke($controller, $booking);
        
        // Verify the message contains dashboard access info for existing user
        $this->assertStringContainsString('Akses Dashboard:', $result['message']);
        $this->assertStringContainsString($existingUser->email, $result['message']);
        $this->assertStringNotContainsString('_Cek email Anda untuk password login_', $result['message']);
    }

    /**
     * Test that new user creation sends welcome notification
     */
    public function test_new_user_creation_sends_welcome_notification()
    {
        Notification::fake();
        
        // Simulate booking data for new user
        $bookingData = [
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '+6281234567890',
        ];
        
        // Use reflection to test private method
        $controller = new \App\Http\Controllers\BookingController();
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('createOrFindUser');
        $method->setAccessible(true);
        
        $user = $method->invoke($controller, $bookingData);
        
        // Verify user was created
        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('jane@example.com', $user->email);
        $this->assertEquals('guest', $user->role);
        
        // Verify notification was sent
        Notification::assertSentTo($user, GuestWelcomeNotification::class);
    }

    /**
     * Test that existing user is found and updated
     */
    public function test_existing_user_is_found_and_updated()
    {
        // Create existing user without phone
        $existingUser = User::factory()->create([
            'email' => 'existing@example.com',
            'phone' => null,
        ]);
        
        $bookingData = [
            'guest_name' => 'Jane Doe',
            'guest_email' => 'existing@example.com',
            'guest_phone' => '+6281234567890',
        ];
        
        $controller = new \App\Http\Controllers\BookingController();
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('createOrFindUser');
        $method->setAccessible(true);
        
        $user = $method->invoke($controller, $bookingData);
        
        // Verify same user was returned with updated phone
        $this->assertEquals($existingUser->id, $user->id);
        $this->assertEquals('+6281234567890', $user->phone);
    }
}