<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffPayroll extends Model
{
    protected $fillable = [
        'user_id',
        'month',
        'year',
        'base_salary',
        'attendance_days',
        'absent_days',
        'late_days',
        'late_deduction',
        'loan_deduction',
        'housekeeping_bonus',
        'frontdesk_first_night_bonus',
        'frontdesk_next_nights_bonus_share',
        'total_salary',
        'status',
        'paid_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'base_salary' => 'float',
        'late_deduction' => 'float',
        'loan_deduction' => 'float',
        'housekeeping_bonus' => 'float',
        'frontdesk_first_night_bonus' => 'float',
        'frontdesk_next_nights_bonus_share' => 'float',
        'total_salary' => 'float',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
