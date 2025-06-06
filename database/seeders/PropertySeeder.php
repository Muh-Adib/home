<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PropertySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $properties = [
            [
                'owner_id' => 2, // Property Owner
                'name' => 'Villa Sunset Bali',
                'description' => 'Beautiful villa with stunning sunset views in the heart of Canggu, Bali. Perfect for families and groups looking for a peaceful retreat with modern amenities.',
                'address' => 'Jl. Pantai Berawa No. 88, Canggu, Badung, Bali 80361',
                'lat' => -8.648270,
                'lng' => 115.137874,
                'capacity' => 8,
                'capacity_max' => 12,
                'bedroom_count' => 4,
                'bathroom_count' => 3,
                'base_rate' => 1500000,
                'weekend_premium_percent' => 30,
                'cleaning_fee' => 200000,
                'extra_bed_rate' => 150000,
                'status' => 'active',
                'house_rules' => 'No smoking inside, No pets allowed, Quiet hours after 10 PM',
                'check_in_time' => '15:00:00',
                'check_out_time' => '11:00:00',
                'min_stay_weekday' => 2,
                'min_stay_weekend' => 3,
                'min_stay_peak' => 5,
                'is_featured' => true,
                'sort_order' => 1,
                'seo_title' => 'Villa Sunset Bali - Luxury Villa Rental in Canggu',
                'seo_description' => 'Book luxury villa in Canggu Bali with stunning sunset views, private pool, and modern amenities. Perfect for family vacation.',
            ],
            [
                'owner_id' => 2,
                'name' => 'Jogja Heritage House',
                'description' => 'Traditional Javanese house with modern comfort in the cultural heart of Yogyakarta. Walking distance to Malioboro Street and Sultan Palace.',
                'address' => 'Jl. Prawirotaman II No. 15, Mergangsan, Yogyakarta 55153',
                'lat' => -7.803982,
                'lng' => 110.365067,
                'capacity' => 6,
                'capacity_max' => 8,
                'bedroom_count' => 3,
                'bathroom_count' => 2,
                'base_rate' => 800000,
                'weekend_premium_percent' => 25,
                'cleaning_fee' => 100000,
                'extra_bed_rate' => 75000,
                'status' => 'active',
                'house_rules' => 'Respect local culture, Remove shoes inside, No loud music after 9 PM',
                'check_in_time' => '14:00:00',
                'check_out_time' => '12:00:00',
                'min_stay_weekday' => 1,
                'min_stay_weekend' => 2,
                'min_stay_peak' => 3,
                'is_featured' => true,
                'sort_order' => 2,
                'seo_title' => 'Jogja Heritage House - Traditional Stay in Yogyakarta',
                'seo_description' => 'Experience authentic Javanese culture in our heritage house. Near Malioboro and cultural attractions.',
            ],
            [
                'owner_id' => 2,
                'name' => 'Bandung Mountain Retreat',
                'description' => 'Cozy mountain villa with panoramic views of Bandung city and tea plantations. Perfect for weekend getaway and family gatherings.',
                'address' => 'Jl. Raya Lembang No. 234, Lembang, Bandung Barat 40391',
                'lat' => -6.811463,
                'lng' => 107.617943,
                'capacity' => 10,
                'capacity_max' => 14,
                'bedroom_count' => 5,
                'bathroom_count' => 4,
                'base_rate' => 1200000,
                'weekend_premium_percent' => 35,
                'cleaning_fee' => 150000,
                'extra_bed_rate' => 100000,
                'status' => 'active',
                'house_rules' => 'No smoking, Keep noise levels down, Clean up after BBQ use',
                'check_in_time' => '15:00:00',
                'check_out_time' => '11:00:00',
                'min_stay_weekday' => 1,
                'min_stay_weekend' => 2,
                'min_stay_peak' => 3,
                'is_featured' => false,
                'sort_order' => 3,
                'seo_title' => 'Bandung Mountain Retreat - Villa with City Views',
                'seo_description' => 'Mountain villa in Lembang with stunning Bandung city views. Perfect for family vacation and group gatherings.',
            ],
            [
                'owner_id' => 2,
                'name' => 'Jakarta Urban Loft',
                'description' => 'Modern loft apartment in South Jakarta with skyline views. Convenient access to shopping malls, restaurants, and business district.',
                'address' => 'Jl. HR Rasuna Said Kav. C-5, Setiabudi, Jakarta Selatan 12920',
                'lat' => -6.221574,
                'lng' => 106.820465,
                'capacity' => 4,
                'capacity_max' => 6,
                'bedroom_count' => 2,
                'bathroom_count' => 2,
                'base_rate' => 900000,
                'weekend_premium_percent' => 20,
                'cleaning_fee' => 120000,
                'extra_bed_rate' => 125000,
                'status' => 'active',
                'house_rules' => 'No parties, No smoking, Visitor registration required',
                'check_in_time' => '15:00:00',
                'check_out_time' => '12:00:00',
                'min_stay_weekday' => 1,
                'min_stay_weekend' => 1,
                'min_stay_peak' => 2,
                'is_featured' => false,
                'sort_order' => 4,
                'seo_title' => 'Jakarta Urban Loft - Modern Stay in South Jakarta',
                'seo_description' => 'Stylish loft apartment in South Jakarta with city views. Perfect for business travelers and short stays.',
            ],
            [
                'owner_id' => 2,
                'name' => 'Lombok Beach House',
                'description' => 'Beachfront villa with direct access to pristine white sand beach. Snorkeling, diving, and water sports activities available.',
                'address' => 'Jl. Pantai Senggigi, Senggigi, Lombok Barat, NTB 83355',
                'lat' => -8.488297,
                'lng' => 116.042389,
                'capacity' => 6,
                'capacity_max' => 8,
                'bedroom_count' => 3,
                'bathroom_count' => 3,
                'base_rate' => 1800000,
                'weekend_premium_percent' => 40,
                'cleaning_fee' => 250000,
                'extra_bed_rate' => 200000,
                'status' => 'maintenance',
                'house_rules' => 'No shoes on beach deck, Rinse off sand before entering, Respect marine environment',
                'check_in_time' => '15:00:00',
                'check_out_time' => '11:00:00',
                'min_stay_weekday' => 2,
                'min_stay_weekend' => 3,
                'min_stay_peak' => 5,
                'is_featured' => true,
                'sort_order' => 5,
                'seo_title' => 'Lombok Beach House - Beachfront Villa in Senggigi',
                'seo_description' => 'Direct beachfront access villa in Lombok with water sports. Perfect for beach lovers and diving enthusiasts.',
            ],
        ];

        foreach ($properties as $propertyData) {
            $propertyData['slug'] = Str::slug($propertyData['name']);
            $propertyData['created_at'] = now();
            $propertyData['updated_at'] = now();
            
            $propertyId = DB::table('properties')->insertGetId($propertyData);
            
            // Add some amenities to each property
            $amenityIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Common amenities
            
            foreach ($amenityIds as $amenityId) {
                DB::table('property_amenities')->insert([
                    'property_id' => $propertyId,
                    'amenity_id' => $amenityId,
                    'is_available' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
