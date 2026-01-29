<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\InventoryUsage;
use App\Models\Property;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CleaningService
{
    /**
     * Mark a booking as cleaned, deduct stock, and update keybox.
     *
     * @param Booking $booking
     * @param string $newKeyboxCode
     * @param array $stockUsage Array of ['item_id' => int, 'quantity' => float]
     * @param string|null $notes
     * @param int $userId
     * @return Booking
     * @throws \Exception
     */
    public function markAsCleaned(Booking $booking, string $newKeyboxCode, array $stockUsage, ?string $notes, int $userId): Booking
    {
        return DB::transaction(function () use ($booking, $newKeyboxCode, $stockUsage, $notes, $userId) {
            // 1. Update Booking
            $booking->update([
                'is_cleaned' => true,
                'cleaned_at' => now(),
                'cleaned_by' => $userId,
                'cleaning_notes' => $notes,
            ]);

            // 2. Update Keybox via Property Model (encapsulated logic)
            $booking->property->updateKeyboxCode($newKeyboxCode, $userId);

            // 3. Process Stock Usage
            if (!empty($stockUsage)) {
                $this->processStockUsage($booking, $stockUsage, $userId);
            }

            return $booking;
        });
    }

    /**
     * Process stock usage: Create Usage records and Stock Movements (Out).
     */
    private function processStockUsage(Booking $booking, array $stockUsage, int $userId): void
    {
        foreach ($stockUsage as $item) {
            $inventoryItem = InventoryItem::find($item['item_id']);

            if (!$inventoryItem) {
                continue;
            }

            $quantity = (float) $item['quantity'];

            if ($quantity <= 0) {
                continue;
            }

            // A. Create Inventory Usage Record (Reporting)
            InventoryUsage::create([
                'inventory_item_id' => $inventoryItem->id,
                'property_id' => $booking->property_id,
                'usage_date' => now(),
                'quantity_used' => $quantity,
                'unit_cost_snapshot' => $inventoryItem->average_unit_cost ?? 0, // Snapshot cost
                'total_cost' => ($inventoryItem->average_unit_cost ?? 0) * $quantity,
                'notes' => "Cleaning for booking #{$booking->booking_number}",
                'created_by' => $userId,
            ]);

            // B. Create Stock Movement (Deduction)
            InventoryStockMovement::create([
                'inventory_item_id' => $inventoryItem->id,
                'property_id' => $booking->property_id,
                'type' => 'out',
                'quantity' => $quantity,
                'unit_cost' => $inventoryItem->average_unit_cost ?? 0,
                'total_cost' => ($inventoryItem->average_unit_cost ?? 0) * $quantity,
                'movement_date' => now(),
                'reference_type' => 'cleaning', // To link back easily
                'reference_id' => $booking->id, // Link to Booking ID
                'notes' => "Used for cleaning booking #{$booking->booking_number}",
                'created_by' => $userId,
            ]);
        }
    }

    /**
     * Get the stock usage template based on the LAST cleaning session for this property.
     * Returns an array of items and quantities from the previous booking's stock movements.
     */
    public function getLastUsageTemplate(Property $property): array
    {
        // Find the last cleaned booking for this property
        $lastCleanedBooking = Booking::where('property_id', $property->id)
            ->where('is_cleaned', true)
            ->whereNotNull('cleaned_at')
            ->latest('cleaned_at')
            ->first();

        if (!$lastCleanedBooking) {
            return [];
        }

        // Get movements linked to this booking
        $movements = InventoryStockMovement::where('reference_type', 'cleaning')
            ->where('reference_id', $lastCleanedBooking->id)
            ->with('item:id,name,unit')
            ->get();

        return $movements->map(function ($movement) {
            return [
                'item_id' => $movement->inventory_item_id,
                'item_name' => $movement->item->name ?? 'Unknown Item',
                'unit' => $movement->item->unit ?? '',
                'quantity' => (float) $movement->quantity,
            ];
        })->toArray();
    }
}
