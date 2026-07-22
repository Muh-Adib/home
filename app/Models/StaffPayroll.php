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
        'sick_days',
        'sick_deduction',
        'permission_days',
        'permission_deduction',
        'absent_deduction',
        'late_days',
        'late_hours',
        'standby_nights',
        'late_deduction',
        'loan_deduction',
        'housekeeping_bonus',
        'standby_bonus',
        'frontdesk_first_night_bonus',
        'frontdesk_next_nights_bonus_share',
        'overtime_hours',
        'overtime_bonus',
        'holiday_days',
        'total_salary',
        'status',
        'paid_at',
        'performance_bonus',
        'kpi_details',
        'points_details',
        'loans_details',
        'notes',
        'created_by',
        'expense_id',
    ];

    protected $casts = [
        'base_salary' => 'float',
        'late_deduction' => 'float',
        'loan_deduction' => 'float',
        'housekeeping_bonus' => 'float',
        'standby_bonus' => 'float',
        'frontdesk_first_night_bonus' => 'float',
        'frontdesk_next_nights_bonus_share' => 'float',
        'performance_bonus' => 'float',
        'total_salary' => 'float',
        'paid_at' => 'datetime',
        'sick_days' => 'integer',
        'sick_deduction' => 'float',
        'permission_days' => 'integer',
        'permission_deduction' => 'float',
        'absent_deduction' => 'float',
        'late_hours' => 'float',
        'overtime_hours' => 'float',
        'overtime_bonus' => 'float',
        'holiday_days' => 'integer',
        'kpi_details' => 'array',
        'points_details' => 'array',
        'loans_details' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(PropertyExpense::class, 'expense_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
