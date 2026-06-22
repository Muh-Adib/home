<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\PropertySeasonalRate;
use Illuminate\Support\Facades\Cache;

class PropertySeasonalRateObserver
{
    /**
     * Handle the PropertySeasonalRate "created" event.
     */
    public function created(PropertySeasonalRate $rate): void
    {
        $this->invalidatePropertyCaches($rate->property_id);
    }

    /**
     * Handle the PropertySeasonalRate "updated" event.
     */
    public function updated(PropertySeasonalRate $rate): void
    {
        $this->invalidatePropertyCaches($rate->property_id);
        if ($rate->isDirty('property_id')) {
            $this->invalidatePropertyCaches($rate->getOriginal('property_id'));
        }
    }

    /**
     * Handle the PropertySeasonalRate "deleted" event.
     */
    public function deleted(PropertySeasonalRate $rate): void
    {
        $this->invalidatePropertyCaches($rate->property_id);
    }

    /**
     * Invalidate cached data for a property affected by seasonal rate changes.
     */
    private function invalidatePropertyCaches(int $propertyId): void
    {
        Cache::forget("property_show_v2_{$propertyId}_relations");
        Cache::forget("property_seo_v2_{$propertyId}");

        $today = now()->toDateString();
        $endDate = now()->addMonths(3)->toDateString();
        Cache::forget("property_v2_{$propertyId}_avail_{$today}_{$endDate}");
    }
}
