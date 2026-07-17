<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Wallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'property_id',
        'balance',
        'is_savings',
        'auto_deduct_from_monthly_report',
        'savings_monthly_amount',
        'target_amount',
        'target_date',
        'notes',
        'created_by',
        'purpose',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'is_savings' => 'boolean',
        'auto_deduct_from_monthly_report' => 'boolean',
        'savings_monthly_amount' => 'decimal:2',
        'target_amount' => 'decimal:2',
        'target_date' => 'date',
    ];

    public function bankAccount(): HasOne
    {
        return $this->hasOne(BankAccount::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get purpose label
     */
    public function getPurposeLabel(): string
    {
        $purposes = config('finance.wallet_purposes', []);

        return $purposes[$this->purpose] ?? ucfirst($this->purpose ?? 'Umum');
    }

    /**
     * Scope: Filter wallets by purpose
     */
    public function scopeByPurpose($query, $purpose)
    {
        return $query->where('purpose', $purpose);
    }

    /**
     * Scope: Filter wallets visible to user
     * User hanya bisa lihat wallet yang mereka buat, kecuali admin/finance yang bisa lihat semua
     */
    public function scopeVisibleToUser($query, ?int $userId = null, ?string $userRole = null)
    {
        if (in_array($userRole, ['super_admin', 'finance'])) {
            return $query; // Admin/Finance bisa lihat semua
        }

        if ($userId) {
            return $query->where('created_by', $userId);
        }

        return $query->whereRaw('1 = 0'); // No access if no user ID
    }

    /**
     * Calculate target progress percentage
     */
    public function getProgressPercentage(): float
    {
        if (! $this->target_amount || $this->target_amount <= 0) {
            return 0;
        }

        $percentage = ($this->balance / $this->target_amount) * 100;

        return min(100, max(0, round($percentage, 2)));
    }

    /**
     * Check if wallet has target
     */
    public function hasTarget(): bool
    {
        return ! is_null($this->target_amount) && ! is_null($this->target_date) && $this->target_amount > 0;
    }

    /**
     * Get days remaining until target date
     */
    public function getDaysRemaining(): ?int
    {
        if (! $this->target_date) {
            return null;
        }

        $today = now()->startOfDay();
        $target = Carbon::parse($this->target_date)->startOfDay();
        $days = $today->diffInDays($target, false);

        return $days >= 0 ? $days : null; // Return null if target date has passed
    }

    /**
     * Check if target is achieved
     */
    public function isTargetAchieved(): bool
    {
        if (! $this->hasTarget()) {
            return false;
        }

        return $this->balance >= $this->target_amount;
    }
}
