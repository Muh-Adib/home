<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LegalPage extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'type',
        'version',
        'content',
        'published_at',
    ];

    protected $casts = [
        'content' => 'array',
        'published_at' => 'datetime',
    ];

    /**
     * Scope untuk ambil hanya dokumen aktif (tidak archived)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    /**
     * Scope untuk ambil dokumen berdasarkan base slug
     */
    public function scopeByBaseSlug($query, $slug)
    {
        return $query->where(function($q) use ($slug) {
            $q->where('slug', $slug)
              ->orWhere('slug', 'LIKE', $slug . '-%');
        });
    }

    /**
     * Check apakah ini dokumen aktif
     */
    public function isActive(): bool
    {
        return $this->deleted_at === null;
    }

    /**
     * Check apakah ini dokumen archived
     */
    public function isArchived(): bool
    {
        return $this->deleted_at !== null;
    }

    /**
     * Get original slug (untuk archived documents)
     */
    public function getOriginalSlugAttribute(): string
    {
        if ($this->isActive()) {
            return $this->slug;
        }
        
        // Extract original slug dari archived slug (tos-abc123-1234567890 -> tos)
        return explode('-', $this->slug)[0];
    }

    /**
     * Get formatted version
     */
    public function getFormattedVersionAttribute(): string
    {
        return $this->version;
    }

    /**
     * Get formatted published date
     */
    public function getFormattedPublishedDateAttribute(): ?string
    {
        return $this->published_at 
            ? $this->published_at->format('d F Y, H:i')
            : null;
    }
}