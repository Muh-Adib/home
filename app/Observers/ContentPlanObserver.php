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
}
