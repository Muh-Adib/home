<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\User;
use Illuminate\Support\Str;

class SampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create a sample owner if doesn't exist
        $owner = User::firstOrCreate(
            ['email' => 'owner@example.com'],
            [
                'name' => 'Property Owner',
                'password' => bcrypt('password'),
                'role' => 'property_owner',
                'email_verified_at' => now(),
            ]
        );

        // Sample properties data
        $properties = [
            [
                'name' => 'Luxury Villa Bali',
                'description' => 'Villa mewah dengan pemandangan laut yang menakjubkan di Bali. Dilengkapi dengan kolam renang pribadi, taman tropis, dan akses langsung ke pantai. Cocok untuk liburan keluarga atau bulan madu yang tak terlupakan.',
                'address' => 'Jl. Pantai Kuta No. 123, Bali',
                'lat' => -8.7216,
                'lng' => 115.1687,
                'capacity' => 6,
                'capacity_max' => 8,
                'bedroom_count' => 3,
                'bathroom_count' => 3,
                'base_rate' => 2800000,
                'weekend_premium_percent' => 25,
                'cleaning_fee' => 200000,
                'extra_bed_rate' => 150000,
                'is_featured' => true,
            ],
            [
                'name' => 'Modern Apartment Jakarta',
                'description' => 'Apartemen modern di jantung kota Jakarta dengan fasilitas lengkap. Dekat dengan pusat perbelanjaan, restoran, dan transportasi umum. Ideal untuk perjalanan bisnis atau wisata kota.',
                'address' => 'Jl. Sudirman No. 456, Jakarta Pusat',
                'lat' => -6.2088,
                'lng' => 106.8456,
                'capacity' => 4,
                'capacity_max' => 6,
                'bedroom_count' => 2,
                'bathroom_count' => 2,
                'base_rate' => 1200000,
                'weekend_premium_percent' => 20,
                'cleaning_fee' => 100000,
                'extra_bed_rate' => 100000,
                'is_featured' => true,
            ],
            [
                'name' => 'Beachfront Resort Lombok',
                'description' => 'Resort tepi pantai yang eksklusif di Lombok dengan pemandangan sunset yang memukau. Menawarkan pengalaman menginap yang tenang dan damai jauh dari keramaian kota.',
                'address' => 'Pantai Senggigi, Lombok Barat',
                'lat' => -8.4956,
                'lng' => 116.0429,
                'capacity' => 8,
                'capacity_max' => 10,
                'bedroom_count' => 4,
                'bathroom_count' => 4,
                'base_rate' => 2500000,
                'weekend_premium_percent' => 30,
                'cleaning_fee' => 250000,
                'extra_bed_rate' => 200000,
                'is_featured' => true,
            ],
            [
                'name' => 'Mountain Retreat Bandung',
                'description' => 'Villa pegunungan yang sejuk di Bandung dengan udara segar dan pemandangan alam yang indah. Sempurna untuk retreat keluarga atau gathering perusahaan.',
                'address' => 'Jl. Raya Lembang No. 789, Bandung',
                'lat' => -6.8168,
                'lng' => 107.6135,
                'capacity' => 10,
                'capacity_max' => 12,
                'bedroom_count' => 5,
                'bathroom_count' => 4,
                'base_rate' => 1800000,
                'weekend_premium_percent' => 35,
                'cleaning_fee' => 150000,
                'extra_bed_rate' => 120000,
                'is_featured' => false,
            ],
            [
                'name' => 'Heritage House Yogyakarta',
                'description' => 'Rumah tradisional Jawa yang telah direnovasi dengan fasilitas modern. Berlokasi strategis dekat dengan Malioboro dan Keraton Yogyakarta.',
                'address' => 'Jl. Malioboro No. 321, Yogyakarta',
                'lat' => -7.7956,
                'lng' => 110.3695,
                'capacity' => 6,
                'capacity_max' => 8,
                'bedroom_count' => 3,
                'bathroom_count' => 3,
                'base_rate' => 1500000,
                'weekend_premium_percent' => 25,
                'cleaning_fee' => 120000,
                'extra_bed_rate' => 100000,
                'is_featured' => false,
            ],
            [
                'name' => 'Tropical Garden Villa Ubud',
                'description' => 'Villa dengan taman tropis yang asri di Ubud, Bali. Dikelilingi oleh sawah dan hutan bambu yang memberikan suasana tenang dan spiritual.',
                'address' => 'Jl. Monkey Forest Road, Ubud, Bali',
                'lat' => -8.5069,
                'lng' => 115.2625,
                'capacity' => 4,
                'capacity_max' => 6,
                'bedroom_count' => 2,
                'bathroom_count' => 2,
                'base_rate' => 2200000,
                'weekend_premium_percent' => 30,
                'cleaning_fee' => 180000,
                'extra_bed_rate' => 130000,
                'is_featured' => true,
            ],
        ];

        foreach ($properties as $propertyData) {
            $property = Property::create([
                'owner_id' => $owner->id,
                'name' => $propertyData['name'],
                'slug' => Str::slug($propertyData['name']),
                'description' => $propertyData['description'],
                'address' => $propertyData['address'],
                'lat' => $propertyData['lat'],
                'lng' => $propertyData['lng'],
                'capacity' => $propertyData['capacity'],
                'capacity_max' => $propertyData['capacity_max'],
                'bedroom_count' => $propertyData['bedroom_count'],
                'bathroom_count' => $propertyData['bathroom_count'],
                'base_rate' => $propertyData['base_rate'],
                'weekend_premium_percent' => $propertyData['weekend_premium_percent'],
                'cleaning_fee' => $propertyData['cleaning_fee'],
                'extra_bed_rate' => $propertyData['extra_bed_rate'],
                'status' => 'active',
                'is_featured' => $propertyData['is_featured'],
                'check_in_time' => '14:00:00',
                'check_out_time' => '12:00:00',
                'min_stay_weekday' => 1,
                'min_stay_weekend' => 2,
                'min_stay_peak' => 3,
            ]);

            // Create sample media for each property
            $mediaData = [
                [
                    'file_name' => 'cover.jpg',
                    'file_path' => '/images/properties/' . Str::slug($propertyData['name']) . '/cover.jpg',
                    'file_size' => 1024000,
                    'mime_type' => 'image/jpeg',
                    'media_type' => 'image',
                    'category' => 'exterior',
                    'is_cover' => true,
                    'is_featured' => true,
                    'display_order' => 1,
                    'alt_text' => $propertyData['name'] . ' - Main View',
                ],
                [
                    'file_name' => 'bedroom.jpg',
                    'file_path' => '/images/properties/' . Str::slug($propertyData['name']) . '/bedroom.jpg',
                    'file_size' => 1024000,
                    'mime_type' => 'image/jpeg',
                    'media_type' => 'image',
                    'category' => 'bedroom',
                    'is_cover' => false,
                    'is_featured' => true,
                    'display_order' => 2,
                    'alt_text' => $propertyData['name'] . ' - Bedroom',
                ],
                [
                    'file_name' => 'bathroom.jpg',
                    'file_path' => '/images/properties/' . Str::slug($propertyData['name']) . '/bathroom.jpg',
                    'file_size' => 1024000,
                    'mime_type' => 'image/jpeg',
                    'media_type' => 'image',
                    'category' => 'bathroom',
                    'is_cover' => false,
                    'is_featured' => false,
                    'display_order' => 3,
                    'alt_text' => $propertyData['name'] . ' - Bathroom',
                ],
                [
                    'file_name' => 'exterior.jpg',
                    'file_path' => '/images/properties/' . Str::slug($propertyData['name']) . '/exterior.jpg',
                    'file_size' => 1024000,
                    'mime_type' => 'image/jpeg',
                    'media_type' => 'image',
                    'category' => 'exterior',
                    'is_cover' => false,
                    'is_featured' => true,
                    'display_order' => 4,
                    'alt_text' => $propertyData['name'] . ' - Exterior View',
                ],
            ];

            foreach ($mediaData as $media) {
                PropertyMedia::create([
                    'property_id' => $property->id,
                    'file_name' => $media['file_name'],
                    'file_path' => $media['file_path'],
                    'file_size' => $media['file_size'],
                    'mime_type' => $media['mime_type'],
                    'media_type' => $media['media_type'],
                    'category' => $media['category'],
                    'is_cover' => $media['is_cover'],
                    'is_featured' => $media['is_featured'],
                    'display_order' => $media['display_order'],
                    'alt_text' => $media['alt_text'],
                ]);
            }
        }

        $this->command->info('Sample properties and media created successfully!');
    }
}
