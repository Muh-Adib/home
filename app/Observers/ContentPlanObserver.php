<?php

namespace App\Observers;

use App\Models\ContentPlan;
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

        if ($contentPlan->article) {
            \App\Models\Article::$isSyncing = true;

            $dataToSync = [
                'status' => $contentPlan->status,
                'title' => $contentPlan->title,
                'target_keywords' => $contentPlan->target_keywords,
            ];

            // Sync dates
            if ($contentPlan->planned_publish_date) {
                $dataToSync['scheduled_at'] = $contentPlan->planned_publish_date;
            }

            // Sync assignee to author
            if ($contentPlan->assigned_to) {
                $dataToSync['author_id'] = $contentPlan->assigned_to;
            }

            $contentPlan->article->update($dataToSync);

            \App\Models\Article::$isSyncing = false;
        }
    }
}
