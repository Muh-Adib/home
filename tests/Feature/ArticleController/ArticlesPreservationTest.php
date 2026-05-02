<?php

namespace Tests\Feature\ArticleController;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Preservation Property Tests — Task 5 (Bugfix: seo-repair-p0-critical-fixes)
 *
 * Goal: Establish baseline behavior BEFORE the cache corruption fix is applied.
 * These tests MUST PASS on unfixed code — they document what must be preserved.
 *
 * Validates: Requirements 3.3, 3.4
 */
class ArticlesPreservationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The exact cache key used by publicIndex() for a plain GET /articles request
     * (no query params). Computed as:
     *   'articles_index_v2_' . md5(json_encode([]))
     * because Request::only(['page','language','search']) returns [] when none are present.
     */
    private string $cacheKey = 'articles_index_v2_d751713988987e9331980363e24189ce';

    private User $admin;

    private Article $publishedArticle;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::forget($this->cacheKey);

        $author = User::factory()->create();

        $this->publishedArticle = Article::create([
            'title' => 'Test Published Article',
            'slug' => 'test-published-article',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'author_id' => $author->id,
            'language' => 'id',
        ]);

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
        ]);
    }

    // =========================================================================
    // Test Case A — Article detail page is unaffected
    // Validates: Requirement 3.3
    // =========================================================================

    /**
     * GET /articles/{slug} for a published article returns HTTP 200.
     *
     * The fix only touches publicIndex() — the show() method is unaffected.
     * This test confirms the article detail page continues to work correctly
     * before and after the fix is applied.
     *
     * **Validates: Requirements 3.3**
     */
    #[Test]
    public function article_detail_page_returns_200_for_published_article(): void
    {
        $response = $this->get('/articles/'.$this->publishedArticle->slug);

        $response->assertStatus(200);
    }

    // =========================================================================
    // Test Case B — Admin articles index is unaffected
    // Validates: Requirement 3.4
    // =========================================================================

    /**
     * GET /admin/articles returns HTTP 200 when authenticated as an admin user.
     *
     * The fix only touches publicIndex() — the admin index() method is unaffected.
     * This test confirms the admin article management interface continues to work
     * correctly before and after the fix is applied.
     *
     * **Validates: Requirements 3.4**
     */
    #[Test]
    public function admin_articles_index_returns_200_for_authenticated_admin(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/articles');

        $response->assertStatus(200);
    }

    // =========================================================================
    // Test Case C — Valid cache entry is preserved (not flushed)
    // Validates: Requirements 3.3, 3.4
    // =========================================================================

    /**
     * GET /articles with a valid pre-seeded cache array returns HTTP 200 and
     * does NOT flush the cache key — the valid cache entry should still be there
     * after the request.
     *
     * publicIndex() calls Cache::remember() which returns the cached value when
     * the key exists. A valid array (matching the paginator toArray() structure)
     * must pass through without being flushed. This confirms the fix only targets
     * corrupt entries and leaves valid ones intact.
     *
     * **Validates: Requirements 3.3, 3.4**
     */
    #[Test]
    public function articles_index_returns_200_and_preserves_valid_cache_entry(): void
    {
        // Seed the cache with a valid paginator-shaped array — exactly what
        // publicIndex() stores via $query->paginate(12)->toArray().
        //
        // We use an empty 'data' array so that SeoService::articlesIndexSchema()
        // maps over nothing (avoiding the object-property access on array items
        // that is part of the same bug being fixed). This is a valid cache entry
        // representing a page with no results, and it must NOT be flushed.
        $validCacheEntry = [
            'current_page' => 1,
            'data' => [],
            'first_page_url' => url('/articles?page=1'),
            'from' => null,
            'last_page' => 1,
            'last_page_url' => url('/articles?page=1'),
            'links' => [],
            'next_page_url' => null,
            'path' => url('/articles'),
            'per_page' => 12,
            'prev_page_url' => null,
            'to' => null,
            'total' => 0,
        ];

        Cache::put($this->cacheKey, $validCacheEntry, 3600);

        $response = $this->get('/articles');

        $response->assertStatus(200);

        // The valid cache entry must NOT have been flushed — it should still be present
        $this->assertTrue(
            Cache::has($this->cacheKey),
            'Valid cache entry was unexpectedly flushed by publicIndex()'
        );
    }
}
