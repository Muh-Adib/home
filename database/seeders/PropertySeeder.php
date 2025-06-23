<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Property;
use App\Models\User;

class PropertySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get existing property owners
        $owners = User::where('role', 'property_owner')->get();
        
        if ($owners->isEmpty()) {
            $this->command->warn('No property owners found. Creating sample properties without owners.');
        }

        $properties = [
            [
                'name' => 'Villa Sunset Paradise',
                'description' => 'Luxury beachfront villa with stunning sunset views. Perfect for romantic getaways and family vacations.',
                'address' => 'Jl. Pantai Sunset No. 123, Canggu, Badung, Bali',
                'capacity' => 6,
                'capacity_max' => 8,
                'bedroom_count' => 3,
                'bathroom_count' => 2,
                'base_rate' => 1500000,
                'extra_bed_rate' => 200000,
                'is_featured' => true,
            ],
            [
                'name' => 'Mountain View Homestay',
                'description' => 'Cozy homestay nestled in the mountains with breathtaking views and cool fresh air.',
                'address' => 'Jl. Gunung Merapi No. 456, Kintamani, Bangli, Bali',
                'capacity' => 4,
                'capacity_max' => 6,
                'bedroom_count' => 2,
                'bathroom_count' => 1,
                'base_rate' => 800000,
                'extra_bed_rate' => 150000,
                'is_featured' => true,
            ],
            [
                'name' => 'Urban Loft Downtown',
                'description' => 'Modern loft in the heart of the city. Walking distance to restaurants, shops, and entertainment.',
                'address' => 'Jl. Sudirman No. 789, Denpasar, Bali',
                'capacity' => 2,
                'capacity_max' => 4,
                'bedroom_count' => 1,
                'bathroom_count' => 1,
                'base_rate' => 600000,
                'extra_bed_rate' => 100000,
                'is_featured' => false,
            ],
            [
                'name' => 'Traditional Javanese House',
                'description' => 'Authentic traditional house with modern amenities. Experience local culture in comfort.',
                'address' => 'Jl. Malioboro No. 321, Yogyakarta',
                'capacity' => 8,
                'capacity_max' => 10,
                'bedroom_count' => 4,
                'bathroom_count' => 3,
                'base_rate' => 1200000,
                'extra_bed_rate' => 180000,
                'is_featured' => true,
            ],
            [
                'name' => 'Beachside Bungalow',
                'description' => 'Charming bungalow just steps from the beach. Wake up to the sound of waves.',
                'address' => 'Jl. Pantai Kuta No. 654, Kuta, Badung, Bali',
                'capacity' => 4,
                'capacity_max' => 5,
                'bedroom_count' => 2,
                'bathroom_count' => 2,
                'base_rate' => 900000,
                'extra_bed_rate' => 120000,
                'is_featured' => false,
            ],
        ];

        foreach ($properties as $index => $propertyData) {
            // Create unique slug with timestamp to avoid duplicates
            $baseSlug = Str::slug($propertyData['name']);
            $slug = $baseSlug;
            
            // Check if slug exists and append timestamp if needed
            $counter = 1;
            while (Property::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . time() . '-' . $counter;
                $counter++;
            }

            // Assign owner if available
            $owner = $owners->get($index % $owners->count());
            
            Property::create([
                'name' => $propertyData['name'],
                'slug' => $slug,
                'description' => $propertyData['description'],
                'address' => $propertyData['address'],
                'capacity' => $propertyData['capacity'],
                'capacity_max' => $propertyData['capacity_max'],
                'bedroom_count' => $propertyData['bedroom_count'],
                'bathroom_count' => $propertyData['bathroom_count'],
                'base_rate' => $propertyData['base_rate'],
                'extra_bed_rate' => $propertyData['extra_bed_rate'],
                'is_featured' => $propertyData['is_featured'],
                'owner_id' => $owner?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("Created property: {$propertyData['name']} with slug: {$slug}");
        }

        $this->command->info('Property seeder completed successfully!');
    }
}
