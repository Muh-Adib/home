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
use Tests\TestCase;

class AIArticleGenerationTest extends TestCase
{
    use RefreshDatabase;

    #[\PHPUnit\Framework\Attributes\Test]
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
                ]
            ]);

        /** Mock: AI returns low score */
        $aiService = Mockery::mock(AIArticleService::class);
        $aiService->shouldReceive('analyzeNewsRelevance')
            ->andReturn(['score' => 4, 'reason' => 'Not travel relevant', 'traveler_angle' => 'None']);

        /** No content generation should be called */
        $aiService->shouldNotReceive('generateMarketingArticle');

        $job = new GenerateTrendingArticleJob();
        $job->handle($newsService, $aiService);

        $this->assertEquals(0, Article::count());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_generates_article_for_high_relevance_news(): void
    {
        /** Seed active property */
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
                ]
            ]);

        /** Mock: AI returns high score */
        $aiService = Mockery::mock(AIArticleService::class);
        $aiService->shouldReceive('analyzeNewsRelevance')
            ->andReturn([
                'score' => 8,
                'reason' => 'Big event, travelers need accommodation',
                'traveler_angle' => 'Book early for Jazz Festival Yogyakarta',
            ]);

        /** Mock: single combined content call */
        $aiService->shouldReceive('generateMarketingArticle')
            ->once()
            ->andReturnUsing(fn() => [
                'success' => true,
                'content' => '## Liburan ke Jogja saat Festival Jazz' . str_repeat(' lorem ipsum', 60),
                'excerpt' => 'Liburan ke Jogja saat festival.',
                'meta_description' => 'Panduan menginap saat Jazz Festival Yogyakarta.',
                'word_count' => 700,
                'provider' => 'gemini',
            ]);

        $job = new GenerateTrendingArticleJob();
        $job->handle($newsService, $aiService);

        $this->assertEquals(1, Article::count());

        $article = Article::first();
        $this->assertEquals('reviewing', $article->status);
        $this->assertStringContainsString('Panduan Menginap', $article->title);
        $this->assertEquals('id', $article->language);
    }
}
