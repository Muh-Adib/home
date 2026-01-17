<?php

namespace App\Services;

use Illuminate\Support\Str;
use Spatie\SchemaOrg\Schema;

class SeoService
{
    /**
     * Default SEO configuration
     */
    private const DEFAULTS = [
        'title_suffix' => ' | Homsjogja',
        'title_separator' => ' - ',
        'description_max_length' => 155,
        'og_image' => 'og-image.jpg',
    ];

    /**
     * Generate SEO data for a page
     *
     * @param array $config Configuration array with keys: title, description, image, url, type
     * @return array SEO data array with title, description, image, url, type, og, twitter
     */
    public function generate(array $config = []): array
    {
        $title = $config['title'] ?? 'Homsjogja';
        $description = $config['description'] ?? 'Homestay Terbaik di Yogyakarta';
        $image = $config['image'] ?? asset(self::DEFAULTS['og_image']);
        $url = $config['url'] ?? url()->current();
        $type = $config['type'] ?? 'website';

        // Auto-append suffix jika belum ada
        if (!Str::contains($title, 'Homsjogja')) {
            $title .= self::DEFAULTS['title_suffix'];
        }

        // Ensure description length
        $description = Str::limit($description, self::DEFAULTS['description_max_length'], '...');

        return [
            'title' => $title,
            'description' => $description,
            'image' => $image,
            'url' => $url,
            'type' => $type,
            // OpenGraph
            'og' => [
                'title' => $title,
                'description' => $description,
                'image' => $image,
                'url' => $url,
                'type' => $type,
            ],
            // Twitter
            'twitter' => [
                'card' => 'summary_large_image',
                'title' => $title,
                'description' => $description,
                'image' => $image,
            ],
        ];
    }

    /**
     * Generate property-specific SEO (GEO-optimized)
     */
    public function forProperty($property, array $extra = []): array
    {
        // GEO: Conversational, question-based title
        $title = "Cari Homestay {$property->name} di Yogyakarta? Booking Sekarang";
        
        // GEO: Natural language, conversational description
        $baseDescription = Str::limit(strip_tags($property->description), 100, '');
        $description = "Ingin menyewa homestay {$property->name}? Kami menawarkan {$baseDescription} " 
            . "dengan harga mulai Rp " . number_format($property->base_rate, 0, ',', '.') 
            . "/malam. Fasilitas lengkap, lokasi strategis. Booking mudah & aman!";

        $image = $property->media->first()?->url ?? asset('og-image.jpg');
        $url = route('properties.show', $property->slug);

        return $this->generate([
            'title' => $title,
            'description' => $description,
            'image' => $image,
            'url' => $url,
            'type' => 'product',
            ...$extra
        ]);
    }

    /**
     * Generate Schema.org for property
     */
    public function propertySchema($property): string
    {
        $schema = Schema::product()
            ->name($property->name)
            ->description(strip_tags($property->description))
            ->image($property->media->first()?->url ?? asset('og-image.jpg'))
            ->url(route('properties.show', $property->slug))
            ->offers(
                Schema::offer()
                    ->price($property->base_rate)
                    ->priceCurrency('IDR')
                    ->availability('https://schema.org/InStock')
                    ->url(route('bookings.create', $property->slug))
            );

        if ($property->rating_avg) {
            $schema->aggregateRating(
                Schema::aggregateRating()
                    ->ratingValue($property->rating_avg)
                    ->reviewCount($property->approved_reviews_count ?? 0)
            );
        }

        if ($property->address) {
            $schema->address(
                Schema::postalAddress()
                    ->streetAddress($property->address)
                    ->addressLocality('Yogyakarta')
                    ->addressRegion('DI Yogyakarta')
                    ->addressCountry('ID')
            );
        }

        return (string) $schema->toScript();
    }

    /**
     * Generate global organization schema
     */
    public function organizationSchema(): string
    {
        $schema = Schema::organization()
            ->name('Homsjogja')
            ->url('https://homsjogja.com')
            ->logo('https://homsjogja.com/logo.svg')
            ->sameAs([
                'https://www.facebook.com/homsjogja',
                'https://www.instagram.com/homsjogja',
            ])
            ->contactPoint(
                Schema::contactPoint()
                    ->telephone('+62-274-123456') // Ganti dengan nomor real
                    ->contactType('Customer Service')
            );

        return (string) $schema->toScript();
    }

    /**
     * Default homepage SEO (Optimized for "homestay di Jogja")
     * PRIMARY TARGET: homestay di Jogja (broad, high-volume)
     * SECONDARY: homestay terbaik di Yogyakarta
     */
    public function forHomepage(): array
    {
        return $this->generate([
            // TARGET: "homestay di Jogja" + "terbaik"
            'title' => 'Homestay di Jogja - Sewa Penginapan Terbaik Mulai 150rb/Malam',
            // GEO: Natural language + target keywords
            'description' => 'Cari homestay di Jogja dengan harga terjangkau? Temukan homestay terbaik di Yogyakarta mulai 150rb/malam. Lokasi strategis dekat Malioboro, fasilitas lengkap, WiFi gratis. Booking mudah & aman. Pilihan terbaik untuk liburan keluarga!',
            'url' => route('home'),
        ]);
    }

    /**
     * Properties index SEO (Optimized for "sewa homestay" - transactional)
     * PRIMARY TARGET: daftar homestay di Yogyakarta
     * SECONDARY: sewa homestay di Yogyakarta (transactional intent)
     */
    public function forPropertiesIndex(): array
    {
        return $this->generate([
            // DIFFERENTIATED from homepage - focus on "daftar" (list) & "sewa" (rent)
            'title' => 'Daftar Lengkap Homestay di Yogyakarta - Sewa Sekarang',
            // GEO: Action-oriented (transactional) + comparison keywords
            'description' => 'Sewa homestay di Yogyakarta dengan mudah! Daftar lengkap penginapan untuk semua budget. Bandingkan harga mulai 150rb-500rb/malam, lihat fasilitas, pilih lokasi strategis dekat Malioboro. Filter berdasarkan harga, kapasitas, dan amenitas. Booking online aman!',
            'url' => route('properties.index'),
        ]);
    }

    // ========================================
    // GEO-SPECIFIC METHODS FOR AI SEARCH
    // ========================================

    /**
     * Generate FAQ Schema (GEO: Q&A format for AI)
     * 
     * @param array $faqs Array of ['question' => string, 'answer' => string]
     * @return string JSON-LD FAQ schema
     */
    public function faqSchema(array $faqs): string
    {
        if (empty($faqs)) {
            return '';
        }

        $faqPage = Schema::fAQPage();
        
        foreach ($faqs as $faq) {
            $faqPage->mainEntity(
                Schema::question()
                    ->name($faq['question'])
                    ->acceptedAnswer(
                        Schema::answer()
                            ->text($faq['answer'])
                    )
            );
        }

        return (string) $faqPage->toScript();
    }

    /**
     * Generate How-To Schema (GEO: Step-by-step content)
     * 
     * @param string $name How-to title
     * @param string $description How-to description
     * @param array $steps Array of ['name' => string, 'text' => string]
     * @return string JSON-LD HowTo schema
     */
    public function howToSchema(string $name, string $description, array $steps): string
    {
        $howTo = Schema::howTo()
            ->name($name)
            ->description($description);

        foreach ($steps as $index => $step) {
            $howTo->step(
                Schema::howToStep()
                    ->name($step['name'])
                    ->text($step['text'])
                    ->position($index + 1)
            );
        }

        return (string) $howTo->toScript();
    }

    /**
     * Generate Breadcrumb Schema (GEO: Navigation context)
     * 
     * @param array $items Array of ['name' => string, 'url' => string]
     * @return string JSON-LD BreadcrumbList schema
     */
    public function breadcrumbSchema(array $items): string
    {
        $breadcrumb = Schema::breadcrumbList();

        foreach ($items as $index => $item) {
            $breadcrumb->itemListElement(
                Schema::listItem()
                    ->position($index + 1)
                    ->name($item['name'])
                    ->item($item['url'])
            );
        }

        return (string) $breadcrumb->toScript();
    }

    /**
     * Generate Review Schema (GEO: Trust signals)
     * 
     * @param object $property Property with reviews
     * @return string JSON-LD Review schema
     */
    public function reviewSchema($property): string
    {
        if (!$property->rating_avg || !$property->approved_reviews_count) {
            return '';
        }

        $aggregateRating = Schema::aggregateRating()
            ->ratingValue($property->rating_avg)
            ->reviewCount($property->approved_reviews_count)
            ->bestRating(5)
            ->worstRating(1);

        return (string) $aggregateRating->toScript();
    }

    /**
     * Generate Local Business Schema (GEO: Location-based)
     * 
     * @param object $property Property data
     * @return string JSON-LD LocalBusiness schema
     */
    public function localBusinessSchema($property): string
    {
        $schema = Schema::lodgingBusiness()
            ->name($property->name)
            ->description(strip_tags($property->description))
            ->image($property->media->first()?->url ?? asset('og-image.jpg'))
            ->url(route('properties.show', $property->slug))
            ->priceRange('IDR ' . number_format($property->base_rate, 0, ',', '.'))
            ->address(
                Schema::postalAddress()
                    ->streetAddress($property->address)
                    ->addressLocality('Yogyakarta')
                    ->addressRegion('DI Yogyakarta')
                    ->addressCountry('ID')
            );

        if ($property->lat && $property->lng) {
            $schema->geo(
                Schema::geoCoordinates()
                    ->latitude($property->lat)
                    ->longitude($property->lng)
            );
        }

        if ($property->rating_avg) {
            $schema->aggregateRating(
                Schema::aggregateRating()
                    ->ratingValue($property->rating_avg)
                    ->reviewCount($property->approved_reviews_count ?? 0)
            );
        }

        return (string) $schema->toScript();
    }

    /**
     * Get common property FAQs (GEO: Pre-defined Q&A)
     * 
     * @param object $property
     * @return array FAQs for property
     */
    public function getPropertyFaqs($property): array
    {
        return [
            [
                'question' => "Berapa harga sewa {$property->name} per malam?",
                'answer' => "Harga sewa {$property->name} mulai dari Rp " . number_format($property->base_rate, 0, ',', '.') . " per malam. Harga dapat bervariasi tergantung musim dan durasi menginap."
            ],
            [
                'question' => "Apa saja fasilitas yang tersedia di {$property->name}?",
                'answer' => "{$property->name} dilengkapi dengan fasilitas lengkap untuk kenyamanan Anda, termasuk WiFi gratis, AC, kamar mandi dalam, dan area parkir. Kapasitas maksimal {$property->capacity_max} orang."
            ],
            [
                'question' => "Bagaimana cara booking {$property->name}?",
                'answer' => "Anda bisa booking {$property->name} langsung melalui website Homsjogja. Pilih tanggal check-in dan check-out, masukkan jumlah tamu, lalu ikuti proses pembayaran. Konfirmasi booking akan dikirim via email."
            ],
            [
                'question' => "Dimana lokasi {$property->name}?",
                'answer' => "{$property->name} berlokasi di {$property->address}, Yogyakarta. Lokasi strategis dengan akses mudah ke berbagai destinasi wisata populer di Jogja."
            ],
            [
                'question' => "Apakah {$property->name} ramah keluarga?",
                'answer' => "Ya, {$property->name} sangat cocok untuk keluarga dengan kapasitas hingga {$property->capacity_max} orang. Tersedia {$property->bedroom_count} kamar tidur dan {$property->bathroom_count} kamar mandi."
            ]
        ];
    }
}
