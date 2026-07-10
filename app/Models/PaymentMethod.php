<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'type',
        'icon',
        'description',
        'account_number',
        'account_name',
        'bank_name',
        'qr_code',
        'instructions',
        'is_active',
        'sort_order',
        'wallet_id',
        'fee_percentage',
        'fee_fixed',
        'fee_type',
        'ipaymu_settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'instructions' => 'array',
        'fee_percentage' => 'decimal:2',
        'fee_fixed' => 'decimal:2',
        'ipaymu_settings' => 'array',
    ];

    // Relationships
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'payment_method_id');
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(BankAccount::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    // Accessors
    public function getFormattedInstructionsAttribute()
    {
        if (is_array($this->instructions)) {
            return $this->instructions;
        }

        return [];
    }

    /**
     * Calculate fee untuk amount tertentu
     */
    public function calculateFee(float $amount): float
    {
        if ($this->fee_type === 'fixed') {
            return $this->fee_fixed ?? 0;
        }

        // Percentage fee
        $percentage = $this->fee_percentage ?? 0;

        return ($amount * $percentage) / 100;
    }

    /**
     * Get total amount dengan fee
     */
    public function getTotalWithFee(float $amount): float
    {
        return $amount + $this->calculateFee($amount);
    }

    /**
     * Check if this is iPaymu payment method
     */
    public function isIpaymu(): bool
    {
        return $this->code === 'ipaymu';
    }

    /**
     * Get iPaymu payment channel dari settings
     */
    public function getIpaymuChannel(): ?string
    {
        if (! $this->isIpaymu()) {
            return null;
        }

        return $this->ipaymu_settings['channel'] ?? 'all';
    }
}
