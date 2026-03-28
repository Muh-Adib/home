<?php

namespace App\Observers;

use App\Jobs\NotifyGoogleIndexingJob;
use App\Models\Article;
use App\Models\ContentPlan;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\SitemapController;

class ArticleObserver
{
    /**
     * Handle the Article "creating" event.
     */
    public function creating(Article $article): void
    {
        if (empty($article->slug)) {
            $article->slug = $this->generateUniqueSlug($article->title);
        }

        if (empty($article->author_id) && Auth::check()) {
            $article->author_id = Auth::id();
        }
    }

    /**
     * Handle the Article "created" event.
     */
    public function created(Article $article): void
    {
        $this->ensureContentPlan($article);

        // Notify Google if article is published immediately upon creation
        if ($article->status === 'published') {
            NotifyGoogleIndexingJob::dispatch(
                $this->buildArticleUrl($article),
                'URL_UPDATED'
            )->onQueue('indexing');
        }
    }

    /**
     * Handle the Article "updating" event.
     */
    public function updating(Article $article): void
    {
        if ($article->isDirty('title') && empty($article->slug)) {
            $article->slug = $this->generateUniqueSlug($article->title);
        }
    }

    /**
     * Handle the Article "updated" event.
     */
    public function updated(Article $article): void
    {
        $statusChanged   = $article->isDirty('status');
        $becamePublished = $statusChanged && $article->status === 'published';
        $becameUnpublished = $statusChanged && $article->status !== 'published';

        if ($article->status === 'published') {
            SitemapController::clearCache();
        }

        // Deindex if article was unpublished (went from published → draft/archived)
        if ($becameUnpublished) {
            NotifyGoogleIndexingJob::dispatch(
                $this->buildArticleUrl($article),
                'URL_DELETED'
            )->onQueue('indexing');
        }

        // Notify Google if article just became published
        elseif ($becamePublished) {
            NotifyGoogleIndexingJob::dispatch(
                $this->buildArticleUrl($article),
                'URL_UPDATED'
            )->onQueue('indexing');
        }

        // Notify Google if key SEO content changed on an already-published article
        elseif ($article->status === 'published' && $article->isDirty(['title', 'slug', 'content', 'excerpt', 'seo_title', 'seo_description', 'featured_image'])) {
            NotifyGoogleIndexingJob::dispatch(
                $this->buildArticleUrl($article),
                'URL_UPDATED'
            )->onQueue('indexing');
        }

        // Prevent infinite loop
        if (Article::$isSyncing) {
            return;
        }

        // Sync to ContentPlan
        if ($article->content_plan_id && $article->contentPlan) {
            ContentPlan::$isSyncing = true;

            $dataToSync = [
                'status' => $article->status,
                'title' => $article->title,
                'target_keywords' => $article->target_keywords,
            ];

            // Sync dates
            if ($article->scheduled_at) {
                $dataToSync['planned_publish_date'] = $article->scheduled_at;
            } elseif ($article->published_at) {
                $dataToSync['actual_publish_date'] = $article->published_at;
                $dataToSync['planned_publish_date'] = $article->published_at;
            }

            // Sync author
            if ($article->author_id) {
                $dataToSync['assigned_to'] = $article->author_id;
            }

            // Sync AI suggestions (intent/variations) back to ContentPlan
            if ($article->isDirty('generation_metadata')) {
                $metadata = $article->generation_metadata ?? [];
                $suggestions = $article->contentPlan->ai_suggestions ?? [];

                $suggestions['search_intent'] = $metadata['search_intent'] ?? ($suggestions['search_intent'] ?? null);
                $suggestions['keyword_variations'] = $metadata['keyword_variations'] ?? ($suggestions['keyword_variations'] ?? null);

                $dataToSync['ai_suggestions'] = $suggestions;
            }

            $article->contentPlan->update($dataToSync);

            ContentPlan::$isSyncing = false;
        }
    }

    /**
     * Handle the Article "deleted" event.
     */
    public function deleted(Article $article): void
    {
        SitemapController::clearCache();

        // Deindex from Google if the deleted article was published
        if ($article->status === 'published') {
            NotifyGoogleIndexingJob::dispatch(
                $this->buildArticleUrl($article),
                'URL_DELETED'
            )->onQueue('indexing');
        }
    }

    /**
     * Build the public-facing URL for an article.
     */
    private function buildArticleUrl(Article $article): string
    {
        $baseUrl = rtrim(config('app.url'), '/');
        return "{$baseUrl}/articles/{$article->slug}";
    }

    /**
     * Generate a unique slug for the article
     */
    private function generateUniqueSlug(string $title): string
    {
        $slug = Str::slug($title);
        $count = Article::whereRaw("slug LIKE ?", ["{$slug}%"])->count();

        return $count > 0 ? "{$slug}-{$count}" : $slug;
    }

    /**
     * Ensure a content plan is linked to the article (background meta-data)
     */
    private function ensureContentPlan(Article $article): void
    {
        if (!$article->content_plan_id) {
            $plan = ContentPlan::create([
                'title' => $article->title,
                'target_keywords' => $article->target_keywords ?? [],
                'status' => 'writing',
                'content_type' => 'article',
                'created_by' => $article->author_id ?? Auth::id(),
                'assigned_to' => $article->author_id ?? Auth::id(),
            ]);

            // Update without triggering observer again
            $article->content_plan_id = $plan->id;
            $article->saveQuietly();
        }
    }
}
