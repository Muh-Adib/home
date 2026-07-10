<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\BankMutation;
use App\Models\Booking;
use App\Models\BookingWorkflow;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_process_successful_moota_payment_webhook()
    {
        // 1. Setup configuration and dependencies
        config(['moota.webhook_secret' => 'super-secret-key-123']);

        $guest = User::factory()->create([
            'email' => 'guest@example.com',
        ]);

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
            'booking_number' => 'BK-MOOTA-777',
            'created_by' => $guest->id,
            'guest_email' => $guest->email,
            'property_id' => $property->id,
            'total_amount' => 500000,
            'payment_status' => 'unpaid',
        ]);

        $paymentMethod = PaymentMethod::create([
            'name' => 'Bank Transfer',
            'code' => 'bank_transfer',
            'type' => 'bank_transfer',
            'is_active' => true,
        ]);

        // Create pending payment request with unique code
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'payment_method_id' => $paymentMethod->id,
            'payment_number' => 'PAY-MOOTA-777',
            'amount' => 500000,
            'payment_type' => 'dp',
            'payment_method' => 'bank_transfer',
            'payment_status' => 'pending',
            'status' => 'menunggu',
            'unique_code' => 123,
            'expected_amount' => 500123,
            'payment_date' => now(),
        ]);

        // 2. Prepare Moota Webhook Payload
        $payload = [
            [
                'mutation_id' => 'mut-moota-abc-123',
                'amount' => 500123,
                'type' => 'CR', // Credit (incoming)
                'description' => 'TRSF E-BANKING CR 07/08 12345 SENDER NAME',
                'date' => now()->format('Y-m-d H:i:s'),
                'account_number' => '1234567890',
            ],
        ];

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', $payloadJson, 'super-secret-key-123');

        // 3. Post to webhook endpoint
        $response = $this->withHeaders([
            'Signature' => $signature,
        ])->postJson('/payment-gateway/moota/webhook', $payload);

        // 4. Assert responses and database assertions
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Processed 1 credit mutations.',
        ]);

        // Assert BankMutation was created
        $this->assertDatabaseHas('bank_mutations', [
            'external_ref' => 'mut-moota-abc-123',
            'amount' => 500123,
            'bank_account_id' => $bankAccount->id,
            'status' => 'cocok',
        ]);

        // Assert Payment status was verified and matched to the mutation
        $payment->refresh();
        $this->assertEquals('verified', $payment->payment_status);
        $this->assertEquals('cocok', $payment->status);
        $this->assertNotNull($payment->matched_mutation_id);

        // Assert Booking was updated to fully paid / confirmed
        $booking->refresh();
        $this->assertEquals('fully_paid', $booking->payment_status);
        $this->assertEquals('confirmed', $booking->booking_status);

        // Assert BookingWorkflow entry was logged
        $this->assertDatabaseHas('booking_workflow', [
            'booking_id' => $booking->id,
            'step' => 'payment_verified',
            'status' => 'completed',
            'processed_by' => null, // Automated by Moota/Reconciliation
        ]);
    }
}
