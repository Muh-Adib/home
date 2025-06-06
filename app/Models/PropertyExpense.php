<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyExpense extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'property_id',
        'expense_category',
        'expense_type',
        'description',
        'amount',
        'expense_date',
        'vendor_name',
        'receipt_number',
        'payment_method',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
        'status',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'approved_at' => 'datetime',
    ];

    /**
     * Get the property that owns the expense.
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Get the user who created the expense.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who approved the expense.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get expense category label
     */
    public function getCategoryLabel(): string
    {
        return match($this->expense_category) {
            'maintenance' => 'Pemeliharaan',
            'utilities' => 'Utilitas',
            'supplies' => 'Perlengkapan',
            'marketing' => 'Marketing',
            'insurance' => 'Asuransi',
            'taxes' => 'Pajak',
            'professional_services' => 'Jasa Profesional',
            'other' => 'Lainnya',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Get expense type label
     */
    public function getTypeLabel(): string
    {
        return match($this->expense_type) {
            'recurring' => 'Berulang',
            'one_time' => 'Sekali',
            'emergency' => 'Darurat',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Get status label
     */
    public function getStatusLabel(): string
    {
        return match($this->status) {
            'pending' => 'Menunggu Persetujuan',
            'approved' => 'Disetujui',
            'rejected' => 'Ditolak',
            'paid' => 'Dibayar',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Check if expense is approved
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if expense is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if expense is paid
     */
    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    /**
     * Approve expense
     */
    public function approve(int $userId): bool
    {
        return $this->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);
    }

    /**
     * Mark as paid
     */
    public function markAsPaid(): bool
    {
        return $this->update(['status' => 'paid']);
    }

    /**
     * Get formatted amount
     */
    public function getFormattedAmount(): string
    {
        return 'Rp ' . number_format($this->amount, 0, ',', '.');
    }

    /**
     * Scope: Get maintenance expenses
     */
    public function scopeMaintenance($query)
    {
        return $query->where('expense_category', 'maintenance');
    }

    /**
     * Scope: Get utilities expenses
     */
    public function scopeUtilities($query)
    {
        return $query->where('expense_category', 'utilities');
    }

    /**
     * Scope: Get approved expenses
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope: Get pending expenses
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Get expenses by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('expense_date', [$startDate, $endDate]);
    }

    /**
     * Scope: Get current month expenses
     */
    public function scopeCurrentMonth($query)
    {
        return $query->whereMonth('expense_date', now()->month)
                    ->whereYear('expense_date', now()->year);
    }
}
