<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryCategory;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * Tambah atau update item inventory secara modular.
     */
    public function upsertItem(array $attributes): InventoryItem
    {
        return DB::transaction(function () use ($attributes) {
            // Validasi category
            $category = InventoryCategory::findOrFail($attributes['category_id']);

            // Upsert berdasarkan item_code
            $item = InventoryItem::updateOrCreate(
                ['item_code' => $attributes['item_code']],
                $attributes
            );

            return $item;
        });
    }

    /**
     * Kurangi stock dengan safe-check.
     */
    public function deductStock(string $itemCode, int $quantity): void
    {
        $item = InventoryItem::where('item_code', $itemCode)->lockForUpdate()->firstOrFail();

        if ($item->total_stock < $quantity) {
            throw new \Exception('Stock tidak mencukupi');
        }

        $item->decrement('total_stock', $quantity);
    }
} 