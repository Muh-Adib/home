<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class CleaningSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'created_by',
        'default_assigned_to',
        'name',
        'description',
        'schedule_type',
        'frequency',
        'days_of_week',
        'day_of_month',
        'custom_dates',
        'preferred_time',
        'estimated_duration',
        'auto_generate_tasks',
        'advance_days',
        'task_title_template',
        'task_description_template',
        'default_priority',
        'cleaning_areas',
        'checklist_template',
        'special_instructions_template',
        'estimated_cost',
        'start_date',
        'end_date',
        'is_active',
        'last_generated_at',
        'next_generation_date',
    ];

    protected $casts = [
        'days_of_week' => 'array',
        'custom_dates' => 'array',
        'cleaning_areas' => 'array',
        'checklist_template' => 'array',
        'estimated_cost' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'last_generated_at' => 'datetime',
        'next_generation_date' => 'date',
        'is_active' => 'boolean',
        'auto_generate_tasks' => 'boolean',
    ];

    // Schedule types
    const SCHEDULE_TYPES = [
        'recurring' => 'Regular Recurring Schedule',
        'booking_based' => 'Booking-Based Schedule',
        'maintenance' => 'Maintenance Schedule',
        'seasonal' => 'Seasonal Schedule',
    ];

    // Frequencies
    const FREQUENCIES = [
        'daily' => 'Daily',
        'weekly' => 'Weekly',
        'biweekly' => 'Bi-weekly',
        'monthly' => 'Monthly',
        'quarterly' => 'Quarterly',
        'yearly' => 'Yearly',
        'custom' => 'Custom',
    ];

    // Priority levels
    const PRIORITIES = [
        'low' => 'Low',
        'normal' => 'Normal',
        'high' => 'High',
        'urgent' => 'Urgent',
    ];

    // Days of week (1=Monday, 7=Sunday)
    const DAYS_OF_WEEK = [
        1 => 'Monday',
        2 => 'Tuesday',
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
        7 => 'Sunday',
    ];

    /**
     * Relationships
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function defaultAssignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_assigned_to');
    }

    public function cleaningTasks(): HasMany
    {
        return $this->hasMany(CleaningTask::class, 'schedule_id');
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByProperty($query, $propertyId)
    {
        return $query->where('property_id', $propertyId);
    }

    public function scopeByScheduleType($query, $type)
    {
        return $query->where('schedule_type', $type);
    }

    public function scopeByFrequency($query, $frequency)
    {
        return $query->where('frequency', $frequency);
    }

    public function scopeAutoGenerate($query)
    {
        return $query->where('auto_generate_tasks', true);
    }

    public function scopeDueForGeneration($query)
    {
        return $query->where('next_generation_date', '<=', now()->toDateString())
                    ->where('auto_generate_tasks', true)
                    ->where('is_active', true);
    }

    /**
     * Accessors
     */
    public function getScheduleTypeNameAttribute(): string
    {
        return self::SCHEDULE_TYPES[$this->schedule_type] ?? $this->schedule_type;
    }

    public function getFrequencyNameAttribute(): string
    {
        return self::FREQUENCIES[$this->frequency] ?? $this->frequency;
    }

    public function getPriorityNameAttribute(): string
    {
        return self::PRIORITIES[$this->default_priority] ?? $this->default_priority;
    }

    public function getDaysOfWeekNamesAttribute(): array
    {
        if (!$this->days_of_week) {
            return [];
        }

        return array_map(function($day) {
            return self::DAYS_OF_WEEK[$day] ?? $day;
        }, $this->days_of_week);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->end_date && $this->end_date->isPast();
    }

    /**
     * Business Methods
     */
    
    /**
     * Generate next task based on schedule
     */
    public function generateNextTask(Carbon $forDate = null): ?CleaningTask
    {
        if (!$this->is_active || $this->is_expired) {
            return null;
        }

        $forDate = $forDate ?? now();
        $scheduledDate = $this->getNextScheduledDate($forDate);

        if (!$scheduledDate) {
            return null;
        }

        $taskData = [
            'property_id' => $this->property_id,
            'created_by' => $this->created_by,
            'assigned_to' => $this->default_assigned_to,
            'title' => $this->parseTemplate($this->task_title_template),
            'description' => $this->parseTemplate($this->task_description_template),
            'task_type' => 'scheduled_cleaning',
            'priority' => $this->default_priority,
            'status' => 'pending',
            'scheduled_date' => $scheduledDate->setTimeFromTimeString($this->preferred_time),
            'estimated_duration' => $this->estimated_duration,
            'cleaning_areas' => $this->cleaning_areas,
            'checklist' => $this->checklist_template,
            'special_instructions' => $this->parseTemplate($this->special_instructions_template),
            'estimated_cost' => $this->estimated_cost,
        ];

        $task = CleaningTask::create($taskData);

        // Update last generation info
        $this->update([
            'last_generated_at' => now(),
            'next_generation_date' => $this->calculateNextGenerationDate(),
        ]);

        return $task;
    }

    /**
     * Get next scheduled date based on frequency
     */
    public function getNextScheduledDate(Carbon $fromDate = null): ?Carbon
    {
        $fromDate = $fromDate ?? now();

        switch ($this->frequency) {
            case 'daily':
                return $fromDate->copy()->addDay();

            case 'weekly':
                return $this->getNextWeeklyDate($fromDate);

            case 'biweekly':
                return $this->getNextWeeklyDate($fromDate)->addWeek();

            case 'monthly':
                return $this->getNextMonthlyDate($fromDate);

            case 'quarterly':
                return $fromDate->copy()->addMonths(3);

            case 'yearly':
                return $fromDate->copy()->addYear();

            case 'custom':
                return $this->getNextCustomDate($fromDate);

            default:
                return null;
        }
    }

    /**
     * Get next weekly date based on days_of_week
     */
    private function getNextWeeklyDate(Carbon $fromDate): Carbon
    {
        if (!$this->days_of_week || empty($this->days_of_week)) {
            return $fromDate->copy()->addWeek();
        }

        $currentDayOfWeek = $fromDate->dayOfWeekIso;
        $nextDays = array_filter($this->days_of_week, function($day) use ($currentDayOfWeek) {
            return $day > $currentDayOfWeek;
        });

        if (!empty($nextDays)) {
            $nextDay = min($nextDays);
            $daysToAdd = $nextDay - $currentDayOfWeek;
        } else {
            // No more days this week, get first day of next week
            $nextDay = min($this->days_of_week);
            $daysToAdd = (7 - $currentDayOfWeek) + $nextDay;
        }

        return $fromDate->copy()->addDays($daysToAdd);
    }

    /**
     * Get next monthly date based on day_of_month
     */
    private function getNextMonthlyDate(Carbon $fromDate): Carbon
    {
        $nextMonth = $fromDate->copy()->addMonth();
        $dayOfMonth = $this->day_of_month ?? 1;

        // Handle last day of month
        if ($dayOfMonth > $nextMonth->daysInMonth) {
            $dayOfMonth = $nextMonth->daysInMonth;
        }

        return $nextMonth->setDay($dayOfMonth);
    }

    /**
     * Get next custom date
     */
    private function getNextCustomDate(Carbon $fromDate): ?Carbon
    {
        if (!$this->custom_dates || empty($this->custom_dates)) {
            return null;
        }

        $futureDates = array_filter($this->custom_dates, function($date) use ($fromDate) {
            return Carbon::parse($date)->isAfter($fromDate);
        });

        if (empty($futureDates)) {
            return null;
        }

        return Carbon::parse(min($futureDates));
    }

    /**
     * Calculate next generation date (advance_days before scheduled date)
     */
    public function calculateNextGenerationDate(): ?Carbon
    {
        $nextScheduled = $this->getNextScheduledDate();
        
        if (!$nextScheduled) {
            return null;
        }

        return $nextScheduled->copy()->subDays($this->advance_days);
    }

    /**
     * Parse template variables
     */
    private function parseTemplate(?string $template): ?string
    {
        if (!$template) {
            return null;
        }

        $replacements = [
            '{property_name}' => $this->property->name ?? '',
            '{schedule_name}' => $this->name,
            '{frequency}' => $this->frequency_name,
            '{date}' => now()->format('Y-m-d'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Generate tasks for multiple days ahead
     */
    public function generateTasksAhead(int $days = 30): array
    {
        $tasks = [];
        $currentDate = now();
        $endDate = $currentDate->copy()->addDays($days);

        while ($currentDate->lte($endDate)) {
            if ($this->shouldGenerateTaskForDate($currentDate)) {
                $task = $this->generateNextTask($currentDate);
                if ($task) {
                    $tasks[] = $task;
                }
            }
            $currentDate->addDay();
        }

        return $tasks;
    }

    /**
     * Check if should generate task for specific date
     */
    private function shouldGenerateTaskForDate(Carbon $date): bool
    {
        switch ($this->frequency) {
            case 'daily':
                return true;

            case 'weekly':
            case 'biweekly':
                return in_array($date->dayOfWeekIso, $this->days_of_week ?? []);

            case 'monthly':
                return $date->day === ($this->day_of_month ?? 1);

            case 'custom':
                $dateString = $date->format('Y-m-d');
                return in_array($dateString, $this->custom_dates ?? []);

            default:
                return false;
        }
    }

    /**
     * Activate/Deactivate schedule
     */
    public function activate(): bool
    {
        return $this->update([
            'is_active' => true,
            'next_generation_date' => $this->calculateNextGenerationDate(),
        ]);
    }

    public function deactivate(): bool
    {
        return $this->update(['is_active' => false]);
    }
}
