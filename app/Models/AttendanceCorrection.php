<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceCorrection extends Model
{
    protected $fillable = [
        'attendance_id',
        'user_id',
        'date',
        'original_check_in',
        'original_check_out',
        'corrected_check_in',
        'corrected_check_out',
        'reason',
        'notes',
        'corrected_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function corrector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corrected_by');
    }
}
