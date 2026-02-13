<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\SeoLandingPage;
use App\Services\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SeoLandingController extends Controller
{
    public function __construct(
        private SeoService $seoService
    ) {
    }

    /**
     * Display SEO landing page
     */
    public function show(string $slug)
    {
        // Find active landing page
        $page = SeoLandingPage::active()
            ->where('slug', $slug)
            ->first();

        // 404 if page not found
        if (!$page) {
            abort(404);
        }

        // Increment view counter (async, non-blocking)
        $page->incrementViews();

        try {
            // Get filtered properties (using active() scope)
            $query = Property::active()
                ->with(['media', 'amenities']);

            // Apply landing page filters safely
            $filteredQuery = clone $query;
            $filteredQuery = $page->applyFiltersToQuery($filteredQuery);

            // Check if filtered query has results
            $filteredCount = $filteredQuery->count();

            // If no results from filter, fall back to showing all properties
            if ($filteredCount === 0) {
                // Use the original query (no filters)
                $properties = $query->orderBy('is_featured', 'desc')
                    ->orderBy('created_at', 'desc')
                    ->paginate(12);
            } else {
                // Use filtered query
                $properties = $filteredQuery->orderBy('is_featured', 'desc')
                    ->orderBy('created_at', 'desc')
                    ->paginate(12);
            }

            // Generate natural content with fallback
            try {
                $content = $this->generateNaturalContent($page, $properties->total());

                // Use intro_text from DB if set (admin override)
                if (!empty($page->intro_text)) {
                    $content['intro'] = $page->intro_text;
                }
            } catch (\Throwable $e) {
                \Log::warning("SEO Landing Content Generation Failed: " . $e->getMessage());
                $content = [
                    'intro' => $page->intro_text ?? "Temukan penginapan terbaik di Yogyakarta bersama Homsjogja.",
                    'whyChooseUs' => [],
                    'about' => $page->meta_description ?? "Homsjogja menyediakan homestay berkualitas.",
                    'tips' => [],
                    'locationDescription' => null,
                ];
            }

            // Generate custom FAQs with fallback
            try {
                $faqs = $this->generateFAQs($page, $properties->total());
            } catch (\Throwable $e) {
                \Log::warning("SEO Landing FAQ Generation Failed: " . $e->getMessage());
                $faqs = [];
            }

            // Prepare SEO data (match SeoService format + robots)
            $seo = [
                'title' => $page->title,
                'description' => $page->meta_description,
                'image' => asset('og-image.jpg'), // Default OG image
                'url' => $page->url,
                'type' => 'website',
                'robots' => 'index, follow', // Explicitly allow indexing
                // OpenGraph
                'og' => [
                    'title' => $page->title,
                    'description' => $page->meta_description,
                    'image' => asset('og-image.jpg'),
                    'url' => $page->url,
                    'type' => 'website',
                ],
                // Twitter
                'twitter' => [
                    'card' => 'summary_large_image',
                    'title' => $page->title,
                    'description' => $page->meta_description,
                    'image' => asset('og-image.jpg'),
                ],
            ];

            // Generate FAQ Schema (JSON-LD) for Google Rich Results
            $faqSchema = json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'FAQPage',
                'mainEntity' => array_map(fn($faq) => [
                    '@type' => 'Question',
                    'name' => $faq['question'],
                    'acceptedAnswer' => [
                        '@type' => 'Answer',
                        'text' => $faq['answer'],
                    ],
                ], $faqs),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            // Generate BreadcrumbList Schema
            $breadcrumbSchema = json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    [
                        '@type' => 'ListItem',
                        'position' => 1,
                        'name' => 'Home',
                        'item' => url('/'),
                    ],
                    [
                        '@type' => 'ListItem',
                        'position' => 2,
                        'name' => $page->target_keyword,
                        'item' => $page->url,
                    ],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            return Inertia::render('SeoLanding', [
                'page' => $page,
                'properties' => $properties,
                'content' => $content,
                'faqs' => $faqs,
                'seo' => $seo,
                'faqSchema' => $faqSchema,
                'breadcrumbSchema' => $breadcrumbSchema,
                'totalCount' => $properties->total(),
            ]);

        } catch (\Throwable $e) {
            \Log::error("SEO Landing Page Error: " . $e->getMessage());
            abort(500, "Terjadi kesalahan saat memuat halaman.");
        }
    }

    /**
     * Generate natural, human-like content for landing page
     * Optimized for Indonesian homestay searches
     */
    private function generateNaturalContent(SeoLandingPage $page, int $totalProperties): array
    {
        $keyword = $page->target_keyword ?? 'Homestay Jogja';
        $filters = $page->filters ?? [];

        // Extract filter details safely
        $propertyType = $this->getPropertyTypeText($filters['property_type'] ?? 'homestay');
        $location = $this->getLocationText($filters['location'] ?? 'Yogyakarta');
        $maxPrice = isset($filters['max_price']) ? (int) $filters['max_price'] : null;
        $amenity = $filters['amenity'] ?? null;

        // Generate intro paragraph (natural & conversational)
        $intro = $this->generateIntro($keyword, $propertyType, $location, $totalProperties, $maxPrice);

        // Why choose us section
        $whyChooseUs = $this->generateWhyChooseUs($propertyType, $location, $maxPrice, $amenity);

        // About section
        $about = $this->generateAbout($keyword, $propertyType, $location);

        // Booking tips
        $tips = $this->generateBookingTips($propertyType, $keyword);

        // Location description (if location-specific)
        $locationDescription = isset($filters['location'])
            ? $this->generateLocationDescription($filters['location'])
            : null;

        return [
            'intro' => $intro,
            'whyChooseUs' => $whyChooseUs,
            'about' => $about,
            'tips' => $tips,
            'locationDescription' => $locationDescription,
        ];
    }

    /**
     * Generate natural intro paragraph
     */
    private function generateIntro(string $keyword, string $propertyType, string $location, int $total, ?int $maxPrice): string
    {
        $priceText = $maxPrice ? "dengan budget hingga Rp " . number_format($maxPrice, 0, ',', '.') : "dengan berbagai pilihan harga";

        $intros = [
            "Sedang mencari {$keyword} untuk liburan atau perjalanan bisnis Anda? Homsjogja menyediakan {$total}+ pilihan {$propertyType} terbaik di {$location} {$priceText}. Semua properti sudah terverifikasi dengan foto asli dan review terpercaya.",

            "Temukan {$keyword} yang sempurna untuk kebutuhan Anda! Kami memiliki {$total}+ {$propertyType} berkualitas di {$location} {$priceText}. Nikmati kemudahan booking online dengan sistem yang aman dan terpercaya.",

            "Butuh {$keyword} untuk hari ini atau besok? Cek {$total}+ {$propertyType} tersedia di {$location} {$priceText}. Proses booking cepat, konfirmasi instan, dan customer service siap membantu 24/7.",
        ];

        return $intros[array_rand($intros)];
    }

    /**
     * Generate "Why Choose Us" benefits
     */
    private function generateWhyChooseUs(string $propertyType, string $location, ?int $maxPrice, ?string $amenity): array
    {
        $benefits = [
            "✓ Pilihan Terlengkap – Ratusan {$propertyType} di seluruh {$location}",
            "✓ Harga Terjangkau – Mulai dari Rp 100rb/malam" . ($maxPrice ? ", maksimal Rp " . number_format($maxPrice, 0, ',', '.') : ""),
            "✓ Lokasi Strategis – Dekat dengan wisata populer, pusat kota, dan transportasi umum",
            "✓ Booking Mudah – Proses pemesanan online 100% aman tanpa ribet",
            "✓ Customer Service – Tim kami siap membantu 24/7 via WhatsApp",
            "✓ Review Terpercaya – Semua review dari tamu asli yang sudah menginap",
        ];

        if ($amenity) {
            $benefits[] = "✓ Fasilitas Lengkap – Semua properti dilengkapi dengan {$amenity}";
        }

        return $benefits;
    }

    /**
     * Generate about section
     */
    private function generateAbout(string $keyword, string $propertyType, string $location): string
    {
        return "Homsjogja adalah platform booking {$keyword} terpercaya yang telah melayani ribuan tamu sejak 2020. Kami berkomitmen menyediakan {$propertyType} berkualitas di {$location} dengan harga yang kompetitif. Semua properti dalam daftar kami telah melalui proses verifikasi ketat untuk memastikan kenyamanan dan keamanan Anda selama menginap.";
    }

    /**
     * Generate booking tips
     */
    private function generateBookingTips(string $propertyType, string $keyword): array
    {
        return [
            'title' => "Tips Booking {$keyword} yang Tepat",
            'items' => [
                "Booking minimal 3-7 hari sebelumnya untuk mendapatkan harga terbaik dan pilihan properti lebih banyak",
                "Baca review dari tamu sebelumnya untuk mengetahui pengalaman nyata mereka",
                "Periksa foto properti secara detail – pastikan sesuai dengan kebutuhan Anda",
                "Konfirmasi fasilitas yang tersedia seperti WiFi, AC, parkir, dan dapur",
                "Tanyakan lokasi pasti dan jarak ke destinasi wisata yang ingin Anda kunjungi",
                "Manfaatkan promo long stay untuk menginap lebih dari 3 malam",
                "Hubungi customer service jika ada pertanyaan sebelum booking",
            ],
        ];
    }

    /**
     * Generate location-specific description
     */
    private function generateLocationDescription(string $location): array
    {
        $descriptions = [
            'Bantul' => [
                'title' => 'Tentang Bantul',
                'text' => 'Bantul adalah kabupaten di selatan Yogyakarta yang terkenal dengan pantai-pantai indahnya seperti Parangtritis, Parangkusumo, dan Gumuk Pasir. Menginap di Bantul cocok untuk Anda yang ingin menikmati suasana pantai sekaligus dekat dengan pusat kota Jogja. Jarak tempuh ke Malioboro hanya 30-45 menit berkendara.',
                'attractions' => ['Pantai Parangtritis', 'Gumuk Pasir', 'Hutan Pinus Mangunan', 'Tebing Breksi'],
            ],
            'Sleman' => [
                'title' => 'Tentang Sleman',
                'text' => 'Sleman adalah kawasan di utara Yogyakarta yang menawarkan suasana sejuk pegunungan. Cocok untuk Anda yang mencari ketenangan namun tetap dekat dengan berbagai destinasi wisata populer seperti Candi Prambanan, Kaliurang, dan Stone Garden. Area ini juga dekat dengan Universitas Gadjah Mada (UGM).',
                'attractions' => ['Candi Prambanan', 'Kaliurang', 'Stone Garden Cangkringan', 'The Lost World Castle'],
            ],
            'Malioboro' => [
                'title' => 'Tentang Malioboro',
                'text' => 'Malioboro adalah jantung kota Yogyakarta dan kawasan wisata paling ikonik. Menginap di sekitar Malioboro memberikan akses mudah ke berbagai tempat wisata, kuliner legendaris, dan pusat perbelanjaan. Cocok untuk traveler yang ingin merasakan kehidupan urban Jogja.',
                'attractions' => ['Jalan Malioboro', 'Keraton Yogyakarta', 'Taman Sari', 'Alun-Alun Kidul'],
            ],
            'Prawirotaman' => [
                'title' => 'Tentang Prawirotaman',
                'text' => 'Prawirotaman adalah kawasan backpacker favorit di Jogja dengan banyak kafe, restoran, dan galeri seni. Suasananya lebih tenang dibanding Malioboro tapi tetap strategis. Cocok untuk solo traveler, backpacker, atau yang mencari suasana artistik.',
                'attractions' => ['Kotagede', 'Museum Ullen Sentalu', 'Berbagai Kafe & Restoran', 'Pasar Beringharjo'],
            ],
        ];

        return $descriptions[$location] ?? [
            'title' => "Tentang {$location}",
            'text' => "{$location} adalah lokasi strategis di Yogyakarta dengan akses mudah ke berbagai destinasi wisata populer.",
            'attractions' => [],
        ];
    }

    /**
     * Generate custom FAQs for landing page
     */
    private function generateFAQs(SeoLandingPage $page, int $totalProperties): array
    {
        $keyword = $page->target_keyword ?? 'Homestay';
        $filters = $page->filters ?? [];
        $maxPrice = isset($filters['max_price']) ? (int) $filters['max_price'] : null;
        $location = $filters['location'] ?? 'Yogyakarta';

        return [
            [
                'question' => "Berapa harga {$keyword} per malam?",
                'answer' => $maxPrice
                    ? "Harga {$keyword} di platform kami mulai dari Rp 100rb hingga Rp " . number_format($maxPrice, 0, ',', '.') . " per malam, tergantung fasilitas dan lokasi. Tersedia {$totalProperties}+ pilihan sesuai budget Anda."
                    : "Harga {$keyword} bervariasi mulai dari Rp 100rb hingga Rp 1 juta per malam, tergantung tipe properti, fasilitas, dan lokasinya. Kami punya {$totalProperties}+ pilihan untuk semua budget.",
            ],
            [
                'question' => "Bagaimana cara booking {$keyword}?",
                'answer' => "Booking sangat mudah! Pilih properti yang Anda suka, tentukan tanggal check-in dan check-out, masukkan jumlah tamu, lalu ikuti proses pembayaran. Konfirmasi booking akan dikirim via email dan WhatsApp dalam beberapa menit.",
            ],
            [
                'question' => "Apakah ada minimum booking {$keyword}?",
                'answer' => "Sebagian besar properti memiliki minimum stay 1 malam untuk weekday dan 2 malam untuk weekend/long weekend. Beberapa properti juga menawarkan diskon khusus untuk long stay (7+ malam).",
            ],
            [
                'question' => "Fasilitas apa saja yang tersedia di {$keyword}?",
                'answer' => "Fasilitas umum yang tersedia meliputi WiFi gratis, AC, kamar mandi dalam, air panas, area parkir, dan dapur. Beberapa properti juga dilengkapi dengan kolam renang, taman, dan area BBQ. Detail fasilitas bisa dilihat di halaman masing-masing properti.",
            ],
            [
                'question' => "Dimana lokasi {$keyword}?",
                'answer' => "Semua {$keyword} yang kami tawarkan berlokasi di {$location} dan sekitarnya. Jarak ke lokasi wisata populer seperti Malioboro, Keraton, dan Prambanan berkisar 10-45 menit berkendara tergantung lokasi properti.",
            ],
            [
                'question' => "Apakah harga sudah termasuk breakfast?",
                'answer' => "Tergantung properti. Beberapa {$keyword} sudah include breakfast, sebagian lainnya menawarkan breakfast dengan biaya tambahan. Info lengkap ada di deskripsi masing-masing properti.",
            ],
        ];
    }

    /**
     * Helper: Get property type text in Indonesian
     */
    private function getPropertyTypeText(string $type): string
    {
        return match ($type) {
            'villa' => 'villa',
            'guest_house' => 'guest house',
            'homestay' => 'homestay',
            default => 'penginapan',
        };
    }

    /**
     * Helper: Get location text
     */
    private function getLocationText(string $location): string
    {
        return htmlspecialchars($location); // Basic sanitization
    }
}
