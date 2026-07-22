<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $content
 * @property string|null $excerpt
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property array|null $seo_keywords
 * @property array|null $target_keywords
 * @property string $language
 * @property string $status
 * @property Carbon|null $published_at
 * @property Carbon|null $scheduled_at
 * @property string|null $ai_provider
 * @property string|null $ai_model
 * @property array|null $generation_metadata
 * @property int $author_id
 * @property int|null $content_plan_id
 * @property int $view_count
 * @property int $click_count
 * @property float|null $avg_time_on_page
 * @property string|null $featured_image
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 */
class Article extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Flag to prevent infinite loops during synchronization
     */
    public static bool $isSyncing = false;

    protected $fillable = [
        'title',
        'slug',
        'content',
        'excerpt',
        'meta_title',
        'meta_description',
        'seo_keywords',
        'target_keywords',
        'language',
        'status', // idea, researching, outlining, writing, reviewing, scheduled, published
        'published_at',
        'scheduled_at',
        'ai_provider',
        'ai_model',
        'generation_metadata',
        'author_id',
        'content_plan_id',
        'view_count',
        'click_count',
        'avg_time_on_page',
        'featured_image',
    ];

    protected $casts = [
        'seo_keywords' => 'array',
        'target_keywords' => 'array',
        'generation_metadata' => 'array',
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'view_count' => 'integer',
        'click_count' => 'integer',
        'avg_time_on_page' => 'decimal:2',
    ];

    // Relationships
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function contentPlan(): BelongsTo
    {
        return $this->belongsTo(ContentPlan::class);
    }

    public function properties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class, 'article_property')
            ->withPivot('mention_context', 'display_card', 'card_position', 'click_count')
            ->withTimestamps();
    }

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->where('published_at', '<=', now());
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled')
            ->where('scheduled_at', '>', now());
    }

    public function scopeByLanguage($query, string $language)
    {
        return $query->where('language', $language);
    }

    public function scopeSearch($query, string $searchTerm)
    {
        return $query->where(function ($q) use ($searchTerm) {
            $q->where('title', 'like', "%{$searchTerm}%")
                ->orWhere('content', 'like', "%{$searchTerm}%")
                ->orWhere('excerpt', 'like', "%{$searchTerm}%");
        });
    }

    public function scopeFeatured($query)
    {
        return $query->whereNotNull('featured_image');
    }

    // Accessors
    public function getReadingTimeAttribute(): int
    {
        // Average reading speed: 200 words per minute
        $wordCount = str_word_count(strip_tags($this->content));

        return (int) ceil($wordCount / 200);
    }

    public function getFormattedPublishedAtAttribute(): ?string
    {
        return $this->published_at?->format('d M Y');
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Schedule the article for publishing
     */
    public function schedule(\DateTimeInterface $date): bool
    {
        return $this->update([
            'status' => 'scheduled',
            'scheduled_at' => $date,
        ]);
    }
}
