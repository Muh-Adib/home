<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffShift extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date',
        'shift_start_time',
        'shift_end_time',
        'is_off_day',
    ];

    protected $casts = [
        'date' => 'date',
        'is_off_day' => 'boolean',
    ];

    /**
     * Get the user that owns the shift.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
