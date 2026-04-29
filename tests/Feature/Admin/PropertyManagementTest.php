<?php

namespace Tests\Feature\Admin;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PropertyManagementTest extends TestCase
{
    // use RefreshDatabase; // Commented out to avoid wiping existing dev data if not using in-memory DB

    #[Test]
    public function admin_can_create_property_with_type()
    {
        // Mock authentication as admin
        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($admin);

        $data = [
            'name' => 'New Villa',
            'type' => 'villa',
            'description' => 'A user created villa',
            'address' => 'Jl. Villa No. 1',
            'location' => 'selatan',
            'capacity' => 2,
            'capacity_max' => 4,
            'bedroom_count' => 1,
            'bathroom_count' => 1,
            'base_rate' => 1000000,
            'weekend_premium_percent' => 10,
            'weekend_premium_type' => 'percentage',
            'cleaning_fee' => 50000,
            'extra_bed_rate' => 100000,
            'check_in_time' => '14:00',
            'check_out_time' => '12:00',
            'min_stay_weekday' => 1,
            'min_stay_weekend' => 2,
            'min_stay_peak' => 3,
            'owner_id' => $admin->id, // or create another owner
            'ical_import_urls' => [],
        ];

        $response = $this->post(route('admin.properties.store'), $data);

        $response->assertRedirect(route('admin.properties.index'));
        $this->assertDatabaseHas('properties', [
            'name' => 'New Villa',
            'type' => 'villa',
        ]);
    }

    #[Test]
    public function admin_can_update_property_type()
    {
        // Mock authentication as admin
        $admin = User::first() ?? User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($admin);

        $property = Property::factory()->create([
            'type' => 'homestay',
            'owner_id' => $admin->id,
        ]);

        $data = [
            'name' => $property->name,
            'type' => 'hotel',
            'description' => $property->description,
            'address' => $property->address,
            'location' => $property->location,
            'capacity' => $property->capacity,
            'capacity_max' => $property->capacity_max,
            'bedroom_count' => $property->bedroom_count,
            'bathroom_count' => $property->bathroom_count,
            'base_rate' => $property->base_rate,
            'weekend_premium_percent' => $property->weekend_premium_percent,
            'weekend_premium_type' => $property->weekend_premium_type,
            'cleaning_fee' => $property->cleaning_fee,
            'extra_bed_rate' => $property->extra_bed_rate,
            'check_in_time' => is_string($property->check_in_time) ? $property->check_in_time : $property->check_in_time->format('H:i'),
            'check_out_time' => is_string($property->check_out_time) ? $property->check_out_time : $property->check_out_time->format('H:i'),
            'min_stay_weekday' => $property->min_stay_weekday,
            'min_stay_weekend' => $property->min_stay_weekend,
            'min_stay_peak' => $property->min_stay_peak,
            'status' => 'active',
            'ical_import_urls' => [],
        ];

        $response = $this->put(route('admin.properties.update', $property->slug), $data);

        $response->assertRedirect(route('admin.properties.index'));
        $this->assertDatabaseHas('properties', [
            'id' => $property->id,
            'type' => 'hotel',
        ]);
    }
}
