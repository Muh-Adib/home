<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployeeLoan extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'amount',
        'disbursed_at',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'integer',
        'disbursed_at' => 'date',
    ];

    /**
     * Get the employee (user) associated with this loan.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    /**
     * Get the payments made towards this loan.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(EmployeeLoanPayment::class);
    }

    /**
     * Get the user who created/approved this loan.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
