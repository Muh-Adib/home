<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Services\SeoService;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class StaticPageController extends Controller
{
    /**
     * Display the homepage.
     */
    public function home(SeoService $seoService): Response
    {
        $featuredProperties = Cache::remember('featured_properties_homepage', 3600, function () {
            return Property::active()
                ->featured()
                ->with([
                    'media' => fn ($q) => $q->orderByRaw('is_cover DESC, display_order ASC'),
                    'amenities',
                ])
                ->orderBy('sort_order')
                ->limit(6)
                ->get()
                ->map(fn (Property $property) => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'slug' => $property->slug,
                    'type' => $property->type,
                    'description' => $property->description,
                    'address' => $property->address,
                    'location' => $property->location,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'bedroom_count' => $property->bedroom_count,
                    'bathroom_count' => $property->bathroom_count,
                    'base_rate' => $property->base_rate,
                    'formatted_base_rate' => $property->formatted_base_rate,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                    'weekend_premium_type' => $property->weekend_premium_type,
                    'weekend_premium_fixed' => $property->weekend_premium_fixed,
                    'check_in_time' => $property->check_in_time,
                    'check_out_time' => $property->check_out_time,
                    'min_stay_weekday' => $property->min_stay_weekday,
                    'min_stay_weekend' => $property->min_stay_weekend,
                    'min_stay_peak' => $property->min_stay_peak,
                    'is_featured' => $property->is_featured,
                    'media' => ($property->relationLoaded('media') ? $property->getRelation('media') : collect())->map(fn ($m) => [
                        'id' => $m->id,
                        'url' => $m->url,
                        'thumbnail_url' => $m->thumbnail_url,
                        'alt_text' => $m->alt_text,
                        'is_featured' => $m->is_featured,
                        'is_cover' => $m->is_cover,
                        'display_order' => $m->display_order,
                        'media_type' => $m->media_type,
                    ])->values()->all(),
                    'amenities' => ($property->relationLoaded('amenities') ? $property->getRelation('amenities') : collect())->map(fn ($a) => [
                        'id' => $a->id,
                        'name' => $a->name,
                        'icon' => $a->icon,
                        'category' => $a->category,
                    ])->values()->all(),
                ])
                ->all();
        });

        $seo = Cache::remember('seo_homepage', 3600, function () use ($seoService) {
            return $seoService->forHomepage();
        });

        return Inertia::render('welcome', [
            'featuredProperties' => $featuredProperties,
            'seo' => $seo,
        ]);
    }

    /**
     * Display the about page.
     */
    public function about(SeoService $seoService): Response
    {
        return Inertia::render('About', [
            'seo' => $seoService->generate([
                'title' => 'Tentang Homsjogja - Platform Booking Penginapan Terpercaya di Yogyakarta',
                'description' => 'Homsjogja adalah platform booking homestay, villa, dan penginapan terbaik di Yogyakarta. Kami menghubungkan wisatawan dengan penginapan berkualitas di Jogja sejak 2023.',
                'url' => url('/about'),
            ]),
            'schema' => $seoService->aboutPageSchema(),
            'breadcrumbSchema' => json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => url('/')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Tentang Kami', 'item' => url('/about')],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    /**
     * Display the FAQ page.
     */
    public function faq(SeoService $seoService): Response
    {
        return Inertia::render('FAQ', [
            'seo' => $seoService->generate([
                'title' => 'FAQ - Pertanyaan Umum Seputar Booking Penginapan | Homsjogja',
                'description' => 'Temukan jawaban atas pertanyaan umum seputar booking homestay, villa, dan penginapan di Yogyakarta bersama Homsjogja.',
                'url' => url('/faq'),
            ]),
            // Pass as JSON string — SchemaOrg component uses dangerouslySetInnerHTML
            'faqSchema' => $seoService->faqPageSchema(),
            'breadcrumbSchema' => json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => url('/')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'FAQ', 'item' => url('/faq')],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    /**
     * Display the support page.
     */
    public function support(SeoService $seoService): Response
    {
        return Inertia::render('Support', [
            'seo' => $seoService->generate([
                'title' => 'Bantuan & Dukungan | Homsjogja',
                'description' => 'Butuh bantuan? Tim support Homsjogja siap membantu Anda 24/7. Hubungi kami untuk pertanyaan seputar booking, pembayaran, atau penginapan di Yogyakarta.',
                'url' => url('/support'),
            ]),
            'schema' => json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'ContactPage',
                'name' => 'Bantuan & Dukungan Homsjogja',
                'description' => 'Halaman bantuan dan dukungan pelanggan Homsjogja',
                'url' => url('/support'),
                'mainEntity' => [
                    '@type' => 'Organization',
                    'name' => 'Homsjogja',
                    'contactPoint' => [
                        '@type' => 'ContactPoint',
                        'contactType' => 'Customer Support',
                        'availableLanguage' => ['Indonesian', 'English'],
                    ],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }
}
