<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingPaymentPhasesTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function guest_payment_page_shows_dp_amount_for_unpaid_booking(): void
    {
        $property = Property::factory()->create([
            'base_rate' => 1000000,
        ]);

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
            'dp_percentage' => 50,
            'dp_amount' => 500000,
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
        ]);

        $response = $this->get(route('payments.create', $booking->booking_number));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->where('pendingAmount', 500000)
            ->where('paymentType', 'dp')
        );
    }

    #[Test]
    public function guest_payment_page_shows_remaining_amount_after_dp_paid(): void
    {
        $property = Property::factory()->create([
            'base_rate' => 1000000,
        ]);

        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
            'dp_percentage' => 50,
            'dp_amount' => 500000,
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_received',
        ]);

        $paymentMethod = PaymentMethod::factory()->create();

        // Create verified DP payment
        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 500000,
            'payment_type' => 'dp',
            'payment_status' => 'verified',
            'status' => 'disetujui',
            'payment_method_id' => $paymentMethod->id,
        ]);

        $response = $this->get(route('payments.create', $booking->booking_number));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->where('pendingAmount', 500000)
            ->where('paymentType', 'remaining')
        );
    }

    #[Test]
    public function admin_store_payment_attaches_proof_to_attachment_path_column(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
        ]);

        $paymentMethod = PaymentMethod::factory()->create();
        $file = UploadedFile::fake()->image('receipt.jpg');

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/booking-management/bookings/{$booking->booking_number}/payments", [
                'payment_method_id' => $paymentMethod->id,
                'amount' => 500000,
                'payment_type' => 'dp',
                'payment_status' => 'verified',
                'payment_date' => now()->toDateString(),
                'proof_of_payment' => $file,
            ]);

        $response->assertStatus(200);

        // Verify the payment record has the file path in attachment_path (not proof_of_payment)
        $payment = Payment::first();
        $this->assertNotNull($payment->attachment_path);
        $this->assertStringContainsString('payment-proofs/', $payment->attachment_path);
    }
}
