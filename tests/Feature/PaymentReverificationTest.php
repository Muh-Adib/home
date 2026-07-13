<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PaymentReverificationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function only_authorized_roles_can_reverify_payments(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $finance = User::factory()->create(['role' => 'finance']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $staff = User::factory()->create(['role' => 'front_desk']);
        $otherOwner = User::factory()->create(['role' => 'property_owner']);

        $property = Property::factory()->create(['owner_id' => $owner->id]);
        $booking = Booking::factory()->create(['property_id' => $property->id]);
        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'payment_status' => 'verified',
            'reverification_status' => 'pending',
        ]);

        // Front desk is not authorized -> 403
        $response = $this->actingAs($staff)
            ->patch(route('admin.payments.reverify-accept', $payment->payment_number));
        $response->assertStatus(403);

        // Another property owner is not authorized -> 403
        $response = $this->actingAs($otherOwner)
            ->patch(route('admin.payments.reverify-accept', $payment->payment_number));
        $response->assertStatus(403);

        // Super Admin is authorized -> 302 (redirect back on success)
        $response = $this->actingAs($superAdmin)
            ->patch(route('admin.payments.reverify-accept', $payment->payment_number), [
                'reverification_notes' => 'Telah dicocokkan dengan mutasi rekening BCA.',
            ]);
        $response->assertStatus(302);

        $payment->refresh();
        $this->assertEquals('accepted', $payment->reverification_status);
        $this->assertEquals($superAdmin->id, $payment->reverified_by);
        $this->assertEquals('Telah dicocokkan dengan mutasi rekening BCA.', $payment->reverification_notes);
    }

    #[Test]
    public function reverify_reject_reverts_payment_and_income_states(): void
    {
        $finance = User::factory()->create(['role' => 'finance']);
        $property = Property::factory()->create();
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'total_amount' => 1000000,
        ]);

        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 1000000,
            'payment_status' => 'verified',
            'status' => 'cocok',
            'reverification_status' => 'pending',
        ]);

        // Reject the reverification
        $response = $this->actingAs($finance)
            ->patch(route('admin.payments.reverify-reject', $payment->payment_number), [
                'reverification_notes' => 'Tidak ada dana masuk pada mutasi Bank Mandiri.',
                'reverification_action' => 'Minta Bukti Baru',
            ]);

        $response->assertStatus(302);

        $payment->refresh();
        $this->assertEquals('rejected', $payment->reverification_status);
        $this->assertEquals('failed', $payment->payment_status);
        $this->assertEquals('ditolak', $payment->status);
        $this->assertEquals('Minta Bukti Baru', $payment->reverification_action);
        $this->assertEquals('Tidak ada dana masuk pada mutasi Bank Mandiri.', $payment->reverification_notes);

        // Verify workflow entry exists
        $this->assertDatabaseHas('booking_workflow', [
            'booking_id' => $booking->id,
            'step' => 'payment_rejected_recheck',
            'status' => 'failed',
        ]);
    }

    #[Test]
    public function payments_can_be_sorted_by_date_and_bank_account(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $methodA = PaymentMethod::factory()->create(['name' => 'Bank Mandiri']);
        $methodB = PaymentMethod::factory()->create(['name' => 'Bank BCA']);

        $property = Property::factory()->create();
        $booking = Booking::factory()->create(['property_id' => $property->id]);

        $payment1 = Payment::factory()->create([
            'booking_id' => $booking->id,
            'payment_method_id' => $methodA->id,
            'payment_date' => now()->subDays(2),
        ]);

        $payment2 = Payment::factory()->create([
            'booking_id' => $booking->id,
            'payment_method_id' => $methodB->id,
            'payment_date' => now()->subDay(),
        ]);

        // Request sorted by bank_account ASC
        $response = $this->actingAs($admin)
            ->get(route('admin.payments.index', [
                'grouped' => 'false',
                'sort_by' => 'bank_account',
                'sort_dir' => 'asc',
            ]));

        $response->assertStatus(200);
        $payments = $response->viewData('page')['props']['payments']['data'];

        // BCA (methodB) comes before Mandiri (methodA) in alphabetical order
        $this->assertEquals($payment2->id, $payments[0]['id']);
        $this->assertEquals($payment1->id, $payments[1]['id']);

        // Request sorted by date DESC
        $response2 = $this->actingAs($admin)
            ->get(route('admin.payments.index', [
                'grouped' => 'false',
                'sort_by' => 'date',
                'sort_dir' => 'desc',
            ]));

        $payments2 = $response2->viewData('page')['props']['payments']['data'];
        $this->assertEquals($payment2->id, $payments2[0]['id']); // payment2 date is more recent than payment1
    }
}
