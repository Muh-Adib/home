<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\LostAndFound;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LostAndFoundTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function authorized_roles_can_access_lost_and_founds_index(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $housekeeping = User::factory()->create(['role' => 'housekeeping']);
        $guest = User::factory()->create(['role' => 'guest']); // Unauthorized role

        $response = $this->actingAs($admin)->get(route('admin.lost-and-founds.index'));
        $response->assertStatus(200);

        $response = $this->actingAs($housekeeping)->get(route('admin.lost-and-founds.index'));
        $response->assertStatus(200);

        $response = $this->actingAs($guest)->get(route('admin.lost-and-founds.index'));
        $response->assertStatus(403);
    }

    #[Test]
    public function user_can_log_lost_and_found_item(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['status' => 'active']);

        $response = $this->actingAs($admin)->post(route('admin.lost-and-founds.store'), [
            'property_id' => $property->id,
            'item_name' => 'Kacamata Hitam Rayban',
            'description' => 'Tertinggal di nakas tidur.',
            'found_date' => '2026-07-13',
        ]);

        $response->assertRedirect(route('admin.lost-and-founds.index'));
        $this->assertDatabaseHas('lost_and_founds', [
            'property_id' => $property->id,
            'item_name' => 'Kacamata Hitam Rayban',
            'status' => 'found',
        ]);
    }

    #[Test]
    public function item_can_be_marked_as_claimed(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['status' => 'active']);
        $item = LostAndFound::create([
            'property_id' => $property->id,
            'item_name' => 'Charger iPhone',
            'found_date' => '2026-07-13',
            'status' => 'found',
        ]);

        $response = $this->actingAs($admin)->patch(route('admin.lost-and-founds.claim', $item), [
            'claimed_by_name' => 'Ozy Wibisono',
            'notes' => 'Diambil via GoSend instan.',
        ]);

        $response->assertRedirect(route('admin.lost-and-founds.index'));
        $this->assertDatabaseHas('lost_and_founds', [
            'id' => $item->id,
            'status' => 'claimed',
            'claimed_by_name' => 'Ozy Wibisono',
            'notes' => 'Diambil via GoSend instan.',
        ]);
    }

    #[Test]
    public function system_suggests_bookings_checkout_correctly(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['status' => 'active']);

        // Create booking checking out on July 10, 2026
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'booking_status' => 'confirmed',
            'check_in' => '2026-07-05',
            'check_out' => '2026-07-10',
        ]);

        // found date = July 12, 2026 (checked out 2 days ago, which is in range)
        $response = $this->actingAs($admin)->get(route('admin.lost-and-founds.suggest-bookings', [
            'property_id' => $property->id,
            'found_date' => '2026-07-12',
        ]));

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'booking_number' => $booking->booking_number,
            'guest_name' => $booking->guest_name,
        ]);
    }
}
