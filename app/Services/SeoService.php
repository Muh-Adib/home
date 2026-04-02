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
     * Property Type conversion
     */

    /**
     * Generate SEO data for a page
     *
     * @param array $config Configuration array with keys: title, description, image, url, type, robots
     * @return array SEO data array with title, description, image, url, type, og, twitter, robots
     */
    public function generate(array $config = []): array
    {
        $title = $config['title'] ?? 'Homsjogja';
        $description = $config['description'] ?? 'Homestay Terbaik di Yogyakarta';
        $image = $config['image'] ?? asset(self::DEFAULTS['og_image']);
        $url = $config['url'] ?? $this->calculateCanonicalUrl();
        $type = $config['type'] ?? 'website';
        $robots = $config['robots'] ?? 'index, follow';

        // Auto-append suffix jika belum ada
        if (!Str::contains($title, 'Homsjogja')) {
            $title .= self::DEFAULTS['title_suffix'];
        }

        // Ensure description length and clean format
        $description = $this->stripMarkdown(Str::limit($description, self::DEFAULTS['description_max_length'], '...'));

        return [
            'title' => $title,
            'description' => $description,
            'image' => $image,
            'url' => $url,
            'type' => $type,
            'robots' => $robots,
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
        $baseDescription = $this->stripMarkdown(Str::limit($property->description, 100, ''));
        $description = "Ingin menyewa {$property->type} {$property->name}? Kami menawarkan {$baseDescription} "
            . "dengan harga mulai Rp " . number_format($property->base_rate, 0, ',', '.')
            . "/malam. Fasilitas lengkap, lokasi strategis. Booking mudah & aman!";

        $image = $property->media->first()?->url ?? asset('og-image.jpg');
        $url = route('properties.show', $property->slug);

        return $this->generate([
            'title' => $title,
            'description' => $description,
            'image' => $image,
            'url' => $url,
            'type' => 'product', // or 'website' if schema handles the product part
            ...$extra
        ]);
    }

    /**
     * Generate Schema.org for property
     * Uses LodgingBusiness/VacationRental as primary type to match Schema.org best practices for accommodations.
     */
    public function propertySchema($property): string
    {
        $description = $this->stripMarkdown($property->description);
        $url = route('properties.show', $property->slug);

        // Map internal property type to Schema.org type method
        // Using vacationRental for most types as they are rented as a whole unit
        $schemaMethod = match (strtolower($property->type ?? 'homestay')) {
            'hotel' => 'hotel',
            default => 'vacationRental',
        };

        // Collect up to 5 images for the rich snippet requirements
        $imageUrls = collect();
        if ($property->relationLoaded('media') && $property->media->isNotEmpty()) {
            $imageUrls = $property->media->take(5)->pluck('url');
        } else {
            $imageUrls->push(asset('og-image.jpg'));
        }

        // Create the schema object dynamically using Spatie factory
        /** @var \Spatie\SchemaOrg\VacationRental $schema */
        $schema = Schema::{$schemaMethod}()
            ->name($property->name)
            ->description($description)
            ->image($imageUrls->toArray())
            ->url($url)
            ->identifier((string) $property->id)
            ->brand(Schema::brand()->name('Homsjogja'))
            ->priceRange('IDR ' . number_format($property->base_rate, 0, ',', '.'))
            ->address(
                Schema::postalAddress()
                    ->streetAddress($property->address ?? 'Yogyakarta')
                    ->addressLocality('Yogyakarta')
                    ->addressRegion('DI Yogyakarta')
                    ->addressCountry('ID')
            )
            ->checkinTime($property->check_in_time?->format('H:i') ?? '14:00')
            ->checkoutTime($property->check_out_time?->format('H:i') ?? '12:00')
            ->numberOfRooms($property->bedroom_count)
            ->setProperty('numberOfBedrooms', $property->bedroom_count)
            ->numberOfBathroomsTotal($property->bathroom_count)
            ->occupancy(
                Schema::quantitativeValue()
                    ->value($property->capacity_max)
                    ->unitText('Person')
            );

        // Safely resolve amenities (Handle conflict between 'amenities' attribute and relationship)
        $amenitiesList = collect();
        if ($property->relationLoaded('amenities')) {
            $amenitiesList = $property->getRelation('amenities');
        } elseif (!empty($property->amenities)) {
            $amenitiesList = collect($property->amenities);
        }

        // Add amenities to schema
        if ($amenitiesList->isNotEmpty()) {
            $schema->amenityFeature(
                $amenitiesList->map(function ($amenity) {
                    // Handle case where amenity is just a string (if from JSON attribute) or Model
                    $name = is_string($amenity) ? $amenity : ($amenity->name ?? null);
                    if ($name) {
                        return Schema::locationFeatureSpecification()
                            ->name($name)
                            ->value(true);
                    }
                    return null;
                })->filter()->values()->toArray()
            );
        }

        // Check for pets allowed in amenities
        $petsAllowed = $amenitiesList->contains(function ($a) {
            $name = is_string($a) ? $a : ($a->name ?? '');
            return str_contains(strtolower($name), 'pet') || str_contains(strtolower($name), 'hewan');
        });
        $schema->petsAllowed($petsAllowed);

        // Add GeoCoordinates if available
        if ($property->lat && $property->lng) {
            $schema->geo(
                Schema::geoCoordinates()
                    ->latitude($property->lat)
                    ->longitude($property->lng)
            );
        }

        // Add Rating
        if ($property->rating_avg) {
            $schema->aggregateRating(
                Schema::aggregateRating()
                    ->ratingValue($property->rating_avg)
                    ->reviewCount($property->approved_reviews_count ?? 1)
            );
        }

        return json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate LodgingBusiness Schema (Better for Accommodation)
     */
    public function lodgingSchema($property): string
    {
        $schema = Schema::lodgingBusiness()
            ->name($property->name)
            ->description($this->stripMarkdown($property->description))
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

        if ($property->rating_avg) {
            $schema->aggregateRating(
                Schema::aggregateRating()
                    ->ratingValue($property->rating_avg)
                    ->reviewCount($property->approved_reviews_count ?? 0)
            );
        }

        return json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate global organization schema
     */
    public function organizationSchema(): string
    {
        $schema = Schema::organization()
            ->name('Homsjogja')
            ->url(config('app.url'))
            ->logo(asset('logo.svg'))
            ->sameAs([
                'https://www.facebook.com/homsjogja',
                'https://www.instagram.com/homsjogja',
            ])
            ->contactPoint(
                Schema::contactPoint()
                    ->telephone('+62-8112-5000-82') // Update with real number
                    ->contactType('Customer Service')
                    ->areaServed('ID')
                    ->availableLanguage(['Indonesian', 'English'])
            )
            ->address(
                Schema::postalAddress()
                    ->addressLocality('Yogyakarta')
                    ->addressRegion('DI Yogyakarta')
                    ->addressCountry('ID')
            )
            ->areaServed(
                Schema::place()
                    ->name('Yogyakarta')
                    ->alternateName('Jogja')
            );

        return json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate WebSite Schema (For Sitelinks Search Box)
     */
    public function webSiteSchema(): string
    {
        $schema = Schema::webSite()
            ->name('Homsjogja')
            ->url(config('app.url'))
            ->about(
                Schema::place()
                    ->name('Yogyakarta')
                    ->alternateName('Jogja')
            )
            ->mentions([
                Schema::thing()->name('Homestay'),
                Schema::thing()->name('Villa Murah'),
                Schema::thing()->name('Penginapan')
            ])
            ->potentialAction(
                Schema::searchAction()
                    ->target(config('app.url') . '/properties?search={search_term_string}')
                    ->queryInput('required name=search_term_string')
            );

        return json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Default homepage SEO (Optimized for "homestay di Jogja")
     * PRIMARY TARGET: homestay di Jogja (broad, high-volume)
     * SECONDARY: homestay terbaik di Yogyakarta
     */
    public function forHomepage(): array
    {
        return $this->generate([
            // TARGET: "homestay jogja", "villa murah jogja", "penginapan murah jogja"
            'title' => 'Homestay Jogja, Villa & Penginapan Murah Jogja | Homsjogja',
            // GEO: Natural language + target keywords
            'description' => 'Cari homestay Jogja, villa murah Jogja, atau penginapan murah Jogja? Temukan sewa penginapan hemat & nyaman mulai 150rb/malam dekat Malioboro. Fasilitas lengkap, family friendly, booking mudah & aman!',
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
            // TARGET: "sewa homestay jogja", "villa jogja", "penginapan murah"
            'title' => 'Sewa Homestay Jogja, Villa & Penginapan Murah di Yogyakarta',
            // GEO: Action-oriented (transactional) + comparison keywords
            'description' => 'Sewa homestay Jogja & villa murah Jogja tanpa ribet! Daftar lengkap penginapan murah Jogja untuk berbagai budget mulai 150rb-500rb/malam. Fasilitas lengkap, lokasi strategis dekat Malioboro. Filter harga & booking online aman!',
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

        $questions = [];
        foreach ($faqs as $faq) {
            $questions[] = Schema::question()
                ->name($faq['question'])
                ->acceptedAnswer(
                    Schema::answer()
                        ->text($this->stripMarkdown($faq['answer']))
                );
        }

        $faqPage->mainEntity($questions);

        return json_encode($faqPage, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate How-To Schema (GEO: Step-by-step content)
     */
    public function howToSchema(string $name, string $description, array $steps): string
    {
        $howTo = Schema::howTo()
            ->name($name)
            ->description($this->stripMarkdown($description));

        foreach ($steps as $index => $step) {
            $howTo->step(
                Schema::howToStep()
                    ->name($step['name'])
                    ->text($this->stripMarkdown($step['text']))
                    ->position($index + 1)
            );
        }

        return json_encode($howTo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate Breadcrumb Schema (GEO: Navigation context)
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

        return json_encode($breadcrumb, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate Review Schema (GEO: Trust signals)
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

        return json_encode($aggregateRating, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate Local Business Schema (GEO: Location-based)
     */
    public function localBusinessSchema($property): string
    {
        $schema = Schema::lodgingBusiness()
            ->name($property->name)
            ->description($this->stripMarkdown($property->description))
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

        return json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate Video Schema (for TikTok property tours)
     */
    public function videoSchema($property): ?string
    {
        if (empty($property->tiktok_video_url)) {
            return null;
        }

        $video = Schema::videoObject()
            ->name("Tour Virtual {$property->name} - Homestay di Yogyakarta")
            ->description($this->stripMarkdown("Video tour lengkap {$property->name}. Lihat fasilitas, kamar, dan suasana homestay kami di Yogyakarta."))
            ->thumbnailUrl($property->media->first()?->url ?? asset('og-image.jpg'))
            ->contentUrl($property->tiktok_video_url)
            ->uploadDate($property->created_at->toIso8601String())
            ->duration('PT1M'); // Default 1 minute

        return json_encode($video, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Get common property FAQs (GEO: Pre-defined Q&A)
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

    /**
     * Generate article-specific SEO
     */
    public function forArticle($article, array $extra = []): array
    {
        $title = $article->meta_title ?? $article->title;
        $description = $this->stripMarkdown($article->meta_description ?? $article->excerpt ?? Str::limit(strip_tags($article->content), 155));
        $image = $article->featured_image
            ? asset('storage/' . $article->featured_image)
            : asset('og-image.jpg');
        $url = route('articles.show', $article->slug);

        return $this->generate([
            'title' => $title,
            'description' => $description,
            'image' => $image,
            'url' => $url,
            'type' => 'article',
            ...$extra
        ]);
    }

    /**
     * Generate Schema.org for article
     */
    public function articleSchema($article): string
    {
        $schema = Schema::article()
            ->headline($article->meta_title ?? $article->title)
            ->description($this->stripMarkdown($article->meta_description ?? $article->excerpt ?? Str::limit(strip_tags($article->content), 155)))
            ->image($article->featured_image
                ? asset('storage/' . $article->featured_image)
                : asset('images/default-article.jpg'))
            ->datePublished($article->published_at?->toIso8601String())
            ->dateModified($article->updated_at->toIso8601String())
            ->author(
                Schema::person()
                    ->name($article->author->name)
            )
            ->publisher(
                Schema::organization()
                    ->name(config('app.name'))
                    ->logo(
                        Schema::imageObject()
                            ->url(asset('images/logo.png'))
                    )
            )
            ->mainEntityOfPage(
                Schema::webPage()
                    ->identifier(route('articles.show', $article->slug))
            );

        if ($article->seo_keywords) {
            $schema->keywords(implode(', ', $article->seo_keywords));
        }

        return json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Strip Markdown and unnecessary characters from text
     */
    private function stripMarkdown(?string $text): string
    {
        if (!$text)
            return '';

        // Remove markdown bold/italic
        $text = preg_replace('/(\*\*|__)(.*?)\1/', '$2', $text);
        $text = preg_replace('/(\*|_)(.*?)\1/', '$2', $text);

        // Remove links
        $text = preg_replace('/\[([^\]]+)\]\([^\)]+\)/', '$1', $text);

        // Remove headings
        $text = preg_replace('/^#+\s+(.*)/m', '$1', $text);

        // Remove list bullets
        $text = preg_replace('/^[\*\-\+]\s+(.*)/m', '$1', $text);

        // Basic strip tags if any HTML remains
        return trim(strip_tags($text));
    }

    /**
     * Calculate strict canonical URL
     * Retains 'page' param, strips everything else (tracking, sort, filters)
     */
    private function calculateCanonicalUrl(): string
    {
        $url = url()->current();

        // Check for pagination
        $page = request()->get('page');
        if ($page && is_numeric($page) && $page > 1) {
            $url .= '?page=' . $page;
        }

        return $url;
    }
}
