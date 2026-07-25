<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attendance extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'shift_start_time',
        'shift_end_time',
        'check_in',
        'check_out',
        'work_hours',
        'late_minutes',
        'overtime_minutes',
        'status',
        'is_off_day',
        'is_corrected',
        'notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'work_hours' => 'float',
        'late_minutes' => 'integer',
        'overtime_minutes' => 'integer',
        'is_off_day' => 'boolean',
        'is_corrected' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(AttendanceCorrection::class)->orderBy('created_at', 'desc');
    }
}
