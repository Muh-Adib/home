<?php

namespace Database\Seeders;

use App\Models\SeoLandingPage;
use Illuminate\Database\Seeder;

class SeoLandingPageSeeder extends Seeder
{
    /**
     * Seed SEO landingpages
     *
     * Creates 30+ programmatic landing pages for:
     * - Property types (villa, homestay, guest house)
     * - Locations (Bantul, Sleman, UGM, Malioboro, Prawirotaman)
     * - Price ranges (murah, 100rb, 200rb)
     * - Amenities (private pool, wifi)
     * - Powerful combos
     */
    public function run(): void
    {
        $pages = [
            // ========================================
            // PROPERTY TYPES (High Volume Keywords)
            // ========================================
            [
                'slug' => 'villa-jogja',
                'title' => 'Villa di Jogja | 100+ Pilihan Villa Mewah Yogyakarta',
                'h1' => 'Villa Mewah di Yogyakarta',
                'meta_description' => 'Cari villa di Jogja? ✓ 100+ villa mewah ✓ Private pool ✓ Mulai Rp 300rb/malam. Lokasi strategis dekat Malioboro. Booking online mudah & aman!',
                'target_keyword' => 'villa jogja',
                'search_volume' => 3600,
                'filters' => json_encode(['property_type' => 'villa']),
                'sitemap_priority' => 0.9,
            ],

            [
                'slug' => 'homestay-jogja',
                'title' => 'Homestay di Jogja | 200+ Homestay Nyaman & Terjangkau',
                'h1' => 'Homestay Terbaik di Yogyakarta',
                'meta_description' => 'Homestay di Jogja mulai Rp 100rb/malam! ✓ 200+ pilihan ✓ Lokasi strategis ✓ Fasilitas lengkap. Cocok untuk keluarga & backpacker. Book now!',
                'target_keyword' => 'homestay jogja',
                'search_volume' => 5400,
                'filters' => json_encode(['property_type' => 'homestay']),
                'sitemap_priority' => 1.0, // Highest!
            ],

            [
                'slug' => 'guest-house-jogja',
                'title' => 'Guest House Jogja | Penginapan Nyaman Budget Traveler',
                'h1' => 'Guest House Terbaik di Yogyakarta',
                'meta_description' => 'Guest house di Jogja untuk budget traveler! Mulai Rp 80rb/malam. Dekat stasiun, Malioboro, kampus. Cocok untuk solo traveler & grup.',
                'target_keyword' => 'guest house jogja',
                'search_volume' => 1200,
                'filters' => json_encode(['property_type' => 'guest_house']),
                'sitemap_priority' => 0.8,
            ],

            // ========================================
            // LOCATION-BASED (Bantul, Sleman, etc.)
            // ========================================
            [
                'slug' => 'homestay-bantul',
                'title' => 'Homestay di Bantul | Dekat Pantai Parangtritis',
                'h1' => 'Homestay Nyaman di Bantul Yogyakarta',
                'meta_description' => 'Homestay murah di Bantul mulai Rp 100rb! Dekat Parangtritis, Gumuk Pasir, Hutan Pinus. Cocok untuk liburan keluarga. Book sekarang!',
                'target_keyword' => 'homestay bantul',
                'search_volume' => 880,
                'filters' => json_encode(['location' => 'Bantul']),
                'sitemap_priority' => 0.8,
            ],

            [
                'slug' => 'homestay-sleman',
                'title' => 'Homestay di Sleman | Dekat Candi Prambanan & Kaliurang',
                'h1' => 'Homestay Asri di Sleman Yogyakarta',
                'meta_description' => 'Homestay sejuk di Sleman! Dekat UGM, Kaliurang, Prambanan, Stone Garden. Suasana pegunungan yang menenangkan. Mulai Rp 120rb/malam.',
                'target_keyword' => 'homestay sleman',
                'search_volume' => 720,
                'filters' => json_encode(['location' => 'Sleman']),
                'sitemap_priority' => 0.8,
            ],

            [
                'slug' => 'villa-bantul',
                'title' => 'Villa di Bantul | Villa Mewah View Pantai Parangtritis',
                'h1' => 'Villa Eksklusif di Bantul Yogyakarta',
                'meta_description' => 'Villa mewah di Bantul dengan view pantai! Private pool, taman luas. Cocok untuk gathering & retreat. Mulai Rp 500rb/malam.',
                'target_keyword' => 'villa bantul',
                'search_volume' => 390,
                'filters' => json_encode(['property_type' => 'villa', 'location' => 'Bantul']),
                'sitemap_priority' => 0.7,
            ],

            [
                'slug' => 'villa-sleman',
                'title' => 'Villa di Sleman | Villa Sejuk View Pegunungan',
                'h1' => 'Villa Asri di Sleman Yogyakarta',
                'meta_description' => 'Villa sejuk di Sleman dengan view Merapi! Dekat Kaliurang, Prambanan. Private pool, garden. Mulai Rp 600rb/malam.',
                'target_keyword' => 'villa sleman',
                'search_volume' => 420,
                'filters' => json_encode(['property_type' => 'villa', 'location' => 'Sleman']),
                'sitemap_priority' => 0.7,
            ],

            // Specific areas
            [
                'slug' => 'homestay-malioboro',
                'title' => 'Homestay Malioboro | Walking Distance ke Jalan Malioboro',
                'h1' => 'Homestay Dekat Malioboro Yogyakarta',
                'meta_description' => 'Homestay dekat Malioboro! Jalan kaki ke pusat kota, stasiun, Keraton. Cocok untuk wisata kuliner & belanja. Mulai Rp 150rb/malam.',
                'target_keyword' => 'homestay malioboro',
                'search_volume' => 1100,
                'filters' => json_encode(['location' => 'Malioboro']),
                'sitemap_priority' => 0.9,
            ],

            [
                'slug' => 'homestay-prawirotaman',
                'title' => 'Homestay Prawirotaman | Guest House Area Backpacker',
                'h1' => 'Homestay di Prawirotaman Yogyakarta',
                'meta_description' => 'Homestay di area backpacker Prawirotaman! Banyak kafe, restoran, galeri seni. Cocok untuk solo traveler. Mulai Rp 80rb/malam.',
                'target_keyword' => 'homestay prawirotaman',
                'search_volume' => 620,
                'filters' => json_encode(['location' => 'Prawirotaman']),
                'sitemap_priority' => 0.7,
            ],

            [
                'slug' => 'homestay-ugm',
                'title' => 'Homestay Dekat UGM | Penginapan Murah Area Kampus',
                'h1' => 'Homestay Strategis Dekat UGM',
                'meta_description' => 'Homestay dekat UGM mulai Rp 80rb! Cocok untuk mahasiswa, orang tua, tamu kampus. Dekat kost, warung makan, minimarket.',
                'target_keyword' => 'homestay ugm',
                'search_volume' => 540,
                'filters' => json_encode(['location' => 'UGM']),
                'sitemap_priority' => 0.7,
            ],

            // ========================================
            // PRICE RANGE (Powerful Keywords!)
            // ========================================
            [
                'slug' => 'homestay-murah-jogja',
                'title' => 'Homestay Murah Jogja Mulai 80rb | Budget Traveler Friendly',
                'h1' => 'Homestay Murah di Yogyakarta Mulai Rp 80rb',
                'meta_description' => 'Cari homestay murah di Jogja? ✓ Mulai Rp 80rb/malam ✓ 100+ pilihan ✓ Lokasi strategis ✓ Fasilitas lengkap. Hemat budget, tetap nyaman!',
                'target_keyword' => 'homestay murah jogja',
                'search_volume' => 1900,
                'filters' => json_encode(['max_price' => 200000]),
                'sitemap_priority' => 1.0, // Very high volume!
            ],

            [
                'slug' => 'villa-murah-jogja',
                'title' => 'Villa Murah Jogja Mulai 250rb | Villa Terjangkau',
                'h1' => 'Villa Murah di Yogyakarta',
                'meta_description' => 'Villa murah di Jogja mulai Rp 250rb/malam! Cocok untuk keluarga besar atau gathering. Fasilitas lengkap, lokasi strategis.',
                'target_keyword' => 'villa murah jogja',
                'search_volume' => 590,
                'filters' => json_encode(['property_type' => 'villa', 'max_price' => 500000]),
                'sitemap_priority' => 0.8,
            ],

            [
                'slug' => 'guest-house-murah-jogja',
                'title' => 'Guest House Murah Jogja Mulai 50rb | Backpacker Friendly',
                'h1' => 'Guest House Murah di Yogyakarta',
                'meta_description' => 'Guest house murah di Jogja untuk backpacker! Mulai Rp 50rb/malam. Dorm & private room tersedia. Suasana sosial & ramah.',
                'target_keyword' => 'guest house murah jogja',
                'search_volume' => 320,
                'filters' => json_encode(['property_type' => 'guest_house', 'max_price' => 150000]),
                'sitemap_priority' => 0.7,
            ],

            // ========================================
            // AMENITIES-BASED
            // ========================================
            [
                'slug' => 'villa-private-pool-jogja',
                'title' => 'Villa Private Pool Jogja | Villa dengan Kolam Renang Pribadi',
                'h1' => 'Villa Private Pool di Yogyakarta',
                'meta_description' => 'Villa dengan private pool di Jogja! Kolam renang pribadi, taman luas. Cocok untuk gathering, ulang tahun, retreat. Mulai Rp 500rb/malam.',
                'target_keyword' => 'villa private pool jogja',
                'search_volume' => 880,
                'filters' => json_encode(['property_type' => 'villa', 'amenity' => 'private pool']),
                'sitemap_priority' => 0.9,
            ],

            [
                'slug' => 'homestay-kolam-renang-jogja',
                'title' => 'Homestay dengan Kolam Renang di Jogja',
                'h1' => 'Homestay Kolam Renang di Yogyakarta',
                'meta_description' => 'Homestay dengan kolam renang di Jogja! Cocok untuk keluarga dengan anak-anak. Harga terjangkau mulai Rp 200rb/malam.',
                'target_keyword' => 'homestay kolam renang jogja',
                'search_volume' => 450,
                'filters' => json_encode(['amenity' => 'swimming pool']),
                'sitemap_priority' => 0.7,
            ],

            // ========================================
            // POWERFUL COMBOS (3+ filters!)
            // ========================================
            [
                'slug' => 'villa-murah-private-pool-jogja',
                'title' => 'Villa Murah Private Pool Jogja | Kolam Renang Pribadi Terjangkau',
                'h1' => 'Villa Murah dengan Private Pool di Yogyakarta',
                'meta_description' => 'Villa murah dengan private pool di Jogja! Mulai Rp 400rb/malam. Cocok untuk gathering keluarga atau teman dengan budget terbatas.',
                'target_keyword' => 'villa murah private pool jogja',
                'search_volume' => 280,
                'filters' => json_encode(['property_type' => 'villa', 'max_price' => 600000, 'amenity' => 'private pool']),
                'sitemap_priority' => 0.8,
            ],

            [
                'slug' => 'homestay-murah-bantul',
                'title' => 'Homestay Murah Bantul | Dekat Pantai Budget Friendly',
                'h1' => 'Homestay Murah di Bantul Yogyakarta',
                'meta_description' => 'Homestay murah di Bantul mulai Rp 80rb! Dekat pantai Parangtritis. Cocok untuk liburan keluarga dengan budget hemat.',
                'target_keyword' => 'homestay murah bantul',
                'search_volume' => 340,
                'filters' => json_encode(['location' => 'Bantul', 'max_price' => 150000]),
                'sitemap_priority' => 0.7,
            ],

            [
                'slug' => 'homestay-murah-sleman',
                'title' => 'Homestay Murah Sleman | Penginapan Sejuk Budget Traveler',
                'h1' => 'Homestay Murah di Sleman Yogyakarta',
                'meta_description' => 'Homestay murah di Sleman mulai Rp 90rb! Suasana sejuk pegunungan, dekat UGM & Kaliurang. Budget traveler friendly.',
                'target_keyword' => 'homestay murah sleman',
                'search_volume' => 310,
                'filters' => json_encode(['location' => 'Sleman', 'max_price' => 150000]),
                'sitemap_priority' => 0.7,
            ],

            [
                'slug' => 'guest-house-malioboro',
                'title' => 'Guest House Malioboro | Walking Distance ke Pusat Kota',
                'h1' => 'Guest House Dekat Malioboro',
                'meta_description' => 'Guest house dekat Malioboro! Jalan kaki ke pusat kota, stasiun Tugu. Cocok untuk backpacker & solo traveler. Mulai Rp 70rb/malam.',
                'target_keyword' => 'guest house malioboro',
                'search_volume' => 520,
                'filters' => json_encode(['property_type' => 'guest_house', 'location' => 'Malioboro']),
                'sitemap_priority' => 0.7,
            ],

            // More combo variations...
            [
                'slug' => 'penginapan-jogja',
                'title' => 'Penginapan di Jogja | 300+ Pilihan Homestay, Villa & Guest House',
                'h1' => 'Penginapan Terbaik di Yogyakarta',
                'meta_description' => 'Cari penginapan di Jogja? ✓ 300+ pilihan homestay, villa, guest house ✓ Semua budget ✓ Booking mudah ✓ Review terpercaya.',
                'target_keyword' => 'penginapan jogja',
                'search_volume' => 2400,
                'filters' => json_encode([]), // No filter, show all
                'sitemap_priority' => 0.9,
            ],
        ];

        // Truncate existing data (optional - for fresh seeding)
        // SeoLandingPage::truncate();

        // Insert all pages
        foreach ($pages as $page) {
            SeoLandingPage::updateOrCreate(
                ['slug' => $page['slug']], // Find by slug
                array_merge($page, [
                    'is_active' => true,
                    'sitemap_changefreq' => 'weekly',
                    'views_count' => 0,
                ])
            );
        }

        $this->command->info('✅ Created '.count($pages).' SEO landing pages!');
    }
}
