<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_name',
        'bank_code',
        'account_number',
        'account_holder',
        'label',
        'payment_method_id',
        'wallet_id',
        'can_receive_payments',
    ];

    protected $casts = [
        'payment_method_id' => 'integer',
        'wallet_id' => 'integer',
        'can_receive_payments' => 'boolean',
    ];

    /**
     * Get the wallet associated with this bank account.
     */
    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    /**
     * Get properties associated with this bank account.
     */
    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    /**
     * Get the payment method associated with this bank account.
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * Scope: Filter bank accounts that can receive payments.
     */
    public function scopeCanReceivePayments($query)
    {
        return $query->where('can_receive_payments', true);
    }

    /**
     * Scope: Filter bank accounts dedicated to expenses.
     */
    public function scopeExpenseOnly($query)
    {
        return $query->where('can_receive_payments', false);
    }
}
