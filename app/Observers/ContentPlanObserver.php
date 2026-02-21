<?php

namespace App\Observers;

use App\Models\ContentPlan;
use App\Models\Article;
use Illuminate\Support\Str;

class ContentPlanObserver
{
    /**
     * Handle the ContentPlan "creating" event.
     */
    public function creating(ContentPlan $contentPlan): void
    {
        if (empty($contentPlan->uuid)) {
            $contentPlan->uuid = (string) Str::uuid();
        }
    }

    /**
     * Handle the ContentPlan "updated" event.
     */
    public function updated(ContentPlan $contentPlan): void
    {
        // Prevent infinite loop
        if (ContentPlan::$isSyncing) {
            return;
        }

        // 1. Auto-create Article when moving to 'writing' status
        if ($contentPlan->isDirty('status') && $contentPlan->status === 'writing' && !$contentPlan->article) {
            Article::create([
                'title' => $contentPlan->title,
                'target_keywords' => $contentPlan->target_keywords,
                'status' => 'writing',
                'language' => 'id',
                'content_plan_id' => $contentPlan->id,
                'author_id' => $contentPlan->assigned_to ?? $contentPlan->created_by,
                'generation_metadata' => [
                    'search_intent' => $contentPlan->ai_suggestions['search_intent'] ?? null,
                    'keyword_variations' => $contentPlan->ai_suggestions['keyword_variations'] ?? null,
                ],
            ]);
        }

        // 2. Sync data to existing Article
        if ($contentPlan->article) {
            Article::$isSyncing = true;

            $dataToSync = [
                'status' => $contentPlan->status,
                'title' => $contentPlan->title,
                'target_keywords' => $contentPlan->target_keywords,
            ];

            // Sync AI suggestions (intent/variations) to generation_metadata
            if ($contentPlan->isDirty('ai_suggestions')) {
                $metadata = $contentPlan->article->generation_metadata ?? [];
                $metadata['search_intent'] = $contentPlan->ai_suggestions['search_intent'] ?? null;
                $metadata['keyword_variations'] = $contentPlan->ai_suggestions['keyword_variations'] ?? null;
                $dataToSync['generation_metadata'] = $metadata;
            }

            // Sync dates
            if ($contentPlan->planned_publish_date) {
                $dataToSync['scheduled_at'] = $contentPlan->planned_publish_date;
            }

            // Sync assignee to author
            if ($contentPlan->assigned_to) {
                $dataToSync['author_id'] = $contentPlan->assigned_to;
            }

            $contentPlan->article->update($dataToSync);

            Article::$isSyncing = false;
        }
    }

    /**
     * Handle the ContentPlan "deleted" event.
     */
    public function deleted(ContentPlan $contentPlan): void
    {
        if ($contentPlan->article) {
            $contentPlan->article->delete();
        }
    }
}
