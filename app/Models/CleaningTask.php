<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CleaningTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'booking_id',
        'assigned_to',
        'created_by',
        'completed_by',
        'task_number',
        'title',
        'description',
        'task_type',
        'priority',
        'status',
        'scheduled_date',
        'estimated_duration',
        'started_at',
        'completed_at',
        'deadline',
        'cleaning_areas',
        'checklist',
        'special_instructions',
        'completion_notes',
        'quality_rating',
        'quality_notes',
        'reviewed_by',
        'reviewed_at',
        'estimated_cost',
        'actual_cost',
        'before_photos',
        'after_photos',
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'deadline' => 'datetime',
        'reviewed_at' => 'datetime',
        'cleaning_areas' => 'array',
        'checklist' => 'array',
        'before_photos' => 'array',
        'after_photos' => 'array',
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
    ];

    protected $dates = [
        'scheduled_date',
        'started_at', 
        'completed_at',
        'deadline',
        'reviewed_at'
    ];

    // Task types constants
    const TASK_TYPES = [
        'checkout_cleaning' => 'Checkout Cleaning',
        'preparation_cleaning' => 'Preparation Cleaning',
        'maintenance_cleaning' => 'Maintenance Cleaning',
        'scheduled_cleaning' => 'Scheduled Cleaning',
        'inspection_cleaning' => 'Inspection Cleaning',
        'emergency_cleaning' => 'Emergency Cleaning',
    ];

    // Priority levels
    const PRIORITIES = [
        'low' => 'Low',
        'normal' => 'Normal',
        'high' => 'High',
        'urgent' => 'Urgent',
    ];

    // Status levels
    const STATUSES = [
        'pending' => 'Pending',
        'assigned' => 'Assigned',
        'in_progress' => 'In Progress',
        'review_required' => 'Review Required',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
    ];

    // Quality ratings
    const QUALITY_RATINGS = [
        'poor' => 'Poor',
        'fair' => 'Fair',
        'good' => 'Good',
        'excellent' => 'Excellent',
    ];

    // Default cleaning areas
    const DEFAULT_CLEANING_AREAS = [
        'bedroom' => 'Bedrooms',
        'bathroom' => 'Bathrooms',
        'kitchen' => 'Kitchen',
        'living_room' => 'Living Room',
        'dining_room' => 'Dining Room',
        'outdoor' => 'Outdoor Areas',
        'pool' => 'Swimming Pool',
        'garden' => 'Garden',
    ];

    /**
     * Relationships
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function inventoryTransactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    /**
     * Boot method to generate task number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($task) {
            if (empty($task->task_number)) {
                $task->task_number = static::generateTaskNumber();
            }
        });
    }

    /**
     * Generate unique task number
     */
    public static function generateTaskNumber(): string
    {
        $date = now()->format('ymd');
        $lastTask = static::whereDate('created_at', now()->toDateString())
            ->orderBy('id', 'desc')
            ->first();
        
        $sequence = $lastTask ? (int) substr($lastTask->task_number, -3) + 1 : 1;
        
        return 'CT-' . $date . '-' . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Scopes
     */
    public function scopeByProperty($query, $propertyId)
    {
        return $query->where('property_id', $propertyId);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByTaskType($query, $taskType)
    {
        return $query->where('task_type', $taskType);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeAssignedTo($query, $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    public function scopeScheduledBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('scheduled_date', [$startDate, $endDate]);
    }

    public function scopeOverdue($query)
    {
        return $query->where('deadline', '<', now())
                    ->whereNotIn('status', ['completed', 'cancelled']);
    }

    public function scopeUpcoming($query, $hours = 24)
    {
        return $query->whereBetween('scheduled_date', [now(), now()->addHours($hours)])
                    ->whereIn('status', ['pending', 'assigned']);
    }

    /**
     * Accessors & Mutators
     */
    public function getTaskTypeNameAttribute(): string
    {
        return self::TASK_TYPES[$this->task_type] ?? $this->task_type;
    }

    public function getPriorityNameAttribute(): string
    {
        return self::PRIORITIES[$this->priority] ?? $this->priority;
    }

    public function getStatusNameAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function getQualityRatingNameAttribute(): ?string
    {
        return $this->quality_rating ? self::QUALITY_RATINGS[$this->quality_rating] : null;
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->deadline && 
               $this->deadline->isPast() && 
               !in_array($this->status, ['completed', 'cancelled']);
    }

    public function getIsUrgentAttribute(): bool
    {
        return $this->priority === 'urgent' || $this->is_overdue;
    }

    public function getDurationInMinutesAttribute(): ?int
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }
        
        return $this->started_at->diffInMinutes($this->completed_at);
    }

    public function getEstimatedDurationInMinutesAttribute(): int
    {
        [$hours, $minutes] = explode(':', $this->estimated_duration);
        return ($hours * 60) + $minutes;
    }

    /**
     * Business Methods
     */
    public function markAsStarted(?int $userId = null): bool
    {
        if ($this->status !== 'assigned') {
            return false;
        }

        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        return true;
    }

    public function markAsCompleted(?int $userId = null, array $completionData = []): bool
    {
        if (!in_array($this->status, ['assigned', 'in_progress'])) {
            return false;
        }

        $updateData = array_merge($completionData, [
            'status' => 'completed',
            'completed_at' => now(),
            'completed_by' => $userId,
        ]);

        $this->update($updateData);

        return true;
    }

    public function assignTo(int $userId): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }

        $this->update([
            'assigned_to' => $userId,
            'status' => 'assigned',
        ]);

        return true;
    }

    public function requiresReview(): bool
    {
        return $this->status === 'completed' && !$this->reviewed_at;
    }

    public function submitForReview(): bool
    {
        if ($this->status !== 'in_progress') {
            return false;
        }

        $this->update(['status' => 'review_required']);

        return true;
    }

    public function approve(int $reviewerId, array $reviewData = []): bool
    {
        if ($this->status !== 'review_required') {
            return false;
        }

        $updateData = array_merge($reviewData, [
            'status' => 'completed',
            'reviewed_by' => $reviewerId,
            'reviewed_at' => now(),
        ]);

        $this->update($updateData);

        return true;
    }

    public function getCleaningAreasListAttribute(): array
    {
        if (!$this->cleaning_areas) {
            return [];
        }

        return array_map(function($area) {
            return self::DEFAULT_CLEANING_AREAS[$area] ?? $area;
        }, $this->cleaning_areas);
    }

    public function getCompletionPercentageAttribute(): int
    {
        if (!$this->checklist || empty($this->checklist)) {
            return $this->status === 'completed' ? 100 : 0;
        }

        $total = count($this->checklist);
        $completed = count(array_filter($this->checklist, function($item) {
            return isset($item['completed']) && $item['completed'];
        }));

        return $total > 0 ? round(($completed / $total) * 100) : 0;
    }
}
