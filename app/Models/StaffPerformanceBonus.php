<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffPerformanceBonus extends Model
{
    protected $fillable = [
        'user_id',
        'month',
        'year',
        'role',
        'housekeeping_bonus',
        'frontdesk_first_night_bonus',
        'frontdesk_next_nights_bonus_share',
        'kpi_performance_bonus',
        'total_bonus',
        'details',
        'status',
        'finalized_at',
        'finalized_by',
    ];

    protected $casts = [
        'month' => 'integer',
        'year' => 'integer',
        'housekeeping_bonus' => 'float',
        'frontdesk_first_night_bonus' => 'float',
        'frontdesk_next_nights_bonus_share' => 'float',
        'kpi_performance_bonus' => 'float',
        'total_bonus' => 'float',
        'details' => 'array',
        'finalized_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function finalizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }
}
