<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Income;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AdminBookingManagementTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $admin;

    protected $property;

    protected $paymentMethod;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);

        $this->property = Property::factory()->create([
            'name' => 'Test Villa',
            'slug' => 'test-villa',
            'base_rate' => 1000000,
            'capacity' => 4,
            'capacity_max' => 6,
            'cleaning_fee' => 200000,
            'extra_bed_rate' => 100000,
            'weekend_premium_percent' => 20,
            'min_stay_weekday' => 1,
            'min_stay_weekend' => 2,
            'min_stay_peak' => 3,
        ]);

        $this->paymentMethod = PaymentMethod::factory()->create([
            'name' => 'Bank Transfer',
            'type' => 'bank_transfer',
            'is_active' => true,
        ]);
    }

    #[Test]
    public function admin_can_create_booking_with_payment()
    {
        $bookingData = [
            'property_id' => $this->property->id,
            'check_in_date' => now()->addDays(1)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_male' => 2,
            'guest_female' => 2,
            'guest_children' => 0,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'booking_status' => 'confirmed',
            'payment_status' => 'fully_paid',
            'dp_percentage' => 100,
            'payment_method_id' => $this->paymentMethod->id,
            'payment_amount' => 2500000,
            'payment_date' => now()->toDateString(),
            'reference_number' => 'TRX123456',
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_name' => 'John Doe',
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('admin.bookings.store'), $bookingData);

        $response->assertRedirect();

        $this->assertDatabaseHas('bookings', [
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'booking_status' => 'confirmed',
            'payment_status' => 'fully_paid',
        ]);

        $booking = Booking::where('guest_email', 'john@example.com')->first();
        $this->assertNotNull($booking);

        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'amount' => 2500000,
            'payment_status' => 'verified',
        ]);
    }

    #[Test]
    public function admin_can_create_booking_with_rate_override()
    {
        $bookingData = [
            'property_id' => $this->property->id,
            'check_in_date' => now()->addDays(1)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_male' => 2,
            'guest_female' => 2,
            'guest_children' => 0,
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '081234567891',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'female',
            'relationship_type' => 'teman',
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
            'dp_percentage' => 50,
            'payment_method_id' => $this->paymentMethod->id,
            'payment_amount' => 1000000,
            'rate_override' => true,
            'override_amount' => 2000000,
            'override_reason' => 'Early bird discount for repeat customer',
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('admin.bookings.store'), $bookingData);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertDatabaseHas('bookings', [
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'total_amount' => 2000000,
        ]);

        $booking = Booking::where('guest_email', 'jane@example.com')->first();
        $this->assertStringContainsString('Rate override by Admin User', $booking->internal_notes);
        $this->assertStringContainsString('Early bird discount for repeat customer', $booking->internal_notes);
    }

    #[Test]
    public function admin_can_edit_booking_with_reschedule()
    {
        // Create initial booking
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(1)->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
            'guest_count' => 2,
            'total_amount' => 2500000,
            'booking_status' => 'confirmed',
        ]);

        $updateData = [
            'property_id' => $this->property->id,
            'check_in_date' => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
            'guest_male' => 2,
            'guest_female' => 2,
            'guest_children' => 2,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'guest_phone' => $booking->guest_phone,
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
            'dp_percentage' => 50,
            'check_in_time' => '15:00',
            'source' => 'direct',
        ];

        $response = $this->actingAs($this->admin)
            ->put(route('admin.bookings.update', $booking->booking_number), $updateData);

        $response->assertRedirect();

        $booking->refresh();
        $this->assertEquals(now()->addDays(2)->toDateString(), $booking->check_in->toDateString());
        $this->assertEquals(now()->addDays(5)->toDateString(), $booking->check_out->toDateString());
        $this->assertEquals(5, $booking->guest_count); // 2+2+1
    }

    #[Test]
    public function admin_can_edit_booking_with_rate_override()
    {
        // Create initial booking
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(1)->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
            'total_amount' => 2500000,
            'booking_status' => 'confirmed',
        ]);

        $updateData = [
            'property_id' => $this->property->id,
            'check_in_date' => $booking->check_in->toDateString(),
            'check_out_date' => $booking->check_out->toDateString(),
            'guest_male' => $booking->guest_male,
            'guest_female' => $booking->guest_female,
            'guest_children' => $booking->guest_children,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'guest_phone' => $booking->guest_phone,
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
            'dp_percentage' => 50,
            'check_in_time' => '15:00',
            'source' => 'direct',
            'payment_method_id' => $this->paymentMethod->id,
            'payment_amount' => 1000000,
            'rate_override' => true,
            'override_amount' => 2000000,
            'override_reason' => 'Special discount for VIP customer',
        ];

        $response = $this->actingAs($this->admin)
            ->put(route('admin.bookings.update', $booking->booking_number), $updateData);

        $response->assertRedirect();

        $booking->refresh();
        $this->assertEquals(2000000, $booking->total_amount);
        $this->assertStringContainsString('Rate override by Admin User', $booking->internal_notes);
        $this->assertStringContainsString('Special discount for VIP customer', $booking->internal_notes);
    }

    #[Test]
    public function payment_is_required_for_confirmed_booking()
    {
        $bookingData = [
            'property_id' => $this->property->id,
            'check_in_date' => now()->addDays(1)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_male' => 2,
            'guest_female' => 2,
            'guest_children' => 0,
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'booking_status' => 'confirmed',
            'payment_status' => 'fully_paid', // Confirmed but no payment data
            'dp_percentage' => 100,
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('admin.bookings.store'), $bookingData);

        $response->assertSessionHasErrors(['payment_method_id']);
    }

    #[Test]
    public function rate_override_requires_reason()
    {
        $bookingData = [
            'property_id' => $this->property->id,
            'check_in_date' => now()->addDays(1)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_male' => 2,
            'guest_female' => 2,
            'guest_children' => 0,
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
            'dp_percentage' => 50,
            'rate_override' => true,
            'override_amount' => 2000000,
            'override_reason' => 'Short', // Too short
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('admin.bookings.store'), $bookingData);

        $response->assertSessionHasErrors(['override_reason']);
    }

    #[Test]
    public function guest_count_cannot_exceed_property_capacity()
    {
        $bookingData = [
            'property_id' => $this->property->id,
            'check_in_date' => now()->addDays(1)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_male' => 4,
            'guest_female' => 4,
            'guest_children' => 0, // Total 8 guests, exceeds capacity_max of 6
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
            'dp_percentage' => 50,
            'payment_method_id' => $this->paymentMethod->id,
            'payment_amount' => 1000000,
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('admin.bookings.store'), $bookingData);

        $response->assertSessionHasErrors(['guest_count']);
    }

    #[Test]
    public function admin_can_view_booking_edit_form()
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(1)->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('admin.bookings.edit', $booking->booking_number));

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page->component('Admin/Bookings/Edit')
                ->has('booking')
                ->has('properties')
                ->has('paymentMethods')
        );
    }

    #[Test]
    public function admin_can_view_booking_create_form()
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.bookings.create'));

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page->component('Admin/Bookings/Create')
                ->has('properties')
                ->has('paymentMethods')
        );
    }

    #[Test]
    public function existing_payments_are_preserved_during_reschedule()
    {
        // Create booking with payment
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(1)->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
            'total_amount' => 2500000,
        ]);

        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 1250000,
            'payment_status' => 'verified',
        ]);

        $updateData = [
            'property_id' => $this->property->id,
            'check_in_date' => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
            'guest_male' => $booking->guest_male,
            'guest_female' => $booking->guest_female,
            'guest_children' => $booking->guest_children,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'guest_phone' => $booking->guest_phone,
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'booking_status' => 'confirmed',
            'payment_status' => 'dp_pending',
            'dp_percentage' => 50,
            'check_in_time' => '15:00',
            'source' => 'direct',
        ];

        $response = $this->actingAs($this->admin)
            ->put(route('admin.bookings.update', $booking->booking_number), $updateData);

        $response->assertRedirect();

        // Payment should still exist
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'booking_id' => $booking->id,
            'amount' => 1250000,
        ]);
    }

    #[Test]
    public function admin_can_update_payment_using_patch()
    {
        // Create booking with payment
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(1)->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
            'total_amount' => 2500000,
        ]);

        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 1250000,
            'payment_status' => 'pending',
            'payment_type' => 'dp',
            'payment_date' => now()->toDateString(),
        ]);

        $updateData = [
            'payment_status' => 'verified',
            'keep_existing_attachment' => true,
        ];

        // Send request using the route name update.patch, but using PATCH method
        $response = $this->actingAs($this->admin)
            ->patch(route('admin.payments.update.patch', $payment->payment_number), $updateData);

        $response->assertRedirect();

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'payment_status' => 'verified',
        ]);
    }

    #[Test]
    public function admin_can_delete_booking_and_associated_payments_and_incomes()
    {
        // Create booking with payment and income
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(1)->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
            'total_amount' => 2500000,
        ]);

        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 1250000,
            'payment_status' => 'verified',
            'payment_type' => 'dp',
            'payment_date' => now()->toDateString(),
            'payment_method_id' => $this->paymentMethod->id,
        ]);

        // Manually create an income associated with this payment/booking
        $income = Income::create([
            'booking_id' => $booking->id,
            'payment_id' => $payment->id,
            'property_id' => $this->property->id,
            'amount' => 1250000,
            'income_date' => now()->toDateString(),
            'source' => 'booking',
            'description' => 'DP Payment',
        ]);

        // Verify the database has the records initially
        $this->assertDatabaseHas('bookings', ['id' => $booking->id]);
        $this->assertDatabaseHas('payments', ['id' => $payment->id]);
        $this->assertDatabaseHas('incomes', ['id' => $income->id]);

        // Send delete request
        $response = $this->actingAs($this->admin)
            ->delete(route('admin.bookings.destroy', $booking->booking_number));

        $response->assertRedirect();

        // Booking should be soft-deleted
        $this->assertSoftDeleted('bookings', ['id' => $booking->id]);

        // Payments and incomes should be deleted completely (hard-deleted)
        $this->assertDatabaseMissing('payments', ['id' => $payment->id]);
        $this->assertDatabaseMissing('incomes', ['id' => $income->id]);
    }

    public function test_can_store_payment_via_api(): void
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'total_amount' => 1000000,
            'remaining_amount' => 1000000,
            'booking_status' => 'confirmed',
        ]);

        $response = $this->actingAs($this->admin)
            ->post("/api/admin/booking-management/bookings/{$booking->booking_number}/payments", [
                'payment_method_id' => $this->paymentMethod->id,
                'amount' => 500000,
                'payment_type' => 'dp',
                'payment_status' => 'verified',
                'payment_date' => now()->toDateString(),
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'amount' => 500000,
            'payment_status' => 'verified',
        ]);
    }
}
