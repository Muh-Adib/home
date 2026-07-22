<?php

namespace Tests\Unit;

use App\Actions\User\EnsureGuestUserAction;
use App\Http\Controllers\Admin\BookingManagementController;
use App\Models\BankAccount;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Property;
use App\Models\User;
use App\Services\ReconciliationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

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
            'booking_status' => 'confirmed',
        ]);

        // Test the method
        $nextCheckIn = $property->getNextCheckIn();

        $this->assertNotNull($nextCheckIn);
        $this->assertEquals($futureBooking->check_in->toDateString(),
            Carbon::parse($nextCheckIn['check_in'])->toDateString());
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
            'booking_status' => 'confirmed',
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
            'created_at' => now()->subMinutes(30), // Recently created
        ]);

        // Create a booking
        $booking = Booking::factory()->create([
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+6281234567890',
            'payment_status' => 'pending',
        ]);

        $controller = app(BookingManagementController::class);

        // Use reflection to access private method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('generateWhatsAppMessage');
        $method->setAccessible(true);

        $result = $method->invoke($controller, $booking);

        // Verify the message contains login info for new user
        $this->assertStringContainsString('Akun Login Anda:', $result['message']);
        $this->assertStringContainsString($guestUser->email, $result['message']);
        $this->assertEquals('6281234567890', $result['phone']);
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
            'created_at' => now()->subDays(5),
        ]);

        $booking = Booking::factory()->create([
            'guest_email' => 'existing@example.com',
            'guest_phone' => '+6281234567890',
            'payment_status' => 'fully_paid',
        ]);

        $controller = app(BookingManagementController::class);

        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('generateWhatsAppMessage');
        $method->setAccessible(true);

        $result = $method->invoke($controller, $booking);

        // Verify the message contains dashboard access info for existing user
        $this->assertStringContainsString('Akses Dashboard:', $result['message']);
        $this->assertStringContainsString($existingUser->email, $result['message']);
        $this->assertStringNotContainsString('_Cek email Anda untuk password login_', $result['message']);
    }

    public function test_new_user_creation_sends_welcome_notification()
    {
        // Simulate booking data for new user
        $bookingData = [
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '+6281234567890',
        ];

        $action = app(EnsureGuestUserAction::class);
        $user = $action->execute($bookingData);

        // Verify user was created
        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('jane@example.com', $user->email);
        $this->assertEquals('guest', $user->role);
    }

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

        $action = app(EnsureGuestUserAction::class);
        $user = $action->execute($bookingData);

        // Verify same user was returned with updated phone
        $this->assertEquals($existingUser->id, $user->id);
        $this->assertEquals('+6281234567890', $user->phone);
    }

    /**
     * Test unique code generation randomness, uniqueness, and constraints (1-300).
     */
    public function test_generate_unique_code_randomness_and_uniqueness()
    {
        // 1. Create a bank account & property
        $bankAccount = BankAccount::create([
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_holder' => 'Homs Partner',
            'label' => 'BCA Rekening Utama',
        ]);
        $property = Property::factory()->create([
            'bank_account_id' => $bankAccount->id,
        ]);

        // 2. Generate a code
        $code = ReconciliationService::generateUniqueCode($bankAccount->id, 100000);
        $this->assertGreaterThanOrEqual(1, $code);
        $this->assertLessThanOrEqual(300, $code);

        // 3. Create a pending payment with this code
        $booking1 = Booking::factory()->create([
            'property_id' => $property->id,
        ]);
        $payment1 = Payment::create([
            'booking_id' => $booking1->id,
            'amount' => 100000 + $code,
            'expected_amount' => 100000 + $code,
            'payment_type' => 'dp',
            'payment_method' => 'bank_transfer',
            'payment_status' => 'pending',
            'status' => 'menunggu',
            'unique_code' => $code,
            'payment_date' => now(),
        ]);

        // 4. Generate another code for the same bank account - it must not be the first code
        $code2 = ReconciliationService::generateUniqueCode($bankAccount->id, 100000);
        $this->assertNotEquals($code, $code2);
        $this->assertGreaterThanOrEqual(1, $code2);
        $this->assertLessThanOrEqual(300, $code2);

        // 5. Create a verified payment with the second code
        $booking2 = Booking::factory()->create([
            'property_id' => $property->id,
        ]);
        $payment2 = Payment::create([
            'booking_id' => $booking2->id,
            'amount' => 100000 + $code2,
            'expected_amount' => 100000 + $code2,
            'payment_type' => 'dp',
            'payment_method' => 'bank_transfer',
            'payment_status' => 'verified',
            'status' => 'cocok',
            'unique_code' => $code2,
            'payment_date' => now(),
        ]);

        // 6. Generate a third code - it must not be either the first or the second code
        $code3 = ReconciliationService::generateUniqueCode($bankAccount->id, 100000);
        $this->assertNotEquals($code, $code3);
        $this->assertNotEquals($code2, $code3);
        $this->assertGreaterThanOrEqual(1, $code3);
        $this->assertLessThanOrEqual(300, $code3);
    }
}
