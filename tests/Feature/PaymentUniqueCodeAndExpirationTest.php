<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Services\PaymentGatewayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class PaymentUniqueCodeAndExpirationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        PaymentMethod::create([
            'name' => 'Transfer Bank BCA',
            'code' => 'bca_transfer',
            'type' => 'bank_transfer',
            'is_active' => true,
        ]);
    }

    public function test_unique_code_is_generated_once_and_remains_permanent_on_reload_or_share(): void
    {
        $property = Property::factory()->create();

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
            'dp_amount' => 500000,
            'check_in' => now()->addDays(2)->toDateString(),
            'check_out' => now()->addDays(4)->toDateString(),
        ]);

        $gatewayService = app(PaymentGatewayService::class);
        $payment1 = $gatewayService->initiateGatewayPayment($booking, 500000, 'dp');

        $this->assertNotNull($payment1->unique_code);
        $code1 = $payment1->unique_code;

        // Re-call initiateGatewayPayment with same amount & type
        $payment2 = $gatewayService->initiateGatewayPayment($booking, 500000, 'dp');

        $this->assertEquals($payment1->id, $payment2->id);
        $this->assertEquals($code1, $payment2->unique_code);

        // Visiting payment page re-uses the same unique code
        $token = $booking->generatePaymentToken();
        $response = $this->get(route('payments.create', [$booking->booking_number, 'token' => $token]));
        $response->assertStatus(200);

        $activePayments = Payment::where('booking_id', $booking->id)
            ->where('status', 'menunggu')
            ->get();

        $this->assertCount(1, $activePayments);
        $this->assertEquals($code1, $activePayments->first()->unique_code);
    }

    public function test_only_one_active_pending_payment_request_allowed_per_booking(): void
    {
        $property = Property::factory()->create();

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 2000000,
            'dp_amount' => 1000000,
            'check_in' => now()->addDays(2)->toDateString(),
            'check_out' => now()->addDays(4)->toDateString(),
        ]);

        $gatewayService = app(PaymentGatewayService::class);

        // First request for DP (1.000.000)
        $p1 = $gatewayService->initiateGatewayPayment($booking, 1000000, 'dp');
        $this->assertEquals('menunggu', $p1->status);

        // Second request for Remaining (2.000.000)
        $p2 = $gatewayService->initiateGatewayPayment($booking, 2000000, 'remaining');
        $this->assertEquals('menunggu', $p2->status);

        // p1 should now be cancelled/batal
        $p1->refresh();
        $this->assertEquals('batal', $p1->status);
        $this->assertEquals('cancelled', $p1->payment_status);

        // Exactly 1 active pending payment request exists
        $activeCount = Payment::where('booking_id', $booking->id)
            ->where('status', 'menunggu')
            ->count();

        $this->assertEquals(1, $activeCount);
    }

    public function test_payment_link_inaccessible_after_checkout_plus_one_day(): void
    {
        $property = Property::factory()->create();

        // Checkout date was 3 days ago (checkout + 1 day is 2 days ago)
        $pastCheckout = now()->subDays(3)->toDateString();

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
            'dp_amount' => 500000,
            'check_in' => now()->subDays(5)->toDateString(),
            'check_out' => $pastCheckout,
        ]);

        $token = $booking->generatePaymentToken();

        // Public create page redirect with error for guest
        $responseCreate = $this->get(route('payments.create', [$booking->booking_number, 'token' => $token]));
        $responseCreate->assertRedirect(route('home'));
        $responseCreate->assertSessionHas('error');

        // Token validation check
        $this->assertFalse($booking->isPaymentTokenValid($token));
    }

    public function test_cancel_pending_allowed_for_guest_and_rejected_when_expired(): void
    {
        $property = Property::factory()->create();
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
            'dp_amount' => 500000,
            'check_out' => now()->addDays(3),
        ]);

        $gatewayService = app(PaymentGatewayService::class);
        $payment = $gatewayService->initiateGatewayPayment($booking, 500000, 'dp');

        // Guest (no auth) CAN cancel pending for non-expired booking
        $response = $this->post(route('payments.cancel-pending', $booking->booking_number));
        $response->assertRedirect();

        $payment->refresh();
        $this->assertEquals('batal', $payment->status);

        // Create another payment for expired booking test
        $expiredBooking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
            'dp_amount' => 500000,
            'check_out' => now()->addDays(3), // Create with valid checkout first
        ]);
        $expiredPayment = $gatewayService->initiateGatewayPayment($expiredBooking, 500000, 'dp');

        // Now backdate the checkout so the link is expired
        $expiredBooking->update(['check_out' => now()->subDays(5)]);

        // Expired booking → rejected
        $response = $this->post(route('payments.cancel-pending', $expiredBooking->booking_number));
        $response->assertRedirect(route('home'));

        $expiredPayment->refresh();
        $this->assertEquals('menunggu', $expiredPayment->status);
    }

    public function test_client_unique_code_input_is_ignored_by_server(): void
    {
        $property = Property::factory()->create();
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
            'dp_amount' => 500000,
            'check_in' => now()->addDays(2)->toDateString(),
            'check_out' => now()->addDays(4)->toDateString(),
        ]);

        $gatewayService = app(PaymentGatewayService::class);
        $payment = $gatewayService->initiateGatewayPayment($booking, 500000, 'dp');
        $serverUniqueCode = $payment->unique_code;

        $token = $booking->generatePaymentToken();

        // Attempt to pass malicious unique_code = 999 from client
        $this->post(route('booking.secure-payment.store', [$booking->booking_number, $token]), [
            'payment_method_id' => PaymentMethod::first()->id,
            'amount' => 500000,
            'unique_code' => 999,
            'proof_of_payment' => UploadedFile::fake()->create('proof.jpg', 100),
        ]);

        $payment->refresh();
        // Server MUST keep original server-generated unique code, NOT 999
        $this->assertEquals($serverUniqueCode, $payment->unique_code);
        $this->assertEquals(500000 + $serverUniqueCode, $payment->expected_amount);
    }
}
