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
        'batch_id',
        'version',
        'is_active',
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
        'approved_at',
        'approved_by',
        'performance_bonus',
        'custom_allowance',
        'custom_deduction',
        'custom_allowance_reason',
        'custom_deduction_reason',
        'kpi_details',
        'points_details',
        'loans_details',
        'attendance_summary',
        'allowance_details',
        'deduction_details',
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
        'overtime_bonus' => 'float',
        'performance_bonus' => 'float',
        'custom_allowance' => 'float',
        'custom_deduction' => 'float',
        'total_salary' => 'float',
        'paid_at' => 'datetime',
        'approved_at' => 'datetime',
        'is_active' => 'boolean',
        'kpi_details' => 'array',
        'points_details' => 'array',
        'loans_details' => 'array',
        'attendance_summary' => 'array',
        'allowance_details' => 'array',
        'deduction_details' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(PropertyExpense::class, 'expense_id');
    }
}
