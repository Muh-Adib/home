<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeoLandingPage extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'title',
        'h1',
        'meta_description',
        'content',
        'filters',
        'target_keyword',
        'search_volume',
        'sitemap_priority',
        'sitemap_changefreq',
        'intro_text',
        'benefits',
        'faqs',
        'location_description',
        'is_active',
        'indexed_at',
        'views_count',
    ];

    protected $casts = [
        'filters' => 'array',
        'benefits' => 'array',
        'faqs' => 'array',
        'is_active' => 'boolean',
        'indexed_at' => 'datetime',
        'sitemap_priority' => 'decimal:1',
        'views_count' => 'integer',
        'search_volume' => 'integer',
    ];

    /**
     * Scope: Only active pages
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: For sitemap (active + high priority)
     */
    public function scopeForSitemap($query)
    {
        return $query->active()
            ->orderBy('sitemap_priority', 'desc')
            ->orderBy('created_at', 'desc');
    }

    /**
     * Increment view count
     */
    public function incrementViews(): void
    {
        $this->increment('views_count');
    }

    /**
     * Get route URL
     */
    public function getUrlAttribute(): string
    {
        return url('/s/' . $this->slug);
    }

    /**
     * Apply filters to property query
     */
    public function applyFiltersToQuery($query)
    {
        // Get filters attribute
        $filters = $this->filters;

        // Ensure it's an array (Laravel cast should handle this, but double-check)
        if (!is_array($filters)) {
            // If it's a string, try to decode it
            if (is_string($filters)) {
                $filters = json_decode($filters, true);
            }

            // If still not array or decode failed, return query unchanged
            if (!is_array($filters)) {
                return $query;
            }
        }

        // If empty array, nothing to filter
        if (empty($filters)) {
            return $query;
        }

        // Apply each filter
        foreach ($filters as $key => $value) {
            match ($key) {
                'property_type' => $query->where(function ($q) use ($value) {
                        if ($value === 'villa') {
                            // Match either exact type OR name/description contains 'villa'
                            $q->where('type', 'villa')
                            ->orWhere('name', 'like', '%villa%')
                            ->orWhere('description', 'like', '%villa%');
                        } elseif ($value === 'guest_house') {
                            $q->where('type', 'guest_house')
                            ->orWhere('type', 'guesthouse')
                            ->orWhere('name', 'like', '%guest%house%')
                            ->orWhere('name', 'like', '%guesthouse%')
                            ->orWhere('description', 'like', '%guest%house%');
                        } elseif ($value === 'homestay') {
                            $q->where('type', 'homestay')
                            ->orWhere('name', 'like', '%homestay%')
                            ->orWhere('description', 'like', '%homestay%');
                        }
                        // If no match, don't filter (show all properties)
                    }),

                'max_price' => $query->where('base_rate', '<=', $value),
                'min_price' => $query->where('base_rate', '>=', $value),

                'location' => $query->where(function ($q) use ($value) {
                        $q->where('address', 'like', "%{$value}%")
                        ->orWhere('location', 'like', "%{$value}%")
                        ->orWhere('description', 'like', "%{$value}%");
                    }),

                'amenity' => $query->whereHas('amenities', function ($q) use ($value) {
                        $q->where('name', 'like', "%{$value}%");
                    }),

                default => null
            };
        }

        return $query;
    }
}
