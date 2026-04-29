<?php

declare(strict_types=1);

namespace App\Observers;

use App\Jobs\NotifyGoogleIndexingJob;
use App\Models\Property;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PropertyObserver
{
    /**
     * Cache keys that must be invalidated when a property changes.
     */
    private function invalidatePropertyCaches(Property $property): void
    {
        Cache::forget("property_show_v2_{$property->id}_relations");
        Cache::forget("property_seo_v2_{$property->id}");
        Cache::forget('properties_map_coordinates');
        Cache::forget('featured_properties_homepage');
        Cache::forget('active_amenities_ordered');
        Cache::forget('seo_properties_index');
        Cache::forget('schema_properties_index');

        // Invalidate availability caches for this property (pattern-based)
        // Since we can't do pattern delete on all drivers, we use a versioning approach:
        // availability cache keys include dates, so they expire naturally within 1h.
        // For immediate invalidation, flush the known current-day key.
        $today = now()->toDateString();
        $endDate = now()->addMonths(3)->toDateString();
        Cache::forget("property_v2_{$property->id}_avail_{$today}_{$endDate}");
    }

    /**
     * Handle the Property "created" event.
     */
    public function created(Property $property): void
    {
        $this->invalidatePropertyCaches($property);

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
     */
    public function updated(Property $property): void
    {
        $this->invalidatePropertyCaches($property);

        $statusChanged = $property->isDirty('status');
        $becameActive  = $statusChanged && $property->status === 'active';
        $becameDeleted = $statusChanged && in_array($property->status, ['inactive', 'deleted'], true);

        if ($becameDeleted) {
            $url = $this->buildPropertyUrl($property);
            NotifyGoogleIndexingJob::dispatch($url, 'URL_DELETED')->onQueue('indexing');
            return;
        }

        if ($property->status !== 'active') {
            return;
        }

        $seoFieldsDirty = $property->isDirty([
            'name', 'description', 'slug', 'seo_title', 'seo_description', 'address', 'base_rate',
        ]);

        if ($becameActive || $seoFieldsDirty) {
            $url = $this->buildPropertyUrl($property);

            Log::info('[PropertyObserver] Active property updated, dispatching Google Indexing notification.', [
                'property_id'    => $property->id,
                'property_slug'  => $property->slug,
                'changed_fields' => $property->getDirty(),
                'url'            => $url,
            ]);

            NotifyGoogleIndexingJob::dispatch($url, 'URL_UPDATED')->onQueue('indexing');
        }
    }

    /**
     * Handle the Property "deleted" (soft delete) event.
     */
    public function deleted(Property $property): void
    {
        $this->invalidatePropertyCaches($property);

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
