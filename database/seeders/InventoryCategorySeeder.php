<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\InventoryCategory;
use Illuminate\Support\Str;

class InventoryCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Jangan truncate di production
        if (app()->environment('production')) {
            $this->command->warn('Tidak boleh truncate InventoryCategory di production!');
            return;
        }
        try {
            InventoryCategory::truncate();
        } catch (\Exception $e) {
            $this->command->error('Gagal truncate InventoryCategory: ' . $e->getMessage());
            return;
        }
        
        $categories = [
            [
                'name' => 'Cleaning Supplies',
                'description' => 'Various cleaning supplies and chemicals for property maintenance',
                'icon' => 'cleaning-bucket',
                'color' => '#3B82F6', // Blue
                'is_active' => true,
            ],
            [
                'name' => 'Bed & Bath Linens',
                'description' => 'Bed sheets, towels, pillows, and other linens',
                'icon' => 'bed',
                'color' => '#10B981', // Green
                'is_active' => true,
            ],
            [
                'name' => 'Toiletries',
                'description' => 'Guest toiletries, soap, shampoo, and bathroom essentials',
                'icon' => 'soap',
                'color' => '#F59E0B', // Yellow
                'is_active' => true,
            ],
            [
                'name' => 'Kitchen Supplies',
                'description' => 'Kitchen utensils, cookware, and dining essentials',
                'icon' => 'chef-hat',
                'color' => '#EF4444', // Red
                'is_active' => true,
            ],
            [
                'name' => 'Maintenance Tools',
                'description' => 'Tools and equipment for property maintenance and repairs',
                'icon' => 'wrench',
                'color' => '#8B5CF6', // Purple
                'is_active' => true,
            ],
            [
                'name' => 'Electronics',
                'description' => 'Electronic equipment, remotes, chargers, and accessories',
                'icon' => 'monitor',
                'color' => '#06B6D4', // Cyan
                'is_active' => true,
            ],
            [
                'name' => 'Safety Equipment',
                'description' => 'Fire extinguishers, first aid supplies, and safety devices',
                'icon' => 'shield',
                'color' => '#DC2626', // Dark Red
                'is_active' => true,
            ],
            [
                'name' => 'Furniture & Decor',
                'description' => 'Furniture items, decorations, and interior accessories',
                'icon' => 'sofa',
                'color' => '#7C2D12', // Brown
                'is_active' => true,
            ],
        ];

        foreach ($categories as $categoryData) {
            $slug = Str::slug($categoryData['name']);
            
            InventoryCategory::create([
                'name' => $categoryData['name'],
                'slug' => $slug,
                'description' => $categoryData['description'],
                'icon' => $categoryData['icon'],
                'color' => $categoryData['color'],
                'category_type' => $this->getCategoryType($categoryData['name']),
                'is_active' => $categoryData['is_active'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("Created inventory category: {$categoryData['name']}");
        }
    }
    
    private function getCategoryType($name)
    {
        $typeMap = [
            'Cleaning Supplies' => 'cleaning_supplies',
            'Bed & Bath Linens' => 'linens_towels',
            'Toiletries' => 'guest_amenities',
            'Kitchen Supplies' => 'kitchen_supplies',
            'Maintenance Tools' => 'maintenance_tools',
            'Electronics' => 'electronics',
            'Safety Equipment' => 'safety_equipment',
            'Furniture & Decor' => 'furniture',
        ];
        
        return $typeMap[$name] ?? 'consumables';

        $this->command->info('Inventory category seeder completed successfully!');
    }
}
