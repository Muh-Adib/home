<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingAttributionTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthorized_users_cannot_access_staff_tracking(): void
    {
        $guest = User::factory()->create(['role' => 'guest']);
        $frontDesk = User::factory()->create(['role' => 'front_desk']);

        $this->actingAs($guest)
            ->get(route('admin.bookings.staff-tracking'))
            ->assertStatus(403);

        $this->actingAs($frontDesk)
            ->get(route('admin.bookings.staff-tracking'))
            ->assertStatus(403);
    }

    public function test_super_admin_can_access_staff_tracking(): void
    {
        $this->withoutExceptionHandling();
        $superAdmin = User::factory()->create(['role' => 'super_admin']);

        $this->actingAs($superAdmin)
            ->get(route('admin.bookings.staff-tracking'))
            ->assertStatus(200);
    }

    public function test_super_admin_can_update_booking_attribution(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $staff1 = User::factory()->create(['role' => 'front_desk']);
        $staff2 = User::factory()->create(['role' => 'front_desk']);

        $property = Property::factory()->create();
        $booking = Booking::factory()->create([
            'property_id' => $property->id,
            'closed_by' => $staff1->id,
            'followed_up_by' => $staff1->id,
        ]);

        $response = $this->actingAs($superAdmin)
            ->put(route('admin.bookings.staff-tracking.update', $booking), [
                'closed_by' => $staff2->id,
                'followed_up_by' => $staff2->id,
            ]);

        $response->assertRedirect();

        $booking->refresh();
        $this->assertEquals($staff2->id, $booking->closed_by);
        $this->assertEquals($staff2->id, $booking->followed_up_by);
    }
}
