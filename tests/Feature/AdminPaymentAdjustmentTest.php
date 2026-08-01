<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use App\Services\PaymentGatewayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminPaymentAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_it_saves_destination_bank_details_on_guest_payment_submission()
    {
        $guest = User::factory()->create(['email' => 'guest@example.com']);

        $bankAccount = BankAccount::create([
            'bank_name' => 'Mandiri',
            'account_number' => '1370500743444',
            'account_holder' => 'Indah Arini Puspitasari',
            'label' => 'Mandiri Rekening Utama',
        ]);

        $property = Property::factory()->create([
            'bank_account_id' => $bankAccount->id,
        ]);

        $booking = Booking::factory()->create([
            'booking_number' => 'BK-111',
            'guest_email' => $guest->email,
            'property_id' => $property->id,
            'total_amount' => 500000,
            'payment_status' => 'unpaid',
        ]);

        $paymentMethod = PaymentMethod::create([
            'name' => 'Mandiri Transfer',
            'code' => 'bank_transfer',
            'type' => 'bank_transfer',
            'is_active' => true,
        ]);

        $bankAccount->update(['payment_method_id' => $paymentMethod->id]);

        $proofFile = UploadedFile::fake()->image('receipt.png');

        // Create initial pending payment via gateway service (server-generated unique code)
        $gatewayService = app(PaymentGatewayService::class);
        $pendingPayment = $gatewayService->initiateGatewayPayment($booking, 250000, 'dp');

        // Submit guest payment
        $response = $this->actingAs($guest)->post(route('payments.store', $booking->booking_number), [
            'payment_method_id' => $paymentMethod->id,
            'amount' => 250000,
            'proof_of_payment' => $proofFile,
            'payment_notes' => 'Tamu kirim dp',
        ]);

        $response->assertSessionHasNoErrors();

        // Assert payment record has correct destination bank details and preserved unique code
        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'unique_code' => $pendingPayment->unique_code,
            'bank_name' => 'Mandiri',
            'account_number' => '1370500743444',
            'account_name' => 'Indah Arini Puspitasari',
        ]);
    }

    public function test_it_saves_destination_bank_details_on_secure_payment_submission()
    {
        $guest = User::factory()->create(['email' => 'guest@example.com']);

        $bankAccount = BankAccount::create([
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_holder' => 'Homs Partner',
            'label' => 'BCA Rekening Utama',
        ]);

        $property = Property::factory()->create([
            'bank_account_id' => $bankAccount->id,
        ]);

        $booking = Booking::factory()->create([
            'booking_number' => 'BK-222',
            'guest_email' => $guest->email,
            'property_id' => $property->id,
            'total_amount' => 600000,
            'payment_status' => 'unpaid',
        ]);

        $token = $booking->generatePaymentToken();

        $paymentMethod = PaymentMethod::create([
            'name' => 'BCA Transfer',
            'code' => 'bank_transfer',
            'type' => 'bank_transfer',
            'is_active' => true,
        ]);

        $bankAccount->update(['payment_method_id' => $paymentMethod->id]);

        $proofFile = UploadedFile::fake()->image('receipt2.png');

        // Create initial pending payment via gateway service (server-generated unique code)
        $gatewayService = app(PaymentGatewayService::class);
        $pendingPayment = $gatewayService->initiateGatewayPayment($booking, 300000, 'dp');

        // Submit via secure token link
        $response = $this->actingAs($guest)->post(route('booking.secure-payment.store', [$booking->booking_number, $token]), [
            'payment_method_id' => $paymentMethod->id,
            'amount' => 300000,
            'proof_of_payment' => $proofFile,
            'payment_notes' => 'Tamu kirim dp secure link',
        ]);

        $response->assertSessionHasNoErrors();

        // Assert payment record has correct destination bank details and preserved unique code
        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'unique_code' => $pendingPayment->unique_code,
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_name' => 'Homs Partner',
        ]);
    }

    public function test_admin_can_verify_and_adjust_payment_with_unique_code()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);

        $property = Property::factory()->create();
        $booking = Booking::factory()->create([
            'booking_number' => 'BK-333',
            'property_id' => $property->id,
            'total_amount' => 500000,
            'payment_status' => 'unpaid',
        ]);

        $paymentMethod = PaymentMethod::create([
            'name' => 'BCA Transfer',
            'code' => 'bank_transfer',
            'type' => 'bank_transfer',
            'is_active' => true,
        ]);

        // Creating a payment that already has a unique code
        // Amount = 500123 (Base = 500000, Unique = 123)
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'payment_method_id' => $paymentMethod->id,
            'payment_number' => 'PAY-333',
            'amount' => 500123,
            'payment_type' => 'full',
            'payment_method' => 'bank_transfer',
            'payment_status' => 'pending',
            'status' => 'menunggu',
            'unique_code' => 123,
            'expected_amount' => 500123,
            'payment_date' => now(),
        ]);

        // 1. Admin verifies without changing unique code
        // This shouldn't throw "Payment amount exceeds pending amount" even though 500123 > 500000
        $response = $this->actingAs($admin)->put("/admin/payments/{$payment->payment_number}", [
            'payment_method_id' => $paymentMethod->id,
            'amount' => 500123,
            'unique_code' => 123,
            'payment_type' => 'full',
            'payment_status' => 'verified',
            'payment_date' => now()->toDateString(),
        ]);

        $response->assertSessionHasNoErrors();

        $payment->refresh();
        $this->assertEquals('verified', $payment->payment_status);
        $this->assertEquals(500123, $payment->amount);
        $this->assertEquals(123, $payment->unique_code);

        // 2. Admin adjusts unique code to 0 (zeroed out)
        $response2 = $this->actingAs($admin)->put("/admin/payments/{$payment->payment_number}", [
            'payment_method_id' => $paymentMethod->id,
            'amount' => 500000,
            'unique_code' => 0,
            'payment_type' => 'full',
            'payment_status' => 'verified',
            'payment_date' => now()->toDateString(),
        ]);

        $response2->assertSessionHasNoErrors();

        $payment->refresh();
        $this->assertEquals(500000, $payment->amount);
        $this->assertEquals(0, $payment->unique_code);
    }
}
