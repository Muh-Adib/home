<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\InventoryItem;
use App\Models\InventoryCategory;
use Illuminate\Support\Str;

class InventoryItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get categories first
        $cleaningCategory = InventoryCategory::where('name', 'Cleaning Supplies')->first();
        $linensCategory = InventoryCategory::where('name', 'Bed & Bath Linens')->first();
        $toiletriesCategory = InventoryCategory::where('name', 'Toiletries')->first();
        $kitchenCategory = InventoryCategory::where('name', 'Kitchen Supplies')->first();
        $maintenanceCategory = InventoryCategory::where('name', 'Maintenance Tools')->first();

        if (!$cleaningCategory) {
            $this->command->warn('Categories not found. Please run InventoryCategorySeeder first.');
            return;
        }

        $items = [
            // Cleaning Supplies
            [
                'category_id' => $cleaningCategory->id,
                'name' => 'All-Purpose Cleaner',
                'description' => 'Multi-surface cleaning spray for general cleaning',
                'sku' => 'CLN-001',
                'unit' => 'bottle',
                'min_stock' => 5,
                'max_stock' => 20,
                'cost_price' => 25000,
                'status' => 'active',
            ],
            [
                'category_id' => $cleaningCategory->id,
                'name' => 'Toilet Paper',
                'description' => 'Premium 2-ply toilet paper rolls',
                'sku' => 'CLN-002',
                'unit' => 'roll',
                'min_stock' => 20,
                'max_stock' => 100,
                'cost_price' => 8000,
                'status' => 'active',
            ],
            [
                'category_id' => $cleaningCategory->id,
                'name' => 'Vacuum Cleaner Bags',
                'description' => 'Replacement bags for vacuum cleaners',
                'sku' => 'CLN-003',
                'unit' => 'piece',
                'min_stock' => 10,
                'max_stock' => 50,
                'cost_price' => 15000,
                'status' => 'active',
            ],

            // Bed & Bath Linens
            [
                'category_id' => $linensCategory->id,
                'name' => 'Bed Sheet Set (Queen)',
                'description' => 'Cotton bed sheet set for queen size beds',
                'sku' => 'LIN-001',
                'unit' => 'set',
                'min_stock' => 5,
                'max_stock' => 25,
                'cost_price' => 150000,
                'status' => 'active',
            ],
            [
                'category_id' => $linensCategory->id,
                'name' => 'Bath Towel',
                'description' => 'Premium cotton bath towel',
                'sku' => 'LIN-002',
                'unit' => 'piece',
                'min_stock' => 10,
                'max_stock' => 50,
                'cost_price' => 75000,
                'status' => 'active',
            ],
            [
                'category_id' => $linensCategory->id,
                'name' => 'Pillow',
                'description' => 'Memory foam pillow with cotton cover',
                'sku' => 'LIN-003',
                'unit' => 'piece',
                'min_stock' => 8,
                'max_stock' => 30,
                'cost_price' => 120000,
                'status' => 'active',
            ],

            // Toiletries
            [
                'category_id' => $toiletriesCategory->id,
                'name' => 'Shampoo',
                'description' => 'Guest shampoo bottles (50ml)',
                'sku' => 'TOI-001',
                'unit' => 'bottle',
                'min_stock' => 20,
                'max_stock' => 100,
                'cost_price' => 12000,
                'status' => 'active',
            ],
            [
                'category_id' => $toiletriesCategory->id,
                'name' => 'Body Soap',
                'description' => 'Guest body soap bars',
                'sku' => 'TOI-002',
                'unit' => 'bar',
                'min_stock' => 15,
                'max_stock' => 75,
                'cost_price' => 8000,
                'status' => 'active',
            ],
            [
                'category_id' => $toiletriesCategory->id,
                'name' => 'Toothbrush',
                'description' => 'Disposable guest toothbrush',
                'sku' => 'TOI-003',
                'unit' => 'piece',
                'min_stock' => 25,
                'max_stock' => 100,
                'cost_price' => 3000,
                'status' => 'active',
            ],

            // Kitchen Supplies
            [
                'category_id' => $kitchenCategory->id,
                'name' => 'Coffee Cups',
                'description' => 'Ceramic coffee cups with saucers',
                'sku' => 'KIT-001',
                'unit' => 'set',
                'min_stock' => 5,
                'max_stock' => 20,
                'cost_price' => 45000,
                'status' => 'active',
            ],
            [
                'category_id' => $kitchenCategory->id,
                'name' => 'Cooking Utensils Set',
                'description' => 'Basic cooking utensils for guest use',
                'sku' => 'KIT-002',
                'unit' => 'set',
                'min_stock' => 3,
                'max_stock' => 10,
                'cost_price' => 85000,
                'status' => 'active',
            ],

            // Maintenance Tools
            [
                'category_id' => $maintenanceCategory->id,
                'name' => 'Light Bulbs (LED)',
                'description' => '12W LED light bulbs for general lighting',
                'sku' => 'MNT-001',
                'unit' => 'piece',
                'min_stock' => 10,
                'max_stock' => 50,
                'cost_price' => 25000,
                'status' => 'active',
            ],
            [
                'category_id' => $maintenanceCategory->id,
                'name' => 'Basic Tool Set',
                'description' => 'Screwdriver, wrench, and basic repair tools',
                'sku' => 'MNT-002',
                'unit' => 'set',
                'min_stock' => 2,
                'max_stock' => 5,
                'cost_price' => 150000,
                'status' => 'active',
            ],
        ];

        foreach ($items as $itemData) {
            $slug = Str::slug($itemData['name']);
            
            InventoryItem::create([
                'category_id' => $itemData['category_id'],
                'code' => $itemData['sku'],  // 'sku' -> 'code'
                'name' => $itemData['name'],
                'slug' => $slug,
                'description' => $itemData['description'],
                'unit' => $itemData['unit'],
                'min_stock_level' => $itemData['min_stock'],  // 'min_stock' -> 'min_stock_level'
                'max_stock_level' => $itemData['max_stock'],  // 'max_stock' -> 'max_stock_level'
                'unit_cost' => $itemData['cost_price'],       // 'cost_price' -> 'unit_cost'
                'is_active' => $itemData['status'] === 'active',  // 'status' -> 'is_active' (boolean)
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("Created inventory item: {$itemData['name']} (Code: {$itemData['sku']})");
        }

        $this->command->info('Inventory item seeder completed successfully!');
    }
}