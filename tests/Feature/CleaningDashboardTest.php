<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CleaningDashboardTest extends TestCase
{
    use RefreshDatabase;

    private $user;
    private $property;
    private $item;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'staff']);
        $this->property = Property::factory()->create([
            'current_keybox_code' => '000',
        ]);
        $this->item = InventoryItem::factory()->create([
            'name' => 'Soap',
            'unit' => 'pcs',
        ]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function it_can_view_cleaning_dashboard()
    {
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_out' => now(),
            'booking_status' => 'checked_out',
            'is_cleaned' => false,
        ]);

        $response = $this->get(route('staff.cleaning.index'));
        $response->assertStatus(200);
    }

    /** @test */
    public function it_can_mark_property_as_cleaned_with_stock_usage()
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_out' => now(),
            'booking_status' => 'checked_out',
            'is_cleaned' => false,
        ]);

        $response = $this->patch(route('staff.cleaning.mark-cleaned', $booking->id), [
            'new_keybox_code' => '999',
            'notes' => 'Cleaned well',
            'stock_usage' => [
                [
                    'item_id' => $this->item->id,
                    'quantity' => 2,
                ]
            ]
        ]);

        $response->assertRedirect();

        // 1. Verify Booking Updated
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'is_cleaned' => true,
            'cleaned_by' => $this->user->id,
        ]);

        // 2. Verify Keybox Updated
        $this->assertDatabaseHas('properties', [
            'id' => $this->property->id,
            'current_keybox_code' => '999',
        ]);

        // 3. Verify Stock Deducted (Movement)
        $this->assertDatabaseHas('inventory_stock_movements', [
            'inventory_item_id' => $this->item->id,
            'quantity' => 2,
            'type' => 'out',
            'reference_type' => 'cleaning',
            'reference_id' => $booking->id,
        ]);

        // 4. Verify Usage Record
        $this->assertDatabaseHas('inventory_usages', [
            'inventory_item_id' => $this->item->id,
            'quantity_used' => 2,
            'property_id' => $this->property->id,
        ]);
    }

    /** @test */
    public function it_returns_template_from_last_cleaning()
    {
        // 1. Create a past booking that was cleaned with stock usage
        $pastBooking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'booking_status' => 'checked_out',
            'is_cleaned' => true,
            'cleaned_at' => now()->subDay(),
        ]);

        InventoryStockMovement::create([
            'inventory_item_id' => $this->item->id,
            'property_id' => $this->property->id,
            'type' => 'out',
            'quantity' => 5,
            'reference_type' => 'cleaning',
            'reference_id' => $pastBooking->id,
            'created_by' => $this->user->id,
            'movement_date' => now(),
        ]);

        // 2. Create a new booking needs cleaning
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_out' => now(),
            'booking_status' => 'checked_out',
            'is_cleaned' => false,
        ]);

        // 3. Visit dashboard and check props
        $response = $this->get(route('staff.cleaning.index'));

        $props = $response->inertiaProps();
        $needsCleaning = $props['needsCleaning'];

        $this->assertNotEmpty($needsCleaning);
        $this->assertEquals(5, $needsCleaning[0]['stock_template'][0]['quantity']);
        $this->assertEquals($this->item->id, $needsCleaning[0]['stock_template'][0]['item_id']);
    }
}
