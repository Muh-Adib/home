<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\InventoryUsage;

class RealisticBookingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Get or Create Dependencies
        $properties = Property::all();
        if ($properties->isEmpty()) {
            $properties = Property::factory(5)->create();
        }

        $cleaningStaff = User::where('role', 'housekeeping')->first()
            ?? User::factory()->create(['role' => 'housekeeping', 'name' => 'Siti Housekeeper']);

        $admin = User::first();

        // Create some common inventory items if they don't exist
        $items = [
            'Sabun Cair' => 'Liter',
            'Shampoo' => 'Botol',
            'Sikat Gigi' => 'Pcs',
            'Handuk' => 'Pcs',
            'Air Mineral 600ml' => 'Botol',
            'Tisu Toilet' => 'Roll',
            'Gas Elpiji' => 'Tabung',
        ];

        $inventoryItems = collect();
        foreach ($items as $name => $unit) {
            $inventoryItems->push(
                InventoryItem::firstOrCreate(
                    ['name' => $name],
                    [
                        'unit' => $unit,
                        'min_stock' => 10,
                        'average_unit_cost' => 5000,
                        'sku' => strtoupper(substr($name, 0, 3)) . rand(100, 999)
                    ]
                )
            );
        }

        // 2. Generate Realistic Scenarios for EACH Property
        foreach ($properties as $property) {

            // A. PAST BOOKINGS (Cleaned & Paid) - Creates History
            for ($i = 0; $i < 3; $i++) {
                $checkOutDate = now()->subDays(rand(2, 30));
                $checkInDate = $checkOutDate->copy()->subDays(rand(1, 5));

                $booking = Booking::factory()->create([
                    'property_id' => $property->id,
                    // 'user_id' => $admin->id, // Removed: No user_id column in bookings table
                    'check_in' => $checkInDate,
                    'check_out' => $checkOutDate,
                    'booking_status' => 'checked_out',
                    'is_cleaned' => true,
                    'cleaned_at' => $checkOutDate->copy()->addHours(2),
                    'cleaned_by' => $cleaningStaff->id,
                    'guest_name' => fake()->name(),
                ]);

                // Create Stock History for this booking (so templates work)
                $this->createStockHistory($booking, $inventoryItems, $cleaningStaff->id);
            }

            // B. TODAY CHECKOUTS (Pending Cleaning) - Shows in Dashboard
            if (rand(0, 1)) { // 50% chance per property
                $booking = Booking::factory()->create([
                    'property_id' => $property->id,
                    'check_in' => now()->subDays(2),
                    'check_out' => now(), // Today!
                    'booking_status' => 'checked_out',
                    'is_cleaned' => false, // Needs Cleaning!
                    'cleaned_at' => null,
                    'guest_name' => fake()->name(),
                    'guest_count' => rand(2, 6),
                ]);
            }

            // C. UPCOMING CHECKINS (Tomorrow/Future)
            if (rand(0, 1)) {
                Booking::factory()->create([
                    'property_id' => $property->id,
                    'check_in' => now()->addDay(),
                    'check_out' => now()->addDays(3),
                    'booking_status' => 'confirmed',
                    'is_cleaned' => false,
                    'guest_name' => fake()->name(),
                ]);
            }
        }
    }

    private function createStockHistory($booking, $inventoryItems, $userId)
    {
        // Randomly pick 3-5 items used
        $usedItems = $inventoryItems->random(rand(3, 5));

        foreach ($usedItems as $item) {
            $qty = rand(1, 3);

            // Movement (Out)
            InventoryStockMovement::create([
                'inventory_item_id' => $item->id,
                'property_id' => $booking->property_id,
                'type' => 'out',
                'quantity' => $qty,
                'unit_cost' => $item->average_unit_cost,
                'total_cost' => $item->average_unit_cost * $qty,
                'movement_date' => $booking->cleaned_at,
                'reference_type' => 'cleaning',
                'reference_id' => $booking->id,
                'created_by' => $userId,
            ]);

            // Usage Record (Idempotent)
            InventoryUsage::firstOrCreate(
                [
                    'inventory_item_id' => $item->id,
                    'property_id' => $booking->property_id,
                    'usage_date' => $booking->cleaned_at,
                ],
                [
                    'quantity_used' => $qty,
                    'unit_cost_snapshot' => $item->average_unit_cost,
                    'total_cost' => $item->average_unit_cost * $qty,
                    'notes' => 'Auto-generated history',
                    'created_by' => $userId,
                ]
            );
        }
    }
}
