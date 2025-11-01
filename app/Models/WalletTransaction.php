<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'wallet_id',
        'direction',
        'category',
        'amount',
        'transaction_date',
        'reference_type',
        'reference_id',
        'related_transaction_id',
        'description',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get related transaction (for transfers)
     */
    public function relatedTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class, 'related_transaction_id');
    }

    /**
     * Check if this is a transfer transaction
     */
    public function isTransfer(): bool
    {
        return $this->category === 'transfer' || $this->reference_type === 'transfer';
    }

    /**
     * Get category label
     */
    public function getCategoryLabel(): string
    {
        $categories = config('finance.wallet_transaction_categories', []);
        return $categories[$this->category] ?? ucfirst($this->category ?? 'Lainnya');
    }
}



