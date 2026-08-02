<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\BookingGuest;
use App\Models\BookingService;
use App\Models\Property;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckInOutAddonsTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_text_includes_first_day_extrabed_and_extra_services(): void
    {
        Carbon::setTestNow(now());
        $admin = User::factory()->create(['role' => 'super_admin']);

        $property = Property::factory()->create([
            'name' => 'Villa Candi',
            'location' => 'selatan',
            'status' => 'active',
        ]);

        $today = now()->toDateString();
        $tomorrow = now()->addDays(2)->toDateString();

        $booking = Booking::factory()->create([
            'booking_number' => 'BK-TEST-CI',
            'property_id' => $property->id,
            'guest_name' => 'Budi Santoso',
            'guest_phone' => '08123456789',
            'check_in' => $today,
            'check_out' => $tomorrow,
            'nights' => 2,
            'booking_status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        BookingGuest::create([
            'booking_id' => $booking->id,
            'full_name' => 'Budi Santoso',
            'phone' => '08123456789',
            'guest_type' => 'primary',
        ]);

        // Add 1 Extra bed on day 1
        BookingDailyRevenue::create([
            'booking_id' => $booking->id,
            'property_id' => $property->id,
            'tanggal' => $today,
            'amount' => 600000,
            'base_amount' => 500000,
            'extra_bed_amount' => 100000,
            'extra_bed_count' => 1,
        ]);

        // Add extra service
        BookingService::create([
            'booking_id' => $booking->id,
            'service_name' => 'Floating Breakfast',
            'service_type' => 'extra_service',
            'quantity' => 1,
            'unit_price' => 100000,
            'total_price' => 100000,
        ]);

        $response = $this->actingAs($admin)->getJson(route('admin.bookings.check-in-out.generate-text'));

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        $text = $response->json('text');
        $this->assertStringContainsString('Villa Candi', $text);
        $this->assertStringContainsString('Extrabed H1: 1', $text);
        $this->assertStringContainsString('Extra Service: Floating Breakfast', $text);
    }
}
