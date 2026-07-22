<?php

namespace Tests\Feature;

use App\Jobs\GenerateTrendingArticleJob;
use App\Models\Article;
use App\Models\Property;
use App\Models\User;
use App\Services\AIArticleService;
use App\Services\NewsDiscoveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AIArticleGenerationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_filters_low_relevance_news(): void
    {
        /** Mock: news service returns 1 item */
        $newsService = Mockery::mock(NewsDiscoveryService::class);
        $newsService->shouldReceive('fetchTrendingNews')
            ->andReturn([
                [
                    'title' => 'Minor Political Debate in City Hall',
                    'link' => 'http://example.com/news1',
                    'source' => 'LocalNews',
                    'pubDate' => now()->toIso8601String(),
                ],
            ]);

        /** Mock: AI returns low score */
        $aiService = Mockery::mock(AIArticleService::class);
        $aiService->shouldReceive('analyzeNewsRelevance')
            ->andReturn(['score' => 4, 'reason' => 'Not travel relevant', 'traveler_angle' => 'None']);

        /** No content generation should be called */
        $aiService->shouldNotReceive('generateTitle');
        $aiService->shouldNotReceive('generateOutline');
        $aiService->shouldNotReceive('generateContent');

        $job = new GenerateTrendingArticleJob;
        $job->handle($newsService, $aiService);

        $this->assertEquals(0, Article::count());
    }

    #[Test]
    public function it_generates_article_for_high_relevance_news(): void
    {
        /** Seed active property & admin user */
        Property::factory()->create(['name' => 'Villa A', 'status' => 'active']);
        User::factory()->create(['role' => 'super_admin']);

        /** Mock: news service returns 1 item */
        $newsService = Mockery::mock(NewsDiscoveryService::class);
        $newsService->shouldReceive('fetchTrendingNews')
            ->andReturn([
                [
                    'title' => 'Major Jazz Festival Announced in Yogyakarta',
                    'link' => 'http://example.com/news2',
                    'source' => 'EventNews',
                    'pubDate' => now()->toIso8601String(),
                ],
            ]);

        /** Mock: AI returns high score */
        $aiService = Mockery::mock(AIArticleService::class);
        $aiService->shouldReceive('analyzeNewsRelevance')
            ->andReturn([
                'score' => 8,
                'reason' => 'Big event, travelers need accommodation',
                'traveler_angle' => 'Book early for Jazz Festival Yogyakarta',
            ]);

        /** Mock: Step 1 — Title generation */
        $aiService->shouldReceive('generateTitle')
            ->once()
            ->andReturn([
                'success' => true,
                'titles' => [
                    'Villa Murah Jogja Saat Jazz Festival: Panduan Lengkap',
                    'Rekomendasi Homestay Jogja untuk Jazz Festival 2026',
                    'Menginap Nyaman di Jogja Saat Jazz Festival',
                ],
                'provider' => 'gemini',
                'model' => 'gemini-pro',
            ]);

        /** Mock: Step 2 — Outline generation */
        $aiService->shouldReceive('generateOutline')
            ->once()
            ->andReturn([
                'success' => true,
                'outline' => "## Hook\nJogja Jazz Festival selalu menarik ribuan pengunjung...\n\n## Area Menginap\n### Dekat Venue Festival\n### Dekat Malioboro\n\n## Estimasi Budget\n- Villa: Rp 1.500.000/malam\n\n## CTA\nSegera booking sebelum penuh!",
                'lsi_keywords' => ['festival Jogja', 'penginapan murah Yogyakarta', 'villa rombongan Jogja'],
                'provider' => 'gemini',
                'article_type' => 'event_article',
            ]);

        /** Mock: Step 3 — Content generation */
        $aiService->shouldReceive('generateContent')
            ->once()
            ->andReturn([
                'success' => true,
                'content' => '## Jazz Festival Jogja dan Dilema Penginapan'.str_repeat(' lorem ipsum', 80),
                'excerpt' => 'Panduan lengkap menginap di Jogja saat Jazz Festival.',
                'meta_description' => 'Cari villa murah di Jogja untuk Jazz Festival? Temukan rekomendasi terbaik di sini.',
                'word_count' => 820,
                'provider' => 'gemini',
                'article_type' => 'event_article',
            ]);

        $job = new GenerateTrendingArticleJob;
        $job->handle($newsService, $aiService);

        $this->assertEquals(1, Article::count());

        $article = Article::first();
        $this->assertEquals('reviewing', $article->status);
        $this->assertEquals('id', $article->language);
        $this->assertEquals('event_article', $article->generation_metadata['article_type']);
        $this->assertNotEmpty($article->generation_metadata['lsi_keywords']);
        $this->assertNotEmpty($article->generation_metadata['keyword_category']);
        $this->assertGreaterThan(0, $article->generation_metadata['word_count']);
    }
}
