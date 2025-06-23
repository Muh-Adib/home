<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function guests_can_create_booking_with_valid_data()
    {
        $property = Property::factory()->create([
            'capacity' => 4,
            'capacity_max' => 6,
            'base_rate' => 1000000,
            'extra_bed_rate' => 150000,
        ]);

        $bookingData = [
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '+6281234567890',
            'guest_male' => 2,
            'guest_female' => 1,
            'guest_children' => 1,
            'check_in' => now()->addDays(7)->format('Y-m-d'),
            'check_out' => now()->addDays(10)->format('Y-m-d'),
            'special_requests' => 'Late check-in requested',
            'dp_percentage' => 30,
        ];

        $response = $this->post(route('bookings.store', $property->slug), $bookingData);

        $response->assertRedirect();
        $this->assertDatabaseHas('bookings', [
            'guest_email' => 'john@example.com',
            'guest_count' => 4, // 2 + 1 + 1
            'property_id' => $property->id,
        ]);
    }

    /** @test */
    public function booking_calculates_extra_bed_charges_correctly()
    {
        $property = Property::factory()->create([
            'capacity' => 4,
            'capacity_max' => 6,
            'base_rate' => 1000000,
            'extra_bed_rate' => 150000,
        ]);

        $bookingData = [
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '+6281234567890',
            'guest_male' => 3,
            'guest_female' => 2,
            'guest_children' => 1, // Total: 6 guests (2 extra beds needed)
            'check_in' => now()->addDays(7)->format('Y-m-d'),
            'check_out' => now()->addDays(10)->format('Y-m-d'),
            'dp_percentage' => 30,
        ];

        $response = $this->post(route('bookings.store', $property->slug), $bookingData);

        $booking = Booking::where('guest_email', 'john@example.com')->first();
        
        // 3 nights * (base_rate + 2 * extra_bed_rate)
        $expectedTotal = 3 * (1000000 + 2 * 150000); // 3,900,000
        $this->assertEquals($expectedTotal, $booking->total_amount);
        
        // 30% DP
        $expectedDP = $expectedTotal * 0.30; // 1,170,000
        $this->assertEquals($expectedDP, $booking->dp_amount);
    }

    /** @test */
    public function booking_prevents_overbooking()
    {
        $property = Property::factory()->create(['capacity_max' => 4]);

        // Create existing booking
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => now()->addDays(7),
            'check_out' => now()->addDays(10),
            'booking_status' => 'confirmed',
        ]);

        $bookingData = [
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '+6281234567890',
            'guest_male' => 2,
            'guest_female' => 2,
            'guest_children' => 0,
            'check_in' => now()->addDays(8)->format('Y-m-d'), // Overlapping dates
            'check_out' => now()->addDays(11)->format('Y-m-d'),
            'dp_percentage' => 30,
        ];

        $response = $this->post(route('bookings.store', $property->slug), $bookingData);

        $response->assertSessionHasErrors(['check_in']);
        $this->assertDatabaseMissing('bookings', [
            'guest_email' => 'jane@example.com',
        ]);
    }

    /** @test */
    public function booking_validates_guest_count_limits()
    {
        $property = Property::factory()->create([
            'capacity_max' => 4
        ]);

        $bookingData = [
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '+6281234567890',
            'guest_male' => 3,
            'guest_female' => 3, // Total: 6 guests (exceeds capacity_max of 4)
            'guest_children' => 0,
            'check_in' => now()->addDays(7)->format('Y-m-d'),
            'check_out' => now()->addDays(10)->format('Y-m-d'),
            'dp_percentage' => 30,
        ];

        $response = $this->post(route('bookings.store', $property->slug), $bookingData);

        $response->assertSessionHasErrors();
        $this->assertDatabaseMissing('bookings', [
            'guest_email' => 'john@example.com',
        ]);
    }

    /** @test */
    public function staff_can_verify_bookings()
    {
        $staff = User::factory()->create(['role' => 'front_desk']);
        $booking = Booking::factory()->create(['booking_status' => 'pending']);

        $response = $this->actingAs($staff)
            ->patch(route('admin.bookings.verify', $booking->booking_number));

        $response->assertRedirect();
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'booking_status' => 'confirmed',
            'verified_by' => $staff->id,
        ]);
    }

    /** @test */
    public function staff_can_cancel_bookings_with_reason()
    {
        $staff = User::factory()->create(['role' => 'property_manager']);
        $booking = Booking::factory()->create(['booking_status' => 'confirmed']);

        $response = $this->actingAs($staff)
            ->patch(route('admin.bookings.cancel', $booking->booking_number), [
                'cancellation_reason' => 'Property maintenance required'
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'booking_status' => 'cancelled',
            'cancelled_by' => $staff->id,
        ]);
    }

    /** @test */
    public function booking_workflow_tracks_status_changes()
    {
        $booking = Booking::factory()->create(['booking_status' => 'pending']);
        $staff = User::factory()->create(['role' => 'front_desk']);

        $this->actingAs($staff)
            ->patch(route('admin.bookings.verify', $booking->booking_number));

        $this->assertDatabaseHas('booking_workflow', [
            'booking_id' => $booking->id,
            'from_status' => 'pending',
            'to_status' => 'confirmed',
            'action_by' => $staff->id,
        ]);
    }

    /** @test */
    public function check_in_process_validates_requirements()
    {
        $staff = User::factory()->create(['role' => 'front_desk']);
        $booking = Booking::factory()->create([
            'booking_status' => 'confirmed',
            'payment_status' => 'paid',
            'check_in' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($staff)
            ->patch(route('admin.bookings.checkin', $booking->booking_number), [
                'actual_check_in' => now()->format('Y-m-d H:i:s'),
                'notes' => 'All documents verified'
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'booking_status' => 'checked_in',
        ]);
    }

    /** @test */
    public function check_in_fails_if_payment_not_complete()
    {
        $staff = User::factory()->create(['role' => 'front_desk']);
        $booking = Booking::factory()->create([
            'booking_status' => 'confirmed',
            'payment_status' => 'pending', // Payment not complete
            'check_in' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($staff)
            ->patch(route('admin.bookings.checkin', $booking->booking_number));

        $response->assertSessionHasErrors();
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'booking_status' => 'confirmed', // Status unchanged
        ]);
    }

    /** @test */
    public function booking_calendar_shows_correct_availability()
    {
        $property = Property::factory()->create();
        
        // Create bookings for different periods
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2024-12-01',
            'check_out' => '2024-12-05',
            'booking_status' => 'confirmed',
        ]);
        
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2024-12-10',
            'check_out' => '2024-12-15',
            'booking_status' => 'confirmed',
        ]);

        $admin = User::factory()->create(['role' => 'super_admin']);
        
        $response = $this->actingAs($admin)
            ->get(route('admin.bookings.calendar'));

        $response->assertStatus(200);
        $response->assertSee('2024-12-01');
        $response->assertSee('2024-12-10');
    }

    /** @test */
    public function my_bookings_shows_only_user_bookings()
    {
        $user = User::factory()->create();
        
        // Create booking for this user
        $userBooking = Booking::factory()->create([
            'guest_email' => $user->email,
        ]);
        
        // Create booking for different user
        $otherBooking = Booking::factory()->create([
            'guest_email' => 'other@example.com',
        ]);

        $response = $this->actingAs($user)
            ->get(route('my-bookings'));

        $response->assertStatus(200);
        $response->assertSee($userBooking->booking_number);
        $response->assertDontSee($otherBooking->booking_number);
    }

    /** @test */
    public function booking_confirmation_page_shows_correct_details()
    {
        $booking = Booking::factory()->create([
            'total_amount' => 3000000,
            'dp_amount' => 900000,
        ]);

        $response = $this->get(route('bookings.confirmation', $booking));

        $response->assertStatus(200);
        $response->assertSee($booking->booking_number);
        $response->assertSee('Rp3.000.000'); // Total amount formatted
        $response->assertSee('Rp900.000');   // DP amount formatted
    }

    /** @test */
    public function seasonal_rates_affect_booking_total()
    {
        $property = Property::factory()->create([
            'base_rate' => 1000000,
        ]);

        // Create seasonal rate for the booking period
        $property->seasonalRates()->create([
            'name' => 'Holiday Season',
            'start_date' => now()->addDays(7)->format('Y-m-d'),
            'end_date' => now()->addDays(14)->format('Y-m-d'),
            'rate_multiplier' => 1.5, // 50% increase
            'is_active' => true,
        ]);

        $bookingData = [
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '+6281234567890',
            'guest_male' => 2,
            'guest_female' => 0,
            'guest_children' => 0,
            'check_in' => now()->addDays(8)->format('Y-m-d'),
            'check_out' => now()->addDays(11)->format('Y-m-d'), // 3 nights
            'dp_percentage' => 30,
        ];

        $response = $this->post(route('bookings.store', $property->slug), $bookingData);

        $booking = Booking::where('guest_email', 'john@example.com')->first();
        
        // 3 nights * (base_rate * 1.5)
        $expectedTotal = 3 * (1000000 * 1.5); // 4,500,000
        $this->assertEquals($expectedTotal, $booking->total_amount);
    }
} 