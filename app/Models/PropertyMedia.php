<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyMedia extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'media_type',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
        'category',
        'title',
        'alt_text',
        'description',
        'display_order',
        'is_featured',
        'is_cover',
        'dimensions',
        'thumbnail_path',
    ];

    protected $casts = [
        'is_cover' => 'boolean',
        'is_featured' => 'boolean',
        'file_size' => 'integer',
        'display_order' => 'integer',
    ];

    protected $appends = [
        'url',
        'thumbnail_url',
    ];

    // Relationships
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    // Scopes
    public function scopeCover($query)
    {
        return $query->where('is_cover', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }

    public function scopeImages($query)
    {
        return $query->where('media_type', 'image');
    }

    public function scopeVideos($query)
    {
        return $query->where('media_type', 'video');
    }

    // Accessors
    public function getUrlAttribute(): string
    {
        return $this->file_path ? asset('storage/' . $this->file_path) : '';
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path ? asset('storage/' . $this->thumbnail_path) : null;
    }

    // Mutators
    public function setSortOrderAttribute($value)
    {
        $this->attributes['display_order'] = $value;
    }

    public function getSortOrderAttribute()
    {
        return $this->attributes['display_order'];
    }
}
