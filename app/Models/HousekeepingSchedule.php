<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HousekeepingSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'user_id',
        'task_name',
        'points',
        'is_completed',
        'completed_at',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'points' => 'float',
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
