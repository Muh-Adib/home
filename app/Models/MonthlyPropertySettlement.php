<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonthlyPropertySettlement extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'period_month',
        'status',
        'occupancy_nights',
        'reservation_count',
        'total_omset',
        'ops_fee_per_night',
        'total_ops_fee',
        'total_fix_cost',
        'total_add_cost',
        'total_var_cost',
        'total_expense_and_ops',
        'net_profit_loss',
        'investor_share_percent',
        'investor_share_amount',
        'management_share_percent',
        'management_share_amount',
        'zakat_percent',
        'zakat_amount',
        'target_wallet_id',
        'wallet_transaction_id',
        'finalized_at',
        'finalized_by',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'property_id' => 'integer',
        'occupancy_nights' => 'integer',
        'reservation_count' => 'integer',
        'total_omset' => 'float',
        'ops_fee_per_night' => 'float',
        'total_ops_fee' => 'float',
        'total_fix_cost' => 'float',
        'total_add_cost' => 'float',
        'total_var_cost' => 'float',
        'total_expense_and_ops' => 'float',
        'net_profit_loss' => 'float',
        'investor_share_percent' => 'float',
        'investor_share_amount' => 'float',
        'management_share_percent' => 'float',
        'management_share_amount' => 'float',
        'zakat_percent' => 'float',
        'zakat_amount' => 'float',
        'target_wallet_id' => 'integer',
        'wallet_transaction_id' => 'integer',
        'finalized_at' => 'datetime',
        'finalized_by' => 'integer',
        'created_by' => 'integer',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(MonthlySettlementItem::class, 'monthly_settlement_id')->orderBy('sort_order')->orderBy('id');
    }

    public function targetWallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class, 'target_wallet_id');
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
