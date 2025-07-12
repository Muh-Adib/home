<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Amenity;

class AmenitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $amenities = [
            // Basic Amenities
            ['name' => 'WiFi', 'icon' => 'wifi', 'category' => 'basic', 'description' => 'High-speed internet connection', 'sort_order' => 1],
            ['name' => 'Air Conditioning', 'icon' => 'snowflake', 'category' => 'basic', 'description' => 'Climate control system', 'sort_order' => 2],
            ['name' => 'Parking', 'icon' => 'car', 'category' => 'basic', 'description' => 'Free parking space', 'sort_order' => 3],
            ['name' => 'TV', 'icon' => 'tv', 'category' => 'basic', 'description' => 'Smart TV with cable channels', 'sort_order' => 4],
            ['name' => 'Towels & Linens', 'icon' => 'shirt', 'category' => 'basic', 'description' => 'Fresh towels and bed linens', 'sort_order' => 5],
            ['name' => 'Bathtub', 'icon' => 'bathtub', 'category' => 'basic', 'description' => 'Private bathtub', 'sort_order' => 6],
            ['name' => 'Shower', 'icon' => 'shower', 'category' => 'basic', 'description' => 'Private shower', 'sort_order' => 7],
            ['name' => 'Bed', 'icon' => 'bed', 'category' => 'basic', 'description' => 'Comfortable bed', 'sort_order' => 8],
            ['name' => 'Baby Friendly', 'icon' => 'baby', 'category' => 'basic', 'description' => 'Baby amenities available', 'sort_order' => 9],

            // Kitchen Amenities
            ['name' => 'Full Kitchen', 'icon' => 'chef-hat', 'category' => 'kitchen', 'description' => 'Complete kitchen with appliances', 'sort_order' => 10],
            ['name' => 'Refrigerator', 'icon' => 'refrigerator', 'category' => 'kitchen', 'description' => 'Full-size refrigerator', 'sort_order' => 11],
            ['name' => 'Microwave', 'icon' => 'microwave', 'category' => 'kitchen', 'description' => 'Microwave oven', 'sort_order' => 12],
            ['name' => 'Coffee Maker', 'icon' => 'coffee', 'category' => 'kitchen', 'description' => 'Coffee machine with supplies', 'sort_order' => 13],
            ['name' => 'Dining Table', 'icon' => 'utensils', 'category' => 'kitchen', 'description' => 'Dining area with table and chairs', 'sort_order' => 14],

            // Bathroom Amenities
            ['name' => 'Hot Water', 'icon' => 'droplets', 'category' => 'bathroom', 'description' => '24-hour hot water supply', 'sort_order' => 20],
            ['name' => 'Hair Dryer', 'icon' => 'wind', 'category' => 'bathroom', 'description' => 'Hair dryer available', 'sort_order' => 21],
            ['name' => 'Toiletries', 'icon' => 'droplet', 'category' => 'bathroom', 'description' => 'Basic toiletries provided', 'sort_order' => 22],

            // Entertainment & Recreation
            ['name' => 'Streaming Service', 'icon' => 'play', 'category' => 'entertainment', 'description' => 'Streaming services available', 'sort_order' => 30],
            ['name' => 'Sound System', 'icon' => 'speaker', 'category' => 'entertainment', 'description' => 'Bluetooth sound system', 'sort_order' => 31],
            ['name' => 'Games Console', 'icon' => 'gamepad-2', 'category' => 'entertainment', 'description' => 'Gaming console available', 'sort_order' => 32],
            ['name' => 'Library', 'icon' => 'book-open', 'category' => 'entertainment', 'description' => 'Book collection available', 'sort_order' => 33],
            ['name' => 'Game Room', 'icon' => 'target', 'category' => 'entertainment', 'description' => 'Dedicated game room', 'sort_order' => 34],
            ['name' => 'Kids Club', 'icon' => 'baby', 'category' => 'entertainment', 'description' => 'Kids entertainment area', 'sort_order' => 35],
            ['name' => 'Playground', 'icon' => 'trees', 'category' => 'entertainment', 'description' => 'Outdoor playground', 'sort_order' => 36],

            // Outdoor Amenities
            ['name' => 'Swimming Pool', 'icon' => 'waves', 'category' => 'outdoor', 'description' => 'Private or shared swimming pool', 'sort_order' => 40],
            ['name' => 'Garden', 'icon' => 'trees', 'category' => 'outdoor', 'description' => 'Beautiful garden area', 'sort_order' => 41],
            ['name' => 'BBQ Grill', 'icon' => 'flame', 'category' => 'outdoor', 'description' => 'Barbecue grill available', 'sort_order' => 42],
            ['name' => 'Outdoor Seating', 'icon' => 'armchair', 'category' => 'outdoor', 'description' => 'Outdoor furniture and seating', 'sort_order' => 43],
            ['name' => 'Beach Access', 'icon' => 'umbrella', 'category' => 'outdoor', 'description' => 'Direct access to beach', 'sort_order' => 44],
            ['name' => 'Mountain View', 'icon' => 'mountain', 'category' => 'outdoor', 'description' => 'Mountain scenery view', 'sort_order' => 45],
            ['name' => 'Sea View', 'icon' => 'waves', 'category' => 'outdoor', 'description' => 'Ocean view', 'sort_order' => 46],
            ['name' => 'City View', 'icon' => 'building-2', 'category' => 'outdoor', 'description' => 'City skyline view', 'sort_order' => 47],

            // Safety & Security
            ['name' => 'Security Camera', 'icon' => 'camera', 'category' => 'safety', 'description' => 'CCTV security system', 'sort_order' => 50],
            ['name' => 'Safe Box', 'icon' => 'lock', 'category' => 'safety', 'description' => 'In-room safe for valuables', 'sort_order' => 51],
            ['name' => 'First Aid Kit', 'icon' => 'heart-pulse', 'category' => 'safety', 'description' => 'Basic first aid supplies', 'sort_order' => 52],
            ['name' => 'Fire Safety', 'icon' => 'shield-check', 'category' => 'safety', 'description' => 'Fire safety equipment', 'sort_order' => 53],

            // Special Features
            ['name' => 'Honeymoon Suite', 'icon' => 'heart', 'category' => 'special', 'description' => 'Special honeymoon setup', 'sort_order' => 60],
            ['name' => 'Family Room', 'icon' => 'users', 'category' => 'special', 'description' => 'Spacious family accommodation', 'sort_order' => 61],
            ['name' => 'Smoking Area', 'icon' => 'cigarette', 'category' => 'special', 'description' => 'Designated smoking zone', 'sort_order' => 62],

            // Accessibility
            ['name' => 'Elevator', 'icon' => 'arrow-up', 'category' => 'accessibility', 'description' => 'Elevator access', 'sort_order' => 70],
            ['name' => 'Wheelchair Access', 'icon' => 'accessibility', 'category' => 'accessibility', 'description' => 'Wheelchair friendly facilities', 'sort_order' => 71],
            ['name' => 'Ramp Access', 'icon' => 'trending-up', 'category' => 'accessibility', 'description' => 'Ramp facilities available', 'sort_order' => 72],
        ];

        foreach ($amenities as $amenityData) {
            // Use updateOrCreate to avoid duplicate constraint violations
            $amenity = Amenity::updateOrCreate(
                ['name' => $amenityData['name']],
                $amenityData
            );
            
            $this->command->info("Created/Updated amenity: {$amenityData['name']}");
        }
    }
}
