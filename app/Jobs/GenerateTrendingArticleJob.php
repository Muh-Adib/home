<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Article;
use App\Models\Property;
use App\Models\User;
use App\Services\AIArticleService;
use App\Services\NewsDiscoveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * GenerateTrendingArticleJob
 *
 * Autopilot article generation pipeline dengan:
 * - Keyword strategy 3 kategori bergilir (transactional, informational, seasonal)
 * - AI Title Generation (SEO-optimized candidate titles)
 * - 2-step AI pipeline: Outline → Content (setara kualitas artikel manual)
 * - Prompt via ArticlePromptService (travel story flow + conversion block)
 */
class GenerateTrendingArticleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Job timeout 12 menit (2-step AI butuh lebih lama) */
    public int $timeout = 720;

    /** @var int Tidak retry — konten AI yang gagal lebih baik di-skip */
    public int $tries = 1;

    /**
     * Keyword pool dibagi 3 kategori untuk coverage SEO yang merata:
     *
     * TRANSACTIONAL: Orang siap booking → traffic konversi tinggi
     * INFORMATIONAL: Orang riset destinasi → traffic volume tinggi
     * SEASONAL:      Event/musim → trend spike, urgency tinggi
     */
    private const KEYWORD_CATEGORIES = [
        'transactional' => [
            'villa murah Jogja untuk rombongan',
            'sewa villa dekat Malioboro Jogja',
            'homestay keluarga Yogyakarta murah',
            'villa private pool Jogja murah',
            'penginapan dekat pantai Gunungkidul',
            'villa kapasitas besar Jogja',
            'sewa rumah harian Jogja dekat wisata',
            'booking homestay Jogja last minute',
        ],
        'informational' => [
            'wisata Yogyakarta 2026 terbaru',
            'tempat wisata keluarga di Jogja',
            'wisata Gunungkidul paling hits',
            'itinerary 3 hari 2 malam di Jogja',
            'wisata Kaliurang Merapi terbaru',
            'destinasi wisata baru Yogyakarta',
            'pantai terindah Gunungkidul',
            'wisata alam Jogja untuk rombongan',
        ],
        'seasonal' => [
            'liburan lebaran ke Jogja 2026',
            'long weekend Jogja penginapan',
            'libur sekolah ke Jogja rekomendasi',
            'festival budaya Yogyakarta 2026',
            'event wisata Jogja bulan ini',
            'tahun baru di Jogja penginapan',
            'high season Jogja villa tersedia',
            'musim liburan Jogja hotel penuh',
        ],
    ];

    /** Kategori dipilih bergilir via cache untuk coverage merata */
    private const CATEGORY_CACHE_KEY = 'autopilot_article_keyword_category';
    private const CATEGORIES = ['transactional', 'informational', 'seasonal'];

    /** Pre-filter: skip berita yang jelas tidak relevan untuk travel/stay */
    private const IRRELEVANT_KEYWORDS = [
        'korupsi',
        'kriminal',
        'begal',
        'pembunuhan',
        'mutilasi',
        'politik',
        'demo',
        'pilkada',
        'pemilu',
        'sidang',
        'hukum',
        'pengadilan',
        'tersangka',
        'ditangkap',
    ];

    // =========================================================================
    // MAIN PIPELINE
    // =========================================================================

    public function handle(NewsDiscoveryService $newsService, AIArticleService $aiService): void
    {
        Log::info('[AutopilotArticle] Pipeline started.');

        // Step 1: Pilih keyword dari kategori bergilir
        [$keyword, $category] = $this->selectKeyword();
        Log::info("[AutopilotArticle] Keyword: \"{$keyword}\" (category: {$category})");

        // Step 2: Fetch berita terkait keyword
        $newsItems = $newsService->fetchTrendingNews($keyword, 'id', 12);

        if (empty($newsItems)) {
            Log::info("[AutopilotArticle] No news found for: {$keyword}");
            return;
        }

        // Step 3: Pre-filter tanpa AI call
        $candidates = $this->preFilterNews($newsItems);

        if (empty($candidates)) {
            Log::info('[AutopilotArticle] All news items filtered at pre-filter stage.');
            return;
        }

        // Step 4: Skor relevansi dengan AI, generate artikel untuk yang pertama lolos
        foreach ($candidates as $news) {
            $relevance = $aiService->analyzeNewsRelevance($news);
            Log::info("[AutopilotArticle] Relevance \"{$news['title']}\": {$relevance['score']}/10");

            if (($relevance['score'] ?? 0) < 7) {
                continue;
            }

            $this->generateArticle($news, $keyword, $category, $aiService, $relevance);
            break; // satu artikel per run
        }

        Log::info('[AutopilotArticle] Pipeline finished.');
    }

    // =========================================================================
    // KEYWORD STRATEGY
    // =========================================================================

    /**
     * Pilih keyword dari kategori bergilir round-robin (transactional → informational → seasonal).
     * State disimpan di cache 24 jam.
     *
     * @return array{0: string, 1: string} [keyword, category_name]
     */
    private function selectKeyword(): array
    {
        $currentIndex = Cache::get(self::CATEGORY_CACHE_KEY, 0);
        $category = self::CATEGORIES[$currentIndex % count(self::CATEGORIES)];
        $pool = self::KEYWORD_CATEGORIES[$category];
        $keyword = $pool[array_rand($pool)];

        // Advance ke kategori berikutnya untuk run berikutnya
        Cache::put(self::CATEGORY_CACHE_KEY, ($currentIndex + 1) % count(self::CATEGORIES), now()->addHours(48));

        return [$keyword, $category];
    }

    // =========================================================================
    // PRE-FILTER (tanpa AI call)
    // =========================================================================

    private function preFilterNews(array $newsItems): array
    {
        return array_values(array_filter($newsItems, function ($news) {
            $titleLower = strtolower($news['title'] ?? '');

            // Skip berita tidak relevan
            foreach (self::IRRELEVANT_KEYWORDS as $bad) {
                if (str_contains($titleLower, $bad)) {
                    Log::info("[AutopilotArticle] Pre-filtered (bad keyword): {$news['title']}");
                    return false;
                }
            }

            // Skip duplikat (1 query DB)
            if (Article::where('generation_metadata->source_url', $news['link'])->exists()) {
                Log::info("[AutopilotArticle] Pre-filtered (duplicate): {$news['title']}");
                return false;
            }

            return true;
        }));
    }

    // =========================================================================
    // 2-STEP ARTICLE GENERATION
    // =========================================================================

    /**
     * Generate artikel dengan pipeline 2 langkah:
     * 1. Title generation (SEO-optimized candidates)
     * 2. Outline generation (event_article type)
     * 3. Content generation (full article dengan travel story flow)
     */
    private function generateArticle(
        array $news,
        string $keyword,
        string $keywordCategory,
        AIArticleService $aiService,
        array $relevance
    ): void {
        try {
            $travelerAngle = $relevance['traveler_angle'] ?? "Liburan ke Jogja saat {$news['title']}";

            // Load 2 properti aktif secara acak untuk natural recommendation
            $properties = Property::where('status', 'active')
                ->inRandomOrder()
                ->limit(2)
                ->get(['id', 'name', 'slug', 'description'])
                ->toArray();

            $author = User::whereIn('role', ['super_admin', 'admin'])->first() ?? User::first();

            // ── Step 1: Generate SEO Title ───────────────────────────────────
            Log::info('[AutopilotArticle] Step 1: Generating SEO title...');

            $titleKeywords = [$keyword, 'Homestay Jogja', 'Villa Yogyakarta'];
            $titleResult = $aiService->generateTitle($titleKeywords, 'gemini', 3);

            // Pilih title yang paling panjang dan deskriptif (biasanya paling SEO-friendly)
            $titles = $titleResult['titles'] ?? [];
            $articleTitle = $this->selectBestTitle($titles, $keyword, $travelerAngle);

            Log::info("[AutopilotArticle] Title selected: {$articleTitle}");

            // ── Step 2: Generate Outline ─────────────────────────────────────
            Log::info('[AutopilotArticle] Step 2: Generating outline...');

            $targetKeywords = [
                $keyword,
                'Homestay Jogja',
                'Villa Yogyakarta',
                'penginapan Jogja',
            ];

            $researchContext = [
                'search_intent' => $this->resolveSearchIntent($keywordCategory),
                'target_audience_analysis' => 'Wisatawan yang merencanakan liburan ke Yogyakarta, dipicu oleh: ' . $news['title'],
                'traveler_angle' => $travelerAngle,
                'key_points' => [
                    $travelerAngle,
                    "Dampak {$news['title']} bagi wisatawan Jogja",
                    'Tips menginap strategis saat musim ramai',
                    'Estimasi harga villa dan homestay',
                    'Rekomendasi area menginap di Jogja',
                ],
            ];

            $outlineResult = $aiService->generateOutline(
                title: $articleTitle,
                keywords: $targetKeywords,
                provider: 'gemini',
                researchContext: $researchContext,
                customInstructions: '',
                articleType: 'event_article'
            );

            $outline = $outlineResult['outline'];
            $lsiKeywords = $outlineResult['lsi_keywords'] ?? [];

            Log::info('[AutopilotArticle] Outline generated. LSI: ' . implode(', ', $lsiKeywords));

            // ── Step 3: Generate Full Content ────────────────────────────────
            Log::info('[AutopilotArticle] Step 3: Generating full article content...');

            $allKeywords = array_unique(array_merge($targetKeywords, $lsiKeywords));

            $contentResult = $aiService->generateContent(
                outline: $outline,
                keywords: $allKeywords,
                properties: $properties,
                provider: 'gemini',
                language: 'id',
                tone: 'casual',
                intent: $researchContext['search_intent'],
                articleType: 'event_article'
            );

            $wordCount = $contentResult['word_count'] ?? 0;
            Log::info("[AutopilotArticle] Content generated: {$wordCount} words.");

            // ── Step 4: Save Article ─────────────────────────────────────────
            $slug = Str::slug($articleTitle) . '-' . Str::random(6);

            Article::create([
                'title' => $articleTitle,
                'slug' => $slug,
                'content' => $contentResult['content'],
                'excerpt' => $contentResult['excerpt'],
                'meta_description' => $contentResult['meta_description'],
                'status' => 'reviewing',
                'author_id' => $author->id,
                'language' => 'id',
                'target_keywords' => array_values(array_slice($allKeywords, 0, 8)),
                'ai_provider' => 'gemini',
                'generation_metadata' => [
                    'source_news' => $news['title'],
                    'source_url' => $news['link'],
                    'relevance_score' => $relevance['score'],
                    'relevance_reason' => $relevance['reason'],
                    'traveler_angle' => $travelerAngle,
                    'article_type' => 'event_article',
                    'keyword_category' => $keywordCategory,
                    'lsi_keywords' => $lsiKeywords,
                    'word_count' => $wordCount,
                    'generated_at' => now()->toDateTimeString(),
                ],
            ]);

            Log::info("[AutopilotArticle] ✅ Article saved: \"{$articleTitle}\" ({$wordCount} words)");

        } catch (\Exception $e) {
            Log::error('[AutopilotArticle] ❌ Generation failed: ' . $e->getMessage(), [
                'news' => $news['title'],
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Pilih judul terbaik dari kandidat AI.
     * Prioritas: mengandung keyword utama + panjang yang optimal (40-70 char).
     */
    private function selectBestTitle(array $titles, string $keyword, string $fallback): string
    {
        if (empty($titles)) {
            return "Panduan Villa & Homestay Jogja: {$fallback}";
        }

        $keywordLower = strtolower($keyword);

        // Prioritaskan title yang mengandung keyword dan panjangnya 40-70 char
        usort($titles, function (string $a, string $b) use ($keywordLower) {
            $aHasKw = str_contains(strtolower($a), $keywordLower) ? 1 : 0;
            $bHasKw = str_contains(strtolower($b), $keywordLower) ? 1 : 0;
            $aLen = strlen($a);
            $bLen = strlen($b);
            $aScore = $aHasKw * 10 + ($aLen >= 40 && $aLen <= 75 ? 5 : 0);
            $bScore = $bHasKw * 10 + ($bLen >= 40 && $bLen <= 75 ? 5 : 0);

            return $bScore <=> $aScore;
        });

        return trim($titles[0]);
    }

    /**
     * Map keyword category → search intent untuk prompt context
     */
    private function resolveSearchIntent(string $category): string
    {
        return match ($category) {
            'transactional' => 'Transactional — Pembaca siap booking. Prioritaskan rekomendasi konkret, harga, dan CTA.',
            'informational' => 'Informational — Pembaca sedang riset. Prioritaskan informasi lengkap, panduan, dan tips.',
            'seasonal' => 'Transactional + Urgency — Event/musim ramai. Bangun urgency booking, tampilkan ketersediaan.',
            default => 'Informational',
        };
    }
}
