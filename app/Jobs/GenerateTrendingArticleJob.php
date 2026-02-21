<?php

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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GenerateTrendingArticleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Job timeout in seconds (10 minutes max)
     */
    public int $timeout = 600;

    /**
     * Number of retries before failing
     */
    public int $tries = 1;

    // Keyword pool seputar wisata & menginap di Yogyakarta
    private array $keywordPool = [
        'Event Wisata Jogja',
        'Kuliner Viral Yogyakarta',
        'Festival Budaya Jogja',
        'Wisata Malioboro Terbaru',
        'Liburan Keluarga ke Jogja',
        'Hotel Penuh Jogja Event',
        'Tempat Wisata Baru Yogyakarta',
        'Long Weekend Jogja',
    ];

    public function handle(NewsDiscoveryService $newsService, AIArticleService $aiService): void
    {
        Log::info('[GenerateTrendingArticleJob] Starting (Stay-Focused Mode)...');

        $selectedKeyword = $this->keywordPool[array_rand($this->keywordPool)];
        Log::info("[GenerateTrendingArticleJob] Keyword selected: {$selectedKeyword}");

        // 1. Fetch news (fetch more so we have fallbacks after filtering)
        $newsItems = $newsService->fetchTrendingNews($selectedKeyword, 'id', 10);

        if (empty($newsItems)) {
            Log::info("[GenerateTrendingArticleJob] No news found for: {$selectedKeyword}");
            return;
        }

        // 2. Quick text-based pre-filter (no AI call needed)
        $candidates = $this->preFilterNews($newsItems);

        if (empty($candidates)) {
            Log::info('[GenerateTrendingArticleJob] All news items filtered out at pre-filter stage.');
            return;
        }

        // 3. Score candidates with AI (only non-duplicates)
        foreach ($candidates as $news) {
            $relevance = $aiService->analyzeNewsRelevance($news);
            Log::info("[GenerateTrendingArticleJob] Relevance '{$news['title']}': {$relevance['score']}/10");

            if (($relevance['score'] ?? 0) < 7) {
                Log::info('[GenerateTrendingArticleJob] Low relevance, skipping.');
                continue;
            }

            // 4. Generate article for first high-relevance news
            $this->generateArticle($news, $selectedKeyword, $aiService, $relevance);
            break;
        }
    }

    /**
     * Fast pre-filter: skip duplicates and clearly irrelevant news
     * WITHOUT making any AI API calls.
     */
    private function preFilterNews(array $newsItems): array
    {
        $skipKeywords = ['korupsi', 'kriminal', 'begal', 'pembunuhan', 'politik', 'demo', 'pilkada'];

        return array_filter($newsItems, function ($news) use ($skipKeywords) {
            $titleLower = strtolower($news['title'] ?? '');

            // Skip if contains irrelevant topic
            foreach ($skipKeywords as $bad) {
                if (str_contains($titleLower, $bad)) {
                    Log::info("[GenerateTrendingArticleJob] Pre-filtered (bad keyword): {$news['title']}");
                    return false;
                }
            }

            // Skip duplicates (DB check - one query)
            if (Article::where('generation_metadata->source_url', $news['link'])->exists()) {
                Log::info("[GenerateTrendingArticleJob] Pre-filtered (duplicate): {$news['title']}");
                return false;
            }

            return true;
        });
    }

    /**
     * Generate article using a single combined AI call (outline + content merged)
     */
    private function generateArticle(array $news, string $keyword, AIArticleService $aiService, array $relevance): void
    {
        try {
            Log::info("[GenerateTrendingArticleJob] Generating article for: {$news['title']}");

            $travelerAngle = $relevance['traveler_angle'] ?? "Liburan ke Jogja saat {$news['title']}";
            $articleTitle = "Panduan Menginap: {$travelerAngle}";

            // Load 2 random active properties with only required columns
            $properties = Property::where('status', 'active')
                ->inRandomOrder()
                ->limit(2)
                ->get(['name', 'slug', 'description'])
                ->toArray();

            $author = User::whereIn('role', ['super_admin', 'admin'])->first() ?? User::first();

            // Single combined AI call (outline + content in one shot)
            $contentResponse = $aiService->generateMarketingArticle(
                articleTitle: $articleTitle,
                newsTrigger: $news['title'],
                newsSource: $news['source'],
                travelerAngle: $travelerAngle,
                keywords: [$keyword, 'Homestay Jogja', 'Sewa Villa Jogja'],
                properties: $properties,
            );
            
            // pastikan singkron dengan plan
            Article::create([
                'title' => $articleTitle,
                'slug' => Str::slug($articleTitle . '-' . uniqid()),
                'content' => $contentResponse['content'],
                'excerpt' => $contentResponse['excerpt'],
                'meta_description' => $contentResponse['meta_description'],
                'status' => 'reviewing',
                'author_id' => $author->id,
                'language' => 'id',
                'target_keywords' => [$keyword, 'Homestay Jogja'],
                'ai_provider' => 'gemini',
                'generation_metadata' => [
                    'source_news' => $news['title'],
                    'source_url' => $news['link'],
                    'relevance_score' => $relevance['score'],
                    'relevance_reason' => $relevance['reason'],
                    'generated_at' => now()->toDateTimeString(),
                ],
            ]);

            Log::info("[GenerateTrendingArticleJob] Article saved: {$articleTitle}");

        } catch (\Exception $e) {
            Log::error('[GenerateTrendingArticleJob] Failed: ' . $e->getMessage(), [
                'news' => $news['title'],
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
