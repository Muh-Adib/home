<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PaymentMethodManagementTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function deleting_payment_method_with_no_payments_succeeds(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $paymentMethod = PaymentMethod::factory()->create();

        $response = $this->actingAs($admin)
            ->delete(route('admin.payment-methods.destroy', $paymentMethod));

        $response->assertRedirect(route('admin.payment-methods.index'));
        $this->assertModelMissing($paymentMethod);
    }

    #[Test]
    public function deleting_payment_method_with_payments_fails_without_replacement(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $paymentMethod = PaymentMethod::factory()->create();

        $booking = Booking::factory()->create();
        Payment::factory()->create([
            'booking_id' => $booking->id,
            'payment_method_id' => $paymentMethod->id,
        ]);

        $response = $this->actingAs($admin)
            ->delete(route('admin.payment-methods.destroy', $paymentMethod));

        $response->assertSessionHasErrors(['replacement_method_id']);
        $this->assertDatabaseHas('payment_methods', ['id' => $paymentMethod->id]);
    }

    #[Test]
    public function deleting_payment_method_with_payments_succeeds_and_reroutes_payments_with_replacement(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $methodToDelete = PaymentMethod::factory()->create(['name' => 'Old Bank']);
        $replacementMethod = PaymentMethod::factory()->create(['name' => 'New Bank']);

        $booking = Booking::factory()->create();
        $payment1 = Payment::factory()->create([
            'booking_id' => $booking->id,
            'payment_method_id' => $methodToDelete->id,
        ]);
        $payment2 = Payment::factory()->create([
            'booking_id' => $booking->id,
            'payment_method_id' => $methodToDelete->id,
        ]);

        $response = $this->actingAs($admin)
            ->delete(route('admin.payment-methods.destroy', $methodToDelete), [
                'replacement_method_id' => $replacementMethod->id,
            ]);

        $response->assertRedirect(route('admin.payment-methods.index'));
        $this->assertModelMissing($methodToDelete);

        // Verify payments have been updated to the replacement method
        $this->assertEquals($replacementMethod->id, $payment1->fresh()->payment_method_id);
        $this->assertEquals($replacementMethod->id, $payment2->fresh()->payment_method_id);
    }
}
