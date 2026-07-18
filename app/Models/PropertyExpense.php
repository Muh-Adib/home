<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyExpense extends Model
{
    use HasFactory;

    /**
     * The attributes to append to the model's array form.
     */
    protected $appends = ['is_linked'];

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'property_id',
        'booking_id',
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
        'recorded_by',
        'approved_by',
        'approved_at',
        'status',
        'wallet_id',
        'expense_scope',
        'receipt_image',
        'capital_split_investor_pct',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'approved_at' => 'datetime',
        'wallet_id' => 'integer',
        'capital_split_investor_pct' => 'decimal:2',
    ];

    /**
     * Get the wallet associated with this expense.
     */
    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

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
     * Get the user who recorded the expense.
     */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Get the user who approved the expense.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get inventory usage related to this expense
     */
    public function inventoryUsage()
    {
        return $this->hasOne(InventoryUsage::class, 'expense_id');
    }

    /**
     * Get inventory stock movement (purchase) related to this expense
     */
    public function stockMovement()
    {
        return $this->hasOne(InventoryStockMovement::class, 'reference_id')->where('reference_type', 'purchase');
    }

    /**
     * Get booking related to this expense
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    /**
     * Get expense category label
     */
    public function getCategoryLabel(): string
    {
        $categories = config('finance.expense_categories', []);

        return $categories[$this->expense_category] ?? ucfirst($this->expense_category ?? 'Lainnya');
    }

    /**
     * Get expense scope label
     */
    public function getScopeLabel(): string
    {
        $scopes = config('finance.expense_scopes', []);

        return $scopes[$this->expense_scope] ?? ucfirst($this->expense_scope ?? 'Lainnya');
    }

    /**
     * Get expense type label
     */
    public function getTypeLabel(): string
    {
        $types = config('finance.expense_types', []);

        return $types[$this->expense_type] ?? ucfirst($this->expense_type ?? 'Lainnya');
    }

    /**
     * Get status label
     */
    public function getStatusLabel(): string
    {
        return match ($this->status) {
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
        return 'Rp '.number_format($this->amount, 0, ',', '.');
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

    /**
     * Scope: Get expenses by scope
     */
    public function scopeByScope($query, $scope)
    {
        return $query->where('expense_scope', $scope);
    }

    /**
     * Get staff payroll related to this expense
     */
    public function staffPayroll(): BelongsTo
    {
        return $this->belongsTo(StaffPayroll::class, 'id', 'expense_id');
    }

    /**
     * Check if this expense is linked to other modules (inventory, booking, payroll)
     */
    public function isLinked(): bool
    {
        return $this->booking_id !== null
            || ($this->relationLoaded('inventoryUsage') ? $this->inventoryUsage !== null : $this->inventoryUsage()->exists())
            || ($this->relationLoaded('stockMovement') ? $this->stockMovement !== null : $this->stockMovement()->exists())
            || ($this->relationLoaded('staffPayroll') ? $this->staffPayroll !== null : $this->staffPayroll()->exists());
    }

    /**
     * Get is_linked attribute for serialization
     */
    public function getIsLinkedAttribute(): bool
    {
        return $this->isLinked();
    }
}
