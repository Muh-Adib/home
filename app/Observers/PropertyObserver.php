<?php

declare(strict_types=1);

namespace App\Observers;

use App\Jobs\NotifyGoogleIndexingJob;
use App\Models\Property;
use Illuminate\Support\Facades\Log;

class PropertyObserver
{
    /**
     * Handle the Property "created" event.
     * Notifies Google to index the new property page.
     */
    public function created(Property $property): void
    {
        if ($property->status !== 'active') {
            return;
        }

        $url = $this->buildPropertyUrl($property);

        Log::info('[PropertyObserver] New active property created, dispatching Google Indexing notification.', [
            'property_id'   => $property->id,
            'property_slug' => $property->slug,
            'url'           => $url,
        ]);

        NotifyGoogleIndexingJob::dispatch($url, 'URL_UPDATED')->onQueue('indexing');
    }

    /**
     * Handle the Property "updated" event.
     * Notifies Google when a property becomes active or its content changes.
     */
    public function updated(Property $property): void
    {
        $statusChanged = $property->isDirty('status');
        $becameActive  = $statusChanged && $property->status === 'active';
        $becameDeleted = $statusChanged && in_array($property->status, ['inactive', 'deleted'], true);

        // If property went inactive => notify Google to deindex
        if ($becameDeleted) {
            $url = $this->buildPropertyUrl($property);
            NotifyGoogleIndexingJob::dispatch($url, 'URL_DELETED')->onQueue('indexing');
            return;
        }

        // Only notify for active properties
        if ($property->status !== 'active') {
            return;
        }

        // Notify if status just became active, or key SEO fields changed
        $seoFieldsDirty = $property->isDirty([
            'name',
            'description',
            'slug',
            'seo_title',
            'seo_description',
            'address',
            'base_rate',
        ]);

        if ($becameActive || $seoFieldsDirty) {
            $url = $this->buildPropertyUrl($property);

            Log::info('[PropertyObserver] Active property updated, dispatching Google Indexing notification.', [
                'property_id'      => $property->id,
                'property_slug'    => $property->slug,
                'changed_fields'   => $property->getDirty(),
                'url'              => $url,
            ]);

            NotifyGoogleIndexingJob::dispatch($url, 'URL_UPDATED')->onQueue('indexing');
        }
    }

    /**
     * Handle the Property "deleted" (soft delete) event.
     * Notifies Google to deindex the removed property page.
     */
    public function deleted(Property $property): void
    {
        $url = $this->buildPropertyUrl($property);

        Log::info('[PropertyObserver] Property soft-deleted, notifying Google to deindex.', [
            'property_id'   => $property->id,
            'property_slug' => $property->slug,
            'url'           => $url,
        ]);

        NotifyGoogleIndexingJob::dispatch($url, 'URL_DELETED')->onQueue('indexing');
    }

    /**
     * Build the public-facing URL for a property.
     */
    private function buildPropertyUrl(Property $property): string
    {
        $baseUrl = rtrim(config('app.url'), '/');
        return "{$baseUrl}/properties/{$property->slug}";
    }
}
