<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $uuid
 * @property string $title
 * @property string|null $description
 * @property array|null $target_keywords
 * @property string|null $target_audience
 * @property string $content_type
 * @property string $status
 * @property array|null $ai_research_data
 * @property array|null $ai_outline
 * @property array|null $ai_suggestions
 * @property \Illuminate\Support\Carbon|null $planned_publish_date
 * @property \Illuminate\Support\Carbon|null $actual_publish_date
 * @property int $priority
 * @property int $created_by
 * @property int|null $assigned_to
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
class ContentPlan extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Flag to prevent infinite loops during synchronization
     */
    public static bool $isSyncing = false;

    protected $fillable = [
        'uuid',
        'title',
        'description',
        'target_keywords',
        'target_audience',
        'content_type',
        'status',
        'ai_research_data',
        'ai_outline',
        'ai_suggestions',
        'planned_publish_date',
        'actual_publish_date',
        'priority',
        'created_by',
        'assigned_to',
    ];

    /**
     * Use UUID for routing instead of numeric ID
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected $casts = [
        'target_keywords' => 'array',
        'ai_research_data' => 'array',
        'ai_outline' => 'array',
        'ai_suggestions' => 'array',
        'planned_publish_date' => 'datetime',
        'actual_publish_date' => 'datetime',
        'priority' => 'integer',
    ];

    // Relationships
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function article(): HasOne
    {
        return $this->hasOne(Article::class);
    }

    // Scopes
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->whereDoesntHave('article')
            ->whereNotIn('status', ['published']);
    }

    public function scopeOverdue($query)
    {
        return $query->where('planned_publish_date', '<', now())
            ->whereNotIn('status', ['published'])
            ->whereDoesntHave('article');
    }

    public function scopeByPriority($query, int $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeHighPriority($query)
    {
        return $query->where('priority', '>=', 4);
    }

    /**
     * Mark the content plan as published
     */
    public function markAsPublished(): void
    {
        $this->update([
            'status' => 'published',
            'actual_publish_date' => now(),
        ]);
    }
}
