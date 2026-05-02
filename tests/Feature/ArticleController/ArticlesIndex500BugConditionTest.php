<?php

namespace Tests\Feature\ArticleController;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Bug Condition Exploration Tests — Task 4 (Bugfix: seo-repair-p0-critical-fixes)
 *
 * CRITICAL: These tests MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * Goal: Surface counterexamples that demonstrate the cache corruption bug in
 * ArticleController::publicIndex(). When a stale or corrupt cache entry exists
 * for the articles index key, the unfixed code throws an unhandled exception
 * resulting in HTTP 500.
 *
 * Cache key format (from publicIndex()):
 *   'articles_index_v2_' . md5(json_encode($request->only(['page', 'language', 'search'])))
 *
 * For a plain GET /articles with no query params, Request::only() returns [] (empty array),
 * so the key is: 'articles_index_v2_' . md5('[]')
 *                = 'articles_index_v2_d751713988987e9331980363e24189ce'
 *
 * Validates: Requirements 1.3, 1.4
 */
class ArticlesIndex500BugConditionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The exact cache key used by publicIndex() for a plain GET /articles request
     * (no query params). Computed as:
     *   'articles_index_v2_' . md5(json_encode([]))
     * because Request::only(['page','language','search']) returns [] when none are present.
     */
    private string $cacheKey = 'articles_index_v2_d751713988987e9331980363e24189ce';

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure cache is clean before each test
        Cache::forget($this->cacheKey);

        // Create a published article so the query has data to work with
        $author = User::factory()->create();
        Article::create([
            'title' => 'Test Article',
            'slug' => 'test-article',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'author_id' => $author->id,
            'language' => 'id',
        ]);
    }

    // =========================================================================
    // Test Case A — Corrupt Non-Array String Cache Entry
    // Validates: Requirements 1.3, 1.4
    // =========================================================================

    /**
     * When the articles index cache key contains a corrupt non-array string value,
     * GET /articles MUST return HTTP 200.
     *
     * The fixed publicIndex() wraps Cache::remember() in a try/catch that flushes the
     * corrupt key and re-executes the query. This test encodes the expected (fixed) behavior.
     *
     * Note: On unfixed code, PHP 8's null-coalescing operator (?? []) on a string offset
     * access returns null rather than throwing, so this specific case may not produce a 500.
     * The test still encodes the correct expected behavior and will pass after the fix.
     *
     * Counterexample documented:
     *   Cache::put($cacheKey, 'corrupt_string', 3600)
     *   GET /articles → should return 200 (fixed behavior)
     *
     * **Validates: Requirements 1.3, 1.4**
     */
    #[Test]
    public function articles_index_returns_200_when_cache_contains_corrupt_string(): void
    {
        // Seed the cache with a corrupt non-array string value BEFORE the request
        Cache::put($this->cacheKey, 'corrupt_string', 3600);

        $response = $this->get('/articles');

        $response->assertStatus(200);
    }

    // =========================================================================
    // Test Case B — Stale Serialized Object Cache Entry (__PHP_Incomplete_Class)
    // Validates: Requirements 1.3, 1.4
    // =========================================================================

    /**
     * When the articles index cache key contains a stale serialized object (simulating a
     * LengthAwarePaginator stored before the toArray() guard was added), GET /articles
     * MUST return HTTP 200.
     *
     * On UNFIXED code this test FAILS with HTTP 500 because Cache::remember() returns the
     * deserialized stdClass (or __PHP_Incomplete_Class) object, and the code then attempts
     * to access it as an array at ArticleController.php:464 ($articles['data'] ?? []),
     * throwing an unhandled Error.
     *
     * Counterexample documented:
     *   Cache::put($cacheKey, new \stdClass(), 3600)
     *   GET /articles → 500
     *   Error: Cannot use object of type stdClass as array
     *   at app/Http/Controllers/ArticleController.php:464
     *   ($this->seoService->articlesIndexSchema(collect($articles['data'] ?? [])))
     *
     * **Validates: Requirements 1.3, 1.4**
     */
    #[Test]
    public function articles_index_returns_200_when_cache_contains_stale_serialized_object(): void
    {
        // Seed the cache with a stdClass object — simulates a stale serialized paginator
        // that was stored before the toArray() guard existed, or a __PHP_Incomplete_Class
        // that results from deserializing a LengthAwarePaginator without the class loaded.
        $staleObject = new \stdClass;
        $staleObject->current_page = 1;
        $staleObject->data = [];
        $staleObject->total = 0;

        Cache::put($this->cacheKey, $staleObject, 3600);

        $response = $this->get('/articles');

        $response->assertStatus(200);
    }
}
