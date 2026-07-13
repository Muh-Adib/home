<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OccupancyReportTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function authorized_roles_can_access_occupancy_report(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $manager = User::factory()->create(['role' => 'property_manager']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $frontDesk = User::factory()->create(['role' => 'front_desk']);
        $guest = User::factory()->create(['role' => 'guest']); // Unauthorized role

        // 1. Super Admin -> 200
        $response = $this->actingAs($superAdmin)->get(route('admin.reports.occupancy'));
        $response->assertStatus(200);

        // 2. Property Manager -> 200
        $response = $this->actingAs($manager)->get(route('admin.reports.occupancy'));
        $response->assertStatus(200);

        // 3. Property Owner -> 200
        $response = $this->actingAs($owner)->get(route('admin.reports.occupancy'));
        $response->assertStatus(200);

        // 4. Front Desk -> 200
        $response = $this->actingAs($frontDesk)->get(route('admin.reports.occupancy'));
        $response->assertStatus(200);

        // 5. Guest -> 403 (Unauthorized)
        $response = $this->actingAs($guest)->get(route('admin.reports.occupancy'));
        $response->assertStatus(403);
    }

    #[Test]
    public function occupancy_report_calculates_correct_occupied_and_vacant_nights(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create([
            'name' => 'Villa Cantik',
            'status' => 'active',
        ]);

        // Let's set target month: July 2026 (31 days)
        $month = 7;
        $year = 2026;

        // Create booking 1: June 28 to July 5 (5 nights occupied in July: July 1, 2, 3, 4)
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2026-06-28',
            'check_out' => '2026-07-05',
            'booking_status' => 'confirmed',
        ]);

        // Create booking 2: July 15 to July 25 (10 nights occupied in July: July 15 to 24)
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2026-07-15',
            'check_out' => '2026-07-25',
            'booking_status' => 'confirmed',
        ]);

        // Total occupied nights = 4 + 10 = 14 nights
        // Total vacant nights = 31 - 14 = 17 nights
        // Occupancy percentage = (14 / 31) * 100 = 45.16% => 45.2%

        $response = $this->actingAs($admin)
            ->get(route('admin.reports.occupancy', [
                'month' => $month,
                'year' => $year,
            ]));

        $response->assertStatus(200);

        $response->assertInertia(function ($page) use ($property) {
            $report = $page->toArray()['props']['occupancyReport'];
            $item = collect($report)->where('property_id', $property->id)->first();

            $this->assertNotNull($item);
            $this->assertEquals(14, $item['occupied_nights']); // 4 (booking 1) + 10 (booking 2)
            $this->assertEquals(17, $item['vacant_nights']); // 31 - 14 = 17
            $this->assertEquals(45.2, $item['occupancy_percentage']); // (14 / 31) * 100
        });
    }

    #[Test]
    public function occupancy_report_correctly_evaluates_target_status_based_on_nights(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create([
            'name' => 'Target Villa',
            'status' => 'active',
        ]);

        // Let's create a booking that occupies 26 nights in July 2026
        Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2026-07-01',
            'check_out' => '2026-07-27',
            'booking_status' => 'confirmed',
        ]);

        $response = $this->actingAs($admin)
            ->get(route('admin.reports.occupancy', [
                'month' => 7,
                'year' => 2026,
            ]));

        $response->assertStatus(200);
        $response->assertInertia(function ($page) {
            $report = $page->toArray()['props']['occupancyReport'];
            $item = collect($report)->first();
            $this->assertEquals('Tercapai', $item['target_status']);
        });
    }
}
