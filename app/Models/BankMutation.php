<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankMutation extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_account_id',
        'trx_at',
        'amount',
        'direction',
        'sender_name',
        'description',
        'external_ref',
        'source',
        'status',
        'matched_payment_id',
        'imported_at',
    ];

    protected $casts = [
        'trx_at' => 'datetime',
        'amount' => 'integer',
        'imported_at' => 'datetime',
    ];

    /**
     * Get the bank account associated with this mutation.
     */
    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    /**
     * Get the payment matched with this mutation.
     */
    public function matchedPayment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'matched_payment_id');
    }
}
